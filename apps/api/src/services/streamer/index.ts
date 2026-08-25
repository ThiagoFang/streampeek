import axios from "redaxios";
import { envVariables } from "../../lib/env";
import { createTwitchStreamerClient } from "./client";
import { createStreamerService } from "./service";

export const TwitchStreamerClient = createTwitchStreamerClient({
  clientId: envVariables.TWITCH_CLIENT_ID,
  request: async (request) => {
    const { data } = await axios<unknown>({ method: "GET", ...request });
    return data;
  },
});

export const StreamerService = createStreamerService(TwitchStreamerClient);
