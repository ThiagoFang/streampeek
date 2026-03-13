export type AuthUrlResponse = { url: string };

export type AuthStatusResponse = { authenticated: boolean };

export type MeResponse = {
  user_id: string;
  user_login: string;
  user_display_name: string;
};
