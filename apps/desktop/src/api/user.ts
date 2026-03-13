import { api } from "@/lib/axios";

const userApi = {
  getAuthUrl: async () => {
    const { data } = await api.get("/auth/twitch");
    return data;
  },
  getAuthStatus: async () => {
    const { data } = await api.get("/auth/status");
    return data;
  },
};

export { userApi };