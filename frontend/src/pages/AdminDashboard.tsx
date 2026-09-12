import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSocket } from "../hooks/useSocket";
import { ActivityFeed } from "../components/ActivityFeed";
import { ActivityEvent, Project } from "../types";

interface Summary {
  totalProjects: number;
  tasksByStatus: { status: string; count: number }[];
  overdueCount: number;
  onlineUsers: number;
}

export function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const socket = useSocket();

  useEffect(() => {
    api.get("/dashboard/summary").then((r) => setSummary(r.data));
    api.get("/projects").then((r) => setProjects(r.data.projects));
    api.get("/tasks/activity/feed").then((r) => setActivity(r.data.activity));
  }, []);

  // Admin sees a single GLOBAL feed and live presence count, per spec.
  useEffect(() => {
    if (!socket) return;
    const onActivity = (e: ActivityEvent) => setActivity((prev) => [e, ...prev].slice(0, 50));
    const onPresence = (count: number) =>
      setSummary((prev) => (prev ? { ...prev, onlineUsers: count } : prev));
    socket.on("activity:new", onActivity);
    socket.on("presence:count", onPresence);
    return () => {
      socket.off("activity:new", onActivity);
      socket.off("presence:count", onPresence);
    };
  }, [socket]);

  if (!summary) return <div className="center-msg">Loading...</div>;

  return (
    <div className="dashboard-grid">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-value">{summary.totalProjects}</div><div className="stat-label">Total Projects</div></div>
        <div className="stat-card"><div className="stat-value">{summary.overdueCount}</div><div className="stat-label">Overdue Tasks</div></div>
        <div className="stat-card"><div className="stat-value">{summary.onlineUsers}</div><div className="stat-label">Online Now</div></div>
        {summary.tasksByStatus.map((s) => (
          <div className="stat-card" key={s.status}>
            <div className="stat-value">{s.count}</div>
            <div className="stat-label">{s.status.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>All Projects</h2>
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
                <span className="muted"> — {p.client?.name} · managed by {p.manager?.name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>Global Activity Feed</h2>
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}
