import Redis from "ioredis";
import { envVariables } from "./env";

export const redis = new Redis(envVariables.REDIS_URL);
export const redisSub = new Redis(envVariables.REDIS_URL);

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err);
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});

redisSub.on("error", (err) => {
  console.error("[RedisSub] Connection error:", err);
});

export async function subscribe(channel: string, handler: (message: string) => void) {
  const subscriber = redisSub.duplicate();
  await subscriber.subscribe(channel);
  subscriber.on("message", (_, message) => handler(message));
  return () => subscriber.unsubscribe(channel).then(() => subscriber.quit());
}