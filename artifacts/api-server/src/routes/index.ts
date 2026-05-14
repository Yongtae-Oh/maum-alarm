import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import biosignalsRouter from "./biosignals";
import eventsRouter from "./events";
import recoveryRouter from "./recovery";
import userRouter from "./user";
import dashboardRouter from "./dashboard";
import insightsRouter from "./insights";
import simulationRouter from "./simulation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(biosignalsRouter);
router.use(eventsRouter);
router.use(recoveryRouter);
router.use(userRouter);
router.use(dashboardRouter);
router.use(insightsRouter);
router.use(simulationRouter);

export default router;
