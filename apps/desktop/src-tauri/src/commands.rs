use tauri::Manager;

use crate::AppState;

#[tauri::command]
pub async fn start_sse(
    app: tauri::AppHandle,
    session_id: String,
    api_base_url: String,
) -> Result<(), String> {
    if session_id.is_empty() {
        return Err("session_id is required".to_string());
    }

    let state = app.state::<AppState>();
    let mut client = state.sse_client.lock().await;
    client.replace(app.clone(), session_id, api_base_url).await;
    Ok(())
}

#[tauri::command]
pub async fn stop_sse(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut client = state.sse_client.lock().await;
    client.stop().await;
    crate::update_tray_icon(&app, false);
    Ok(())
}

#[tauri::command]
pub async fn get_online_streamers(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let state = app.state::<AppState>();
    let streamers = state.online_streamers.lock().await;
    Ok(streamers.iter().cloned().collect())
}
