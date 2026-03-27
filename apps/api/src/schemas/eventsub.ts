import { type } from "arktype";

export const EventSubSchemas = {
  baseMessage: type({ metadata: { message_type: "string" } }),
  welcomePayload: type({ session: { id: "string", keepalive_timeout_seconds: "number" } }),
  notificationEvent: type({
    broadcaster_user_id: "string",
    broadcaster_user_login: "string",
    broadcaster_user_name: "string",
  }),
  reconnectPayload: type({ session: { reconnect_url: "string" } }),
};
