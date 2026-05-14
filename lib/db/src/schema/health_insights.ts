import { pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthInsightsTable = pgTable("health_insights", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const insertHealthInsightSchema = createInsertSchema(healthInsightsTable).omit({ id: true });
export type InsertHealthInsight = z.infer<typeof insertHealthInsightSchema>;
export type HealthInsight = typeof healthInsightsTable.$inferSelect;
