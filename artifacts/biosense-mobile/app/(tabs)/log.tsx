import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { getEvents, updateEventFeedback, StoredEvent, getRankStats } from "@/lib/storage";
import { useI18n } from "@/context/I18nContext";

// ─── 시간대 분류 ──────────────────────────────────────────────────────────────
type TimePeriodKey = "morning" | "afternoon" | "evening" | "night";

function getTimePeriodKey(timestamp: string): TimePeriodKey {
  const h = new Date(timestamp).getHours();
  if (h >= 6  && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}

function getHour(timestamp: string): number {
  return new Date(timestamp).getHours();
}

// ─── 패턴 분석 ────────────────────────────────────────────────────────────────
interface PatternInsight {
  weekCount: number;
  peakPeriodKey: TimePeriodKey | null;
  peakHourRange: string | null;
  dominantType: string | null;
  avgHR: number;
  sentenceKeys: string[];
}

function analyzePatterns(events: StoredEvent[]): PatternInsight {
  const now = Date.now();
  const week = events.filter((e) => now - new Date(e.timestamp).getTime() < 7 * 86400000);
  const weekCount = week.length;

  const periodCount: Record<TimePeriodKey, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  week.forEach((e) => { periodCount[getTimePeriodKey(e.timestamp)] += 1; });
  const peakPeriodKey = weekCount > 0
    ? (Object.entries(periodCount).sort((a, b) => b[1] - a[1])[0][0] as TimePeriodKey)
    : null;

  let peakHourRange: string | null = null;
  if (weekCount >= 2) {
    const hourBuckets: Record<number, number> = {};
    week.forEach((e) => {
      const h = Math.floor(getHour(e.timestamp) / 2) * 2;
      hourBuckets[h] = (hourBuckets[h] ?? 0) + 1;
    });
    const peakH = parseInt(Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0][0]);
    peakHourRange = `${peakH}~${peakH + 2}`;
  }

  const typeCount: Record<string, number> = {};
  week.forEach((e) => { typeCount[e.type] = (typeCount[e.type] ?? 0) + 1; });
  const dominantType = weekCount > 0
    ? Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const avgHR = weekCount > 0
    ? Math.round(week.reduce((s, e) => s + e.heartRate, 0) / weekCount)
    : 0;

  const sentenceKeys: string[] = [];
  if (weekCount === 0) {
    sentenceKeys.push("noEvent1");
    sentenceKeys.push("noEvent2");
  } else {
    if (peakHourRange && peakPeriodKey) {
      sentenceKeys.push("peakMsg");
    }
    if (weekCount >= 3) {
      sentenceKeys.push("week3p");
    } else if (weekCount >= 1) {
      sentenceKeys.push("week1p");
    }
    if (avgHR > 0) {
      sentenceKeys.push(avgHR > 100 ? "hrHigh" : "hrStable");
    }
    if (peakPeriodKey === "afternoon" && (periodCount["afternoon"] ?? 0) >= 2) {
      sentenceKeys.push("afternoon");
    } else if (peakPeriodKey === "night" && (periodCount["night"] ?? 0) >= 2) {
      sentenceKeys.push("night");
    } else if (peakPeriodKey === "morning" && (periodCount["morning"] ?? 0) >= 2) {
      sentenceKeys.push("morning");
    }
  }

  return { weekCount, peakPeriodKey, peakHourRange, dominantType, avgHR, sentenceKeys };
}

