import { pgTable, serial, timestamp, real, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const biosignalReadingsTable = pgTable("biosignal_readings", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  heartRate: real("heart_rate").notNull(),
  hrv: real("hrv").notNull(),
  respiratoryRate: real("respiratory_rate").notNull(),
  motionLevel: real("motion_level").notNull(),
  spo2: real("spo2").notNull(),
  skinTemperature: real("skin_temperature").notNull(),
  stateClassification: text("state_classification").notNull(),
  emotionalDistress: boolean("emotional_distress").notNull().default(false),
  contextualNote: text("contextual_note"),
});

export const insertBiosignalReadingSchema = createInsertSchema(biosignalReadingsTable).omit({ id: true });
export type InsertBiosignalReading = z.infer<typeof insertBiosignalReadingSchema>;
export type BiosignalReading = typeof biosignalReadingsTable.$inferSelect;
