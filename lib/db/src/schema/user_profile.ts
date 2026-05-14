import { pgTable, serial, timestamp, real, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfileTable = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("사용자"),
  age: integer("age"),
  baselineHeartRate: real("baseline_heart_rate").notNull().default(65),
  baselineHrv: real("baseline_hrv").notNull().default(45),
  sensitivityLevel: text("sensitivity_level").notNull().default("medium"),
  notificationMode: text("notification_mode").notNull().default("moderate"),
  emergencyContact: text("emergency_contact"),
  guardianPhone: text("guardian_phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfileTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfileTable.$inferSelect;
