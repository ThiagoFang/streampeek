import type { ColumnType } from "kysely";
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type AuthToken = {
  id: Generated<number>;
  session_id: string;
  access_token: string;
  refresh_token: string;
  user_id: string;
  user_login: string;
  user_display_name: string;
  profile_image_url: string;
  expires_at: Timestamp;
  created_at: Generated<Timestamp>;
};
export type NotificationExclusion = {
  id: Generated<number>;
  user_id: string;
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
};
export type UserSettings = {
  id: Generated<number>;
  user_id: string;
  notifications_enabled: Generated<boolean>;
  updated_at: Generated<Timestamp>;
};
export type DB = {
  auth_tokens: AuthToken;
  notification_exclusions: NotificationExclusion;
  user_settings: UserSettings;
};
