import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as projectController from "../controllers/projectController";

const router = Router();
router.use(requireAuth);

router.get("/", projectController.list);
router.get("/:id", projectController.getOne);
router.post("/", requireRole("ADMIN", "PM"), projectController.create);

export default router;
