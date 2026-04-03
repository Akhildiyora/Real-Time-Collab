import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { prisma } from "../../../../packages/db/src/index";
import { getYDoc, setupWSConnection, setContentInitializor } from "@y/websocket-server/utils";
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
const REDIS_INSTANCE_ID = crypto.randomUUID();

const bridgedDocs = new Map<string, boolean>();

function extractDocIdFromReq(req: IncomingMessage) {
  // y-websocket client connects to `ws://host:port/<roomname>?...`
  // @y/websocket-server uses the URL pathname as `docName` by default.
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);
  return url.pathname.replace(/^\//, "");
}

function getTokenFromReq(req: IncomingMessage) {
  const url = new URL(req.url || "/", `http://${req.headers.host ?? "localhost"}`);
  const tokenFromQuery = url.searchParams.get("token");

  const authHeader = req.headers.authorization;
  const bearer =
    typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "").trim() : undefined;

  return tokenFromQuery ?? bearer;
}

async function userCanAccessDocument(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return !!doc;
}

export async function setupYjsWebsocket(httpServer: any) {
  // Set initial content loader (best effort). For now we keep documents empty
  // and let Phase 6 persist Yjs state back to PostgreSQL.
  setContentInitializor(async (_ydoc) => {
    // Intentionally left blank for now.
  });

  const wss = new WebSocketServer({ noServer: true });

  // Redis subscriber: receives updates from other instances, applies them to the
  // local Y.Doc so connected clients receive them.
  const subscriber = redis.duplicate();
  await subscriber.connect();
  await subscriber.psubscribe("doc:*:updates", "doc:*:presence");
  subscriber.on("pmessage", (pattern: string, channel: string, message: string) => {
    void handleRedisMessage(pattern, channel, message);
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const docId = extractDocIdFromReq(req);
    if (!docId) {
      ws.close(1008, "Missing document id");
      return;
    }

    // Bridge Yjs <-> Redis for this doc (idempotent).
    void bridgeDocToRedis(docId);

    // Presence bridging:
    // - publish raw awareness messages from clients to Redis
    // - other instances forward the same raw message to their connected clients
    ws.on("message", (data: WebSocket.RawData) => {
      try {
        const message = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
        // y-websocket protocol: first varuint is message type (0=sync, 1=awareness).
        // Since message types are tiny (0/1), the varuint is encoded in the first byte.
        const messageType = message[0];
        const messageAwareness = 1;
        if (messageType !== messageAwareness) return;

        void redis.publish(docPresenceChannel(docId), JSON.stringify({
          instanceId: REDIS_INSTANCE_ID,
          message: message.toString("base64"),
        }));
      } catch {
        // If decoding fails, ignore the message (editor will still work locally).
      }
    });

    setupWSConnection(ws, req, { docName: docId, gc: true });
  });

  httpServer.on("upgrade", async (req: IncomingMessage, socket: any, head: Buffer) => {
    // Only handle WS upgrades
    if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== "websocket") return;

    const docId = extractDocIdFromReq(req);
    if (!docId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // Auth check: verify JWT access token, then confirm ownership/sharing in PostgreSQL.
    // For now, we accept any collaborator for read/write. Viewer restrictions can be
    // enforced once we introduce a write filter at the message layer.
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
      wss.emit("connection", ws, req);
    });
  });

  async function bridgeDocToRedis(documentId: string) {
    if (bridgedDocs.get(documentId)) return;
    bridgedDocs.set(documentId, true);

    const doc = getYDoc(documentId, true);

    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === REDIS_APPLY_ORIGIN) return;
      const payload = {
        instanceId: REDIS_INSTANCE_ID,
        update: Buffer.from(update).toString("base64"),
      };
      void redis.publish(docUpdatesChannel(documentId), JSON.stringify(payload));
    });
  }

  async function handleRedisMessage(_pattern: string, channel: string, message: string) {
    // channel: doc:{id}:updates | doc:{id}:presence
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

    if (!parsed) return;
    if (parsed.instanceId === REDIS_INSTANCE_ID) return;

    if (kind === "updates") {
      if (!parsed.update) return;
      const update = Uint8Array.from(Buffer.from(parsed.update, "base64"));
      doc.applyUpdate(update, REDIS_APPLY_ORIGIN);
      return;
    }

    if (kind === "presence") {
      if (!parsed.message) return;
      // For presence we forward raw awareness messages to connected clients.
      // Note: we intentionally don't apply to doc.awareness here, so the doc's
      // initial awareness snapshot might lag until the next local awareness update.
      const msgBytes = Uint8Array.from(Buffer.from(parsed.message, "base64"));
      doc.conns.forEach((_value: any, conn: any) => {
        if (conn.readyState === 1) conn.send(msgBytes);
      });
    }
  }
}

