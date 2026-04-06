import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.middleware";
import { documentAccessMiddleware } from "../middlewares/document.middleware";
import {
  createDocumentController,
  deleteDocumentController,
  getDocumentController,
  listDocumentsController,
  listVersionsController,
  shareDocumentController,
  updateDocumentController,
} from "../controllers/document.controller";
import {
  createCommentController,
  createReplyController,
  listCommentsController,
  resolveCommentController,
} from "../controllers/comment.controller";

export const documentRoutes = new Hono();

documentRoutes.use("*", authMiddleware);

documentRoutes.get("/documents", listDocumentsController);
documentRoutes.post("/documents", createDocumentController);
documentRoutes.get("/documents/:id", documentAccessMiddleware, getDocumentController);
documentRoutes.put("/documents/:id", documentAccessMiddleware, updateDocumentController);
documentRoutes.delete("/documents/:id", documentAccessMiddleware, deleteDocumentController);
documentRoutes.post("/documents/:id/share", documentAccessMiddleware, shareDocumentController);
documentRoutes.get("/documents/:id/versions", documentAccessMiddleware, listVersionsController);

// Comment Routes
documentRoutes.get("/documents/:id/comments", documentAccessMiddleware, listCommentsController);
documentRoutes.post("/documents/:id/comments", documentAccessMiddleware, createCommentController);
documentRoutes.patch("/documents/comments/:commentId/resolve", resolveCommentController);
documentRoutes.post("/documents/comments/:commentId/replies", createReplyController);

