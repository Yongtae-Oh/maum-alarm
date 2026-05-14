import { pgTable, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userThresholdsTable = pgTable("user_thresholds", {
  id: serial("id").primaryKey(),
  hrStressThreshold: real("hr_stress_threshold").notNull().default(95),
  hrCrisisThreshold: real("hr_crisis_threshold").notNull().default(130),
  hrvStressThreshold: real("hrv_stress_threshold").notNull().default(25),
  motionExerciseThreshold: real("motion_exercise_threshold").notNull().default(40),
  sustainedWindowSeconds: integer("sustained_window_seconds").notNull().default(30),
  learningIterations: integer("learning_iterations").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertUserThresholdsSchema = createInsertSchema(userThresholdsTable).omit({ id: true });
export type InsertUserThresholds = z.infer<typeof insertUserThresholdsSchema>;
export type UserThresholds = typeof userThresholdsTable.$inferSelect;
