import { Router, type IRouter } from "express";
import { db, simulationStateTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { TriggerSimulationScenarioBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/simulation/scenario", async (req, res): Promise<void> => {
  const body = TriggerSimulationScenarioBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  await db.insert(simulationStateTable).values({
    currentScenario: body.data.scenario,
    activatedAt: new Date(),
  });

  const scenarioMessages: Record<string, string> = {
    calm: "평온 상태 시뮬레이션 시작. 모든 생체신호가 정상 범위입니다.",
    stress: "스트레스 시뮬레이션 시작. 심박수 상승 + HRV 감소 + 활동량 정상",
    exercise: "운동 시뮬레이션 시작. 심박수 상승 + 운동강도 상승 — 감정 불안과 구별됩니다",
    anxiety_spike: "불안 급등 시뮬레이션 시작. 심박수 급등 + HRV 급감 + 정적 상태",
    panic_attack: "공황 발작 시뮬레이션 시작. 위기 수준 심박수 + 극도 HRV 저하",
    fatigue: "피로 시뮬레이션 시작. 낮은 심박수 + 낮은 활동량",
    sleep: "수면 시뮬레이션 시작. 최저 심박수 + 높은 HRV",
    meeting: "회의 시뮬레이션 시작. 약간 높은 심박수 + 낮은 활동량",
  };

  res.json({
    scenario: body.data.scenario,
    message: scenarioMessages[body.data.scenario] ?? "시뮬레이션 시작",
    activated: true,
  });
});

export default router;
