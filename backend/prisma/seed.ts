import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding database...");

  // Wipe existing data (dev convenience - order matters for FKs)
  await prisma.notification.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await hash("Password123!");

  const admin = await prisma.user.create({
    data: { name: "Ananya Rao", email: "admin@agency.dev", passwordHash: defaultPassword, role: "ADMIN" },
  });

  const pm1 = await prisma.user.create({
    data: { name: "Priya Nair", email: "priya.pm@agency.dev", passwordHash: defaultPassword, role: "PM" },
  });
  const pm2 = await prisma.user.create({
    data: { name: "Karan Mehta", email: "karan.pm@agency.dev", passwordHash: defaultPassword, role: "PM" },
  });

  const dev1 = await prisma.user.create({
    data: { name: "Ravi Kumar", email: "ravi.dev@agency.dev", passwordHash: defaultPassword, role: "DEVELOPER" },
  });
  const dev2 = await prisma.user.create({
    data: { name: "Sneha Iyer", email: "sneha.dev@agency.dev", passwordHash: defaultPassword, role: "DEVELOPER" },
  });
  const dev3 = await prisma.user.create({
    data: { name: "Arjun Das", email: "arjun.dev@agency.dev", passwordHash: defaultPassword, role: "DEVELOPER" },
  });
  const dev4 = await prisma.user.create({
    data: { name: "Meera Joshi", email: "meera.dev@agency.dev", passwordHash: defaultPassword, role: "DEVELOPER" },
  });

  const [clientA, clientB, clientC] = await Promise.all([
    prisma.client.create({ data: { name: "Northwind Retail" } }),
    prisma.client.create({ data: { name: "Solstice Health" } }),
    prisma.client.create({ data: { name: "Vertex Logistics" } }),
  ]);

  const projectA = await prisma.project.create({
    data: {
      name: "Northwind Storefront Revamp",
      description: "Rebuild the e-commerce storefront on a headless stack.",
      clientId: clientA.id,
      managerId: pm1.id,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: "Solstice Patient Portal",
      description: "Patient-facing appointment booking and records portal.",
      clientId: clientB.id,
      managerId: pm1.id,
    },
  });
  const projectC = await prisma.project.create({
    data: {
      name: "Vertex Fleet Tracker",
      description: "Real-time fleet tracking dashboard for logistics ops.",
      clientId: clientC.id,
      managerId: pm2.id,
    },
  });

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  type TaskSeed = {
    title: string;
    assigneeId: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    isOverdue?: boolean;
  };

  const projectATasks: TaskSeed[] = [
    { title: "Set up headless CMS integration", assigneeId: dev1.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: days(5) },
    { title: "Build product listing page", assigneeId: dev1.id, status: "TODO", priority: "MEDIUM", dueDate: days(10) },
    { title: "Implement cart & checkout flow", assigneeId: dev2.id, status: "IN_REVIEW", priority: "CRITICAL", dueDate: days(2) },
    { title: "Migrate legacy product catalog", assigneeId: dev2.id, status: "TODO", priority: "HIGH", dueDate: days(-2), isOverdue: true },
    { title: "Add search & filtering", assigneeId: dev1.id, status: "DONE", priority: "LOW", dueDate: days(-1) },
    { title: "Performance audit (Lighthouse)", assigneeId: dev2.id, status: "TODO", priority: "MEDIUM", dueDate: days(14) },
  ];

  const projectBTasks: TaskSeed[] = [
    { title: "Design appointment booking flow", assigneeId: dev3.id, status: "IN_PROGRESS", priority: "HIGH", dueDate: days(7) },
    { title: "HIPAA-compliant file storage", assigneeId: dev3.id, status: "TODO", priority: "CRITICAL", dueDate: days(3) },
    { title: "Patient records dashboard", assigneeId: dev4.id, status: "IN_PROGRESS", priority: "MEDIUM", dueDate: days(-3), isOverdue: true },
    { title: "SMS appointment reminders", assigneeId: dev4.id, status: "TODO", priority: "LOW", dueDate: days(12) },
    { title: "Accessibility pass (WCAG AA)", assigneeId: dev3.id, status: "IN_REVIEW", priority: "MEDIUM", dueDate: days(4) },
  ];

  const projectCTasks: TaskSeed[] = [
    { title: "Live GPS ingestion pipeline", assigneeId: dev4.id, status: "IN_PROGRESS", priority: "CRITICAL", dueDate: days(6) },
    { title: "Fleet map with clustering", assigneeId: dev2.id, status: "TODO", priority: "HIGH", dueDate: days(9) },
    { title: "Driver mobile check-in", assigneeId: dev4.id, status: "DONE", priority: "MEDIUM", dueDate: days(-5) },
    { title: "Route optimization service", assigneeId: dev2.id, status: "TODO", priority: "HIGH", dueDate: days(15) },
    { title: "Geofence alerting", assigneeId: dev4.id, status: "IN_REVIEW", priority: "MEDIUM", dueDate: days(1) },
  ];

  async function seedTasks(projectId: string, tasks: TaskSeed[]) {
    for (const t of tasks) {
      const task = await prisma.task.create({
        data: {
          projectId,
          title: t.title,
          assigneeId: t.assigneeId,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          isOverdue: !!t.isOverdue,
        },
      });

      // Pre-existing activity log entries so the feed isn't empty on first load.
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          projectId,
          actorId: t.assigneeId,
          fromStatus: "TODO",
          toStatus: t.status,
          message: `Task "${t.title}" created and set to ${t.status.replace("_", " ")}`,
        },
      });
    }
  }

  await seedTasks(projectA.id, projectATasks);
  await seedTasks(projectB.id, projectBTasks);
  await seedTasks(projectC.id, projectCTasks);

  console.log("Seed complete.");
  console.log("Login with any of these (password: Password123!):");
  console.log(`  Admin: ${admin.email}`);
  console.log(`  PM:    ${pm1.email} / ${pm2.email}`);
  console.log(`  Dev:   ${dev1.email} / ${dev2.email} / ${dev3.email} / ${dev4.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
