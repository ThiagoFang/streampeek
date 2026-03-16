const queryKeys = {
  auth: {
    url: ["auth", "url"] as const,
    status: ["auth", "status"] as const,
    me: ["auth", "me"] as const,
  },
  streamers: {
    followed: ["streamers", "followed"] as const,
  },
};

export { queryKeys };