#[cfg(target_os = "linux")]
mod tray_linux;
#[cfg(not(target_os = "linux"))]
mod tray_native;

#[cfg(target_os = "linux")]
pub use tray_linux::StreamPeekTray;

use tauri::Manager;

pub fn setup(
    app: &tauri::App,
    win: &tauri::WebviewWindow,
) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "linux")]
    tray_linux::setup(app, win)?;

    #[cfg(not(target_os = "linux"))]
    tray_native::setup(app, win)?;

    Ok(())
}

pub fn update_tray_icon(app: &tauri::AppHandle, has_online: bool) {
    #[cfg(target_os = "linux")]
    {
        let state = app.state::<crate::AppState>();
        let handle = state.ksni_handle.clone();
        tokio::spawn(async move {
            if let Some(h) = handle.lock().await.as_ref() {
                h.update(move |tray| tray.has_online = has_online).await;
            }
        });
    }

    #[cfg(not(target_os = "linux"))]
    {
        use tauri::image::Image;

        let tray = match app.tray_by_id("main") {
            Some(t) => t,
            None => return,
        };

        let icon_bytes = if has_online {
            include_bytes!("../../icons/logo_streampeek_active.png").to_vec()
        } else {
            include_bytes!("../../icons/logo_streampeek_white.png").to_vec()
        };

        let image = match Image::from_bytes(&icon_bytes) {
            Ok(img) => img,
            Err(_) => return,
        };

        let _ = tray.set_icon(Some(image));
    }
}
