mod sse;

use std::collections::HashSet;
use std::sync::Arc;
use tauri::{
    image::Image,
    tray::{MouseButtonState, TrayIconEvent},
    Manager, WindowEvent,
};

use tauri::menu::{MenuBuilder, MenuItemBuilder};

#[cfg(not(target_os = "linux"))]
use tauri::tray::MouseButton;
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;

use sse::SseClient;

pub struct AppState {
    sse_client: Arc<Mutex<SseClient>>,
    online_streamers: Arc<Mutex<HashSet<String>>>,
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
        }
    }
}

#[tauri::command]
async fn start_sse(
    app: tauri::AppHandle,
    session_id: String,
    api_base_url: String,
) -> Result<(), String> {
    if session_id.is_empty() {
        return Err("session_id is required".to_string());
    }

    let state = app.state::<AppState>();
    let mut client = state.sse_client.lock().await;
    client.start(app.clone(), session_id, api_base_url);
    Ok(())
}

#[tauri::command]
async fn stop_sse(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut client = state.sse_client.lock().await;
    client.stop();
    Ok(())
}

#[tauri::command]
async fn get_online_streamers(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let state = app.state::<AppState>();
    let streamers = state.online_streamers.lock().await;
    Ok(streamers.iter().cloned().collect())
}

pub fn update_tray_icon(app: &tauri::AppHandle, has_online: bool) {
    let tray = match app.tray_by_id("main") {
        Some(t) => t,
        None => return,
    };

    let icon_bytes = if has_online {
        include_bytes!("../icons/logo_streampeek_active.png").to_vec()
    } else {
        include_bytes!("../icons/logo_streampeek_white.png").to_vec()
    };

    let image = match Image::from_bytes(&icon_bytes) {
        Ok(img) => img,
        Err(_) => return,
    };

    let _ = tray.set_icon(Some(image));
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
            start_sse,
            stop_sse,
            get_online_streamers
        ])
        .setup(|app| {
            let store = app.store("settings.json")?;
            let is_first_run = store
                .get("has_run")
                .map(|v| !v.as_bool().unwrap_or(false))
                .unwrap_or(true);

            let tray = app.tray_by_id("main").expect("tray not found");
            let win = app.get_webview_window("main").unwrap();

            {
                let show = MenuItemBuilder::with_id("show", "Mostrar janela").build(app)?;
                let quit = MenuItemBuilder::with_id("quit", "Sair").build(app)?;
                let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;
                tray.set_menu(Some(menu))?;

                #[cfg(not(target_os = "linux"))]
                tray.set_show_menu_on_left_click(false)?;

                tray.on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });
            }

            if is_first_run {
                let _ = win.show();
                let _ = win.set_focus();
                store.set("has_run", serde_json::Value::Bool(true));
                let _ = store.save();
            }

            let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(280.0, 360.0)));

            win.on_window_event({
                let win = win.clone();
                move |event| {
                    match event {
                        WindowEvent::CloseRequested { api, .. } => {
                            api.prevent_close();
                            let _ = win.hide();
                        }
                        WindowEvent::Focused(false) => {
                            let _ = win.hide();
                        }
                        _ => {}
                    }
                }
            });

            tray.on_tray_icon_event(move |_tray, event| {
                let should_open = match &event {
                    TrayIconEvent::Click {
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        #[cfg(target_os = "linux")]
                        { true }
                        #[cfg(not(target_os = "linux"))]
                        { matches!(event, TrayIconEvent::Click { button: MouseButton::Left, .. }) }
                    }
                    _ => false,
                };

                if should_open {
                    if let TrayIconEvent::Click { position, .. } = event {
                        let size = win.outer_size().unwrap_or_default();
                        let mut x = position.x as i32 - (size.width as i32 / 2);
                        let mut y = position.y as i32 - size.height as i32 - 16;

                        if let Ok(Some(monitor)) = win.primary_monitor() {
                            let mon_pos = monitor.position();
                            let mon_size = monitor.size();
                            let max_x = mon_pos.x + mon_size.width as i32 - size.width as i32;
                            let max_y = mon_pos.y + mon_size.height as i32 - size.height as i32;
                            x = x.clamp(mon_pos.x, max_x);
                            y = y.clamp(mon_pos.y, max_y);
                        }

                        let _ = win.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition::new(x, y),
                        ));
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}