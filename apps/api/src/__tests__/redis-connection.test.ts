import { describe, expect, it } from "bun:test";
import { createBullMQQueueConnection, createBullMQWorkerConnection } from "../lib/redis-connection";

describe("BullMQ Redis connection", () => {
  it("preserves authentication, TLS and database information from the Redis URL", () => {
    const redisUrl = "rediss://queue-user:p%40ssword@redis.example.com:6380/4";

    expect(createBullMQWorkerConnection(redisUrl)).toEqual({
      url: redisUrl,
      maxRetriesPerRequest: null,
    });
    expect(createBullMQQueueConnection(redisUrl)).toEqual({
      url: redisUrl,
      maxRetriesPerRequest: 3,
    });
  });
});
