import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import * as projectService from "../services/projectService";
import { AuthedRequest } from "../middleware/auth";

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    clientId: z.string().uuid(),
    managerId: z.string().uuid().optional(),
  }),
});

export const list = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const projects = await projectService.listProjectsForActor(req.user!);
  res.json({ projects });
});

export const getOne = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const project = await projectService.getProjectForActor(req.params.id, req.user!);
  res.json({ project });
});

export const create = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { body } = createSchema.parse({ body: req.body });
  const project = await projectService.createProject(
    { name: body.name, description: body.description, clientId: body.clientId, managerId: body.managerId! },
    req.user!
  );
  res.status(201).json({ project });
});
