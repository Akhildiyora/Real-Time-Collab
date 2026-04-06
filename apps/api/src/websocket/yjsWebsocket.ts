import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import { prisma } from "@repo/db";
// @ts-ignore - y-websocket/bin/utils is the standard location for setupWSConnection
import { setupWSConnection, setPersistence, getYDoc } from "y-websocket/bin/utils";
import { redis } from "../redis";
import { verifyAccessToken } from "../services/token.service";

// Matches your architecture naming:
// - doc:{id}:updates
// - doc:{id}:presence
function docUpdatesChannel(documentId: string) {
  return `doc:${documentId}:updates`;
}
function docPresenceChannel(documentId: string) {
  return `doc:${documentId}:presence`;
}

const REDIS_APPLY_ORIGIN = { kind: "redis-apply" } as const;
const PERSISTENCE_ORIGIN = { kind: "prisma-persistence" } as const;
const REDIS_INSTANCE_ID = crypto.randomUUID();

const bridgedDocs = new Map<string, boolean>();
const userSockets = new Map<string, Set<WebSocket>>();
const DEBOUNCE_MS = 10000;

export async function setupYjsWebsocket(httpServer: any) {
  // Persistence: Load initial document state from Prisma
  setPersistence({
    bindState: async (docName: string, ydoc: Y.Doc) => {
      // 1. Load from DB
      const doc = await prisma.document.findUnique({
        where: { id: docName },
        select: { content: true, yjsState: true },
      });

      if (doc?.yjsState) {
        Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState as any), PERSISTENCE_ORIGIN);
      } else if (doc?.content) {
        const text = ydoc.getText("default");
        text.insert(0, doc.content);
      }

      // 2. We handle the saving ourselves in bridgeDocToRedis to integrate with Redis
    },
    writeState: async (_docName: string, _ydoc: Y.Doc) => {
      // Handled in bridgeDocToRedis
      return true;
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  // Connect both main and subscriber if not already
  const subscriber = redis.duplicate();
  if (subscriber.status === "wait") await subscriber.connect();

  await subscriber.psubscribe(
    "doc:*:updates",
    "doc:*:presence",
    "doc:*:comments",
    "user:*:notifications"
  );
  subscriber.on("pmessage", (pattern: string, channel: string, message: string) => {
    void handleRedisMessage(pattern, channel, message);
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const docId = extractDocIdFromReq(req);
    const userId = (req as any).userId;
    if (!docId || !userId) {
      ws.close(1008, "Missing required context");
      return;
    }

    // Track user socket for targeted notifications
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(ws);

    ws.on("close", () => {
      userSockets.get(userId)?.delete(ws);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
    });

    void bridgeDocToRedis(docId);

    ws.on("message", (data: WebSocket.RawData) => {
      try {
        const message = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
        const messageType = message[0];
        const messageAwareness = 1;
        if (messageType !== messageAwareness) return;

        void redis.publish(docPresenceChannel(docId), JSON.stringify({
          instanceId: REDIS_INSTANCE_ID,
          message: message.toString("base64"),
        }));
      } catch {
        // Ignore awareness decoding issues
      }
    });

    setupWSConnection(ws, req, { docName: docId, gc: true });
  });

  httpServer.on("upgrade", async (req: IncomingMessage, socket: any, head: Buffer) => {
    if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== "websocket") return;

    const docId = extractDocIdFromReq(req);
    if (!docId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const token = getTokenFromReq(req);
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let payload: { sub: string } | undefined;
    try {
      payload = verifyAccessToken(token) as any;
    } catch {
      payload = undefined;
    }

    if (!payload?.sub) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const canAccess = await userCanAccessDocument(docId, payload.sub);
    if (!canAccess) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      (req as any).userId = payload!.sub;
      wss.emit("connection", ws, req);
    });
  });

  async function bridgeDocToRedis(documentId: string) {
    if (bridgedDocs.get(documentId)) return;
    bridgedDocs.set(documentId, true);

    const doc = getYDoc(documentId, true) as any;
    doc.name = documentId;

    let timeout: NodeJS.Timeout | null = null;

    doc.on("update", (update: Uint8Array, origin: any) => {
      // 1. Publish to Redis (if not coming from Redis)
      if (origin !== REDIS_APPLY_ORIGIN) {
        const payload = {
          instanceId: REDIS_INSTANCE_ID,
          update: Buffer.from(update).toString("base64"),
        };
        void redis.publish(docUpdatesChannel(documentId), JSON.stringify(payload));
      }

      // 2. Persist to DB (Debounced)
      if (origin !== PERSISTENCE_ORIGIN) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(async () => {
          const state = Y.encodeStateAsUpdate(doc);
          const content = doc.getText("default").toString();
          
          await prisma.document.update({
            where: { id: documentId },
            data: {
              yjsState: Buffer.from(state),
              content: content,
            },
          });
          timeout = null;
        }, DEBOUNCE_MS);
      }
    });
  }

  async function handleRedisMessage(_pattern: string, channel: string, message: string) {
    const parts = channel.split(":");
    const documentId = parts[1];
    if (!documentId) return;

    const doc = getYDoc(documentId, true) as any;
    const kind = parts[2];
    let parsed: { instanceId?: string; update?: string; message?: string } | null = null;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    if (!parsed || parsed.instanceId === REDIS_INSTANCE_ID) return;

    if (kind === "updates" && parsed.update) {
      const update = Uint8Array.from(Buffer.from(parsed.update, "base64"));
      doc.applyUpdate(update, REDIS_APPLY_ORIGIN);
    } else if (kind === "presence" && parsed.message) {
      const msgBytes = Uint8Array.from(Buffer.from(parsed.message, "base64"));
      doc.conns.forEach((_value: any, conn: any) => {
        if (conn.readyState === 1) conn.send(msgBytes);
      });
    } else if (kind === "comments") {
      // Send comment events to all connections in this document
      doc.conns.forEach((_value: any, conn: any) => {
        if (conn.readyState === 1) {
          conn.send(JSON.stringify({ type: "SYNC_EVENT", payload: parsed }));
        }
      });
    } else if (kind === "notifications") {
      // Send notification to specific user's sockets
      const userId = parts[1];
      userSockets.get(userId)?.forEach((ws) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "NOTIFICATION", payload: parsed }));
        }
      });
    }
  }
}

function extractDocIdFromReq(req: IncomingMessage) {
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);
  return url.pathname.replace(/^\//, "");
}

function getTokenFromReq(req: IncomingMessage) {
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);
  return url.searchParams.get("token") || req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
}

async function userCanAccessDocument(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!doc;
}
