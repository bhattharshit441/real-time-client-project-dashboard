import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Notification } from "../types";
import { useSocket } from "../hooks/useSocket";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const socket = useSocket();

  useEffect(() => {
    api.get("/notifications").then((r) => {
      setNotifications(r.data.notifications);
      setUnread(r.data.unread);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = (n: Notification) => setNotifications((prev) => [n, ...prev]);
    const onCount = (count: number) => setUnread(count);
    socket.on("notification:new", onNew);
    socket.on("notification:unreadCount", onCount);
    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:unreadCount", onCount);
    };
  }, [socket]);

  async function markOne(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAll() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="notif-wrapper">
      <button className="icon-btn" onClick={() => setOpen((o) => !o)}>
        🔔 {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <strong>Notifications</strong>
            <button className="link-btn" onClick={markAll}>Mark all read</button>
          </div>
          {notifications.length === 0 && <div className="notif-empty">No notifications yet</div>}
          {notifications.map((n) => (
            <div key={n.id} className={`notif-item ${n.read ? "" : "unread"}`} onClick={() => markOne(n.id)}>
              <div>{n.message}</div>
              <div className="notif-time">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
