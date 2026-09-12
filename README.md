# Real-Time Client Project Dashboard

A full-stack internal tool for a small agency: manage clients/projects/tasks,
enforce role-based access at the API layer, and watch task updates arrive
live over WebSockets.

## Stack

- **Frontend:** React + TypeScript (Vite), React Router, socket.io-client
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Socket.io
- **Background jobs:** node-cron
- **Auth:** JWT access token (in memory on the client) + JWT refresh token (HttpOnly cookie)

## Quick start (Docker, preferred)

```bash
docker compose up --build
```

This starts Postgres, runs migrations, seeds the database, and starts both
the API (port 4000) and the frontend (port 5173, served via nginx).

Open http://localhost:5173 and log in with any seeded account (see below).

## Manual local setup

**Backend**
```bash
cd backend
cp .env.example .env      # edit DATABASE_URL if not using Docker's Postgres
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                # http://localhost:4000
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## Seeded accounts

All seeded users share the password `Password123!`.

| Role      | Email                |
|-----------|-----------------------|
| Admin     | admin@agency.dev      |
| PM        | priya.pm@agency.dev   |
| PM        | karan.pm@agency.dev   |
| Developer | ravi.dev@agency.dev   |
| Developer | sneha.dev@agency.dev  |
| Developer | arjun.dev@agency.dev  |
| Developer | meera.dev@agency.dev  |

Seed data includes 3 clients, 3 projects, 16 tasks across all statuses,
2 tasks already flagged overdue, and a pre-existing activity-log entry per
task so dashboards and feeds are populated on first load.

## Database schema (high level)

```
User (id, name, email, passwordHash, role[ADMIN|PM|DEVELOPER])
RefreshToken (id, token, userId, expiresAt, revoked)   -- persisted, revocable, rotated on use
Client (id, name)
Project (id, name, description, clientId -> Client, managerId -> User)
Task (id, projectId -> Project, title, description, assigneeId -> User,
      status, priority, dueDate, isOverdue)
TaskActivity (id, taskId -> Task, projectId -> Project, actorId -> User,
              fromStatus, toStatus, message, createdAt)  -- append-only audit log
Notification (id, userId -> User, taskId -> Task, message, read, createdAt)
```

**Indexing decisions** (see `prisma/schema.prisma` for the exact `@@index`
declarations):

- `Project.managerId` / `Project.clientId` — PMs load "my projects" and admins
  filter by client constantly; both are equality lookups on foreign keys.
- `Task.assigneeId` — the single most-hit query in the app (developer's task
  list, "who is this assigned to" checks on every write).
- `Task.status`, `Task.priority`, `Task.dueDate`, and the composite
  `Task.(status, dueDate)` — the spec requires shareable filter query params
  on status/priority/due-range, and the overdue cron job scans exactly on
  `(status != DONE, dueDate < now)`, so that composite index serves the job
  directly instead of a full table scan.
- `TaskActivity.(projectId, createdAt)` and `(taskId, createdAt)` — the feed
  and the missed-event catchup query are both "recent N rows for X, ordered
  by time," which is what a composite index in that order is built for.
- `Notification.(userId, read, createdAt)` — the notification dropdown query
  is "unread-first, newest, for this user."

## Architectural decisions

**WebSocket library: Socket.io, not raw WebSocket.** The app needs rooms
(per-project feeds, a global admin room, per-user personal rooms), automatic
reconnection, and a request/response-ish pattern for room joins
(`project:join` / `project:leave`). Socket.io gives all of that out of the
box; raw WebSocket would mean re-implementing room bookkeeping and
reconnection handling by hand for no real benefit here. SSE was ruled out
because the client needs to send messages to the server (which project room
to join), not just receive a one-way stream.

**Role-filtered real-time feed.** Every status change writes one
`TaskActivity` row, then the server fans that single event out over three
socket channels based on who *should* see it — never based on what the
client claims to be viewing:
- `project:<id>` — anyone currently viewing that project's page (join is
  itself access-checked server-side against the viewer's role before the
  socket is allowed into the room)
- `admin:global` — every connected admin, satisfying "Admin sees a single
  global feed"
- `user:<assigneeId>` — the task's assignee, so a developer sees activity on
  their own tasks even without a project page open

On page load / reconnect, the client also calls `GET /api/tasks/activity/feed`,
which returns the last 20 activity rows **from the database**, scoped by the
same role rules (PM: their projects only, Developer: their assigned tasks
only), so a user who was offline never loses events — nothing is held only
in server memory.

**Job queue: node-cron, not Bull.** The overdue-flagging job is a single
lightweight periodic scan (`UPDATE ... WHERE dueDate < now AND status !=
DONE`) with no need for retries, priorities, or distributed workers across
multiple processes. Bull earns its complexity (Redis, worker pools, job
retries) when work items need per-item processing guarantees; this job is a
five-minute cron tick against one table, so node-cron is the simpler correct
tool.

**Token storage.** The refresh token is issued as an `HttpOnly`,
`SameSite=Lax` cookie scoped to `/api/auth` — JavaScript on the frontend
never touches it, which is the point of `HttpOnly` (mitigates XSS token
theft). The access token lives only in memory in the React app (never
`localStorage`) and is attached via an Axios interceptor; a 401 triggers one
silent `/api/auth/refresh` call using the cookie, and the refresh token is
rotated (old one revoked, new one issued) on every use.

**Role enforcement is server-side, not just hidden UI.** `requireRole`
middleware gates routes, but the more important guarantee is inside the
services (`projectService`, `taskService`): every list/read/write query is
constrained by `managerId = actor.id` (PM) or `assigneeId = actor.id`
(Developer) *inside the Prisma `where` clause itself*. A Developer who edits
their JWT's role claim would fail signature verification; a Developer who is
simply issued a legitimate token still cannot reach another developer's task
rows because the query never includes them in the first place.

## Known limitations

- Client management (create/edit `Client` records) has no dedicated UI yet —
  clients are seeded directly; the API model supports it but there's no
  admin screen for it.
- No test suite included given the scope of this exercise; the service layer
  is structured (thin controllers, logic in `services/`) specifically to
  make unit testing straightforward to add.
- Presence count is per-process, in-memory (`Map` in `socketBus.ts`) — fine
  for a single backend instance, but would need to move to Redis (or
  Socket.io's Redis adapter) to work correctly if the API were horizontally
  scaled across multiple instances.
- No file/document attachments on tasks.
- Rate limiting is not implemented on the API.

## Deployment note

This submission was built and packaged in a sandboxed environment without
outbound network access, so it has **not** been pushed to a public Git
hosting service or deployed to Vercel as the assignment's submission format
requests. The `docker-compose.yml` here is the fastest way to run the whole
stack (Postgres + API + frontend) locally to verify it end-to-end. To submit
per the original requirements, this repo would additionally need: `git init`
+ push to GitHub/GitLab, and a Vercel deployment for the frontend (Socket.io
requires a persistent server process, so the backend would need to be hosted
on a platform that supports long-lived connections — e.g. Railway, Render,
or Fly.io — rather than Vercel's serverless functions, which don't hold
WebSocket connections open).
