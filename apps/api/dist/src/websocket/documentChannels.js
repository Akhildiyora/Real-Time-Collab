import { redis } from "../redis";
export function documentUpdateChannel(documentId) {
    return `doc:${documentId}:updates`;
}
export function documentPresenceChannel(documentId) {
    return `doc:${documentId}:presence`;
}
export async function publishDocumentUpdate(documentId, payload) {
    await redis.publish(documentUpdateChannel(documentId), JSON.stringify(payload));
}
export async function publishDocumentPresence(documentId, payload) {
    await redis.publish(documentPresenceChannel(documentId), JSON.stringify(payload));
}
export async function setupDocumentChannels() {
    const subscriber = redis.duplicate();
    await subscriber.connect();
    await subscriber.pSubscribe("doc:*:updates", () => { });
    await subscriber.pSubscribe("doc:*:presence", () => { });
}
