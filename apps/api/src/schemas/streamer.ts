import { type } from "arktype";

export const StreamerSchemas = {
  followedResponse: type({
    data: type({
      broadcaster_id: "string",
      broadcaster_login: "string",
      broadcaster_name: "string",
    }).array(),
    pagination: type({
      "cursor?": "string",
    }),
  }),
  streamsResponse: type({
    data: type({
      user_id: "string",
      viewer_count: "number",
      game_name: "string",
      thumbnail_url: "string",
      started_at: "string",
    }).array(),
  }),
};