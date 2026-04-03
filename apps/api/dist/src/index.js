import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.routes";
import { setupDocumentChannels } from "./websocket/documentChannels";
const app = new Hono();
app.use("*", cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.get("/", (c) => c.json({ ok: true, service: "api" }));
app.route("/auth", authRoutes);
setupDocumentChannels().catch((err) => {
    console.error("Redis pub/sub bootstrap failed:", err);
});
serve({
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
