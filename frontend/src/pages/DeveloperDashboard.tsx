import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSocket } from "../hooks/useSocket";
import { ActivityFeed } from "../components/ActivityFeed";
import { ActivityEvent, Task } from "../types";
import { StatusBadge, PriorityBadge } from "../components/Badges";

export function DeveloperDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const socket = useSocket();

  function loadTasks() {
    // Server scopes this to assigneeId = self regardless of what's passed here.
    api.get("/dashboard/summary").then((r) => setTasks(r.data.tasks));
  }

  useEffect(() => {
    loadTasks();
    api.get("/tasks/activity/feed").then((r) => setActivity(r.data.activity));
  }, []);

  // Developer's personal room (`user:{id}`) only receives activity for tasks
  // assigned to them, per the server-side broadcastActivity fan-out.
  useEffect(() => {
    if (!socket) return;
    const onActivity = (e: ActivityEvent) => setActivity((prev) => [e, ...prev].slice(0, 50));
    socket.on("activity:new", onActivity);
    return () => {
      socket.off("activity:new", onActivity);
    };
  }, [socket]);

  async function updateStatus(taskId: string, status: Task["status"]) {
    await api.patch(`/tasks/${taskId}/status`, { status });
    loadTasks();
  }

  return (
    <div className="dashboard-grid">
      <div className="two-col">
        <div className="panel">
          <h2>My Tasks</h2>
          <table className="task-table">
            <thead>
              <tr><th>Task</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th><th></th></tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={t.isOverdue ? "overdue-row" : ""}>
                  <td>
                    <Link to={`/projects/${t.projectId}`}>{t.title}</Link>
                    {t.isOverdue && <span className="overdue-tag">Overdue</span>}
                  </td>
                  <td>{t.project?.name}</td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  <td>
                    <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value as Task["status"])}>
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr><td colSpan={6} className="muted">No tasks assigned to you yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2>My Activity</h2>
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}
