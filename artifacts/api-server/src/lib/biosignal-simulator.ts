import { db, simulationStateTable, biosignalReadingsTable, healthEventsTable, userThresholdsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "./logger";

export type ScenarioType = "calm" | "stress" | "exercise" | "anxiety_spike" | "panic_attack" | "fatigue" | "sleep" | "meeting" | "obsession";

interface ScenarioParams {
  hrBase: number;
  hrVariance: number;
  hrvBase: number;
  hrvVariance: number;
  rrBase: number;
  rrVariance: number;
  motionBase: number;
  motionVariance: number;
  spo2Base: number;
  tempBase: number;
  stateClassification: string;
}

const SCENARIO_PARAMS: Record<ScenarioType, ScenarioParams> = {
  calm: {
    hrBase: 65, hrVariance: 4,
    hrvBase: 50, hrvVariance: 8,
    rrBase: 14, rrVariance: 1,
    motionBase: 3, motionVariance: 2,
    spo2Base: 98.5, tempBase: 36.5,
    stateClassification: "calm"
  },
  stress: {
    hrBase: 95, hrVariance: 8,
    hrvBase: 20, hrvVariance: 5,
    rrBase: 19, rrVariance: 2,
    motionBase: 5, motionVariance: 4,
    spo2Base: 97.8, tempBase: 36.8,
    stateClassification: "stress"
  },
  exercise: {
    hrBase: 145, hrVariance: 12,
    hrvBase: 18, hrvVariance: 4,
    rrBase: 26, rrVariance: 3,
    motionBase: 75, motionVariance: 20,
    spo2Base: 97.5, tempBase: 37.4,
    stateClassification: "exercise"
  },
  anxiety_spike: {
    hrBase: 108, hrVariance: 15,
    hrvBase: 14, hrvVariance: 4,
    rrBase: 22, rrVariance: 3,
    motionBase: 6, motionVariance: 5,
    spo2Base: 97.2, tempBase: 36.9,
    stateClassification: "anxiety"
  },
  panic_attack: {
    hrBase: 138, hrVariance: 18,
    hrvBase: 8, hrvVariance: 3,
    rrBase: 28, rrVariance: 4,
    motionBase: 10, motionVariance: 8,
    spo2Base: 96.5, tempBase: 37.1,
    stateClassification: "crisis"
  },
  fatigue: {
    hrBase: 58, hrVariance: 3,
    hrvBase: 28, hrvVariance: 6,
    rrBase: 12, rrVariance: 1,
    motionBase: 2, motionVariance: 2,
    spo2Base: 98.2, tempBase: 36.4,
    stateClassification: "fatigue"
  },
  sleep: {
    hrBase: 52, hrVariance: 3,
    hrvBase: 60, hrvVariance: 10,
    rrBase: 12, rrVariance: 1,
    motionBase: 1, motionVariance: 1,
    spo2Base: 98.8, tempBase: 36.2,
    stateClassification: "sleep"
  },
  meeting: {
    hrBase: 72, hrVariance: 5,
    hrvBase: 38, hrvVariance: 7,
    rrBase: 15, rrVariance: 1,
    motionBase: 4, motionVariance: 3,
    spo2Base: 98.3, tempBase: 36.6,
    stateClassification: "meeting"
  },
  // 집착: HR 만성 완만 상승 + HRV 중등도 억제 + 극히 낮은 활동량
  obsession: {
    hrBase: 79, hrVariance: 4,
    hrvBase: 20, hrvVariance: 3,
    rrBase: 16, rrVariance: 1,
    motionBase: 1, motionVariance: 1,
    spo2Base: 98.0, tempBase: 36.6,
    stateClassification: "obsession"
  }
};

function rand(base: number, variance: number): number {
  return Math.max(0, base + (Math.random() - 0.5) * 2 * variance);
}

function classifyState(hr: number, hrv: number, motion: number, thresholds: {
  hrStressThreshold: number;
  hrCrisisThreshold: number;
  hrvStressThreshold: number;
  motionExerciseThreshold: number;
}): { state: string; emotionalDistress: boolean; note: string } {
  const { hrStressThreshold, hrCrisisThreshold, hrvStressThreshold, motionExerciseThreshold } = thresholds;

  if (motion > motionExerciseThreshold && hr > hrStressThreshold) {
    return { state: "exercise", emotionalDistress: false, note: "신체 활동 중 — 운동 상태로 분류됩니다" };
  }

  if (hr >= hrCrisisThreshold && hrv < hrvStressThreshold * 0.6 && motion < motionExerciseThreshold * 0.3) {
    return { state: "crisis", emotionalDistress: true, note: "위기 상황 — 심박수 급등 + 낮은 HRV + 정적 상태. 즉각적 대응이 필요합니다" };
  }

  if (hr >= hrStressThreshold * 1.1 && hrv < hrvStressThreshold * 0.7 && motion < motionExerciseThreshold * 0.2) {
    return { state: "anxiety", emotionalDistress: true, note: "불안 감지 — 심박수 상승 + HRV 저하 + 낮은 활동량. 감정적 혼란이 의심됩니다" };
  }

  if (hr >= hrStressThreshold && hrv < hrvStressThreshold && motion < motionExerciseThreshold * 0.25) {
    return { state: "stress", emotionalDistress: true, note: "스트레스 감지 — 심박수 상승 + HRV 감소 + 정적 상태" };
  }

  // 집착: 만성적 완만 HR 상승 + 중등도 HRV 억제 + 극히 낮은 활동량 (반추 상태)
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
    return { state: "sleep", emotionalDistress: false, note: "수면 중 또는 깊은 휴식 상태" };
  }

  if (hr < 65 && hrv < 32 && motion < 8) {
    return { state: "fatigue", emotionalDistress: false, note: "피로 상태 — 낮은 심박수와 HRV" };
  }

  return { state: "calm", emotionalDistress: false, note: "평온 상태 — 생체신호가 정상 범위에 있습니다" };
}

