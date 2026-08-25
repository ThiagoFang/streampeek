import axios from "redaxios";
import { envVariables } from "../lib/env";
import { createTwitchAuthClient } from "./twitch-auth";

export const TwitchAuth = createTwitchAuthClient({
  clientId: envVariables.TWITCH_CLIENT_ID,
  clientSecret: envVariables.TWITCH_CLIENT_SECRET,
  redirectUri: envVariables.TWITCH_REDIRECT_URI,
  request: async ({ body, ...request }) => {
    const { data } = await axios({ ...request, data: body });
    return data;
  },
});