// ─── 하루 요약 카드 ───────────────────────────────────────────────────────────
function TodaySummaryCard({ events, colors }: { events: StoredEvent[]; colors: ReturnType<typeof useColors> }) {
  const { t, lang } = useI18n();
  const [todayRecovery, setTodayRecovery] = useState(0);

  useEffect(() => {
    getRankStats().then((s) => {
      const today = new Date().toISOString().slice(0, 10);
      setTodayRecovery(s.todayDate === today ? (s.todayCount ?? 0) : 0);
    });
  }, [events]);

  const today = new Date().toISOString().slice(0, 10);
  const todayAlerts = events.filter((e) => e.timestamp.slice(0, 10) === today);
  const confirmedCount = todayAlerts.filter((e) => e.feedback === "confirmed").length;

  const alertCount = todayAlerts.length;
  const noActivity = alertCount === 0 && todayRecovery === 0;

  const dateStr = new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    month: "long", day: "numeric", weekday: "short",
  });

  return (
    <View style={[todayStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={todayStyles.header}>
        <Feather name="calendar" size={15} color="#22d3ee" />
        <Text style={[todayStyles.title, { color: colors.foreground }]}>{t.todayCard}</Text>
        <Text style={[todayStyles.sub, { color: colors.mutedForeground }]}>{dateStr}</Text>
      </View>

      {noActivity ? (
        <View style={todayStyles.emptyRow}>
          <Feather name="check-circle" size={14} color="#10b981" />
          <Text style={[todayStyles.emptyText, { color: colors.mutedForeground }]}>{t.todayStable}</Text>
        </View>
      ) : (
        <View style={todayStyles.statsRow}>
          <View style={todayStyles.statBox}>
            <Text style={[todayStyles.statNum, { color: alertCount > 0 ? "#f59e0b" : colors.mutedForeground }]}>{alertCount}</Text>
            <Text style={[todayStyles.statLabel, { color: colors.mutedForeground }]}>{t.alertDetect}</Text>
          </View>
          <View style={[todayStyles.divider, { backgroundColor: colors.border }]} />
          <View style={todayStyles.statBox}>
            <Text style={[todayStyles.statNum, { color: todayRecovery > 0 ? "#10b981" : colors.mutedForeground }]}>{todayRecovery}</Text>
            <Text style={[todayStyles.statLabel, { color: colors.mutedForeground }]}>{t.recoveryRoutine}</Text>
          </View>
          <View style={[todayStyles.divider, { backgroundColor: colors.border }]} />
          <View style={todayStyles.statBox}>
            <Text style={[todayStyles.statNum, { color: confirmedCount > 0 ? "#22d3ee" : colors.mutedForeground }]}>{confirmedCount}</Text>
            <Text style={[todayStyles.statLabel, { color: colors.mutedForeground }]}>{t.directCheck}</Text>
          </View>
        </View>
      )}

      {alertCount > 0 && todayRecovery > 0 && (
        <View style={[todayStyles.reflectRow, { backgroundColor: "#10b98110", borderColor: "#10b98130" }]}>
          <Feather name="trending-up" size={12} color="#10b981" />
          <Text style={[todayStyles.reflectText, { color: "#10b981" }]}>
            {t.reflectMsg(alertCount, todayRecovery)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── 인사이트 카드 ────────────────────────────────────────────────────────────
function InsightCard({ events, colors }: { events: StoredEvent[]; colors: ReturnType<typeof useColors> }) {
  const { t, lang } = useI18n();

  const TYPE_LABEL: Record<string, string> = {
    stress:    t.stateStress,
    anxiety:   t.stateAnxiety,
    crisis:    t.stateCrisis,
    obsession: t.stateObsession,
  };

  const PERIOD_LABEL: Record<string, string> = {
    morning:   t.morning,
    afternoon: t.afternoon,
    evening:   t.evening,
    night:     t.night,
  };

  const insight = analyzePatterns(events);
  const hasData = insight.weekCount > 0;

  const now = Date.now();
  const week = events.filter((e) => now - new Date(e.timestamp).getTime() < 7 * 86400000);
  const periodCount: Record<TimePeriodKey, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  week.forEach((e) => { periodCount[getTimePeriodKey(e.timestamp)] += 1; });
  const maxCount = Math.max(1, ...Object.values(periodCount));

  const periods: TimePeriodKey[] = ["morning", "afternoon", "evening", "night"];
  const periodColors: Record<TimePeriodKey, string> = {
    morning: "#f59e0b", afternoon: "#22d3ee", evening: "#a78bfa", night: "#818cf8",
  };

  // sentence 빌드
  const sentences: string[] = [];
  for (const key of insight.sentenceKeys) {
    if (key === "noEvent1") sentences.push(t.insightNoEvent1);
    else if (key === "noEvent2") sentences.push(t.insightNoEvent2);
    else if (key === "peakMsg" && insight.peakPeriodKey && insight.peakHourRange) {
      const periodLabel = PERIOD_LABEL[insight.peakPeriodKey] ?? insight.peakPeriodKey;
      const typeLabel = insight.dominantType ? (TYPE_LABEL[insight.dominantType] ?? insight.dominantType) : "";
      const hourRange = lang === "ko" ? `${insight.peakHourRange}시` : `${insight.peakHourRange}h`;
      sentences.push(t.insightPeakMsg(periodLabel, hourRange, typeLabel));
    }
    else if (key === "week3p") sentences.push(t.insightWeek3p(insight.weekCount));
    else if (key === "week1p") sentences.push(t.insightWeek1p(insight.weekCount));
    else if (key === "hrHigh") sentences.push(t.insightHrHigh);
    else if (key === "hrStable") sentences.push(t.insightHrStable);
    else if (key === "afternoon") sentences.push(t.insightAfternoon);
    else if (key === "night") sentences.push(t.insightNight);
    else if (key === "morning") sentences.push(t.insightMorning);
  }

  return (
    <View style={[insightStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={insightStyles.header}>
        <View style={insightStyles.headerLeft}>
          <Feather name="bar-chart-2" size={16} color="#22d3ee" />
          <Text style={[insightStyles.title, { color: colors.foreground }]}>{t.patternTitle}</Text>
        </View>
        <Text style={[insightStyles.sub, { color: colors.mutedForeground }]}>{t.last7days}</Text>
      </View>

      <View style={insightStyles.chartRow}>
        {periods.map((p) => {
          const count = periodCount[p];
          const ratio = count / maxCount;
          const color = periodColors[p];
          return (
            <View key={p} style={insightStyles.barCol}>
              <Text style={[insightStyles.barCount, { color: count > 0 ? color : colors.mutedForeground }]}>
                {count > 0 ? count : ""}
              </Text>
              <View style={insightStyles.barTrack}>
                <View style={[insightStyles.barFill, { height: `${Math.max(ratio * 100, count > 0 ? 12 : 0)}%`, backgroundColor: color + (count > 0 ? "cc" : "30") }]} />
              </View>
              <Text style={[insightStyles.barLabel, { color: colors.mutedForeground }]}>{PERIOD_LABEL[p]}</Text>
            </View>
          );
        })}
      </View>

      <View style={[insightStyles.sentenceBox, { backgroundColor: hasData ? "#22d3ee10" : colors.muted, borderColor: hasData ? "#22d3ee30" : colors.border }]}>
        {sentences.map((s, i) => (
          <View key={i} style={insightStyles.sentenceRow}>
            <Feather name={i === 0 ? "zap" : "circle"} size={i === 0 ? 13 : 5} color={hasData ? "#22d3ee" : colors.mutedForeground} />
            <Text style={[insightStyles.sentence, { color: i === 0 ? colors.foreground : colors.mutedForeground, fontFamily: i === 0 ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
              {s}
            </Text>
          </View>
        ))}
      </View>

      {hasData && (
        <View style={insightStyles.statsRow}>
          <View style={insightStyles.statItem}>
            <Text style={[insightStyles.statValue, { color: colors.foreground }]}>{insight.weekCount}</Text>
            <Text style={[insightStyles.statLabel, { color: colors.mutedForeground }]}>{t.thisWeekDetect}</Text>
          </View>
          {insight.avgHR > 0 && (
            <View style={insightStyles.statItem}>
              <Text style={[insightStyles.statValue, { color: colors.foreground }]}>{insight.avgHR}</Text>
              <Text style={[insightStyles.statLabel, { color: colors.mutedForeground }]}>{t.avgHR}</Text>
            </View>
          )}
          {insight.dominantType && (
            <View style={insightStyles.statItem}>
              <Text style={[insightStyles.statValue, { color: "#f59e0b" }]}>
                {TYPE_LABEL[insight.dominantType] ?? insight.dominantType}
              </Text>
              <Text style={[insightStyles.statLabel, { color: colors.mutedForeground }]}>{t.mainPattern}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── 이벤트 카드 ──────────────────────────────────────────────────────────────
function formatRelative(ts: string, lang: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === "en") {
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
  if (mins < 1)  return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function getEventColor(type: string): { text: string; bg: string } {
  const map: Record<string, { text: string; bg: string }> = {
    crisis:    { text: "#ef4444", bg: "#ef444418" },
    anxiety:   { text: "#f97316", bg: "#f9731618" },
    obsession: { text: "#d946ef", bg: "#d946ef18" },
  };
  return map[type] ?? { text: "#f59e0b", bg: "#f59e0b18" };
}

function EventCard({ event, onFeedback }: { event: StoredEvent; onFeedback: (id: string, f: "confirmed" | "false_alarm") => void }) {
  const colors = useColors();
  const { t, lang } = useI18n();

  const TYPE_LABEL: Record<string, string> = {
    stress: t.stateStress, anxiety: t.stateAnxiety, crisis: t.stateCrisis, obsession: t.stateObsession,
  };
  const NOTE_LABEL: Record<string, string> = {
    stress:    t.sentenceStress,
    anxiety:   t.sentenceAnxiety,
    crisis:    t.sentenceCrisis,
    obsession: t.sentenceObsession,
  };
  const PERIOD_LABEL: Record<string, string> = {
    morning: t.morning, afternoon: t.afternoon, evening: t.evening, night: t.night,
  };

  const color  = getEventColor(event.type);
  const periodKey = getTimePeriodKey(event.timestamp);
  const period = PERIOD_LABEL[periodKey];
  const label  = TYPE_LABEL[event.type] ?? t.stateStress;
  const note   = NOTE_LABEL[event.type] ?? event.note;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeBadge, { backgroundColor: color.bg, borderColor: color.text + "40" }]}>
            <Text style={[styles.typeBadgeText, { color: color.text }]}>{label.toUpperCase()}</Text>
          </View>
          <View style={[styles.periodBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.periodBadgeText, { color: colors.mutedForeground }]}>{period}</Text>
          </View>
        </View>
        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatRelative(event.timestamp, lang)}</Text>
      </View>

      <Text style={[styles.humanNote, { color: colors.foreground }]}>{note}</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Feather name="heart" size={11} color="#ef4444" />
          <Text style={[styles.metricText, { color: colors.mutedForeground }]}>{event.heartRate} bpm</Text>
        </View>
        <View style={styles.metricItem}>
          <Feather name="activity" size={11} color="#60a5fa" />
          <Text style={[styles.metricText, { color: colors.mutedForeground }]}>{t.eventHrv} {event.hrv}</Text>
        </View>
      </View>

      {event.feedback ? (
        <View style={[styles.feedbackDone, { backgroundColor: colors.muted }]}>
          <Text style={[styles.feedbackDoneText, { color: colors.mutedForeground }]}>
            {event.feedback === "confirmed" ? t.feedbackDoneYes : t.feedbackDoneNo}
          </Text>
        </View>
      ) : (
        <View style={styles.feedbackRow}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onFeedback(event.id, "confirmed");
            }}
            style={[styles.feedbackBtn, { backgroundColor: "#10b98115", borderColor: "#10b98140" }]}
          >
            <Text style={[styles.feedbackBtnText, { color: "#10b981" }]}>{t.feedbackConfirm}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onFeedback(event.id, "false_alarm");
            }}
            style={[styles.feedbackBtn, { backgroundColor: "#ef444415", borderColor: "#ef444440" }]}
          >
            <Text style={[styles.feedbackBtnText, { color: "#ef4444" }]}>{t.feedbackDeny}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────
export default function LogScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { t } = useI18n();
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const data = await getEvents();
    setEvents(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleFeedback = async (id: string, feedback: "confirmed" | "false_alarm") => {
    await updateEventFeedback(id, feedback);
    await load();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.logTitle}</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {events.length > 0 ? t.logCount(events.length) : t.logEmpty}
        </Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 80 }]}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <TodaySummaryCard events={events} colors={colors} />
            <InsightCard events={events} colors={colors} />
          </View>
        }
        renderItem={({ item }) => <EventCard event={item} onFeedback={handleFeedback} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.emptyTitle}</Text>
            <Text style={[styles.emptyNote, { color: colors.mutedForeground }]}>
              {t.emptyNote}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const todayStyles = StyleSheet.create({
  card:        { marginHorizontal: 16, marginTop: 8, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  header:      { flexDirection: "row", alignItems: "center", gap: 8 },
  title:       { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  sub:         { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  emptyText:   { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  statsRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statBox:     { alignItems: "center", gap: 2, flex: 1 },
  statNum:     { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel:   { fontSize: 11, fontFamily: "Inter_500Medium" },
  divider:     { width: 1, height: 36 },
  reflectRow:  { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, padding: 10 },
  reflectText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 18 },
});

const insightStyles = StyleSheet.create({
  card:        { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  title:       { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub:         { fontSize: 12, fontFamily: "Inter_400Regular" },
  chartRow:    { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  barCol:      { flex: 1, alignItems: "center", gap: 4 },
  barCount:    { fontSize: 11, fontFamily: "Inter_700Bold", height: 14 },
  barTrack:    { width: "100%", height: 60, backgroundColor: "#1f2937", borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill:     { width: "100%", borderRadius: 4 },
  barLabel:    { fontSize: 10, fontFamily: "Inter_500Medium" },
  sentenceBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  sentenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  sentence:    { flex: 1, fontSize: 13, lineHeight: 19 },
  statsRow:    { flexDirection: "row", justifyContent: "space-around" },
  statItem:    { alignItems: "center", gap: 2 },
  statValue:   { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel:   { fontSize: 10, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  container:   { flex: 1 },
  headerBar:   { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  list:        { paddingTop: 8, gap: 10 },
  card:          { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderLeft:{ flexDirection: "row", alignItems: "center", gap: 6 },
  typeBadge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  periodBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  periodBadgeText:{ fontSize: 10, fontFamily: "Inter_500Medium" },
  timeText:      { fontSize: 12, fontFamily: "Inter_400Regular" },
  humanNote:   { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  metricsRow:  { flexDirection: "row", gap: 14 },
  metricItem:  { flexDirection: "row", alignItems: "center", gap: 4 },
  metricText:  { fontSize: 12, fontFamily: "Inter_400Regular" },
  feedbackRow:     { flexDirection: "row", gap: 8 },
  feedbackBtn:     { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  feedbackBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  feedbackDone:    { alignItems: "center", paddingVertical: 6, borderRadius: 8 },
  feedbackDoneText:{ fontSize: 12, fontFamily: "Inter_500Medium" },
  empty:      { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyNote:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 250 },
});
