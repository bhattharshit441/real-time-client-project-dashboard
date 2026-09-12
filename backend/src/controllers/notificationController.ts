import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as notificationService from "../services/notificationService";
import { AuthedRequest } from "../middleware/auth";

export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const notifications = await notificationService.listNotifications(req.user!.id);
  const unread = await notificationService.unreadCount(req.user!.id);
  res.json({ notifications, unread });
});

export const markRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await notificationService.markRead(req.user!.id, req.params.id);
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  res.json({ success: true });
});
