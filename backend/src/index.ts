import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSockets } from "./sockets";
import { startOverdueJob } from "./jobs/overdueJob";

const app = createApp();
const httpServer = http.createServer(app);

initSockets(httpServer);
startOverdueJob();

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API + WebSocket server listening on port ${env.port}`);
});
