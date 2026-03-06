use tauri::{
    tray::TrayIconEvent, Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Hide on blur
            let win = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = win.hide();
                }
            });

            // Toggle window on tray click
            let tray = app.tray_by_id("main").expect("tray not found");
            let win = app.get_webview_window("main").unwrap();
            tray.on_tray_icon_event(move |_tray, event| {
                if let TrayIconEvent::Click { position, .. } = event {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let size = win.outer_size().unwrap_or_default();
                        let x = position.x as i32 - (size.width as i32 / 2);
                        let y = position.y as i32 - size.height as i32 - 16;
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