async function getCurrentScenario(): Promise<ScenarioType> {
  const [state] = await db.select().from(simulationStateTable).orderBy(desc(simulationStateTable.id)).limit(1);
  return (state?.currentScenario ?? "calm") as ScenarioType;
}

async function getThresholds() {
  const [thresholds] = await db.select().from(userThresholdsTable).limit(1);
  return thresholds ?? {
    hrStressThreshold: 95,
    hrCrisisThreshold: 130,
    hrvStressThreshold: 25,
    motionExerciseThreshold: 40,
  };
}

let lastEventTime: Date | null = null;
const MIN_EVENT_INTERVAL_MS = 60000;

export async function generateReading() {
  const scenario = await getCurrentScenario();
  const params = SCENARIO_PARAMS[scenario];
  const thresholds = await getThresholds();

  const heartRate = parseFloat(rand(params.hrBase, params.hrVariance).toFixed(1));
  const hrv = parseFloat(rand(params.hrvBase, params.hrvVariance).toFixed(1));
  const respiratoryRate = parseFloat(rand(params.rrBase, params.rrVariance).toFixed(1));
  const motionLevel = parseFloat(Math.min(100, rand(params.motionBase, params.motionVariance)).toFixed(1));
  const spo2 = parseFloat(Math.min(100, rand(params.spo2Base, 0.5)).toFixed(1));
  const skinTemperature = parseFloat(rand(params.tempBase, 0.2).toFixed(2));

  const { state, emotionalDistress, note } = classifyState(heartRate, hrv, motionLevel, thresholds);

  const [reading] = await db.insert(biosignalReadingsTable).values({
    heartRate,
    hrv,
    respiratoryRate,
    motionLevel,
    spo2,
    skinTemperature,
    stateClassification: state,
    emotionalDistress,
    contextualNote: note,
  }).returning();

  if (emotionalDistress && (state === "crisis" || state === "anxiety" || state === "stress" || state === "obsession")) {
    const now = new Date();
    const shouldCreateEvent = !lastEventTime || (now.getTime() - lastEventTime.getTime()) > MIN_EVENT_INTERVAL_MS;

    if (shouldCreateEvent) {
      lastEventTime = now;
      let eventType = "stress";
      let severity = "medium";
      let detectionReason = "";

      if (state === "crisis") {
        eventType = "crisis";
        severity = "critical";
        detectionReason = `심박수 ${heartRate.toFixed(0)}bpm + HRV ${hrv.toFixed(0)}ms (정상의 ${((hrv / thresholds.hrvStressThreshold) * 100).toFixed(0)}%) + 활동량 ${motionLevel.toFixed(0)}. 운동 없는 극도의 심박수 급등 — 위기 상황으로 분류됩니다`;
      } else if (state === "anxiety") {
        eventType = "anxiety";
        severity = "high";
        detectionReason = `심박수 ${heartRate.toFixed(0)}bpm 상승 + HRV ${hrv.toFixed(0)}ms 저하 + 활동량 ${motionLevel.toFixed(0)} (운동 기준 ${thresholds.motionExerciseThreshold} 미만). 운동 상황이 아닌 감정적 불안으로 분류됩니다`;
      } else if (state === "obsession") {
        eventType = "obsession";
        severity = "medium";
        detectionReason = `심박수 ${heartRate.toFixed(0)}bpm 만성 상승 + HRV ${hrv.toFixed(0)}ms 억제 + 활동량 ${motionLevel.toFixed(0)} (극히 낮음). 내려놓지 못하는 생각으로 긴장이 누적되는 집착 상태로 분류됩니다`;
      } else {
        eventType = "stress";
        severity = heartRate > thresholds.hrStressThreshold * 1.1 ? "high" : "medium";
        detectionReason = `심박수 ${heartRate.toFixed(0)}bpm + HRV ${hrv.toFixed(0)}ms. 신체 활동 없는 심박수 상승 — 스트레스/정서 불안으로 분류됩니다`;
      }

      const motionExerciseThreshold = thresholds.motionExerciseThreshold;
      let contextSituation = "rest";
      if (motionLevel > motionExerciseThreshold) contextSituation = "exercise";
      else if (heartRate < 60) contextSituation = "sleep";

      await db.insert(healthEventsTable).values({
        eventType,
        severity,
        heartRateAtEvent: heartRate,
        hrvAtEvent: hrv,
        motionAtEvent: motionLevel,
        contextSituation,
        detectionReason,
        resolved: false,
      });

      logger.info({ eventType, severity, heartRate, hrv }, "Health event created");
    }
  }

  return reading;
}
