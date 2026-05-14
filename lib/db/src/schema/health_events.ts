import { pgTable, serial, timestamp, real, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthEventsTable = pgTable("health_events", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull(),
  heartRateAtEvent: real("heart_rate_at_event").notNull(),
  hrvAtEvent: real("hrv_at_event").notNull(),
  motionAtEvent: real("motion_at_event").notNull(),
  contextSituation: text("context_situation").notNull().default("unknown"),
  detectionReason: text("detection_reason").notNull(),
  userFeedback: text("user_feedback"),
  feedbackNote: text("feedback_note"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  recoverySessionId: integer("recovery_session_id"),
});

export const insertHealthEventSchema = createInsertSchema(healthEventsTable).omit({ id: true });
export type InsertHealthEvent = z.infer<typeof insertHealthEventSchema>;
export type HealthEvent = typeof healthEventsTable.$inferSelect;
