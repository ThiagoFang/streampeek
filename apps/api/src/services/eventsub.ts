import axios from "redaxios";
import { EventSubSchemas } from "../schemas/eventsub";
import { TwitchStreamer } from "./streamer";
import type { StreamEventBus } from "../lib/event-bus";

export class TwitchEventSub {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private keepaliveTimer: Timer | null = null;
  private reconnectAttempts = 0;
  private accessToken: string | null = null;
  private clientId: string | null = null;
  private userId: string | null = null;

  constructor(private bus: StreamEventBus) {}

  connect(accessToken: string, clientId: string, userId: string) {
    this.accessToken = accessToken;
    this.clientId = clientId;
    this.userId = userId;
    this.reconnectAttempts = 0;
    this.openWebSocket("wss://eventsub.wss.twitch.tv/ws");
  }

  disconnect() {
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.ws = null;
    this.sessionId = null;
    this.accessToken = null;
    this.clientId = null;
    this.userId = null;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private openWebSocket(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (e) => this.handleMessage(e.data as string);
    this.ws.onclose = () => this.handleClose();
    this.ws.onerror = () => this.ws?.close();
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[EventSub] Failed to parse message");
      return;
    }
    const { message_type } = EventSubSchemas.baseMessage.assert(parsed).metadata;
    const data = parsed as { payload: Record<string, unknown> };

    switch (message_type) {
      case "session_welcome":
        this.handleWelcome(data.payload);
        break;
      case "notification": {
        const payload = data.payload as { subscription: { type: string }; event: unknown };
        this.handleNotification(payload.subscription.type, payload.event);
        break;
      }
      case "session_reconnect":
        this.handleReconnect(data.payload);
        break;
      case "session_keepalive": {
        const session = (data.payload as { session?: { keepalive_timeout_seconds?: number } }).session;
        this.resetKeepaliveTimer(session?.keepalive_timeout_seconds);
        break;
      }
    }
  }

  private handleWelcome(payload: unknown) {
    const { session } = EventSubSchemas.welcomePayload.assert(payload);
    this.sessionId = session.id;
    this.reconnectAttempts = 0;
    this.resetKeepaliveTimer(session.keepalive_timeout_seconds);

    if (this.accessToken && this.clientId && this.userId) {
      this.subscribeToEvents(this.accessToken, this.clientId, this.userId);
    }
  }

  private handleNotification(subscriptionType: string, event: unknown) {
    const validated = EventSubSchemas.notificationEvent.assert(event);

    if (subscriptionType === "stream.online" || subscriptionType === "stream.offline") {
      this.bus.emit({
        type: subscriptionType,
        broadcasterUserId: validated.broadcaster_user_id,
        broadcasterUserLogin: validated.broadcaster_user_login,
        broadcasterUserName: validated.broadcaster_user_name,
      });
    }
  }

  private handleReconnect(payload: unknown) {
    const { session } = EventSubSchemas.reconnectPayload.assert(payload);
    const oldWs = this.ws;
    this.openWebSocket(session.reconnect_url);
    setTimeout(() => oldWs?.close(), 5000);
  }

  private resetKeepaliveTimer(timeoutSeconds?: number) {
    if (this.keepaliveTimer) clearTimeout(this.keepaliveTimer);
    const timeout = ((timeoutSeconds ?? 10) + 10) * 1000;
    this.keepaliveTimer = setTimeout(() => {
      console.log("[EventSub] Keepalive timeout, reconnecting...");
      this.ws?.close();
    }, timeout);
  }

  private handleClose() {
    if (!this.accessToken) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    console.log(`[EventSub] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.openWebSocket("wss://eventsub.wss.twitch.tv/ws"), delay);
  }

  private async subscribeToEvents(accessToken: string, clientId: string, userId: string) {
    const channels = await TwitchStreamer.getFollowedChannels(userId, accessToken);

    if (channels.length > 150) {
      console.warn(
        `[EventSub] User follows ${channels.length} channels. Max 300 subscriptions per WS. Some may fail.`,
      );
    }

    const types = ["stream.online", "stream.offline"] as const;
    const batchSize = 20;

    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      const promises = batch.flatMap((channel) =>
        types.map((eventType) =>
          this.createSubscription(accessToken, clientId, eventType, channel.broadcaster_id).catch((err) => {
            if (err?.status !== 409) {
              console.error(`[EventSub] Failed to subscribe ${eventType} for ${channel.broadcaster_id}:`, err?.status ?? err);
            }
          }),
        ),
      );
      await Promise.all(promises);
    }

    console.log(`[EventSub] Subscribed to ${channels.length * 2} events for ${channels.length} channels`);
  }

  private async createSubscription(accessToken: string, clientId: string, eventType: string, broadcasterId: string) {
    await axios({
      method: "POST",
      url: "https://api.twitch.tv/helix/eventsub/subscriptions",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": clientId,
        "Content-Type": "application/json",
      },
      data: {
        type: eventType,
        version: "1",
        condition: { broadcaster_user_id: broadcasterId },
        transport: { method: "websocket", session_id: this.sessionId },
      },
    });
  }
}
