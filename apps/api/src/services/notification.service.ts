import { prisma } from "@repo/db";
import { redis } from "../redis";

export type NotificationType = "MENTION" | "REPLY";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  referenceId: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      referenceId: params.referenceId,
    },
    include: {
      user: { select: { email: true } },
    },
  });

  // Broadcast to the specific user's notification channel
  await redis.publish(`user:${params.userId}:notifications`, JSON.stringify({
    type: "NOTIFICATION_RECEIVED",
    payload: notification,
  }));

  return notification;
}

export async function listUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}
