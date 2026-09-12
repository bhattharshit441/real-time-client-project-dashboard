import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";

interface Actor {
  id: string;
  role: Role;
}

// Server-side scoping: a PM's query is ALWAYS constrained to managerId = self.
// This is what stops a Developer or another PM from reading someone else's
// projects even if they call the endpoint directly with a valid-but-wrong-role token.
export async function listProjectsForActor(actor: Actor) {
  if (actor.role === "ADMIN") {
    return prisma.project.findMany({
      include: { client: true, manager: true, _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  if (actor.role === "PM") {
    return prisma.project.findMany({
      where: { managerId: actor.id },
      include: { client: true, manager: true, _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  // Developer: projects that contain at least one task assigned to them
  return prisma.project.findMany({
    where: { tasks: { some: { assigneeId: actor.id } } },
    include: { client: true, manager: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectForActor(projectId: string, actor: Actor) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, manager: true },
  });
  if (!project) throw Errors.notFound("Project not found");

  if (actor.role === "ADMIN") return project;
  if (actor.role === "PM") {
    if (project.managerId !== actor.id) throw Errors.forbidden("Not your project");
    return project;
  }
  // Developer must have an assigned task in this project
  const hasTask = await prisma.task.findFirst({
    where: { projectId, assigneeId: actor.id },
  });
  if (!hasTask) throw Errors.forbidden("You have no tasks in this project");
  return project;
}

export async function createProject(input: {
  name: string;
  description?: string;
  clientId: string;
  managerId: string;
}, actor: Actor) {
  if (actor.role === "DEVELOPER") throw Errors.forbidden("Developers cannot create projects");
  // A PM can only create projects assigned to themselves as manager.
  // An Admin must explicitly pick which PM manages the new project.
  if (actor.role === "ADMIN" && !input.managerId) {
    throw Errors.badRequest("managerId is required when an admin creates a project");
  }
  const managerId = actor.role === "PM" ? actor.id : input.managerId!;
  return prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      clientId: input.clientId,
      managerId,
    },
  });
}
