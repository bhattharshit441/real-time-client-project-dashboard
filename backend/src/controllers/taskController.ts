import { Response } from "express";
import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import * as taskService from "../services/taskService";
import { AuthedRequest } from "../middleware/auth";

const statusEnum = z.nativeEnum(TaskStatus);
const priorityEnum = z.nativeEnum(TaskPriority);

const listSchema = z.object({
  query: z.object({
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    projectId: z.string().uuid().optional(),
    dueBefore: z.string().optional(),
    dueAfter: z.string().optional(),
  }),
});

const createSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    assigneeId: z.string().uuid().optional(),
    priority: priorityEnum.optional(),
    dueDate: z.string().optional(),
  }),
});

const statusUpdateSchema = z.object({
  body: z.object({ status: statusEnum }),
});

// Filters arrive as query params so lists are shareable/bookmarkable URLs.
export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { query } = listSchema.parse({ query: req.query });
  const tasks = await taskService.listTasks(req.user!, {
    status: query.status,
    priority: query.priority,
    projectId: query.projectId,
    dueBefore: query.dueBefore ? new Date(query.dueBefore) : undefined,
    dueAfter: query.dueAfter ? new Date(query.dueAfter) : undefined,
  });
  res.json({ tasks });
});

export const create = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { body } = createSchema.parse({ body: req.body });
  const task = await taskService.createTask(req.user!, {
    ...body,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
  });
  res.status(201).json({ task });
});

export const updateStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { body } = statusUpdateSchema.parse({ body: req.body });
  const task = await taskService.updateTaskStatus(req.user!, req.params.id, body.status);
  res.json({ task });
});

export const recentActivity = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  const activity = await taskService.getRecentActivity(req.user!, projectId);
  res.json({ activity });
});
