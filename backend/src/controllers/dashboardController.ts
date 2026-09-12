import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as dashboardService from "../services/dashboardService";
import { AuthedRequest } from "../middleware/auth";
import { Errors } from "../utils/AppError";

export const summary = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === "ADMIN") return res.json(await dashboardService.adminSummary());
  if (user.role === "PM") return res.json(await dashboardService.pmSummary(user));
  if (user.role === "DEVELOPER") return res.json(await dashboardService.developerSummary(user));
  throw Errors.forbidden();
});
