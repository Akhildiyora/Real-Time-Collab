import client from "prom-client";

// Collect default metrics (CPU, Memory, GC)
client.collectDefaultMetrics({ prefix: "neural_editor_" });

export const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "path", "status"],
});

export const httpResponseDuration = new client.Histogram({
  name: "http_response_duration_ms",
  help: "Duration of HTTP responses in milliseconds",
  labelNames: ["method", "path", "status"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

export const activeWebsocketConnections = new client.Gauge({
  name: "websocket_active_connections",
  help: "Number of active WebSocket connections",
});

export const register = client.register;
