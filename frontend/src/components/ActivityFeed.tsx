import { ActivityEvent } from "../types";

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// The formatted "X moved Task Y from A -> B" string is built server-side
// (taskService.ts) at the moment the activity is recorded, so the feed here
// just renders it plus a relative timestamp.
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <div className="empty-state">No activity yet.</div>;
  }
  return (
    <ul className="activity-feed">
      {events.map((e) => (
        <li key={e.id} className="activity-item">
          <span className="activity-text">{e.message}</span>
          <span className="activity-time">{timeAgo(e.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
