export type RankLevel =
  | "초급"
  | "9급"
  | "8급"
  | "7급"
  | "6급"
  | "5급"
  | "4급"
  | "3급"
  | "2급"
  | "1급"
  | "매니저급"
  | "마스터급";

export interface RankInfo {
  level: RankLevel;
  levelEn: string;
  label: string;
  labelEn: string;
  minSessions: number;
  color: string;
  icon: string;
  description: string;
  descriptionEn: string;
  privilege: string;
  privilegeEn: string;
  iconBg: string;
  circleFill: string | null;
  textColor: string;
  minSuccessRate?: number;
}

export const RANKS: RankInfo[] = [
  {
    level: "초급",       levelEn: "Beginner",
    label: "감지 입문자", labelEn: "First Noticer",
    minSessions: 0,
    color: "#ffffff",
    icon: "🌱",
    description:   "마음의 신호를 처음 알아채기 시작한 단계",
    descriptionEn: "Just beginning to notice signals from the mind",
    privilege:   "앱 기본 기능",
    privilegeEn: "Core app features",
    iconBg: "#0d0f14",
    circleFill: null,
    textColor: "#ffffff",
  },
  {
    level: "9급",    levelEn: "Grade 9",
    label: "알아채는 자", labelEn: "The Noticer",
    minSessions: 10,
    color: "#fde047",
    icon: "👁",
    description:   "생체신호의 변화를 인식하기 시작함",
    descriptionEn: "Starting to recognize changes in biometric signals",
    privilege:   "기록 분석 기능 해제",
    privilegeEn: "Log analysis unlocked",
    iconBg: "#0d0f14",
    circleFill: "#fde047",
    textColor: "#ffffff",
  },
  {
    level: "8급",    levelEn: "Grade 8",
    label: "호흡하는 자", labelEn: "The Breather",
    minSessions: 25,
    color: "#f59e0b",
    icon: "🌬",
    description:   "호흡 회복을 습관으로 만들어가는 중",
    descriptionEn: "Building breathing recovery into a daily habit",
    privilege:   "박스 호흡 고급 가이드 해제",
    privilegeEn: "Advanced box breathing guide unlocked",
    iconBg: "#0d0f14",
    circleFill: "#f59e0b",
    textColor: "#ffffff",
  },
  {
    level: "7급",  levelEn: "Grade 7",
    label: "관찰자", labelEn: "The Observer",
    minSessions: 50,
    color: "#f97316",
    icon: "🔍",
    description:   "자신의 패턴을 파악하기 시작함",
    descriptionEn: "Beginning to identify personal patterns",
    privilege:   "주간 패턴 리포트 해제",
    privilegeEn: "Weekly pattern report unlocked",
    iconBg: "#0d0f14",
    circleFill: "#f97316",
    textColor: "#ffffff",
  },
  {
    level: "6급",       levelEn: "Grade 6",
    label: "균형 탐색자", labelEn: "Balance Seeker",
    minSessions: 80,
    color: "#22c55e",
    icon: "⚖️",
    description:   "균형 상태를 의식적으로 찾아가는 단계",
    descriptionEn: "Consciously working toward a balanced state",
    privilege:   "월간 HRV 추세 차트",
    privilegeEn: "Monthly HRV trend chart",
    iconBg: "#0d0f14",
    circleFill: "#22c55e",
    textColor: "#ffffff",
  },
  {
    level: "5급",       levelEn: "Grade 5",
    label: "중심 유지자", labelEn: "Center Keeper",
    minSessions: 120,
    color: "#06b6d4",
    icon: "🎯",
    description:   "외부 자극에도 중심을 유지하는 능력 향상",
    descriptionEn: "Improving ability to stay centered under external stress",
    privilege:   "커스텀 알림 임계값 설정",
    privilegeEn: "Custom alert threshold settings",
    iconBg: "#0d0f14",
    circleFill: "#06b6d4",
    textColor: "#ffffff",
  },
  {
    level: "4급",       levelEn: "Grade 4",
    label: "회복 설계자", labelEn: "Recovery Architect",
    minSessions: 180,
    color: "#3b82f6",
    icon: "🛠",
    description:   "자신만의 회복 루틴을 설계하는 단계",
    descriptionEn: "Designing a personalized recovery routine",
    privilege:   "개인 회복 루틴 저장 기능",
    privilegeEn: "Personal recovery routine storage",
    iconBg: "#0d0f14",
    circleFill: "#3b82f6",
    textColor: "#ffffff",
  },
  {
    level: "3급",      levelEn: "Grade 3",
    label: "마음 조율사", labelEn: "Mind Tuner",
    minSessions: 260,
    color: "#8b5cf6",
    icon: "🎼",
    description:   "감정 상태를 능숙하게 조율하는 수준",
    descriptionEn: "Skillfully tuning emotional states",
    privilege:   "공식 수료 배지 발급",
    privilegeEn: "Official completion badge issued",
    iconBg: "#0d0f14",
    circleFill: "#8b5cf6",
    textColor: "#ffffff",
  },
  {
    level: "2급",      levelEn: "Grade 2",
    label: "감정 항법사", labelEn: "Emotion Navigator",
    minSessions: 360,
    color: "#ef4444",
    icon: "🧭",
    description:   "감정의 흐름을 읽고 방향을 잡는 전문 수준",
    descriptionEn: "Reading emotional currents and setting direction",
    privilege:   "SNS 공유 인증 카드",
    privilegeEn: "Shareable certification card",
    iconBg: "#0d0f14",
    circleFill: "#ef4444",
    textColor: "#ffffff",
  },
  {
    level: "1급",          levelEn: "Grade 1",
    label: "자기인식 전문가", labelEn: "Self-Awareness Expert",
    minSessions: 500,
    color: "#991b1b",
    icon: "⭐",
    description:   "자기 내면 상태를 전문가 수준으로 인식·관리",
    descriptionEn: "Expert-level awareness and management of inner states",
    privilege:   "공식 인증서 PDF 발급",
    privilegeEn: "Official certificate PDF issued",
    iconBg: "#0d0f14",
    circleFill: "#991b1b",
    textColor: "#fbbf24",
  },
  {
    level: "매니저급",  levelEn: "Manager",
    label: "마음 코치",  labelEn: "Mind Coach",
    minSessions: 700,
    color: "#fbbf24",
    icon: "🏅",
    description:   "타인의 감정 회복을 안내할 수 있는 코치 수준",
    descriptionEn: "Capable of guiding others through emotional recovery",
    privilege:   "그룹 세션 개설 권한",
    privilegeEn: "Group session hosting",
    iconBg: "#0d0f14",
    circleFill: "#111111",
    textColor: "#fbbf24",
    minSuccessRate: 0.95,
  },
  {
    level: "마스터급",  levelEn: "Master",
    label: "마음 마스터", labelEn: "Mind Master",
    minSessions: 1000,
    color: "#d4af37",
    icon: "👑",
    description:   "최고 수준의 메타인지 역량 보유자",
    descriptionEn: "The highest level of metacognitive ability",
    privilege:   "지역 센터장 자격 부여",
    privilegeEn: "Regional center director qualification",
    iconBg: "#0d0f14",
    circleFill: "#d4af37",
    textColor: "#0d0f14",
    minSuccessRate: 0.99,
  },
];

