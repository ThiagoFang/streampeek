mod commands;
#[cfg(target_os = "linux")]
pub(crate) mod kwin;
mod sse;
mod tray;

use std::collections::HashSet;
use std::sync::Arc;
use tauri::{Manager, WindowEvent};
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;

use sse::SseClient;

pub struct AppState {
    pub(crate) sse_client: Arc<Mutex<SseClient>>,
    pub(crate) online_streamers: Arc<Mutex<HashSet<String>>>,
    #[cfg(target_os = "linux")]
    pub(crate) ksni_handle: Arc<Mutex<Option<ksni::Handle<tray::StreamPeekTray>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    pub fn new() -> Self {
        let online_streamers = Arc::new(Mutex::new(HashSet::new()));
        Self {
            sse_client: Arc::new(Mutex::new(SseClient::new(online_streamers.clone()))),
            online_streamers,
            #[cfg(target_os = "linux")]
            ksni_handle: Arc::new(Mutex::new(None)),
        }
    }
}

pub fn update_tray_icon(app: &tauri::AppHandle, has_online: bool) {
    tray::update_tray_icon(app, has_online);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::start_sse,
            commands::stop_sse,
            commands::get_online_streamers,
        ])
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();

            tray::setup(app, &win)?;
            setup_window(app, &win)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_window(
    app: &tauri::App,
    win: &tauri::WebviewWindow,
) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("settings.json")?;
    let is_first_run = store
        .get("has_run")
        .map(|v| !v.as_bool().unwrap_or(false))
        .unwrap_or(true);

    if is_first_run {
        let _ = win.show();
        let _ = win.set_focus();
        store.set("has_run", serde_json::Value::Bool(true));
        let _ = store.save();
    }

    let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(280.0, 360.0)));

    win.on_window_event({
        let win = win.clone();
        move |event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = win.hide();
            }
            WindowEvent::Focused(false) => {
                let _ = win.hide();
            }
            _ => {}
        }
    });

    Ok(())
}
