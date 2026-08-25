export function createBullMQWorkerConnection(redisUrl: string) {
  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}

export function createBullMQQueueConnection(redisUrl: string) {
  return {
    url: redisUrl,
    maxRetriesPerRequest: 3,
  };
}
