import { api } from "@/lib/axios";
import type { Streamer } from "@streampeek/shared/types/streamer";

const streamerApi = {
  getFollowed: async () => {
    const { data } = await api<{ data: Streamer[] }>({
      method: "GET",
      url: "/streamers/followed",
    });
    return data.data;
  },
};

export { streamerApi };
