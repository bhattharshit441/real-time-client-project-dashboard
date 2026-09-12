export type Role = "ADMIN" | "PM" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  client?: Client;
  managerId: string;
  manager?: User;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  project?: Project;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  assignee?: User | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  taskId: string;
  projectId: string;
  actorName?: string;
  actor?: User;
  fromStatus?: TaskStatus | null;
  toStatus: TaskStatus;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  taskId?: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}
