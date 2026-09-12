import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSocket } from "../hooks/useSocket";
import { ActivityFeed } from "../components/ActivityFeed";
import { ActivityEvent, Project, Task } from "../types";

interface Summary {
  projects: Project[];
  tasksByPriority: { priority: string; count: number }[];
  upcomingDueThisWeek: Task[];
}

export function PMDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const socket = useSocket();

  useEffect(() => {
    api.get("/dashboard/summary").then((r) => setSummary(r.data));
    api.get("/tasks/activity/feed").then((r) => setActivity(r.data.activity));
  }, []);

  // PM's feed is server-filtered to "their own projects" - the client just
  // renders whatever the server sends over the socket (see broadcastActivity
  // and getRecentActivity server-side scoping).
  useEffect(() => {
    if (!socket) return;
    const onActivity = (e: ActivityEvent) => setActivity((prev) => [e, ...prev].slice(0, 50));
    socket.on("activity:new", onActivity);
    return () => {
      socket.off("activity:new", onActivity);
    };
  }, [socket]);

  // Join each of this PM's project rooms so their feed stays live even
  // without opening each project's detail page individually.
  useEffect(() => {
    if (!socket || !summary) return;
    summary.projects.forEach((p) => socket.emit("project:join", p.id));
    return () => {
      summary.projects.forEach((p) => socket.emit("project:leave", p.id));
    };
  }, [socket, summary]);

  if (!summary) return <div className="center-msg">Loading...</div>;

  return (
    <div className="dashboard-grid">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-value">{summary.projects.length}</div><div className="stat-label">My Projects</div></div>
        {summary.tasksByPriority.map((p) => (
          <div className="stat-card" key={p.priority}>
            <div className="stat-value">{p.count}</div>
            <div className="stat-label">{p.priority} priority</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>My Projects</h2>
          <ul className="project-list">
            {summary.projects.map((p: any) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`}>{p.name}</Link>
                <span className="muted"> — {p._count?.tasks ?? 0} tasks</span>
              </li>
            ))}
          </ul>
          <h2>Due This Week</h2>
          <ul className="task-list">
            {summary.upcomingDueThisWeek.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong> — {t.assignee?.name} · due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
              </li>
            ))}
            {summary.upcomingDueThisWeek.length === 0 && <li className="muted">Nothing due this week.</li>}
          </ul>
        </div>
        <div className="panel">
          <h2>Team Activity</h2>
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}
