import pino from "pino";

const isProduction = Bun.env.NODE_ENV === "production";

const logger = pino({
  level: isProduction ? "info" : "debug",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
