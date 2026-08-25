import { StreamerSchemas } from "../../schemas/streamer";

export type FollowedChannel = (typeof StreamerSchemas.followedResponse.infer.data)[number];
export type StreamSnapshot = (typeof StreamerSchemas.streamsResponse.infer.data)[number];
export type TwitchUser = (typeof StreamerSchemas.usersResponse.infer.data)[number];
