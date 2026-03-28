import { type } from "arktype";

export const NotificationExclusionSchemas = {
  add: type({
    broadcaster_id: "string > 0",
    broadcaster_login: "string > 0",
    broadcaster_name: "string > 0",
  }),
  remove: type({
    broadcaster_id: "string > 0",
  }),
};
