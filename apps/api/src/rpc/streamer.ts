import { TwitchStreamer } from "../services/streamer";
import { protectedProcedure } from "./procedures";

export const streamerRouter = {
  getFollowed: protectedProcedure.handler(({ context }) =>
    TwitchStreamer.getFollowedStreamers(context.token.user_id, context.token.access_token),
  ),
};