// ─── Time-based scoring ──────────────────────────────────────────────────────

export interface TimeGrade {
  label: string;
  labelEn: string;
  color: string;
  bonus: number;
  maxSeconds: number;
}

export const TIME_GRADES: TimeGrade[] = [
  { label: "탁월", labelEn: "Excellent", color: "#22d3ee", bonus: 15, maxSeconds: 120 },
  { label: "우수", labelEn: "Good",      color: "#10b981", bonus: 8,  maxSeconds: 300 },
  { label: "양호", labelEn: "Okay",      color: "#f59e0b", bonus: 3,  maxSeconds: 600 },
  { label: "기본", labelEn: "Base",      color: "#7a8a9a", bonus: 0,  maxSeconds: Infinity },
];

export function getTimeGrade(timeSeconds: number): TimeGrade {
  for (const g of TIME_GRADES) {
    if (timeSeconds <= g.maxSeconds) return g;
  }
  return TIME_GRADES[TIME_GRADES.length - 1];
}

export function calcSessionScore(success: boolean, timeSeconds: number): number {
  if (!success) return 2;
  const timeGrade = getTimeGrade(timeSeconds);
  return 15 + timeGrade.bonus;
}

// ─── Rank helpers ────────────────────────────────────────────────────────────

export interface RankStats {
  totalSessions: number;
  successSessions: number;
  currentStreak: number;
  totalScore: number;
}

export function getCurrentRank(successSessions: number, successRate = 1): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const r = RANKS[i];
    if (successSessions >= r.minSessions) {
      if (r.minSuccessRate !== undefined && successRate < r.minSuccessRate) continue;
      return r;
    }
  }
  return RANKS[0];
}

export function getNextRank(successSessions: number, successRate = 1): RankInfo | null {
  const current = getCurrentRank(successSessions, successRate);
  const idx = RANKS.findIndex((r) => r.level === current.level);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

export function getProgressToNext(successSessions: number, successRate = 1): number {
  const current = getCurrentRank(successSessions, successRate);
  const next = getNextRank(successSessions, successRate);
  if (!next) return 1;
  const range = next.minSessions - current.minSessions;
  const done = successSessions - current.minSessions;
  return Math.min(1, done / range);
}

export interface PromotionStatus {
  sessionsMet: boolean;
  rateMet: boolean;
  eligible: boolean;
}

export function getPromotionStatus(
  next: RankInfo,
  successSessions: number,
  successRate: number,
): PromotionStatus {
  const sessionsMet = successSessions >= next.minSessions;
  const rateMet = next.minSuccessRate === undefined || successRate >= next.minSuccessRate;
  return { sessionsMet, rateMet, eligible: sessionsMet && rateMet };
}

export function calcScore(sessions: number, successRate: number, streak: number): number {
  const baseScore = sessions * 10;
  const rateBonus = Math.floor(baseScore * (successRate - 1.0));
  const streakBonus = streak >= 7 ? 50 : streak >= 3 ? 20 : 0;
  return Math.max(0, baseScore + rateBonus + streakBonus);
}
