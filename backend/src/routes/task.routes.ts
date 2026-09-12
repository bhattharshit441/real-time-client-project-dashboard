import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as taskController from "../controllers/taskController";

const router = Router();
router.use(requireAuth);

router.get("/", taskController.list);
router.get("/activity/feed", taskController.recentActivity);
router.post("/", requireRole("ADMIN", "PM"), taskController.create);
// Status updates allowed for any authenticated role, but taskService still
// enforces per-task ownership (developer must be the assignee, PM must own the project).
router.patch("/:id/status", taskController.updateStatus);

export default router;
