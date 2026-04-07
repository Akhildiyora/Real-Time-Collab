import pino from "pino";

// Configure logger based on environment
const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      }
    : undefined,
});

// Helper for structured metadata
export const logContext = (context: Record<string, any>) => {
  return logger.child(context);
};
