use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StreamEvent {
    #[serde(rename = "type")]
    event_type: String,
    broadcaster_user_name: Option<String>,
    broadcaster_user_login: Option<String>,
    game_name: Option<String>,
    #[serde(rename = "shouldNotify", default = "notification_enabled_by_default")]
    should_notify: bool,
}

fn notification_enabled_by_default() -> bool {
    true
}

#[derive(Clone, Serialize)]
struct StreamerPayload {
    login: String,
    display_name: String,
    game_name: Option<String>,
}

pub struct SseClient {
    online_streamers: Arc<Mutex<HashSet<String>>>,
    running: Option<Arc<AtomicBool>>,
    task: Option<JoinHandle<()>>,
}

impl SseClient {
    pub fn new(online_streamers: Arc<Mutex<HashSet<String>>>) -> Self {
        Self {
            online_streamers,
            running: None,
            task: None,
        }
    }

    pub async fn replace(
        &mut self,
        app_handle: AppHandle,
        session_id: String,
        api_base_url: String,
    ) {
        self.stop().await;
        crate::update_tray_icon(&app_handle, false);
        self.start(app_handle, session_id, api_base_url);
    }

    fn start(&mut self, app_handle: AppHandle, session_id: String, api_base_url: String) {
        let online_streamers = self.online_streamers.clone();
        let running = Arc::new(AtomicBool::new(true));
        self.running = Some(running.clone());

        let task = tokio::spawn(async move {
            let mut delay = Duration::from_secs(1);
            let max_delay = Duration::from_secs(30);
            let client = reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(10))
                .build()
                .expect("failed to build HTTP client");

            while running.load(Ordering::SeqCst) {
                match connect_and_process(
                    &app_handle,
                    &client,
                    &session_id,
                    &api_base_url,
                    &online_streamers,
                    &running,
                )
                .await
                {
                    Ok(()) => {
                        delay = Duration::from_secs(1);
                    }
                    Err(e) => {
                        log::error!("SSE connection error: {}", e);
                    }
                }

                if !running.load(Ordering::SeqCst) {
                    break;
                }

                tokio::time::sleep(delay).await;
                delay = std::cmp::min(delay * 2, max_delay);
            }
        });

        self.task = Some(task);
    }

    pub async fn stop(&mut self) {
        if let Some(running) = self.running.take() {
            running.store(false, Ordering::SeqCst);
        }
        if let Some(task) = self.task.take() {
            task.abort();
        }
        clear_online_state(&self.online_streamers).await;
    }
}

async fn clear_online_state(online_streamers: &Arc<Mutex<HashSet<String>>>) {
    online_streamers.lock().await.clear();
}

async fn connect_and_process(
    app_handle: &AppHandle,
    client: &reqwest::Client,
    session_id: &str,
    api_base_url: &str,
    online_streamers: &Arc<Mutex<HashSet<String>>>,
    running: &Arc<AtomicBool>,
) -> Result<(), Box<dyn std::error::Error>> {
    let url = format!("{}/events", api_base_url);

    let response = client
        .get(&url)
        .header("Authorization", format!("Session {}", session_id))
        .send()
        .await?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        if running.swap(false, Ordering::SeqCst) {
            clear_online_state(online_streamers).await;
            crate::update_tray_icon(app_handle, false);
        }
        return Err(format!("HTTP {} — stopping reconnection", status).into());
    }
    if !status.is_success() {
        return Err(format!("HTTP {}", status).into());
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        if !running.load(Ordering::SeqCst) {
            break;
        }

        let chunk = chunk?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        while let Some(pos) = buffer.find("\n\n") {
            let message = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();

            if let Some(event) = parse_sse_event(&message) {
                handle_event(app_handle, &event, online_streamers).await;
            }
        }
    }

    Ok(())
}

