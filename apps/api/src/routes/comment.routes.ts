import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  createReplyController,
  resolveCommentController,
  updateCommentController,
  deleteCommentController,
  updateReplyController,
  deleteReplyController
} from "../controllers/comment.controller";

export const commentRoutes = new Hono();

// All these routes are prefixed with /comments in index.ts

// 1. Resolve action
commentRoutes.patch("/:commentId/resolve", authMiddleware, resolveCommentController);

// 2. Replies
commentRoutes.post("/:commentId/replies", authMiddleware, createReplyController);

// 3. CRUD for Comments
commentRoutes.patch("/:commentId", authMiddleware, updateCommentController);
commentRoutes.delete("/:commentId", authMiddleware, deleteCommentController);

// 4. CRUD for Replies
commentRoutes.patch("/replies/:replyId", authMiddleware, updateReplyController);
commentRoutes.delete("/replies/:replyId", authMiddleware, deleteReplyController);
