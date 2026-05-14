import { pgTable, serial, timestamp, real, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recoverySessionsTable = pgTable("recovery_sessions", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  sessionType: text("session_type").notNull(),
  durationSeconds: integer("duration_seconds"),
  effectivenessRating: integer("effectiveness_rating"),
  triggerEventId: integer("trigger_event_id"),
  hrBefore: real("hr_before"),
  hrAfter: real("hr_after"),
  completed: boolean("completed").notNull().default(false),
});

export const insertRecoverySessionSchema = createInsertSchema(recoverySessionsTable).omit({ id: true });
export type InsertRecoverySession = z.infer<typeof insertRecoverySessionSchema>;
export type RecoverySession = typeof recoverySessionsTable.$inferSelect;
