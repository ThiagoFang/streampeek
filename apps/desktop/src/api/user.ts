import { api } from "@/lib/axios";
import type { AuthUrlResponse, AuthStatusResponse, MeResponse } from "@/types/auth";

const userApi = {
  getAuthUrl: async () => {
    const { data } = await api<AuthUrlResponse>({
      method: "GET",
      url: "/auth/twitch",
    });
    return data;
  },
  getAuthStatus: async () => {
    const { data } = await api<AuthStatusResponse>({
      method: "GET",
      url: "/auth/status",
    });
    return data;
  },
  getMe: async () => {
    const { data } = await api<MeResponse>({
      method: "GET",
      url: "/auth/me",
    });
    return data;
  },
};

export { userApi };
