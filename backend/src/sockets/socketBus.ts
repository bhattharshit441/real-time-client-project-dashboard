import { Server } from "socket.io";

// Indirection layer so services can emit socket events without importing
// the full socket bootstrap (avoids circular imports with index.ts).
let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO(): Server {
  if (!ioInstance) throw new Error("Socket.io not initialized yet");
  return ioInstance;
}

// Tracks distinct online users (a user may have multiple tabs/sockets open,
// so we count sockets-per-user and only report a user "online" while count > 0).
const onlineUsers = new Map<string, number>();

export function markUserOnline(userId: string) {
  onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
}

export function markUserOffline(userId: string) {
  const current = onlineUsers.get(userId) ?? 0;
  if (current <= 1) onlineUsers.delete(userId);
  else onlineUsers.set(userId, current - 1);
}

export function getOnlineUserCount(): number {
  return onlineUsers.size;
}
