import { redis } from "../redis";

export function documentUpdateChannel(documentId: string) {
  return `doc:${documentId}:updates`;
}

export function documentPresenceChannel(documentId: string) {
  return `doc:${documentId}:presence`;
}

export async function publishDocumentUpdate(documentId: string, payload: unknown) {
  await redis.publish(documentUpdateChannel(documentId), JSON.stringify(payload));
}

export async function publishDocumentPresence(documentId: string, payload: unknown) {
  await redis.publish(documentPresenceChannel(documentId), JSON.stringify(payload));
}

export async function setupDocumentChannels() {
  const subscriber = redis.duplicate();
  await subscriber.connect();
  await subscriber.psubscribe("doc:*:updates");
  await subscriber.psubscribe("doc:*:presence");
}
