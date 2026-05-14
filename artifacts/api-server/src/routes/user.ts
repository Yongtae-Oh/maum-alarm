import { Router, type IRouter } from "express";
import { db, userProfileTable, userThresholdsTable, healthEventsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { UpdateUserProfileBody, UpdateUserThresholdsBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function ensureProfile() {
  const [existing] = await db.select().from(userProfileTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(userProfileTable).values({
    name: "사용자",
    baselineHeartRate: 65,
    baselineHrv: 45,
    sensitivityLevel: "medium",
    notificationMode: "moderate",
  }).returning();
  return created;
}

async function ensureThresholds() {
  const [existing] = await db.select().from(userThresholdsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(userThresholdsTable).values({
    hrStressThreshold: 95,
    hrCrisisThreshold: 130,
    hrvStressThreshold: 25,
    motionExerciseThreshold: 40,
    sustainedWindowSeconds: 30,
    learningIterations: 0,
  }).returning();
  return created;
}

router.get("/user/profile", async (req, res): Promise<void> => {
  const profile = await ensureProfile();
  res.json({
    id: profile.id,
    name: profile.name,
    age: profile.age,
    baselineHeartRate: profile.baselineHeartRate,
    baselineHrv: profile.baselineHrv,
    sensitivityLevel: profile.sensitivityLevel,
    notificationMode: profile.notificationMode,
    emergencyContact: profile.emergencyContact,
    guardianPhone: profile.guardianPhone,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
});

router.put("/user/profile", async (req, res): Promise<void> => {
  const body = UpdateUserProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await ensureProfile();
  const [updated] = await db
    .update(userProfileTable)
    .set({ ...body.data, updatedAt: new Date() })
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    age: updated.age,
    baselineHeartRate: updated.baselineHeartRate,
    baselineHrv: updated.baselineHrv,
    sensitivityLevel: updated.sensitivityLevel,
    notificationMode: updated.notificationMode,
    emergencyContact: updated.emergencyContact,
    guardianPhone: updated.guardianPhone,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

router.get("/user/thresholds", async (req, res): Promise<void> => {
  const thresholds = await ensureThresholds();
  res.json({
    id: thresholds.id,
    hrStressThreshold: thresholds.hrStressThreshold,
    hrCrisisThreshold: thresholds.hrCrisisThreshold,
    hrvStressThreshold: thresholds.hrvStressThreshold,
    motionExerciseThreshold: thresholds.motionExerciseThreshold,
    sustainedWindowSeconds: thresholds.sustainedWindowSeconds,
    learningIterations: thresholds.learningIterations,
    lastUpdated: thresholds.lastUpdated,
  });
});

router.put("/user/thresholds", async (req, res): Promise<void> => {
  const body = UpdateUserThresholdsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await ensureThresholds();
  const [updated] = await db
    .update(userThresholdsTable)
    .set({ ...body.data, lastUpdated: new Date() })
    .returning();

  res.json({
    id: updated.id,
    hrStressThreshold: updated.hrStressThreshold,
    hrCrisisThreshold: updated.hrCrisisThreshold,
    hrvStressThreshold: updated.hrvStressThreshold,
    motionExerciseThreshold: updated.motionExerciseThreshold,
    sustainedWindowSeconds: updated.sustainedWindowSeconds,
    learningIterations: updated.learningIterations,
    lastUpdated: updated.lastUpdated,
  });
});

export default router;
