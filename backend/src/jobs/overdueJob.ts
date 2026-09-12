import cron from "node-cron";
import { prisma } from "../config/prisma";

// Why node-cron over Bull queue: overdue-flagging is a single lightweight
// periodic scan with no need for retries, backoff, or distributed workers
// (single backend instance for this app). Bull would be justified if this
// grew into a job needing per-item retries, priorities, or horizontal
// scaling across multiple worker processes - not the case here.
export function startOverdueJob() {
  // Runs every 5 minutes. Tasks are flagged in the DB, not computed on page
  // load, so every client (REST and socket) sees a consistent isOverdue flag.
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const result = await prisma.task.updateMany({
      where: {
        dueDate: { lt: now },
        status: { not: "DONE" },
        isOverdue: false,
      },
      data: { isOverdue: true },
    });
    if (result.count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[overdueJob] flagged ${result.count} task(s) as overdue`);
    }
  });
}
