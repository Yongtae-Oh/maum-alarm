export function calculateHR(rrIntervals: number[]): number {
  if (rrIntervals.length === 0) return 0;
  const avg = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  return Math.round(60000 / avg);
}

export function calculateHRV(rrIntervals: number[]): number {
  if (rrIntervals.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    diffs.push(Math.pow(rrIntervals[i] - rrIntervals[i - 1], 2));
  }
  const rmssd = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  return Math.round(rmssd * 10) / 10;
}

export type StateType = "calm" | "stress" | "anxiety" | "crisis" | "exercise" | "fatigue" | "sleep" | "obsession";

export interface ClassificationResult {
  state: StateType;
  emotionalDistress: boolean;
  note: string;
}

export function classifyState(
  hr: number,
  hrv: number,
  motion: number,
  thresholds: {
    hrStressThreshold: number;
    hrCrisisThreshold: number;
    hrvStressThreshold: number;
    motionExerciseThreshold: number;
  }
): ClassificationResult {
  const { hrStressThreshold, hrCrisisThreshold, hrvStressThreshold, motionExerciseThreshold } = thresholds;

  if (motion > motionExerciseThreshold && hr > hrStressThreshold) {
    return { state: "exercise", emotionalDistress: false, note: "신체 활동 중 — 운동 상태입니다" };
  }
  if (hr >= hrCrisisThreshold && hrv < hrvStressThreshold * 0.6 && motion < motionExerciseThreshold * 0.3) {
    return { state: "crisis", emotionalDistress: true, note: "위기 상황 감지 — 심박수 급등 + 낮은 HRV + 정적 상태" };
  }
  if (hr >= hrStressThreshold * 1.1 && hrv < hrvStressThreshold * 0.7 && motion < motionExerciseThreshold * 0.2) {
    return { state: "anxiety", emotionalDistress: true, note: "불안 감지 — 심박수 상승 + HRV 저하 + 낮은 활동량" };
  }
  if (hr >= hrStressThreshold && hrv < hrvStressThreshold && motion < motionExerciseThreshold * 0.25) {
    return { state: "stress", emotionalDistress: true, note: "스트레스 감지 — 심박수 상승 + HRV 감소 + 정적 상태" };
  }
  // 집착: 만성적으로 완만히 상승한 HR + 중등도 HRV 억제 + 극히 낮은 활동량 (반추 상태)
  const obsessionHRMin = Math.max(70, hrStressThreshold * 0.76);
  if (
    hr >= obsessionHRMin &&
    hr < hrStressThreshold &&
    hrv < hrvStressThreshold * 1.4 &&
    motion < motionExerciseThreshold * 0.12
  ) {
    return { state: "obsession", emotionalDistress: true, note: "집착 감지 — 내려놓지 못하는 생각이 긴장을 서서히 누적시키고 있습니다" };
  }
  if (hr < 58 && motion < 5 && hrv > 55) {
    return { state: "sleep", emotionalDistress: false, note: "수면 또는 깊은 휴식 상태" };
  }
  if (hr < 65 && hrv < 32 && motion < 8) {
    return { state: "fatigue", emotionalDistress: false, note: "피로 상태 — 낮은 심박수와 HRV" };
  }
  return { state: "calm", emotionalDistress: false, note: "평온 상태 — 생체신호가 정상 범위에 있습니다" };
}
