import { type } from "arktype";

export const AuthSchemas = {
  callbackQuery: type({
    code: "string > 0",
    state: "string > 0",
  }),
  tokenResponse: type({
    access_token: "string",
    refresh_token: "string",
    token_type: "string",
    expires_in: "number",
  }),
  twitchUser: type({
    id: "string",
    login: "string",
    display_name: "string",
  }),
};
