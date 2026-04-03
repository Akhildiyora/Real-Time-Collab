import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.routes";
import { documentRoutes } from "./routes/document.routes";
import { setupYjsWebsocket } from "./websocket/yjsWebsocket";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.get("/", (c) => c.json({ ok: true, service: "api" }));
app.route("/auth", authRoutes);
app.route("/", documentRoutes);

const httpServer = serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

setupYjsWebsocket(httpServer).catch((err: unknown) => {
  console.error("Yjs websocket setup failed:", err);
});
