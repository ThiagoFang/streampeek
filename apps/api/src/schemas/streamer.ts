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
  usersResponse: type({
    data: type({
      id: "string",
      profile_image_url: "string",
    }).array(),
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
