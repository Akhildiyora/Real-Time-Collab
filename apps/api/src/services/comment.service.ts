import { prisma } from "@repo/db";
import { redis } from "../redis";
import * as notificationService from "./notification.service";

export async function createComment(params: {
  documentId: string;
  authorId: string;
  content: string;
  anchorData?: any;
}) {
  const comment = await prisma.comment.create({
    data: {
      documentId: params.documentId,
      authorId: params.authorId,
      content: params.content,
      anchorData: params.anchorData,
    },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  // 1. Extract and handle mentions (@username)
  const usernames = extractMentions(params.content);
  if (usernames.length > 0) {
    // We match usernames. For simplicity in this system, 
    // username is the email prefix (e.g. 'akhil' from 'akhil@example.com')
    const users = await prisma.user.findMany({
      where: {
        OR: filenamesToUserQueries(usernames)
      },
      select: { id: true, email: true },
    });

    for (const targetUser of users) {
      if (targetUser.id === params.authorId) continue;

      await prisma.mention.create({
        data: {
          commentId: comment.id,
          userId: targetUser.id,
        },
      });

      await notificationService.createNotification({
        userId: targetUser.id,
        type: "MENTION",
        referenceId: comment.id,
      });
    }
  }

  // 2. Broadcast to all collaborators
  await redis.publish(`doc:${params.documentId}:comments`, JSON.stringify({
    type: "COMMENT_ADDED",
    payload: comment
  }));

  return comment;
}

export async function getComments(documentId: string) {
  return prisma.comment.findMany({
    where: { documentId },
    include: {
      author: { select: { id: true, email: true } },
      replies: {
        include: { author: { select: { id: true, email: true } } },
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
    payload: { commentId }
  }));

  return updated;
}

export async function createReply(params: {
  commentId: string;
  authorId: string;
  content: string;
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
      content: params.content,
    },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  // Notify original author if someone else replies
  if (comment.authorId !== params.authorId) {
    await notificationService.createNotification({
      userId: comment.authorId,
      type: "REPLY",
      referenceId: params.commentId,
    });
  }

  await redis.publish(`doc:${comment.documentId}:comments`, JSON.stringify({
    type: "REPLY_ADDED",
    payload: { commentId: params.commentId, reply }
  }));

  return reply;
}

export async function updateComment(commentId: string, content: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { documentId: true, authorId: true }
  });

  if (!comment) return null;
  if (comment.authorId !== userId) return "forbidden" as const;

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: { author: { select: { id: true, email: true } } }
  });

  await redis.publish(`doc:${comment.documentId}:comments`, JSON.stringify({
    type: "COMMENT_UPDATED",
    payload: updated
  }));

  return updated;
}

export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { document: { select: { ownerId: true } } }
  });

  if (!comment) return null;
  
  // Allow author OR document owner to delete
  if (comment.authorId !== userId && comment.document.ownerId !== userId) {
    return "forbidden" as const;
  }

  await prisma.comment.delete({ where: { id: commentId } });

  await redis.publish(`doc:${comment.documentId}:comments`, JSON.stringify({
    type: "COMMENT_DELETED",
    payload: { commentId }
  }));

  return true;
}

export async function updateReply(replyId: string, content: string, userId: string) {
  const reply = await prisma.commentReply.findUnique({
    where: { id: replyId },
    include: { comment: { select: { documentId: true } } }
  });

  if (!reply) return null;
  if (reply.authorId !== userId) return "forbidden" as const;

  const updated = await prisma.commentReply.update({
    where: { id: replyId },
    data: { content },
    include: { author: { select: { id: true, email: true } } }
  });

  await redis.publish(`doc:${reply.comment.documentId}:comments`, JSON.stringify({
    type: "REPLY_UPDATED",
    payload: { commentId: reply.commentId, reply: updated }
  }));

  return updated;
}

export async function deleteReply(replyId: string, userId: string) {
  const reply = await prisma.commentReply.findUnique({
    where: { id: replyId },
    include: { 
      comment: { 
        select: { 
          documentId: true, 
          document: { select: { ownerId: true } } 
        } 
      } 
    }
  });

  if (!reply) return null;

  // Allow author OR document owner to delete
  if (reply.authorId !== userId && reply.comment.document.ownerId !== userId) {
    return "forbidden" as const;
  }

  await prisma.commentReply.delete({ where: { id: replyId } });

  await redis.publish(`doc:${reply.comment.documentId}:comments`, JSON.stringify({
    type: "REPLY_DELETED",
    payload: { commentId: reply.commentId, replyId }
  }));

  return true;
}

function extractMentions(text: string): string[] {
  // Regex to find @username (alphanumeric and underscores)
  const regex = /@(\w+)/g;
  return [...text.matchAll(regex)].map((m) => m[1]);
}

function filenamesToUserQueries(usernames: string[]) {
  // Utility to match email prefixes in Prisma
  return usernames.map(u => ({
    email: { startsWith: `${u}@` }
  }));
}
