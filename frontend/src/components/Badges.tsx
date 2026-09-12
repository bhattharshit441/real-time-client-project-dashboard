import { TaskPriority, TaskStatus } from "../types";

const statusClass: Record<TaskStatus, string> = {
  TODO: "badge-status-todo",
  IN_PROGRESS: "badge-status-progress",
  IN_REVIEW: "badge-status-review",
  DONE: "badge-status-done",
};
const statusText: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge-pill ${statusClass[status]}`}>{statusText[status]}</span>;
}

const priorityClass: Record<TaskPriority, string> = {
  LOW: "badge-priority-low",
  MEDIUM: "badge-priority-medium",
  HIGH: "badge-priority-high",
  CRITICAL: "badge-priority-critical",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`badge-pill ${priorityClass[priority]}`}>{priority}</span>;
}
