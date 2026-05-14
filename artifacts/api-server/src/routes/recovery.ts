import { Router, type IRouter } from "express";
import { db, recoverySessionsTable, healthEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { CreateRecoverySessionBody, CompleteRecoverySessionParams, CompleteRecoverySessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recovery/sessions", async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(recoverySessionsTable)
    .orderBy(desc(recoverySessionsTable.startedAt))
    .limit(50);

  res.json(sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    sessionType: s.sessionType,
    durationSeconds: s.durationSeconds,
    effectivenessRating: s.effectivenessRating,
    triggerEventId: s.triggerEventId,
    hrBefore: s.hrBefore,
    hrAfter: s.hrAfter,
    completed: s.completed,
  })));
});

router.post("/recovery/sessions", async (req, res): Promise<void> => {
  const body = CreateRecoverySessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [session] = await db.insert(recoverySessionsTable).values({
    sessionType: body.data.sessionType,
    triggerEventId: body.data.triggerEventId ?? null,
    hrBefore: body.data.hrBefore ?? null,
    completed: false,
  }).returning();

  res.status(201).json({
    id: session.id,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    sessionType: session.sessionType,
    durationSeconds: session.durationSeconds,
    effectivenessRating: session.effectivenessRating,
    triggerEventId: session.triggerEventId,
    hrBefore: session.hrBefore,
    hrAfter: session.hrAfter,
    completed: session.completed,
  });
});

router.patch("/recovery/sessions/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteRecoverySessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteRecoverySessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(recoverySessionsTable).where(eq(recoverySessionsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const completedAt = new Date();
  const durationSeconds = Math.round((completedAt.getTime() - new Date(existing.startedAt).getTime()) / 1000);

  const [updated] = await db
    .update(recoverySessionsTable)
    .set({
      completedAt,
      durationSeconds,
      effectivenessRating: body.data.effectivenessRating,
      hrAfter: body.data.hrAfter ?? null,
      completed: true,
    })
    .where(eq(recoverySessionsTable.id, id))
    .returning();

  if (existing.triggerEventId) {
    await db.update(healthEventsTable).set({
      resolved: true,
      resolvedAt: completedAt,
      recoverySessionId: id,
    }).where(eq(healthEventsTable.id, existing.triggerEventId));
  }

  res.json({
    id: updated.id,
    startedAt: updated.startedAt,
    completedAt: updated.completedAt,
    sessionType: updated.sessionType,
    durationSeconds: updated.durationSeconds,
    effectivenessRating: updated.effectivenessRating,
    triggerEventId: updated.triggerEventId,
    hrBefore: updated.hrBefore,
    hrAfter: updated.hrAfter,
    completed: updated.completed,
  });
});

export default router;
