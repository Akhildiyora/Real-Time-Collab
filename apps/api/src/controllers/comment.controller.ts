import { Context } from "hono";
import { z } from "zod";
import * as commentService from "../services/comment.service";

const commentSchema = z.object({
  body: z.string().min(1),
  anchorData: z.any().optional(),
});

const replySchema = z.object({
  body: z.string().min(1),
});

export async function listCommentsController(c: Context) {
  const documentId = c.req.param("id")!;
  const comments = await commentService.getComments(documentId);
  return c.json(comments);
}

export async function createCommentController(c: Context) {
  const user = c.get("user") as { sub: string };
  const documentId = c.req.param("id")!;
  const body = await c.req.json();
  const parsed = commentSchema.parse(body);

  const comment = await commentService.createComment({
    documentId,
    authorId: user.sub,
    body: parsed.body,
    anchorData: parsed.anchorData,
  });

  return c.json(comment, 201);
}

export async function resolveCommentController(c: Context) {
  const user = c.get("user") as { sub: string };
  const commentId = c.req.param("commentId")!;

  const result = await commentService.resolveComment(commentId, user.sub);
  if (!result) return c.json({ error: "Comment not found" }, 404);

  return c.json(result);
}

export async function createReplyController(c: Context) {
  const user = c.get("user") as { sub: string };
  const commentId = c.req.param("commentId")!;
  const body = await c.req.json();
  const parsed = replySchema.parse(body);

  const reply = await commentService.createReply({
    commentId,
    authorId: user.sub,
    body: parsed.body,
  });

  if (!reply) return c.json({ error: "Comment not found" }, 404);
  return c.json(reply, 201);
}
