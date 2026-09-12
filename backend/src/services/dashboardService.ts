import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getOnlineUserCount } from "../sockets/socketBus";

interface Actor {
  id: string;
  role: Role;
}

export async function adminSummary() {
  const [totalProjects, statusCounts, overdueCount] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.count({ where: { isOverdue: true } }),
  ]);

  return {
    totalProjects,
    tasksByStatus: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    overdueCount,
    onlineUsers: getOnlineUserCount(),
  };
}

export async function pmSummary(actor: Actor) {
  const projects = await prisma.project.findMany({
    where: { managerId: actor.id },
    include: { _count: { select: { tasks: true } } },
  });

  const priorityCounts = await prisma.task.groupBy({
    by: ["priority"],
    where: { project: { managerId: actor.id } },
    _count: { _all: true },
  });

  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const upcoming = await prisma.task.findMany({
    where: {
      project: { managerId: actor.id },
      dueDate: { gte: new Date(), lte: weekFromNow },
      status: { not: "DONE" },
    },
    orderBy: { dueDate: "asc" },
    include: { assignee: true },
  });

  return {
    projects,
    tasksByPriority: priorityCounts.map((p) => ({ priority: p.priority, count: p._count._all })),
    upcomingDueThisWeek: upcoming,
  };
}

export async function developerSummary(actor: Actor) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: actor.id },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { project: true },
  });
  return { tasks };
}
