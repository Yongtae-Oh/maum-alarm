import AsyncStorage from "@react-native-async-storage/async-storage";

const EVENTS_KEY = "biosense_events";
const THRESHOLDS_KEY = "biosense_thresholds";
const LAST_ALERT_KEY = "biosense_last_alert";
const RANK_STATS_KEY = "biosense_rank_stats";
const CHECKINS_KEY = "biosense_checkins";
const MEMBERSHIP_KEY = "biosense_membership";
const DAILY_ALERT_KEY = "biosense_daily_alert";

export const DAILY_SESSION_LIMIT = 3;

// ─── 멤버십 ───────────────────────────────────────────────────────────────────
export type MembershipTier = "free" | "paid";

export const DAILY_ALERT_LIMIT_FREE = 2;
export const DAILY_ALERT_LIMIT_PAID = 5;

export async function getMembership(): Promise<MembershipTier> {
  const raw = await AsyncStorage.getItem(MEMBERSHIP_KEY);
  return raw === "paid" ? "paid" : "free";
}

export async function setMembership(tier: MembershipTier): Promise<void> {
  await AsyncStorage.setItem(MEMBERSHIP_KEY, tier);
}

// ─── 일일 알림 카운트 ─────────────────────────────────────────────────────────
interface DailyAlertRecord {
  count: number;
  date: string;
}

export async function getTodayAlertCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(DAILY_ALERT_KEY);
  if (!raw) return 0;
  try {
    const rec = JSON.parse(raw) as DailyAlertRecord;
    const today = new Date().toISOString().slice(0, 10);
    return rec.date === today ? rec.count : 0;
  } catch {
    return 0;
  }
}

export async function incrementTodayAlert(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await getTodayAlertCount();
  const next = current + 1;
  await AsyncStorage.setItem(DAILY_ALERT_KEY, JSON.stringify({ count: next, date: today }));
  return next;
}

export type FollowUpOutcome = "recovered" | "partial" | "incomplete" | "monitoring";

export interface StoredEvent {
  id: string;
  timestamp: string;
  type: "stress" | "anxiety" | "crisis";
  severity: "medium" | "high" | "critical";
  heartRate: number;
  hrv: number;
  note: string;
  feedback: "confirmed" | "false_alarm" | FollowUpOutcome | null;
}

export interface Thresholds {
  hrStressThreshold: number;
  hrCrisisThreshold: number;
  hrvStressThreshold: number;
  motionExerciseThreshold: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  hrStressThreshold: 95,
  hrCrisisThreshold: 130,
  hrvStressThreshold: 25,
  motionExerciseThreshold: 40,
};

export async function saveEvent(event: StoredEvent): Promise<void> {
  const existing = await getEvents();
  const updated = [event, ...existing].slice(0, 200);
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}

export async function getEvents(): Promise<StoredEvent[]> {
  const raw = await AsyncStorage.getItem(EVENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredEvent[];
  } catch {
    return [];
  }
}

export async function updateEventFeedback(id: string, feedback: "confirmed" | "false_alarm" | FollowUpOutcome): Promise<void> {
  const events = await getEvents();
  const updated = events.map((e) => (e.id === id ? { ...e, feedback } : e));
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
}

export async function saveFollowUpResult(eventId: string, outcome: FollowUpOutcome): Promise<void> {
  await updateEventFeedback(eventId, outcome);
}

export async function clearEvents(): Promise<void> {
  await AsyncStorage.removeItem(EVENTS_KEY);
}

