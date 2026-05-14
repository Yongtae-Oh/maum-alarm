import { Router, type IRouter } from "express";
import { db, healthInsightsTable, healthEventsTable, recoverySessionsTable, userThresholdsTable } from "@workspace/db";
import { desc, gte } from "drizzle-orm";

const router: IRouter = Router();

async function generateInsights() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = await db.select().from(healthEventsTable).where(gte(healthEventsTable.timestamp, sevenDaysAgo));
  const recentSessions = await db.select().from(recoverySessionsTable).where(gte(recoverySessionsTable.startedAt, sevenDaysAgo));
  const [thresholds] = await db.select().from(userThresholdsTable).limit(1);

  const existingInsights = await db.select().from(healthInsightsTable).orderBy(desc(healthInsightsTable.generatedAt));

  if (existingInsights.length > 0) return existingInsights.slice(0, 10);

  const insightsToInsert = [
    {
      category: "recommendation",
      title: "운동과 감정 불안 구별 기준이 설정되었습니다",
      description: `현재 심박수 ${thresholds?.hrStressThreshold ?? 95}bpm 이상 + 활동량 ${thresholds?.motionExerciseThreshold ?? 40} 미만일 때 감정 불안으로 분류합니다. 피드백을 제공하면 정확도가 개선됩니다.`,
      priority: "high",
    },
    {
      category: "pattern",
      title: "HRV 저하가 스트레스의 핵심 지표입니다",
      description: "심박변이도(HRV)는 자율신경계 균형을 반영합니다. HRV가 낮아지면 몸이 스트레스 상태에 있다는 신호입니다. 지속적인 모니터링으로 개인 기준값을 학습합니다.",
      priority: "high",
    },
    {
      category: "recommendation",
      title: "4-7-8 호흡법으로 빠른 평정심 회복",
      description: "불안이나 스트레스 감지 시 4초 흡기 → 7초 정지 → 8초 호기 패턴을 3회 반복하면 부교감신경이 활성화되어 심박수가 낮아집니다.",
      priority: "medium",
    },
    {
      category: "threshold",
      title: `학습 진행 중: ${thresholds?.learningIterations ?? 0}회 피드백 완료`,
      description: "피드백을 제공할수록 시스템이 개인 생체 리듬을 더 정확히 학습합니다. 10회 이상 피드백 시 개인화 임계치가 정밀해집니다.",
      priority: recentEvents.length > 0 ? "high" : "medium",
    },
    {
      category: "achievement",
      title: "생체신호 모니터링 시작",
      description: "다채널 생체신호 실시간 분석이 시작되었습니다. 운동과 감정 불안을 자동 구별하여 필요할 때만 메타인지 알림을 제공합니다.",
      priority: "low",
    },
  ];

  if (recentEvents.length > 2) {
    insightsToInsert.push({
      category: "pattern",
      title: `최근 7일간 ${recentEvents.length}건의 이벤트 감지`,
      description: `스트레스/불안 이벤트가 자주 감지되고 있습니다. 회복 세션을 정기적으로 실행하고 피드백을 제공하여 임계치를 조정해 보세요.`,
      priority: "high",
    });
  }

  if (recentSessions.length > 0) {
    const completedSessions = recentSessions.filter((s) => s.completed);
    const avgRating = completedSessions.reduce((a, s) => a + (s.effectivenessRating ?? 0), 0) / (completedSessions.length || 1);
    insightsToInsert.push({
      category: "achievement",
      title: `회복 세션 ${recentSessions.length}회 완료`,
      description: `평균 효과 점수: ${avgRating.toFixed(1)}/5. 꾸준한 회복 연습이 자율신경계 회복력을 높입니다.`,
      priority: "medium",
    });
  }

  await db.insert(healthInsightsTable).values(insightsToInsert);
  return await db.select().from(healthInsightsTable).orderBy(desc(healthInsightsTable.generatedAt)).limit(10);
}

router.get("/insights", async (req, res): Promise<void> => {
  const insights = await generateInsights();
  res.json(insights.map((i) => ({
    id: i.id,
    category: i.category,
    title: i.title,
    description: i.description,
    priority: i.priority,
    generatedAt: i.generatedAt,
  })));
});

export default router;
