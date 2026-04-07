import { Hono } from "hono";
import * as notificationService from "../services/notification.service";
import { jwt } from "hono/jwt";

const notifications = new Hono();

notifications.use("/*", jwt({ secret: process.env.JWT_SECRET!, alg: "HS256" }));

notifications.get("/", async (c) => {
  const user = c.get("jwtPayload") as { sub: string };
  const list = await notificationService.listUserNotifications(user.sub);
  return c.json(list);
});

notifications.patch("/:id/read", async (c) => {
  const user = c.get("jwtPayload") as { sub: string };
  const id = c.req.param("id")!;
  await notificationService.markAsRead(id, user.sub);
  return c.json({ success: true });
});

export { notifications };
