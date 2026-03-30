use tauri::{tray::TrayIconEvent, Manager};

pub fn run() {
    tauri::Builder::default()
        // Plugin for sending desktop notifications
        .plugin(tauri_plugin_notification::init())
        // Plugin that allows opening external URLs and running shell commands from the frontend
        .plugin(tauri_plugin_shell::init())
        // Plugin for managing OS-level autostart on login
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // Setup runs once when the app initializes
        .setup(|app| {
            // Get the tray icon configured in tauri.conf.json with id "main"
            let tray = app.tray_by_id("main").expect("tray not found");
            let win = app.get_webview_window("main").unwrap();

            let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize::new(280.0, 360.0)));

            // Register handler for tray icon events
            tray.on_tray_icon_event(move |_tray, event| {
                // Only react to clicks (ignores hover, double click, etc)
                if let TrayIconEvent::Click { position, .. } = event {
                    if win.is_visible().unwrap_or(false) {
                        // Window is visible → hide it
                        let _ = win.hide();
                    } else {
                        // Window is hidden → position it above the tray icon and show it
                        let size = win.outer_size().unwrap_or_default();
                        // Center horizontally on the click point
                        let x = position.x as i32 - (size.width as i32 / 2);
                        // Position above the click point with 16px margin
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
        // generate_context! reads tauri.conf.json at build time to configure the app
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
