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
import { OrbitDotImage } from "@/components/OrbitDotImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { getRankStats, recordRecoverySession, RankStats, DAILY_SESSION_LIMIT } from "@/lib/storage";
import {
  getCurrentRank,
  getNextRank,
  getProgressToNext,
  getPromotionStatus,
  RANKS,
  RankLevel,
  TIME_GRADES,
  calcSessionScore,
} from "@/lib/ranking";
import { useI18n } from "@/context/I18nContext";

const RANK_ICON_SOURCES: Record<RankLevel, ReturnType<typeof require>> = {
  "초급":    require("@/assets/images/rank-icons/rank-00-beginner.png"),
  "9급":     require("@/assets/images/rank-icons/rank-01-9gup.png"),
  "8급":     require("@/assets/images/rank-icons/rank-02-8gup.png"),
  "7급":     require("@/assets/images/rank-icons/rank-03-7gup.png"),
  "6급":     require("@/assets/images/rank-icons/rank-04-6gup.png"),
  "5급":     require("@/assets/images/rank-icons/rank-05-5gup.png"),
  "4급":     require("@/assets/images/rank-icons/rank-06-4gup.png"),
  "3급":     require("@/assets/images/rank-icons/rank-07-3gup.png"),
  "2급":     require("@/assets/images/rank-icons/rank-08-2gup.png"),
  "1급":     require("@/assets/images/rank-icons/rank-09-1gup.png"),
  "매니저급": require("@/assets/images/rank-icons/rank-10-manager.png"),
  "마스터급": require("@/assets/images/rank-icons/rank-11-master.png"),
};

const RANK_DOT_COLORS: Record<RankLevel, string> = {
  "초급":    "#ffffff",
  "9급":     "#94a3b8",
  "8급":     "#60a5fa",
  "7급":     "#34d399",
  "6급":     "#a78bfa",
  "5급":     "#f59e0b",
  "4급":     "#fb923c",
  "3급":     "#f87171",
  "2급":     "#e879f9",
  "1급":     "#22d3ee",
  "매니저급": "#fbbf24",
  "마스터급": "#f0abfc",
};

function RankCircleIcon({ level, size = 96 }: { level: RankLevel; size?: number }) {
  return (
    <OrbitDotImage
      source={RANK_ICON_SOURCES[level]}
      size={size}
      circleRatio={0.385}
      dotColor={RANK_DOT_COLORS[level]}
      speed={3200}
    />
  );
}

