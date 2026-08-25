import Redis from "ioredis";
import { envVariables } from "./env";
import { createLogger } from "./logger";
import { createBullMQConnection } from "./redis-connection";

const logger = createLogger({ component: "redis" });

export const redis = new Redis(envVariables.REDIS_URL);
export const redisSub = new Redis(envVariables.REDIS_URL);
export const bullMQConnection = createBullMQConnection(envVariables.REDIS_URL);

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

redisSub.on("error", (err) => {
  logger.error({ err }, "RedisSub connection error");
});

export async function subscribe(channel: string, handler: (message: string) => void) {
  const subscriber = redisSub.duplicate();
  await subscriber.subscribe(channel);
  subscriber.on("message", (_, message) => handler(message));
  return async () => {
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
  };
}
