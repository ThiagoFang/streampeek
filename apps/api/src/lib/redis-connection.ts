export function createBullMQConnection(redisUrl: string) {
  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}
