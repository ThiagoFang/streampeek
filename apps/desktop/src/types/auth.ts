export type AuthUrlResponse = { url: string; state: string };

export type AuthStatusResponse =
  | { authenticated: false }
  | { authenticated: true; session_id: string };

export type MeResponse = {
  user_id: string;
  user_login: string;
  user_display_name: string;
};
