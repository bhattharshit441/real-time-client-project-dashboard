import { prisma } from "../config/prisma";
import { getIO } from "../sockets/socketBus";

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
  await pushUnreadCount(userId);
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  await pushUnreadCount(userId);
}

// Unread badge updates over the socket, not polling, per spec.
export async function pushUnreadCount(userId: string) {
  const count = await unreadCount(userId);
  getIO().to(`user:${userId}`).emit("notification:unreadCount", count);
  return count;
}
