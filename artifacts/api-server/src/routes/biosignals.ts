import { Router, type IRouter } from "express";
import { db, biosignalReadingsTable } from "@workspace/db";
import { desc, gte } from "drizzle-orm";
import { generateReading } from "../lib/biosignal-simulator";
import { GetBiosignalHistoryQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/biosignals/current", async (req, res): Promise<void> => {
  const reading = await generateReading();
  res.json({
    id: reading.id,
    timestamp: reading.timestamp,
    heartRate: reading.heartRate,
    hrv: reading.hrv,
    respiratoryRate: reading.respiratoryRate,
    motionLevel: reading.motionLevel,
    spo2: reading.spo2,
    skinTemperature: reading.skinTemperature,
    stateClassification: reading.stateClassification,
    emotionalDistress: reading.emotionalDistress,
    contextualNote: reading.contextualNote,
  });
});

router.get("/biosignals/history", async (req, res): Promise<void> => {
  const parsed = GetBiosignalHistoryQueryParams.safeParse(req.query);
  const minutes = parsed.success ? (parsed.data.minutes ?? 10) : 10;

  const since = new Date(Date.now() - minutes * 60 * 1000);
  const readings = await db
    .select()
    .from(biosignalReadingsTable)
    .where(gte(biosignalReadingsTable.timestamp, since))
    .orderBy(desc(biosignalReadingsTable.timestamp))
    .limit(200);

  res.json(readings.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    heartRate: r.heartRate,
    hrv: r.hrv,
    respiratoryRate: r.respiratoryRate,
    motionLevel: r.motionLevel,
    spo2: r.spo2,
    skinTemperature: r.skinTemperature,
    stateClassification: r.stateClassification,
    emotionalDistress: r.emotionalDistress,
    contextualNote: r.contextualNote,
  })));
});

export default router;
