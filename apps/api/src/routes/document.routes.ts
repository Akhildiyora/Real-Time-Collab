import { Hono } from "hono";
import { authMiddleware } from "../middlewares/auth.middleware";
import { documentAccessMiddleware } from "../middlewares/document.middleware";
import {
  createDocumentController,
  deleteDocumentController,
  getDocumentController,
  getDocumentAuditLogsController,
  listDocumentsController,
  listVersionsController,
  searchDocumentsController,
  shareDocumentController,
  updateDocumentController,
  seedDocumentsController,
} from "../controllers/document.controller";
import {
  createCommentController,
  createReplyController,
  listCommentsController,
  resolveCommentController,
} from "../controllers/comment.controller";
import {
  createShareLinkController,
  listShareLinksController,
  deleteShareLinkController
} from "../controllers/sharing.controller";
import {
  exportPDFController,
  exportDOCXController
} from "../controllers/export.controller";
import { uploadDocumentController } from "../controllers/upload.controller";

export const documentRoutes = new Hono();

// 1. Private Routes (Require explicit JWT authentication)
documentRoutes.get("/documents", authMiddleware, listDocumentsController);
documentRoutes.get("/documents/search", authMiddleware, searchDocumentsController);
documentRoutes.post("/documents", authMiddleware, createDocumentController);
documentRoutes.post("/documents/seed", authMiddleware, seedDocumentsController);
documentRoutes.post("/documents/upload", authMiddleware, uploadDocumentController);

// 2. Resource Routes (Support JWT OR Public Share Token)
// documentAccessMiddleware handles both cases
documentRoutes.get("/documents/:id", documentAccessMiddleware, getDocumentController);
documentRoutes.put("/documents/:id", documentAccessMiddleware, updateDocumentController);
documentRoutes.patch("/documents/:id", documentAccessMiddleware, updateDocumentController);
documentRoutes.delete("/documents/:id", documentAccessMiddleware, deleteDocumentController);
documentRoutes.post("/documents/:id/share", documentAccessMiddleware, shareDocumentController);
documentRoutes.get("/documents/:id/versions", documentAccessMiddleware, listVersionsController);

// 3. Sharing & Public Link Management (Requires Admin via middleware)
documentRoutes.get("/documents/:id/share-links", documentAccessMiddleware, listShareLinksController);
documentRoutes.get("/documents/:id/audit-logs", documentAccessMiddleware, getDocumentAuditLogsController);
documentRoutes.post("/documents/:id/share-links", documentAccessMiddleware, createShareLinkController);
documentRoutes.delete("/documents/:id/share-links/:tokenId", documentAccessMiddleware, deleteShareLinkController);

// 5. Export Routes
documentRoutes.get("/documents/:id/export/pdf", documentAccessMiddleware, exportPDFController);
documentRoutes.get("/documents/:id/export/docx", documentAccessMiddleware, exportDOCXController);

// 4. Comment Routes (Support JWT OR Public Share Token)
documentRoutes.get("/documents/:id/comments", documentAccessMiddleware, listCommentsController);
documentRoutes.post("/documents/:id/comments", documentAccessMiddleware, createCommentController);
