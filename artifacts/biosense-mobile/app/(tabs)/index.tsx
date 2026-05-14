import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBLE } from "@/context/BLEContext";
import { FollowUpOutcome, CheckInFeeling } from "@/lib/storage";
import { OrbitDotImage } from "@/components/OrbitDotImage";
import { saveCheckIn } from "@/lib/storage";
import { useI18n } from "@/context/I18nContext";

// ─── 상태별 인간 언어 해석 ─────────────────────────────────────────────────────
interface StateInfo {
  label: string;
  bg: string;
  text: string;
  sentence: string;
  detail: string;
  micro?: string;
}

function useStateMap() {
  const { t } = useI18n();
  const map: Record<string, StateInfo> = {
    calm:      { label: t.stateCalm,      bg: "#22d3ee20", text: "#22d3ee", sentence: t.sentenceCalm,      detail: t.detailCalm },
    stress:    { label: t.stateStress,    bg: "#f59e0b20", text: "#f59e0b", sentence: t.sentenceStress,    detail: t.detailStress,    micro: t.microStress },
    anxiety:   { label: t.stateAnxiety,   bg: "#f9731620", text: "#f97316", sentence: t.sentenceAnxiety,   detail: t.detailAnxiety,   micro: t.microAnxiety },
    crisis:    { label: t.stateCrisis,    bg: "#ef444420", text: "#ef4444", sentence: t.sentenceCrisis,    detail: t.detailCrisis,    micro: t.microCrisis },
    obsession: { label: t.stateObsession, bg: "#d946ef20", text: "#d946ef", sentence: t.sentenceObsession, detail: t.detailObsession, micro: t.microObsession },
    exercise:  { label: t.stateExercise,  bg: "#34d39920", text: "#34d399", sentence: t.sentenceExercise,  detail: t.detailExercise },
    fatigue:   { label: t.stateFatigue,   bg: "#60a5fa20", text: "#60a5fa", sentence: t.sentenceFatigue,   detail: t.detailFatigue,   micro: t.microFatigue },
    sleep:     { label: t.stateSleep,     bg: "#818cf820", text: "#818cf8", sentence: t.sentenceSleep,     detail: t.detailSleep },
    meeting:   { label: t.stateMeeting,   bg: "#a78bfa20", text: "#a78bfa", sentence: t.sentenceMeeting,   detail: t.detailMeeting },
  };
  const def: StateInfo = { label: t.stateCalm, bg: "#22d3ee20", text: "#22d3ee", sentence: t.sentenceCalm, detail: t.detailCalm };
  return { map, def };
}

function useHRVDescription(hrv: number) {
  const { t } = useI18n();
  if (hrv <= 0) return { label: t.disconnected, color: "#7a8a9a" };
  if (hrv >= 50) return { label: t.hrvGood,     color: "#22d3ee" };
  if (hrv >= 35) return { label: t.hrvMild,     color: "#10b981" };
  if (hrv >= 20) return { label: t.hrvRising,   color: "#f59e0b" };
  return { label: t.hrvHigh, color: "#ef4444" };
}

// ─── HeartCircle ─────────────────────────────────────────────────────────────
function HeartCircle({ hr, distress, color }: { hr: number; distress: boolean; color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: distress ? 1.12 : 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 1,   duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [distress]);

  return (
    <View style={styles.circleWrapper}>
      <Animated.View style={[styles.circlePulse, { borderColor: color, opacity: glow, transform: [{ scale: pulse }] }]} />
      <View style={[styles.circleInner, { borderColor: color + "60" }]}>
        <Text style={[styles.hrNumber, { color }]}>{hr > 0 ? hr : "--"}</Text>
        <Text style={[styles.hrUnit, { color: color + "aa" }]}>bpm</Text>
      </View>
    </View>
  );
}

