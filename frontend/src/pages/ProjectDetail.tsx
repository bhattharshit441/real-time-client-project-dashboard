import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import { ActivityFeed } from "../components/ActivityFeed";
import { StatusBadge, PriorityBadge } from "../components/Badges";
import { ActivityEvent, Project, Task, TaskPriority, TaskStatus } from "../types";

// Filters live in the URL query string so filtered views are shareable/bookmarkable.
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const socket = useSocket();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";

  const filteredTasks = useMemo(() => tasks, [tasks]);

  function loadTasks() {
    if (!id) return;
    const params: Record<string, string> = { projectId: id };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    api.get("/tasks", { params }).then((r) => setTasks(r.data.tasks));
  }

  useEffect(() => {
    if (!id) return;
    setError(null);
    api.get(`/projects/${id}`).then((r) => setProject(r.data.project)).catch(() => setError("You don't have access to this project."));
    loadTasks();
    api.get("/tasks/activity/feed", { params: { projectId: id } }).then((r) => setActivity(r.data.activity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status, priority]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("project:join", id);
    const onActivity = (e: ActivityEvent) => {
      if (e.projectId !== id) return;
      setActivity((prev) => [e, ...prev].slice(0, 50));
      loadTasks();
    };
    socket.on("activity:new", onActivity);
    return () => {
      socket.emit("project:leave", id);
      socket.off("activity:new", onActivity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
  }

  if (error) return <div className="center-msg">{error}</div>;
  if (!project) return <div className="center-msg">Loading...</div>;

  return (
    <div className="dashboard-grid">
      <div className="panel">
        <h1>{project.name}</h1>
        <p className="muted">{project.client?.name} · managed by {project.manager?.name}</p>
        {project.description && <p>{project.description}</p>}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="filters-row">
            <select value={status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
            <select value={priority} onChange={(e) => setFilter("priority", e.target.value)}>
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <table className="task-table">
            <thead>
              <tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th>{user?.role !== "DEVELOPER" && <th></th>}</tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr key={t.id} className={t.isOverdue ? "overdue-row" : ""}>
                  <td>{t.title}{t.isOverdue && <span className="overdue-tag">Overdue</span>}</td>
                  <td>{t.assignee?.name ?? "Unassigned"}</td>
                  <td><PriorityBadge priority={t.priority as TaskPriority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  {(user?.role !== "DEVELOPER" || t.assigneeId === user?.id) && (
                    <td>
                      <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value as TaskStatus)}>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
              {filteredTasks.length === 0 && <tr><td colSpan={6} className="muted">No tasks match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Live Activity</h2>
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}