export default function RankScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const [stats, setStats] = useState<RankStats>({
    totalSessions: 0,
    successSessions: 0,
    currentStreak: 0,
    totalScore: 0,
    lastSessionDate: null,
    todayCount: 0,
    todayDate: null,
  });
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showAll, setShowAll] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean; score: number; grade: string; color: string; limitReached?: boolean;
  } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const s = await getRankStats();
    setStats(s);
    const sr = s.totalSessions > 0 ? s.successSessions / s.totalSessions : 1;
    const progress = getProgressToNext(s.successSessions, sr);
    Animated.timing(progressAnim, { toValue: progress, duration: 800, useNativeDriver: false }).start();
  }, [progressAnim]);

  useEffect(() => { load(); }, [load]);

  const handleRecord = async (success: boolean, timeSeconds = 0) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const result = await recordRecoverySession(success, timeSeconds);
    if (result.limitReached) {
      setLastResult({ success: false, score: 0, grade: "", color: "#f59e0b", limitReached: true });
    } else {
      const tg = TIME_GRADES.find((g) => timeSeconds <= g.maxSeconds) ?? TIME_GRADES[TIME_GRADES.length - 1];
      setLastResult({ success, score: result.score, grade: tg.label, color: tg.color });
    }
    await load();
    if (Platform.OS !== "web" && !result.limitReached) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = stats.todayDate === today ? (stats.todayCount ?? 0) : 0;
  const dailyLimitReached = todayCount >= DAILY_SESSION_LIMIT;

  const successRate = stats.totalSessions > 0 ? stats.successSessions / stats.totalSessions : 1;
  const current = getCurrentRank(stats.successSessions, successRate);
  const next = getNextRank(stats.successSessions, successRate);
  const remaining = next ? Math.max(0, next.minSessions - stats.successSessions) : 0;
  const promoStatus = next ? getPromotionStatus(next, stats.successSessions, successRate) : null;

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const SCORE_TIME_LABEL = (maxSec: number) => {
    if (maxSec === 120)  return lang === "ko" ? "2분 이내"  : "Under 2 min";
    if (maxSec === 300)  return lang === "ko" ? "2~5분"     : "2–5 min";
    if (maxSec === 600)  return lang === "ko" ? "5~10분"    : "5–10 min";
    return lang === "ko" ? "10분 초과" : "Over 10 min";
  };

  const STAT_ITEMS = [
    { label: t.totalScore,  value: (stats.totalScore ?? 0).toLocaleString(), icon: "star"        as const, color: "#f59e0b" },
    { label: t.successCount,value: `${stats.successSessions}${t.sessions}`,  icon: "check-circle" as const, color: "#10b981" },
    { label: t.successRate, value: `${Math.round(successRate * 100)}%`,       icon: "trending-up" as const, color: "#22d3ee" },
    { label: t.streakDays,  value: `${stats.currentStreak}${lang === "ko" ? "일" : "d"}`, icon: "zap" as const, color: "#d946ef" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.rankTitle}</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{t.rankSub}</Text>
      </View>

      {/* 오늘 기록 현황 */}
      <View style={[styles.dailyBar, { backgroundColor: colors.card, borderColor: dailyLimitReached ? "#f59e0b50" : colors.border }]}>
        <Feather name="calendar" size={14} color={dailyLimitReached ? "#f59e0b" : colors.mutedForeground} />
        <Text style={[styles.dailyText, { color: dailyLimitReached ? "#f59e0b" : colors.mutedForeground }]}>
          {t.todayRecord}
        </Text>
        <View style={styles.dailyDots}>
          {Array.from({ length: DAILY_SESSION_LIMIT }).map((_, i) => (
            <View key={i} style={[styles.dailyDot, { backgroundColor: i < todayCount ? current.color : colors.muted }]} />
          ))}
        </View>
        <Text style={[styles.dailyCount, { color: dailyLimitReached ? "#f59e0b" : colors.foreground }]}>
          {todayCount}/{DAILY_SESSION_LIMIT}
        </Text>
        {dailyLimitReached && (
          <Text style={[styles.dailyDone, { color: "#f59e0b" }]}>{t.todayDone}</Text>
        )}
      </View>

      {/* 급수 카드 */}
      <View style={[styles.rankCard, { backgroundColor: colors.card, borderColor: current.color + "55" }]}>
        <View style={styles.rankTop}>
          <RankCircleIcon level={current.level} size={88} />
          <View style={styles.rankInfo}>
            <View style={styles.rankBadgeRow}>
              <View style={[styles.rankBadge, { backgroundColor: current.color + "20", borderColor: current.color + "50" }]}>
                <Text style={[styles.rankBadgeText, { color: current.color }]}>
                  {lang === "ko" ? current.level : current.levelEn}
                </Text>
              </View>
            </View>
            <Text style={[styles.rankLabel, { color: colors.foreground }]}>
              {lang === "ko" ? current.label : current.labelEn}
            </Text>
            <Text style={[styles.rankDesc, { color: colors.mutedForeground }]}>
              {lang === "ko" ? current.description : current.descriptionEn}
            </Text>
          </View>
        </View>

        {next ? (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                {t.rankNext(
                  lang === "ko" ? next.level : next.levelEn,
                  lang === "ko" ? next.label : next.labelEn,
                )}
              </Text>
              <Text style={[styles.progressCount, { color: current.color }]}>
                {t.rankRemain(remaining)}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: current.color }]} />
            </View>
            {next.minSuccessRate !== undefined && (
              <View style={styles.conditionRow}>
                <Feather
                  name={promoStatus?.rateMet ? "check-circle" : "alert-circle"}
                  size={13}
                  color={promoStatus?.rateMet ? "#10b981" : "#f59e0b"}
                />
                <Text style={[styles.conditionText, { color: promoStatus?.rateMet ? "#10b981" : "#f59e0b" }]}>
                  {t.rankCondition(lang === "ko" ? next.level : next.levelEn, Math.round(next.minSuccessRate * 100))}
                  {"  "}
                  <Text style={{ fontFamily: "Inter_700Bold" }}>
                    ({lang === "ko" ? "현재 " : "now "}{Math.round(successRate * 100)}%)
                  </Text>
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.masterBadge, { backgroundColor: current.color + "20" }]}>
            <Feather name="award" size={14} color={current.color} />
            <Text style={[styles.masterBadgeText, { color: current.color }]}>{t.noNextRank}</Text>
          </View>
        )}

        <View style={[styles.privilegeRow, { borderTopColor: colors.border }]}>
          <Feather name="unlock" size={13} color={current.color} />
          <Text style={[styles.privilegeText, { color: colors.mutedForeground }]}>
            {lang === "ko" ? current.privilege : current.privilegeEn}
          </Text>
        </View>
      </View>

      {/* 통계 4칸 */}
      <View style={styles.statsRow}>
        {STAT_ITEMS.map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={s.icon} size={15} color={s.color} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* 점수 계산 방식 */}
      <View style={[styles.scoreGuide, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.scoreGuideTitle, { color: colors.foreground }]}>{t.howToScore}</Text>
        <View style={styles.scoreRows}>
          {TIME_GRADES.map((g) => {
            const totalForSuccess = 15 + g.bonus;
            return (
              <View key={g.label} style={styles.scoreRow}>
                <View style={[styles.gradeTag, { backgroundColor: g.color + "20", borderColor: g.color + "50" }]}>
                  <Text style={[styles.gradeTagText, { color: g.color }]}>{g.label}</Text>
                </View>
                <Text style={[styles.scoreTimeText, { color: colors.mutedForeground }]}>{SCORE_TIME_LABEL(g.maxSeconds)}</Text>
                <View style={styles.scorePoints}>
                  <Text style={[styles.scorePointsSuccess, { color: "#10b981" }]}>
                    {lang === "ko" ? "성공" : "OK"} +{totalForSuccess}
                  </Text>
                  <Text style={[styles.scorePointsFail, { color: colors.mutedForeground }]}>
                    {lang === "ko" ? "미완료" : "fail"} +2
                  </Text>
                </View>
              </View>
            );
          })}
          <View style={[styles.scoreRow, { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 4, paddingTop: 8 }]}>
            <Feather name="zap" size={12} color="#d946ef" />
            <Text style={[styles.scoreTimeText, { color: colors.mutedForeground, flex: 1 }]}>{t.streakBonus}</Text>
            <Text style={[styles.scorePointsSuccess, { color: "#d946ef" }]}>
              {lang === "ko" ? "3일 +20 · 7일 +50" : "3d +20 · 7d +50"}
            </Text>
          </View>
          <View style={[styles.scoreRow, { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 4, paddingTop: 8 }]}>
            <Feather name="calendar" size={12} color="#f59e0b" />
            <Text style={[styles.scoreTimeText, { color: colors.mutedForeground, flex: 1 }]}>{t.dailyLimit}</Text>
            <Text style={[styles.scorePointsSuccess, { color: "#f59e0b" }]}>{DAILY_SESSION_LIMIT}</Text>
          </View>
        </View>
      </View>

      {/* 마지막 세션 결과 */}
      {lastResult && (
        <View style={[
          styles.lastResult,
          {
            backgroundColor: lastResult.limitReached ? "#f59e0b12" : lastResult.success ? "#10b98112" : "#ef444412",
            borderColor: lastResult.limitReached ? "#f59e0b40" : lastResult.success ? "#10b98140" : "#ef444440",
          },
        ]}>
          <Feather
            name={lastResult.limitReached ? "calendar" : lastResult.success ? "check-circle" : "x-circle"}
            size={16}
            color={lastResult.limitReached ? "#f59e0b" : lastResult.success ? "#10b981" : "#ef4444"}
          />
          <Text style={[styles.lastResultText, {
            color: lastResult.limitReached ? "#f59e0b" : lastResult.success ? "#10b981" : "#ef4444",
          }]}>
            {lastResult.limitReached
              ? t.limitReachedMsg
              : lastResult.success
                ? t.scoreResult(lastResult.score, lastResult.grade)
                : t.scoreResultFail(2)}
          </Text>
        </View>
      )}

      {/* 수동 기록 버튼 */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.manualRecord}</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{t.manualSub}</Text>
      </View>
      <View style={styles.recordRow}>
        <Pressable
          onPress={() => handleRecord(true, 90)}
          disabled={dailyLimitReached}
          style={({ pressed }) => [
            styles.recordBtn,
            { backgroundColor: "#10b98115", borderColor: "#10b98150", opacity: dailyLimitReached ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="check" size={16} color="#10b981" />
          <Text style={[styles.recordBtnText, { color: "#10b981" }]}>{t.recoverSuccess}</Text>
        </Pressable>
        <Pressable
          onPress={() => handleRecord(false)}
          disabled={dailyLimitReached}
          style={({ pressed }) => [
            styles.recordBtn,
            { backgroundColor: "#ef444415", borderColor: "#ef444450", opacity: dailyLimitReached ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="x" size={16} color="#ef4444" />
          <Text style={[styles.recordBtnText, { color: "#ef4444" }]}>{t.recoverFail}</Text>
        </Pressable>
      </View>

      {/* 전체 급수표 */}
      <Pressable
        onPress={() => setShowAll((v) => !v)}
        style={[styles.allRankHeader, { borderColor: colors.border }]}
      >
        <Text style={[styles.allRankTitle, { color: colors.foreground }]}>{t.allRankTable}</Text>
        <Feather name={showAll ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>

      {showAll && (
        <View style={[styles.rankTable, { borderColor: colors.border }]}>
          {RANKS.map((r, i) => {
            const isCurrent = r.level === current.level;
            const isAchieved = stats.successSessions >= r.minSessions &&
              (r.minSuccessRate === undefined || successRate >= r.minSuccessRate);
            const rateLocked = stats.successSessions >= r.minSessions &&
              r.minSuccessRate !== undefined && successRate < r.minSuccessRate;
            return (
              <View
                key={r.level}
                style={[
                  styles.rankRow,
                  i < RANKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
                  isCurrent && { backgroundColor: r.color + "10" },
                ]}
              >
                <View style={[styles.rankRowColorDot, { backgroundColor: isAchieved ? r.color : rateLocked ? "#f59e0b" : colors.border }]} />
                <View style={styles.rankRowInfo}>
                  <Text style={[styles.rankRowLevel, { color: isAchieved ? r.color : rateLocked ? "#f59e0b" : colors.mutedForeground }]}>
                    {lang === "ko" ? r.level : r.levelEn}{rateLocked && " 🔒"}
                  </Text>
                  <Text style={[styles.rankRowLabel, { color: isAchieved ? colors.foreground : colors.mutedForeground }]}>
                    {lang === "ko" ? r.label : r.labelEn}
                    {r.minSuccessRate !== undefined && ` · ${t.successMin} ${Math.round(r.minSuccessRate * 100)}%+`}
                  </Text>
                </View>
                <View style={styles.rankRowRight}>
                  <Text style={[styles.rankRowMin, { color: colors.mutedForeground }]}>
                    {r.minSessions > 0 ? `${r.minSessions}${t.sessions}~` : (lang === "ko" ? "시작" : "start")}
                  </Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: r.color + "25" }]}>
                      <Text style={[styles.currentBadgeText, { color: r.color }]}>{lang === "ko" ? "현재" : "now"}</Text>
                    </View>
                  )}
                  {isAchieved && !isCurrent && <Feather name="check" size={12} color={r.color} />}
                  {rateLocked && <Feather name="lock" size={12} color="#f59e0b" />}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  dailyBar: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8,
  },
  dailyText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dailyDots: { flexDirection: "row", gap: 5, flex: 1 },
  dailyDot: { width: 10, height: 10, borderRadius: 5 },
  dailyCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  dailyDone: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rankCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1.5, padding: 18, gap: 14, marginBottom: 12 },
  rankTop: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  rankBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  rankBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  rankBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  rankInfo: { flex: 1 },
  rankLabel: { fontSize: 19, fontFamily: "Inter_700Bold", marginBottom: 3 },
  rankDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  progressSection: { gap: 7 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  conditionRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 2 },
  conditionText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
  masterBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: "flex-start" },
  masterBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  privilegeRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 12 },
  privilegeText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 4 },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  scoreGuide: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  scoreGuideTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  scoreRows: { gap: 7 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gradeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, borderWidth: 1, minWidth: 44, alignItems: "center" },
  gradeTagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  scoreTimeText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  scorePoints: { flexDirection: "row", gap: 8 },
  scorePointsSuccess: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scorePointsFail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  lastResult: { marginHorizontal: 16, borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  lastResultText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  recordRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  recordBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  recordBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  allRankHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  allRankTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rankTable: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  rankRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  rankRowColorDot: { width: 8, height: 8, borderRadius: 4 },
  rankRowInfo: { flex: 1 },
  rankRowLevel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  rankRowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rankRowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rankRowMin: { fontSize: 10, fontFamily: "Inter_400Regular" },
  currentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  currentBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
});
