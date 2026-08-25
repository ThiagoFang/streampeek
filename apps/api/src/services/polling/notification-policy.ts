import type { StreamEvent } from "./types";

interface NotificationPolicy {
  notificationsEnabled: boolean;
  streamerExcluded: boolean;
}

export function shouldNotify(event: StreamEvent, policy: NotificationPolicy): boolean {
  return event.type === "stream.online" && policy.notificationsEnabled && !policy.streamerExcluded;
}