fn parse_sse_event(message: &str) -> Option<StreamEvent> {
    for line in message.lines() {
        if let Some(data) = line.strip_prefix("data: ") {
            return serde_json::from_str(data).ok();
        }
    }
    None
}

fn build_payload(event: &StreamEvent) -> StreamerPayload {
    let login = event.broadcaster_user_login.clone().unwrap_or_default();
    let display_name = event
        .broadcaster_user_name
        .clone()
        .unwrap_or_else(|| login.clone());
    StreamerPayload {
        login,
        display_name,
        game_name: event.game_name.clone(),
    }
}

async fn update_online_state(
    login: &str,
    is_online: bool,
    online_streamers: &Arc<Mutex<HashSet<String>>>,
) -> bool {
    let mut streamers = online_streamers.lock().await;
    if is_online {
        streamers.insert(login.to_string());
    } else {
        streamers.remove(login);
    }
    !streamers.is_empty()
}

fn send_notification(
    app_handle: &AppHandle,
    display_name: &str,
    login: &str,
    game_name: &Option<String>,
) {
    let body = game_name
        .as_ref()
        .map(|g| format!("Entrou ao vivo — {}", g))
        .unwrap_or_else(|| "Entrou ao vivo!".to_string());

    let _ = app_handle
        .notification()
        .builder()
        .title(display_name)
        .body(&body)
        .extra("login", login)
        .show();
}

async fn handle_event(
    app_handle: &AppHandle,
    event: &StreamEvent,
    online_streamers: &Arc<Mutex<HashSet<String>>>,
) {
    let payload = build_payload(event);

    match event.event_type.as_str() {
        "stream.online" => {
            update_online_state(&payload.login, true, online_streamers).await;
            crate::update_tray_icon(app_handle, true);
            if event.should_notify {
                send_notification(
                    app_handle,
                    &payload.display_name,
                    &payload.login,
                    &event.game_name,
                );
            }
            let _ = app_handle.emit("streamer-online", &payload);
        }
        "stream.offline" => {
            let has_online = update_online_state(&payload.login, false, online_streamers).await;
            crate::update_tray_icon(app_handle, has_online);
            let _ = app_handle.emit("streamer-offline", &payload);
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::{build_payload, parse_sse_event, SseClient};
    use std::collections::HashSet;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[test]
    fn reads_notification_preference_from_event() {
        let event = parse_sse_event(r#"data: {"type":"stream.online","shouldNotify":false}"#)
            .expect("event should be valid");

        assert!(!event.should_notify);
    }

    #[test]
    fn keeps_notifications_enabled_for_older_events() {
        let event =
            parse_sse_event(r#"data: {"type":"stream.online"}"#).expect("event should be valid");

        assert!(event.should_notify);
    }

    #[test]
    fn reads_the_complete_backend_event_payload() {
        let event = parse_sse_event(
            r#"data: {"type":"stream.online","broadcasterUserName":"Streamer Name","broadcasterUserLogin":"streamer_login","gameName":"Game","shouldNotify":true}"#,
        )
        .expect("event should be valid");
        let payload = build_payload(&event);

        assert_eq!(event.event_type, "stream.online");
        assert_eq!(payload.display_name, "Streamer Name");
        assert_eq!(payload.login, "streamer_login");
        assert_eq!(payload.game_name.as_deref(), Some("Game"));
    }

    #[tokio::test]
    async fn stopping_clears_the_connection_generation_and_online_state() {
        let online_streamers = Arc::new(Mutex::new(HashSet::from(["streamer".to_string()])));
        let running = Arc::new(AtomicBool::new(true));
        let mut client = SseClient::new(online_streamers.clone());
        client.running = Some(running.clone());
        client.task = Some(tokio::spawn(std::future::pending()));

        client.stop().await;

        assert!(!running.load(Ordering::SeqCst));
        assert!(client.running.is_none());
        assert!(client.task.is_none());
        assert!(online_streamers.lock().await.is_empty());
    }
}
