import pino from "pino";

const isProduction = Bun.env.NODE_ENV === "production";

export const logger = pino({
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

export const log = {
  info: (data: Record<string, unknown>, msg: string) => logger.info(data, msg),
  warn: (data: Record<string, unknown>, msg: string) => logger.warn(data, msg),
  error: (data: Record<string, unknown>, msg: string) => logger.error(data, msg),
  debug: (data: Record<string, unknown>, msg: string) => logger.debug(data, msg),
};