// ─── 변화 감지 배너 ───────────────────────────────────────────────────────────
function DetectionBanner({ info, insetTop }: { info: StateInfo; insetTop: number }) {
  const { t } = useI18n();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.timing(opacity,   { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 350, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,    duration: 350, useNativeDriver: true }),
      ]).start();
    }, 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: insetTop + 12, backgroundColor: info.bg, borderColor: info.text + "80", transform: [{ translateY }], opacity },
      ]}
    >
      <Feather name="radio" size={18} color={info.text} />
      <View style={styles.bannerTextWrap}>
        <Text style={[styles.bannerMain, { color: info.text }]}>{info.sentence}</Text>
        {info.micro && (
          <Text style={[styles.bannerSub, { color: info.text + "cc" }]}>
            {t.microBannerPrefix}{info.micro}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── 마이크로 러닝 카드 ───────────────────────────────────────────────────────
function MicroLearningCard({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { t } = useI18n();
  const MICRO_CARDS = [
    { icon: "heart"    as const, text: t.micro0t, sub: t.micro0s },
    { icon: "wind"     as const, text: t.micro1t, sub: t.micro1s },
    { icon: "eye"      as const, text: t.micro2t, sub: t.micro2s },
    { icon: "activity" as const, text: t.micro3t, sub: t.micro3s },
    { icon: "zap"      as const, text: t.micro4t, sub: t.micro4s },
    { icon: "moon"     as const, text: t.micro5t, sub: t.micro5s },
    { icon: "sun"      as const, text: t.micro6t, sub: t.micro6s },
  ];
  const dayIndex = new Date().getDate() % MICRO_CARDS.length;
  const card = MICRO_CARDS[dayIndex];
  return (
    <View style={[microStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={microStyles.header}>
        <View style={microStyles.iconWrap}>
          <Feather name={card.icon} size={14} color="#22d3ee" />
        </View>
        <Text style={[microStyles.tag, { color: "#22d3ee" }]}>{t.todayMicro}</Text>
      </View>
      <Text style={[microStyles.main, { color: colors.foreground }]}>{card.text}</Text>
      <Text style={[microStyles.sub, { color: colors.mutedForeground }]}>{card.sub}</Text>
    </View>
  );
}

// ─── 마음 상태 재확인 카드 ────────────────────────────────────────────────────
function FollowUpCard({
  colors,
  onDismiss,
}: {
  colors: ReturnType<typeof useColors>;
  onDismiss: (o: FollowUpOutcome) => Promise<void>;
}) {
  const { t } = useI18n();
  const FOLLOW_UP_OPTIONS: { outcome: FollowUpOutcome; label: string; color: string; resultLabel: string }[] = [
    { outcome: "recovered",  label: t.fuRecovered,  color: "#22d3ee", resultLabel: t.fuResultRecovered },
    { outcome: "partial",    label: t.fuPartial,    color: "#f59e0b", resultLabel: t.fuResultPartial },
    { outcome: "incomplete", label: t.fuIncomplete, color: "#ef4444", resultLabel: t.fuResultIncomplete },
    { outcome: "monitoring", label: t.fuMonitoring, color: "#6b7280", resultLabel: t.fuResultMonitoring },
  ];

  const [responded, setResponded] = useState(false);
  const [resultLabel, setResultLabel] = useState("");

  const handleSelect = useCallback(async (opt: (typeof FOLLOW_UP_OPTIONS)[number]) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setResultLabel(opt.resultLabel);
    setResponded(true);
    await onDismiss(opt.outcome);
  }, [onDismiss]);

  return (
    <View style={[followUpStyles.card, { backgroundColor: colors.card, borderColor: "#f59e0b55" }]}>
      <View style={followUpStyles.header}>
        <Feather name="clock" size={14} color="#f59e0b" />
        <Text style={[followUpStyles.title, { color: colors.foreground }]}>{t.followUpTitle}</Text>
      </View>
      {!responded ? (
        <>
          <Text style={[followUpStyles.question, { color: colors.mutedForeground }]}>
            {t.followUpQuestion}
          </Text>
          {FOLLOW_UP_OPTIONS.map((opt) => (
            <Pressable
              key={opt.outcome}
              onPress={() => handleSelect(opt)}
              style={[followUpStyles.optionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <View style={[followUpStyles.optionDot, { backgroundColor: opt.color }]} />
              <Text style={[followUpStyles.optionLabel, { color: colors.foreground }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </>
      ) : (
        <View style={followUpStyles.resultRow}>
          <Feather name="check-circle" size={18} color="#22d3ee" />
          <Text style={[followUpStyles.resultText, { color: colors.foreground }]}>
            {resultLabel} — {t.followUpRecorded}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── 메타인지 체크인 ──────────────────────────────────────────────────────────
function CheckInSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { t } = useI18n();
  const CHECK_IN_FEELINGS: CheckInFeeling[] = [
    t.checkInTension as CheckInFeeling,
    t.checkInPressure as CheckInFeeling,
    t.checkInFatigue as CheckInFeeling,
    t.checkInUnsure as CheckInFeeling,
  ];
  const FEELING_COLORS: Record<string, string> = {
    [t.checkInTension]:  "#f59e0b",
    [t.checkInPressure]: "#f97316",
    [t.checkInFatigue]:  "#60a5fa",
    [t.checkInUnsure]:   "#6b7280",
  };

  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSelect = useCallback(async (feeling: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(feeling);
    await saveCheckIn(feeling as CheckInFeeling);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <View style={[checkStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={checkStyles.header}>
        <Feather name="edit-3" size={14} color="#22d3ee" />
        <Text style={[checkStyles.title, { color: colors.foreground }]}>{t.checkInTitle}</Text>
        {saved && (
          <View style={checkStyles.savedBadge}>
            <Text style={checkStyles.savedText}>✓ {t.checkInSaved}</Text>
          </View>
        )}
      </View>
      <View style={checkStyles.chips}>
        {CHECK_IN_FEELINGS.map((f) => {
          const isActive = selected === f;
          const color = FEELING_COLORS[f] ?? "#6b7280";
          return (
            <Pressable
              key={f}
              onPress={() => handleSelect(f)}
              style={[
                checkStyles.chip,
                {
                  backgroundColor: isActive ? color + "25" : colors.muted,
                  borderColor: isActive ? color + "80" : colors.border,
                },
              ]}
            >
              <Text style={[checkStyles.chipText, { color: isActive ? color : colors.mutedForeground }]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────
export default function MonitorScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { t, lang } = useI18n();
  const { isConnected, isDemoMode, currentHR, currentHRV, currentMotion, classification, isPaid, alertsToday, alertDailyLimit, exerciseTransition, followUpReady, dismissFollowUp } = useBLE();

  const { map: STATE_MAP, def: DEFAULT_STATE } = useStateMap();
  const info = STATE_MAP[classification.state] ?? DEFAULT_STATE;
  const distress = classification.emotionalDistress;

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const prevState      = useRef<string>(classification.state);
  const bannerKey      = useRef(0);
  const [bannerVisible, setBannerVisible] = React.useState(false);
  const bannerInfoRef  = useRef<StateInfo>(info);

  useEffect(() => {
    if (!isConnected) return;
    const curr = classification.state;
    if (prevState.current !== curr) {
      prevState.current = curr;
      const distressStates = ["stress", "anxiety", "crisis", "obsession", "fatigue"];
      if (distressStates.includes(curr)) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        bannerInfoRef.current = STATE_MAP[curr] ?? DEFAULT_STATE;
        bannerKey.current += 1;
        setBannerVisible(true);
        setTimeout(() => setBannerVisible(false), 4500);
      }
    }
  }, [classification.state, isConnected]);

  const handleConnect = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/connect" as any);
  };

  const hrvDesc = useHRVDescription(currentHRV);

  // 활동량 레이블
  const motionLabel = currentMotion > 30 ? (lang === "ko" ? "활발한 움직임" : "Active")
    : currentMotion > 10 ? (lang === "ko" ? "가벼운 움직임" : "Light movement")
    : (lang === "ko" ? "정적 상태" : "Still");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더: 연결 상태 pill + 오늘 알림 현황 */}
        <View style={[styles.header, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <Pressable
            onPress={handleConnect}
            style={[
              styles.connectionPill,
              {
                backgroundColor: isConnected ? info.bg    : colors.muted,
                borderColor:     isConnected ? info.text + "40" : colors.border,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: isConnected ? info.text : colors.mutedForeground }]} />
            <Text style={[styles.pillText, { color: isConnected ? info.text : colors.mutedForeground }]}>
              {isConnected ? (isDemoMode ? t.demoMode : t.connectedDevice) : t.connecting}
            </Text>
            <Feather name="chevron-right" size={12} color={isConnected ? info.text : colors.mutedForeground} />
          </Pressable>
          {isConnected && (
            <View style={[styles.alertCountBadge, {
              backgroundColor: alertsToday >= alertDailyLimit ? "#ef444415" : (isPaid ? "#22d3ee12" : colors.muted),
              borderColor:     alertsToday >= alertDailyLimit ? "#ef444440" : (isPaid ? "#22d3ee40" : colors.border),
            }]}>
              <Feather
                name={alertsToday >= alertDailyLimit ? "bell-off" : "bell"}
                size={10}
                color={alertsToday >= alertDailyLimit ? "#ef4444" : (isPaid ? "#22d3ee" : colors.mutedForeground)}
              />
              <Text style={[styles.alertCountText, {
                color: alertsToday >= alertDailyLimit ? "#ef4444" : (isPaid ? "#22d3ee" : colors.mutedForeground),
              }]}>
                {alertsToday}/{alertDailyLimit}
              </Text>
            </View>
          )}
        </View>

        {/* 알림 한도 도달 시 업그레이드 넛지 */}
        {isConnected && alertsToday >= alertDailyLimit && !isPaid && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/payment" as any);
            }}
            style={[styles.upgradeNudge, { backgroundColor: "#22d3ee10", borderColor: "#22d3ee35" }]}
          >
            <Feather name="arrow-up-circle" size={16} color="#22d3ee" />
            <View style={styles.upgradeText}>
              <Text style={[styles.upgradeTitle, { color: "#22d3ee" }]}>{t.alertLimitReached}</Text>
              <Text style={[styles.upgradeDesc, { color: colors.mutedForeground }]}>{t.alertLimitSub}</Text>
            </View>
            <Feather name="chevron-right" size={14} color="#22d3ee" />
          </Pressable>
        )}

        {/* 불안→운동 전환 알림 배너 */}
        {isConnected && exerciseTransition && !followUpReady && (
          <View style={[styles.transitionCard, { backgroundColor: "#f9741612", borderColor: "#f9741640" }]}>
            <Feather name="activity" size={15} color="#f97416" />
            <View style={styles.transitionText}>
              <Text style={[styles.transitionTitle, { color: "#f97416" }]}>
                {t.transitionTitle}
              </Text>
              <Text style={[styles.transitionDesc, { color: colors.mutedForeground }]}>
                {t.transitionDesc}
              </Text>
            </View>
          </View>
        )}

        {/* 마음 상태 재확인 카드 */}
        {isConnected && followUpReady && (
          <FollowUpCard colors={colors} onDismiss={dismissFollowUp} />
        )}

        {/* 감지 알림 카드 — distress 상태 시 */}
        {distress && isConnected && (
          <Pressable
            onPress={() => router.push((`/recover?state=${classification.state}`) as any)}
            style={[styles.alertCard, { backgroundColor: info.bg, borderColor: info.text + "50" }]}
          >
            <View style={styles.alertRow}>
              <Feather name="alert-triangle" size={18} color={info.text} />
              <View style={styles.alertText}>
                <Text style={[styles.alertTitle, { color: info.text }]}>{info.sentence}</Text>
                <Text style={[styles.alertNote, { color: info.text + "cc" }]}>{info.detail}</Text>
              </View>
              <Feather name="wind" size={18} color={info.text} />
            </View>
            {info.micro && (
              <View style={[styles.microRow, { borderTopColor: info.text + "30" }]}>
                <Feather name="zap" size={12} color={info.text} />
                <Text style={[styles.microText, { color: info.text }]}>{t.nowArrow}{info.micro}</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* 심박 원형 / 로고 */}
        {isConnected ? (
          <HeartCircle hr={currentHR} distress={distress} color={info.text} />
        ) : (
          <View style={styles.animWrapper}>
            <OrbitDotImage
              source={require("@/assets/images/icon.png")}
              size={220}
              circleRatio={0.385}
              dotColor="#22d3ee"
              speed={3200}
            />
          </View>
        )}

        {/* 상태 배지 */}
        <View style={[styles.stateBadge, { backgroundColor: info.bg, borderColor: info.text + "40" }]}>
          <Text style={[styles.stateBadgeText, { color: info.text }]}>
            {isConnected ? info.label.toUpperCase() : t.disconnected.toUpperCase()}
          </Text>
        </View>

        {/* 인간 언어 해석 문장 */}
        <Text style={[styles.sentenceText, { color: isConnected ? colors.foreground : colors.mutedForeground }]}>
          {isConnected ? info.sentence : t.disconnectedMsg}
        </Text>
        {isConnected && (
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{info.detail}</Text>
        )}

        {/* 생체신호 카드 — HRV 자율신경 설명 */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="activity" size={16} color={isConnected ? hrvDesc.color : "#7a8a9a"} />
            <Text style={[styles.metricValue, { color: isConnected ? colors.foreground : colors.mutedForeground }]}>
              {isConnected && currentHRV > 0 ? currentHRV : "--"}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{t.hrv}</Text>
            <Text style={[styles.metricDesc, { color: isConnected ? hrvDesc.color : "#7a8a9a" }]}>
              {isConnected ? hrvDesc.label : t.disconnected}
            </Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zap" size={16} color={isConnected ? info.text : "#7a8a9a"} />
            <Text style={[styles.metricValue, { color: isConnected ? colors.foreground : colors.mutedForeground }]}>
              {isConnected ? currentMotion : "--"}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{t.motion}</Text>
            <Text style={[styles.metricDesc, { color: colors.mutedForeground }]}>
              {isConnected ? motionLabel : t.disconnected}
            </Text>
          </View>
        </View>

        {/* 연결 버튼 */}
        {!isConnected && (
          <Pressable
            onPress={handleConnect}
            style={({ pressed }) => [styles.connectButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="bluetooth" size={20} color={colors.primaryForeground} />
            <Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>{t.connectBtn}</Text>
          </Pressable>
        )}

        {/* 데모 시나리오 변경 */}
        {isConnected && isDemoMode && (
          <Pressable
            onPress={() => router.push("/scenarios" as any)}
            style={({ pressed }) => [styles.scenarioButton, { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="sliders" size={16} color={colors.mutedForeground} />
            <Text style={[styles.scenarioButtonText, { color: colors.mutedForeground }]}>
              {t.scenarioTitle}
            </Text>
          </Pressable>
        )}

        {/* 메타인지 체크인 */}
        {isConnected && <CheckInSection colors={colors} />}

        {/* 오늘의 마음 알아차림 카드 */}
        <MicroLearningCard colors={colors} />
      </ScrollView>

      {/* 변화 감지 배너 */}
      {bannerVisible && (
        <DetectionBanner
          key={bannerKey.current}
          info={bannerInfoRef.current}
          insetTop={topPad}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  container: { flex: 1 },
  content:   { paddingHorizontal: 20, alignItems: "center", gap: 14 },
  header:    { width: "100%" },

  alertCountBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100, borderWidth: 1,
  },
  alertCountText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  upgradeNudge: {
    width: "100%", borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  upgradeText: { flex: 1 },
  upgradeTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  upgradeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },

  transitionCard: {
    width: "100%", borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "flex-start", gap: 10,
  },
  transitionText: { flex: 1 },
  transitionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  transitionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 17 },

  connectionPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1,
  },
  dot:      { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },

  alertCard: { width: "100%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  alertRow:  { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  alertNote:  { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 17 },
  microRow:  { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8, borderTopWidth: 1 },
  microText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  animWrapper: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },

  circleWrapper: { position: "relative", width: 200, height: 200, alignItems: "center", justifyContent: "center", marginVertical: 8 },
  circlePulse:   { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 2 },
  circleInner:   { width: 160, height: 160, borderRadius: 80, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  hrNumber:      { fontSize: 54, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  hrUnit:        { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: -6 },

  stateBadge:     { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  stateBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2 },

  sentenceText: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 26 },
  detailText:   { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, color: "#6b7280" },

  metricsRow: { flexDirection: "row", gap: 12, width: "100%" },
  metricCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14,
    alignItems: "center", gap: 4,
  },
  metricValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  metricLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metricDesc:  { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },

  connectButton: {
    width: "100%", borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  connectButtonText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  scenarioButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 100, borderWidth: 1,
  },
  scenarioButtonText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  banner: {
    position: "absolute", left: 16, right: 16,
    borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
  },
  bannerTextWrap: { flex: 1 },
  bannerMain:     { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  bannerSub:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 17 },
});

const microStyles = StyleSheet.create({
  card:    { width: "100%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  header:  { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap:{ width: 24, height: 24, borderRadius: 8, backgroundColor: "#22d3ee15", alignItems: "center", justifyContent: "center" },
  tag:     { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  main:    { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  sub:     { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});

const followUpStyles = StyleSheet.create({
  card:       { width: "100%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  header:     { flexDirection: "row", alignItems: "center", gap: 8 },
  title:      { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  question:   { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  optionBtn:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  optionDot:  { width: 8, height: 8, borderRadius: 4 },
  optionLabel:{ fontSize: 13, fontFamily: "Inter_500Medium" },
  resultRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  resultText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

const checkStyles = StyleSheet.create({
  card:       { width: "100%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  header:     { flexDirection: "row", alignItems: "center", gap: 8 },
  title:      { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  savedBadge: { marginLeft: "auto", backgroundColor: "#22d3ee20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  savedText:  { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#22d3ee" },
  chips:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  chipText:   { fontSize: 13, fontFamily: "Inter_500Medium" },
});
