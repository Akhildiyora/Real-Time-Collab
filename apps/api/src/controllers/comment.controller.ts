import { Context } from "hono";
import { z } from "zod";
import * as commentService from "../services/comment.service";
import { prisma } from "@repo/db";

const commentSchema = z.object({
  content: z.string().min(1),
  anchorData: z.any().optional(),
});

const replySchema = z.object({
  content: z.string().min(1),
});

export async function listCommentsController(c: Context) {
  const documentId = c.req.param("id")!;
  const comments = await commentService.getComments(documentId);
  return c.json(comments);
}

export async function createCommentController(c: Context) {
  try {
    const jwtPayload = c.get("jwtPayload") as { sub: string } | undefined;
    const user = c.get("user") as { sub: string } | undefined;
    const isPublic = c.get("isPublic") as boolean;
    const documentId = c.req.param("id")!;
    const body = await c.req.json();
    const parsed = commentSchema.parse(body);

    let authorId = jwtPayload?.sub || user?.sub;
    
    if (!authorId && isPublic) {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) {
        return c.json({ error: "Document not found" }, 404);
      }
      authorId = doc.ownerId;
    }

    if (!authorId) {
      console.error(`[COMMENT_500] No author found. docId: ${documentId}, isPublic: ${isPublic}`);
      return c.json({ error: "Unauthorized: Could not establish identity for comment" }, 401);
    }

    const comment = await commentService.createComment({
      documentId,
      content: parsed.content,
      anchorData: {
        ...(parsed.anchorData || {}),
        isAnonymous: !jwtPayload?.sub && isPublic
      },
      authorId: authorId as string
    });

    return c.json(comment, 201);
  } catch (error: any) {
    console.error(`[COMMENT_500] Fatal:`, error);
    return c.json({ error: "Failed to create comment", details: error.message }, 500);
  }
}

export async function resolveCommentController(c: Context) {
  const payload = (c.get("jwtPayload") || c.get("user")) as { sub: string };
  const commentId = c.req.param("commentId")!;

  const result = await commentService.resolveComment(commentId, payload.sub);
  if (!result) return c.json({ error: "Comment not found" }, 404);

  return c.json(result);
}

export async function createReplyController(c: Context) {
  const payload = (c.get("jwtPayload") || c.get("user")) as { sub: string };
  const commentId = c.req.param("commentId")!;
  const body = await c.req.json();
  const parsed = replySchema.parse(body);

  const reply = await commentService.createReply({
    commentId,
    content: parsed.content,
    authorId: payload.sub
  });

  if (!reply) return c.json({ error: "Comment not found" }, 404);
  return c.json(reply, 201);
}

export async function updateCommentController(c: Context) {
  const payload = (c.get("jwtPayload") || c.get("user")) as { sub: string };
  const commentId = c.req.param("commentId")!;
  const body = await c.req.json();
  const parsed = commentSchema.parse(body);

  const result = await commentService.updateComment(commentId, parsed.content, payload.sub);
  if (!result) return c.json({ error: "Comment not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);

  return c.json(result);
}

export async function deleteCommentController(c: Context) {
  const payload = (c.get("jwtPayload") || c.get("user")) as { sub: string };
  const commentId = c.req.param("commentId")!;

  const result = await commentService.deleteComment(commentId, payload.sub);
  if (!result) return c.json({ error: "Comment not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);

  return c.json({ success: true });
}

export async function updateReplyController(c: Context) {
  const payload = (c.get("jwtPayload") || c.get("user")) as { sub: string };
  const replyId = c.req.param("replyId")!;
  const body = await c.req.json();
  const parsed = replySchema.parse(body);

  const result = await commentService.updateReply(replyId, parsed.content, payload.sub);
  if (!result) return c.json({ error: "Reply not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);

  return c.json(result);
}

export async function deleteReplyController(c: Context) {
  const payload = (c.get("jwtPayload") || c.get("user")) as { sub: string };
  const replyId = c.req.param("replyId")!;

  const result = await commentService.deleteReply(replyId, payload.sub);
  if (!result) return c.json({ error: "Reply not found" }, 404);
  if (result === "forbidden") return c.json({ error: "Forbidden" }, 403);

  return c.json({ success: true });
}
