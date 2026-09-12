import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";
import { setIO, markUserOnline, markUserOffline, getOnlineUserCount } from "./socketBus";
import { prisma } from "../config/prisma";

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    role: string;
  };
}

// Why Socket.io over raw WebSocket / SSE:
// - Built-in room primitive maps directly onto our fan-out needs (per-project
//   rooms, a global admin room, per-user personal rooms) without hand-rolled
//   connection bookkeeping.
// - Automatic reconnection + fallback transport handling reduces the amount
//   of client-side resilience code we'd otherwise have to write ourselves.
// - SSE was ruled out because notifications and presence need bidirectional
//   messages (client tells server which project room to join/leave).
export function initSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  // Authenticate every socket connection using the same JWT access token
  // used for REST calls - no separate, weaker auth path for sockets.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing token"));
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data = { userId: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const { userId, role } = socket.data;

    // Personal room: used for notifications and for a developer's
    // task-specific activity feed.
    socket.join(`user:${userId}`);
    if (role === "ADMIN") socket.join("admin:global");

    markUserOnline(userId);
    io.to("admin:global").emit("presence:count", getOnlineUserCount());

    // Client asks to join/leave a specific project room when it opens/closes
    // that project's detail page. Server still scopes what it emits based on
    // role elsewhere, so joining a room you have no access to yields no data
    // beyond what broadcastActivity already restricts - but we double check here too.
    socket.on("project:join", async (projectId: string) => {
      const allowed = await canAccessProject(userId, role, projectId);
      if (allowed) socket.join(`project:${projectId}`);
    });

    socket.on("project:leave", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      markUserOffline(userId);
      io.to("admin:global").emit("presence:count", getOnlineUserCount());
    });
  });

  setIO(io);
  return io;
}

async function canAccessProject(userId: string, role: string, projectId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (role === "PM") {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    return project?.managerId === userId;
  }
  // DEVELOPER
  const task = await prisma.task.findFirst({ where: { projectId, assigneeId: userId } });
  return !!task;
}
