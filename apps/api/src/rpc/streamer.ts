import { StreamerService } from "../services/streamer";
import { protectedProcedure } from "./procedures";

export const streamerRouter = {
  getFollowed: protectedProcedure.handler(({ context }) =>
    StreamerService.getFollowed(context.token.user_id, context.token.access_token),
  ),
};
