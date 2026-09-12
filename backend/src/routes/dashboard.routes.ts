import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as dashboardController from "../controllers/dashboardController";

const router = Router();
router.use(requireAuth);
router.get("/summary", dashboardController.summary);

export default router;
