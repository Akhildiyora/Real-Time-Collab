import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.routes";
import { documentRoutes } from "./routes/document.routes";
import { userRoutes } from "./routes/user.routes";
import { notifications } from "./routes/notification.routes";
import { setupYjsWebsocket } from "./websocket/yjsWebsocket";

import { sharingRoutes } from "./routes/sharing.routes";
import { commentRoutes } from "./routes/comment.routes";
import { rateLimit } from "./middlewares/rateLimit.middleware";
import * as Sentry from "@sentry/node";
import { logger } from "./lib/logger";
import { register, requestCounter, httpResponseDuration } from "./lib/metrics";

// 1. Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const authRateLimit = rateLimit({ windowMs: 60000, max: 10 }); // 10 requests per minute
const apiRateLimit = rateLimit({ windowMs: 60000, max: 100 }); // 100 requests per minute

type Bindings = {
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  SENTRY_DSN: string;
};

type Variables = {
  user: { sub: string; email: string; role: string };
  userRole: string;
};

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 2. Global Error Handler (Sentry)
app.onError((err, c) => {
  logger.error({ err, path: c.req.path }, "Unhandled Exception");
  Sentry.captureException(err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

// 3. Logging & Metrics Middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  const { method, path } = c.req;
  const timer = httpResponseDuration.startTimer({ method, path });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Update metrics
  requestCounter.inc({ method, path, status });
  timer({ status });

  // Structured Logging
  logger.info({
    method,
    path,
    status,
    duration: `${duration}ms`,
    userId: (c.get("user") as any)?.sub
  }, "Request Handled");
});

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Unconditionally mirror the exact mathematical string the browser requested. 
      // This bulletproofs trailing slashes and satisfies credentials: true headers perfectly.
      return origin || "https://real-time-collab-web.vercel.app";
    },
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
  }),
);

app.get("/", (c) => c.json({ ok: true, service: "api" }));

app.get("/metrics", async (c) => {
  const metrics = await register.metrics();
  return c.text(metrics);
});

app.use("/auth/*", authRateLimit);
app.use("/comments/*", apiRateLimit);
app.use("/documents/*/share/*", apiRateLimit);

app.route("/auth", authRoutes);
app.route("/", documentRoutes);
app.route("/users", userRoutes);
app.route("/notifications", notifications);
app.route("/documents/:id/share", sharingRoutes);
app.route("/comments", commentRoutes);

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
