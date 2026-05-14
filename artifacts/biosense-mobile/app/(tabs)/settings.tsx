import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBLE, ScenarioType } from "@/context/BLEContext";
import { saveThresholds, getThresholds, clearEvents, Thresholds } from "@/lib/storage";
import { requestNotificationPermission } from "@/lib/notifications";
import { useI18n } from "@/context/I18nContext";

function ThresholdRow({
  label,
  value,
  min,
  max,
  unit,
  color,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.thresholdRow, { borderBottomColor: colors.border }]}>
      <View style={styles.thresholdInfo}>
        <Text style={[styles.thresholdLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.thresholdValue, { color }]}>
          {value} {unit}
        </Text>
      </View>
      <View style={styles.thresholdControls}>
        <Pressable
          onPress={onDecrease}
          disabled={value <= min}
          style={[styles.stepBtn, { backgroundColor: colors.muted, opacity: value <= min ? 0.4 : 1 }]}
        >
          <Feather name="minus" size={14} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={onIncrease}
          disabled={value >= max}
          style={[styles.stepBtn, { backgroundColor: colors.muted, opacity: value >= max ? 0.4 : 1 }]}
        >
          <Feather name="plus" size={14} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const { scenario, setScenario, isDemoMode, reloadThresholds, isPaid, alertsToday, alertDailyLimit, downgradeToFree } = useBLE();
  const [thresholds, setThresholdsState] = useState<Thresholds>({
    hrStressThreshold: 95,
    hrCrisisThreshold: 130,
    hrvStressThreshold: 25,
    motionExerciseThreshold: 40,
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const SCENARIOS: { id: ScenarioType; label: string; desc: string; color: string }[] = [
    { id: "calm",          label: t.scCalm,        desc: t.scCalmDesc,        color: "#22d3ee" },
    { id: "stress",        label: t.scStress,       desc: t.scStressDesc,      color: "#f59e0b" },
    { id: "exercise",      label: t.scExercise,     desc: t.scExerciseDesc,    color: "#f97316" },
    { id: "anxiety_spike", label: t.scAnxiety,      desc: t.scAnxietyDesc,     color: "#f97316" },
    { id: "panic_attack",  label: t.scPanic,        desc: t.scPanicDesc,       color: "#ef4444" },
    { id: "fatigue",       label: t.scFatigue,      desc: t.scFatigueDesc,     color: "#60a5fa" },
    { id: "sleep",         label: t.scSleep,        desc: t.scSleepDesc,       color: "#818cf8" },
    { id: "meeting",       label: t.scMeeting,      desc: t.scMeetingDesc,     color: "#a78bfa" },
  ];

  useEffect(() => {
    getThresholds().then(setThresholdsState);
  }, []);

  const update = useCallback(
    async (key: keyof Thresholds, delta: number) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = { ...thresholds, [key]: thresholds[key] + delta };
      setThresholdsState(next);
      await saveThresholds(next);
      await reloadThresholds();
    },
    [thresholds, reloadThresholds]
  );

  const handleNotificationToggle = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleClearHistory = () => {
    if (Platform.OS === "web") {
      clearEvents();
      return;
    }
    Alert.alert(t.clearConfirmTitle, t.clearConfirmMsg, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          await clearEvents();
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.settingsTitle}</Text>
      </View>

      {/* ─── 멤버십 섹션 ─────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Feather name="star" size={14} color={colors.mutedForeground} />
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.membership}</Text>
        </View>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t.currentTier}</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
              {t.alertUsage(alertsToday, alertDailyLimit)}
            </Text>
          </View>
          <View style={[memberStyles.badge, {
            backgroundColor: isPaid ? "#22d3ee20" : colors.muted,
            borderColor:     isPaid ? "#22d3ee60" : colors.border,
          }]}>
            <Text style={[memberStyles.badgeText, { color: isPaid ? "#22d3ee" : colors.mutedForeground }]}>
              {isPaid ? t.paidBadge : t.freeBadge}
            </Text>
          </View>
        </View>
        {!isPaid ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/payment" as any);
            }}
            style={[memberStyles.upgradeBtn, { borderBottomColor: colors.border }]}
          >
            <Feather name="arrow-up-circle" size={18} color="#22d3ee" />
            <View style={{ flex: 1 }}>
              <Text style={memberStyles.upgradeBtnText}>{t.upgradeBtn}</Text>
              <Text style={[memberStyles.upgradeBtnDesc, { color: colors.mutedForeground }]}>
                {t.upgradeDesc}
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color="#22d3ee" />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              downgradeToFree();
            }}
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>{t.downgradeBtn}</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* ─── 언어 설정 ────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Feather name="globe" size={14} color={colors.mutedForeground} />
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.language}</Text>
        </View>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setLang("ko")}
            style={[langStyles.btn, {
              backgroundColor: lang === "ko" ? "#22d3ee20" : colors.muted,
              borderColor:     lang === "ko" ? "#22d3ee80" : colors.border,
            }]}
          >
            <Text style={[langStyles.btnText, { color: lang === "ko" ? "#22d3ee" : colors.mutedForeground }]}>
              KR {t.langKo}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLang("en")}
            style={[langStyles.btn, {
              backgroundColor: lang === "en" ? "#22d3ee20" : colors.muted,
              borderColor:     lang === "en" ? "#22d3ee80" : colors.border,
            }]}
          >
            <Text style={[langStyles.btnText, { color: lang === "en" ? "#22d3ee" : colors.mutedForeground }]}>
              EN {t.langEn}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── 알림 섹션 ────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Feather name="bell" size={14} color={colors.mutedForeground} />
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.notifications}</Text>
        </View>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t.allowNotif}</Text>
            <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
              {t.notifDesc}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.muted, true: colors.primary + "80" }}
            thumbColor={notificationsEnabled ? colors.primary : colors.mutedForeground}
          />
        </View>
      </View>

      {/* ─── 임계치 섹션 ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Feather name="sliders" size={14} color={colors.mutedForeground} />
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.thresholds}</Text>
        </View>
        <ThresholdRow
          label={t.stressHR}
          value={thresholds.hrStressThreshold}
          min={70} max={140} unit="bpm" color="#f59e0b"
          onDecrease={() => update("hrStressThreshold", -1)}
          onIncrease={() => update("hrStressThreshold", 1)}
        />
        <ThresholdRow
          label={t.crisisHR}
          value={thresholds.hrCrisisThreshold}
          min={100} max={180} unit="bpm" color="#ef4444"
          onDecrease={() => update("hrCrisisThreshold", -1)}
          onIncrease={() => update("hrCrisisThreshold", 1)}
        />
        <ThresholdRow
          label={t.stressHRV}
          value={thresholds.hrvStressThreshold}
          min={10} max={60} unit="ms" color="#60a5fa"
          onDecrease={() => update("hrvStressThreshold", -1)}
          onIncrease={() => update("hrvStressThreshold", 1)}
        />
        <ThresholdRow
          label={t.motionLevel}
          value={thresholds.motionExerciseThreshold}
          min={15} max={80} unit="" color="#f97316"
          onDecrease={() => update("motionExerciseThreshold", -1)}
          onIncrease={() => update("motionExerciseThreshold", 1)}
        />
      </View>

      {/* ─── 시나리오 섹션 ────────────────────────────────── */}
      {isDemoMode && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <Feather name="cpu" size={14} color={colors.mutedForeground} />
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.scenarioSection}</Text>
          </View>
          {SCENARIOS.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setScenario(s.id);
              }}
              style={[
                styles.scenarioRow,
                {
                  backgroundColor: scenario === s.id ? s.color + "18" : "transparent",
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.scenarioDot,
                  { backgroundColor: scenario === s.id ? s.color : colors.muted },
                ]}
              />
              <View style={styles.scenarioText}>
                <Text style={[styles.scenarioLabel, { color: scenario === s.id ? s.color : colors.foreground }]}>
                  {s.label}
                </Text>
                <Text style={[styles.scenarioDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
              </View>
              {scenario === s.id && <Feather name="check" size={14} color={s.color} />}
            </Pressable>
          ))}
        </View>
      )}

      {/* ─── 데이터 섹션 ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Feather name="database" size={14} color={colors.mutedForeground} />
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.dataSection}</Text>
        </View>
        <Pressable
          onPress={handleClearHistory}
          style={[styles.dangerRow, { borderBottomColor: colors.border }]}
        >
          <Feather name="trash-2" size={16} color="#ef4444" />
          <Text style={[styles.dangerText, { color: "#ef4444" }]}>{t.clearHistory}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thresholdInfo: { gap: 2 },
  thresholdLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  thresholdValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  thresholdControls: { flexDirection: "row", gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  scenarioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scenarioDot: { width: 8, height: 8, borderRadius: 4 },
  scenarioText: { flex: 1 },
  scenarioLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  scenarioDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dangerText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

const memberStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 100, borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  upgradeBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#22d3ee0c",
  },
  upgradeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#22d3ee" },
  upgradeBtnDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
});

const langStyles = StyleSheet.create({
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
