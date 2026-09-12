import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/AppError";
import { getIO } from "../sockets/socketBus";

interface Actor {
  id: string;
  role: Role;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueBefore?: Date;
  dueAfter?: Date;
  projectId?: string;
}

// Central RBAC rule: a Developer's task list is ALWAYS constrained to
// assigneeId = self, at the query level - not filtered client-side.
function scopeWhereClause(actor: Actor, filters: TaskFilters) {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.dueBefore || filters.dueAfter) {
    where.dueDate = {};
    if (filters.dueBefore) where.dueDate.lte = filters.dueBefore;
    if (filters.dueAfter) where.dueDate.gte = filters.dueAfter;
  }

  if (actor.role === "DEVELOPER") {
    where.assigneeId = actor.id;
  } else if (actor.role === "PM") {
    where.project = { managerId: actor.id };
  }
  // ADMIN: no extra scoping

  return where;
}

export async function listTasks(actor: Actor, filters: TaskFilters) {
  return prisma.task.findMany({
    where: scopeWhereClause(actor, filters),
    include: { assignee: true, project: true },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
}

async function assertCanAccessTask(taskId: string, actor: Actor) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw Errors.notFound("Task not found");

  if (actor.role === "ADMIN") return task;
  if (actor.role === "PM") {
    if (task.project.managerId !== actor.id) throw Errors.forbidden("Not your project's task");
    return task;
  }
  // DEVELOPER
  if (task.assigneeId !== actor.id) throw Errors.forbidden("This task is not assigned to you");
  return task;
}

export async function createTask(
  actor: Actor,
  input: {
    projectId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    priority?: TaskPriority;
    dueDate?: Date;
  }
) {
  if (actor.role === "DEVELOPER") throw Errors.forbidden("Developers cannot create tasks");

  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw Errors.notFound("Project not found");
  if (actor.role === "PM" && project.managerId !== actor.id) {
    throw Errors.forbidden("Not your project");
  }

  const task = await prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId,
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate,
    },
  });

  if (task.assigneeId) {
    const notification = await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        taskId: task.id,
        message: `You were assigned a new task: "${task.title}"`,
      },
    });
    emitNotification(task.assigneeId, notification);
  }

  return task;
}

export async function updateTaskStatus(
  actor: Actor,
  taskId: string,
  newStatus: TaskStatus
) {
  const task = await assertCanAccessTask(taskId, actor);
  const oldStatus = task.status;
  if (oldStatus === newStatus) return task;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus, isOverdue: newStatus === "DONE" ? false : task.isOverdue },
  });

  const actorUser = await prisma.user.findUnique({ where: { id: actor.id } });
  const activity = await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      projectId: task.projectId,
      actorId: actor.id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      message: `${actorUser?.name} moved "${task.title}" from ${labelStatus(oldStatus)} \u2192 ${labelStatus(newStatus)}`,
    },
    include: { actor: true },
  });

  broadcastActivity(activity, task.projectId, task.assigneeId);

  // Notify PM when a task in their project moves to IN_REVIEW
  if (newStatus === "IN_REVIEW") {
    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      const notification = await prisma.notification.create({
        data: {
          userId: project.managerId,
          taskId: task.id,
          message: `Task "${task.title}" was moved to In Review by ${actorUser?.name}`,
        },
      });
      emitNotification(project.managerId, notification);
    }
  }

  return updated;
}

function labelStatus(status: TaskStatus) {
  return { TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done" }[status];
}

// Fan-out rule for the role-filtered real-time feed:
// - everyone currently viewing the project room gets it (PM who owns it, admin, devs on it)
// - all admins get it via the global admin room (Admin sees everything)
// - the task's assignee gets it in their personal feed room even if not "viewing" the project
function broadcastActivity(activity: any, projectId: string, assigneeId: string | null) {
  const io = getIO();
  const payload = {
    id: activity.id,
    taskId: activity.taskId,
    projectId: activity.projectId,
    actorName: activity.actor.name,
    fromStatus: activity.fromStatus,
    toStatus: activity.toStatus,
    message: activity.message,
    createdAt: activity.createdAt,
  };
  io.to(`project:${projectId}`).emit("activity:new", payload);
  io.to("admin:global").emit("activity:new", payload);
  if (assigneeId) io.to(`user:${assigneeId}`).emit("activity:new", payload);
}

function emitNotification(userId: string, notification: any) {
  const io = getIO();
  io.to(`user:${userId}`).emit("notification:new", notification);
}

// Missed-event catchup: fetched from DB, not memory, per spec.
export async function getRecentActivity(actor: Actor, projectId?: string) {
  const where: any = {};
  if (projectId) where.projectId = projectId;

  if (actor.role === "PM") {
    where.project = { managerId: actor.id };
  } else if (actor.role === "DEVELOPER") {
    where.task = { assigneeId: actor.id };
  }
  // ADMIN: unscoped (global feed)

  return prisma.taskActivity.findMany({
    where,
    include: { actor: true, task: true, project: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
