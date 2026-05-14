import { pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const simulationStateTable = pgTable("simulation_state", {
  id: serial("id").primaryKey(),
  currentScenario: text("current_scenario").notNull().default("calm"),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
});

export const insertSimulationStateSchema = createInsertSchema(simulationStateTable).omit({ id: true });
export type InsertSimulationState = z.infer<typeof insertSimulationStateSchema>;
export type SimulationState = typeof simulationStateTable.$inferSelect;
