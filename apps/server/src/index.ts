import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { env } from "./lib/env.js";
import authPlugin from "./plugins/auth.js";
import { devAuthRoutes } from "./routes/devAuth.js";
import { roomRoutes } from "./routes/rooms.js";
import { newsRoutes } from "./routes/news.js";
import { insightsRoutes } from "./routes/insights.js";
import { translateRoutes } from "./routes/translate.js";
import { userRoutes } from "./routes/users.js";
import { holidayRoutes } from "./routes/holidays.js";
import { registerWs } from "./ws/hub.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true
});
await app.register(websocket);

await app.register(authPlugin);

app.get("/health", async () => ({ ok: true }));

await app.register(devAuthRoutes);
await app.register(roomRoutes);
await app.register(newsRoutes);
await app.register(insightsRoutes);
await app.register(translateRoutes);
await app.register(userRoutes);
await app.register(holidayRoutes);
await registerWs(app);

app.listen({ port: env.port, host: env.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
