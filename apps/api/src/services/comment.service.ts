import { prisma } from "@repo/db";
import { redis } from "../redis";

export async function createComment(params: {
  documentId: string;
  authorId: string;
  body: string;
  anchorData?: any;
}) {
  const comment = await prisma.comment.create({
    data: {
      documentId: params.documentId,
      authorId: params.authorId,
      body: params.body,
      anchorData: params.anchorData,
    },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  // 1. Extract and handle mentions
  const mentionedEmails = extractMentions(params.body);
  if (mentionedEmails.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { email: { in: mentionedEmails } },
      select: { id: true, email: true },
    });

    for (const targetUser of mentionedUsers) {
      // Don't notify yourself
      if (targetUser.id === params.authorId) continue;

      await prisma.mention.create({
        data: {
          commentId: comment.id,
          userId: targetUser.id,
        },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: "MENTION",
          referenceId: comment.id,
        },
      });

      // Notify via Redis
      await redis.publish(`user:${targetUser.id}:notifications`, JSON.stringify(notification));
    }
  }

  // 2. Notify other collaborators about the new comment
  await redis.publish(`doc:${params.documentId}:comments`, JSON.stringify({
    type: "COMMENT_ADDED",
    comment
  }));

  return comment;
}

export async function getComments(documentId: string) {
  return prisma.comment.findMany({
    where: { documentId },
    include: {
      author: { select: { email: true } },
      replies: {
        include: { author: { select: { email: true } } },
        orderBy: { createdAt: "asc" }
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { documentId: true }
  });
  
  if (!comment) return null;

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { isResolved: true },
  });

  await redis.publish(`doc:${comment.documentId}:comments`, JSON.stringify({
    type: "COMMENT_RESOLVED",
    commentId
  }));

  return updated;
}

export async function createReply(params: {
  commentId: string;
  authorId: string;
  body: string;
}) {
  const comment = await prisma.comment.findUnique({
    where: { id: params.commentId },
    select: { documentId: true, authorId: true }
  });

  if (!comment) return null;

  const reply = await prisma.commentReply.create({
    data: {
      commentId: params.commentId,
      authorId: params.authorId,
      body: params.body,
    },
    include: {
      author: { select: { email: true } },
    },
  });

  // Notify original comment author if it's someone else
  if (comment.authorId !== params.authorId) {
    const notification = await prisma.notification.create({
      data: {
        userId: comment.authorId,
        type: "REPLY",
        referenceId: params.commentId,
      },
    });

    await redis.publish(`user:${comment.authorId}:notifications`, JSON.stringify(notification));
  }

  await redis.publish(`doc:${comment.documentId}:comments`, JSON.stringify({
    type: "REPLY_ADDED",
    commentId: params.commentId,
    reply
  }));

  return reply;
}

function extractMentions(text: string): string[] {
  // Simple regex to find words starting with @ (e.g. @user@example.com)
  const regex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  return [...text.matchAll(regex)].map((m) => m[1]);
}
