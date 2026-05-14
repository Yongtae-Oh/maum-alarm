import { Router, type IRouter } from "express";
import { db, biosignalReadingsTable, healthEventsTable, recoverySessionsTable } from "@workspace/db";
import { desc, gte, isNull } from "drizzle-orm";
import { generateReading } from "../lib/biosignal-simulator";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const reading = await generateReading();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allTodayEvents = await db.select().from(healthEventsTable).where(gte(healthEventsTable.timestamp, today));
  const eventsLast24h = allTodayEvents.length;

  const [activeSession] = await db
    .select()
    .from(recoverySessionsTable)
    .where(isNull(recoverySessionsTable.completedAt))
    .orderBy(desc(recoverySessionsTable.startedAt))
    .limit(1);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = await db.select().from(healthEventsTable).where(gte(healthEventsTable.timestamp, sevenDaysAgo));

  let streakDays = 0;
  const checkDay = new Date();
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(checkDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(checkDay);
    dayEnd.setHours(23, 59, 59, 999);
    const hasCrisis = recentEvents.some(
      (e) => e.severity === "critical" && e.timestamp >= dayStart && e.timestamp <= dayEnd
    );
    if (hasCrisis) break;
    streakDays++;
    checkDay.setDate(checkDay.getDate() - 1);
  }

  let equilibriumScore = 100;
  const stateDeductions: Record<string, number> = {
    calm: 0,
    meeting: 5,
    fatigue: 15,
    sleep: 0,
    exercise: 5,
    stress: 35,
    anxiety: 50,
    crisis: 70,
  };
  equilibriumScore = Math.max(0, 100 - (stateDeductions[reading.stateClassification] ?? 0));
  if (eventsLast24h > 0) equilibriumScore = Math.max(0, equilibriumScore - eventsLast24h * 3);

  const weeklyTrend = eventsLast24h === 0 ? "improving" : eventsLast24h < 3 ? "stable" : "declining";

  res.json({
    currentState: reading.stateClassification,
    currentHeartRate: reading.heartRate,
    currentHrv: reading.hrv,
    currentMotion: reading.motionLevel,
    equilibriumScore: Math.round(equilibriumScore),
    eventsLast24h,
    activeRecoverySession: activeSession?.id ?? null,
    streakDays,
    weeklyTrend,
  });
});

export default router;
