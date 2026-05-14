import { Router, type IRouter } from "express";
import { db, healthEventsTable } from "@workspace/db";
import { desc, eq, gte, count } from "drizzle-orm";
import { GetEventsQueryParams, SubmitEventFeedbackParams, SubmitEventFeedbackBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const parsed = GetEventsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const events = await db
    .select()
    .from(healthEventsTable)
    .orderBy(desc(healthEventsTable.timestamp))
    .limit(limit)
    .offset(offset);

  res.json(events.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    eventType: e.eventType,
    severity: e.severity,
    heartRateAtEvent: e.heartRateAtEvent,
    hrvAtEvent: e.hrvAtEvent,
    motionAtEvent: e.motionAtEvent,
    contextSituation: e.contextSituation,
    detectionReason: e.detectionReason,
    userFeedback: e.userFeedback,
    feedbackNote: e.feedbackNote,
    resolved: e.resolved,
    resolvedAt: e.resolvedAt,
    recoverySessionId: e.recoverySessionId,
  })));
});

router.get("/events/summary", async (req, res): Promise<void> => {
  const allEvents = await db.select().from(healthEventsTable).orderBy(desc(healthEventsTable.timestamp));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEvents = allEvents.filter((e) => e.timestamp >= today).length;

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let falseAlarmCount = 0;
  const resolvedTimes: number[] = [];

  for (const e of allEvents) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    if (e.userFeedback === "false_alarm") falseAlarmCount++;
    if (e.resolved && e.resolvedAt && e.timestamp) {
      const diffMs = new Date(e.resolvedAt).getTime() - new Date(e.timestamp).getTime();
      resolvedTimes.push(diffMs / 60000);
    }
  }

  const falseAlarmRate = allEvents.length > 0 ? (falseAlarmCount / allEvents.length) * 100 : 0;
  const avgRecoveryTimeMinutes = resolvedTimes.length > 0
    ? resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length
    : null;

  res.json({
    totalEvents: allEvents.length,
    todayEvents,
    byType,
    bySeverity,
    falseAlarmRate: parseFloat(falseAlarmRate.toFixed(1)),
    avgRecoveryTimeMinutes: avgRecoveryTimeMinutes !== null ? parseFloat(avgRecoveryTimeMinutes.toFixed(1)) : null,
  });
});

router.post("/events/:id/feedback", async (req, res): Promise<void> => {
  const params = SubmitEventFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SubmitEventFeedbackBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(healthEventsTable).where(eq(healthEventsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const [updated] = await db
    .update(healthEventsTable)
    .set({
      userFeedback: body.data.feedback,
      feedbackNote: body.data.note ?? null,
      resolved: true,
      resolvedAt: new Date(),
    })
    .where(eq(healthEventsTable.id, id))
    .returning();

  res.json({
    id: updated.id,
    timestamp: updated.timestamp,
    eventType: updated.eventType,
    severity: updated.severity,
    heartRateAtEvent: updated.heartRateAtEvent,
    hrvAtEvent: updated.hrvAtEvent,
    motionAtEvent: updated.motionAtEvent,
    contextSituation: updated.contextSituation,
    detectionReason: updated.detectionReason,
    userFeedback: updated.userFeedback,
    feedbackNote: updated.feedbackNote,
    resolved: updated.resolved,
    resolvedAt: updated.resolvedAt,
    recoverySessionId: updated.recoverySessionId,
  });
});

export default router;