export async function getThresholds(): Promise<Thresholds> {
  const raw = await AsyncStorage.getItem(THRESHOLDS_KEY);
  if (!raw) return DEFAULT_THRESHOLDS;
  try {
    return { ...DEFAULT_THRESHOLDS, ...(JSON.parse(raw) as Partial<Thresholds>) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export async function saveThresholds(t: Thresholds): Promise<void> {
  await AsyncStorage.setItem(THRESHOLDS_KEY, JSON.stringify(t));
}

export async function getLastAlertTime(): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_ALERT_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export async function setLastAlertTime(ts: number): Promise<void> {
  await AsyncStorage.setItem(LAST_ALERT_KEY, String(ts));
}

// ─── 메타인지 체크인 ──────────────────────────────────────────────────────────

export type CheckInFeeling = "긴장" | "압박감" | "피로" | "잘 모르겠음";

export interface CheckIn {
  id: string;
  timestamp: string;
  feeling: CheckInFeeling;
}

export async function saveCheckIn(feeling: CheckInFeeling): Promise<void> {
  const existing = await getCheckIns();
  const item: CheckIn = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    feeling,
  };
  const updated = [item, ...existing].slice(0, 500);
  await AsyncStorage.setItem(CHECKINS_KEY, JSON.stringify(updated));
}

export async function getCheckIns(): Promise<CheckIn[]> {
  const raw = await AsyncStorage.getItem(CHECKINS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as CheckIn[]; } catch { return []; }
}

export async function getTodayCheckIns(): Promise<CheckIn[]> {
  const all = await getCheckIns();
  const today = new Date().toISOString().slice(0, 10);
  return all.filter((c) => c.timestamp.slice(0, 10) === today);
}

// ─── Rank / Gamification stats ───────────────────────────────────────────────

export interface RankStats {
  totalSessions: number;
  successSessions: number;
  currentStreak: number;
  totalScore: number;
  lastSessionDate: string | null;
  todayCount: number;
  todayDate: string | null;
}

const DEFAULT_RANK_STATS: RankStats = {
  totalSessions: 0,
  successSessions: 0,
  currentStreak: 0,
  totalScore: 0,
  lastSessionDate: null,
  todayCount: 0,
  todayDate: null,
};

export async function getRankStats(): Promise<RankStats> {
  const raw = await AsyncStorage.getItem(RANK_STATS_KEY);
  if (!raw) return DEFAULT_RANK_STATS;
  try {
    return { ...DEFAULT_RANK_STATS, ...(JSON.parse(raw) as Partial<RankStats>) };
  } catch {
    return DEFAULT_RANK_STATS;
  }
}

export interface RecordResult {
  stats: RankStats;
  counted: boolean;
  limitReached: boolean;
  score: number;
}

export async function recordRecoverySession(
  success: boolean,
  timeSeconds: number = 0,
): Promise<RecordResult> {
  const { calcSessionScore } = await import("@/lib/ranking");
  const stats = await getRankStats();
  const today = new Date().toISOString().slice(0, 10);

  // ── Daily limit check ─────────────────────────────────────────────────────
  const currentTodayCount = stats.todayDate === today ? (stats.todayCount ?? 0) : 0;
  const limitReached = currentTodayCount >= DAILY_SESSION_LIMIT;

  if (limitReached) {
    return { stats, counted: false, limitReached: true, score: 0 };
  }

  // ── Streak calculation ────────────────────────────────────────────────────
  const lastDate = stats.lastSessionDate;
  let streak = stats.currentStreak;
  if (lastDate === null) {
    streak = success ? 1 : 0;
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      streak = success ? streak + 1 : 0;
    } else if (lastDate === today) {
      streak = success ? Math.max(streak, 1) : streak;
    } else {
      streak = success ? 1 : 0;
    }
  }

  const sessionScore = calcSessionScore(success, timeSeconds);
  const streakBonus = success && streak >= 7 ? 50 : success && streak >= 3 ? 20 : 0;
  const totalEarned = sessionScore + streakBonus;

  const updated: RankStats = {
    totalSessions: stats.totalSessions + 1,
    successSessions: stats.successSessions + (success ? 1 : 0),
    currentStreak: streak,
    totalScore: (stats.totalScore ?? 0) + totalEarned,
    lastSessionDate: today,
    todayCount: currentTodayCount + 1,
    todayDate: today,
  };

  await AsyncStorage.setItem(RANK_STATS_KEY, JSON.stringify(updated));
  return { stats: updated, counted: true, limitReached: false, score: totalEarned };
}
