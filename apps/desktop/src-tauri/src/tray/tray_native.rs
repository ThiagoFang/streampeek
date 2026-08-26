use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    Manager,
};

pub fn setup(
    app: &tauri::App,
    win: &tauri::WebviewWindow,
) -> Result<(), Box<dyn std::error::Error>> {
    let tray = app.tray_by_id("main").expect("tray not found");
    tray.set_icon(Some(super::square_tray_image(include_bytes!(
        "../../icons/logo_streampeek_white.png"
    ))?))?;

    let show = MenuItemBuilder::with_id("show", "Mostrar janela").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Sair").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;
    tray.set_menu(Some(menu))?;
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

    let win_for_tray = win.clone();
    tray.on_tray_icon_event(move |_tray, event| {
        if let TrayIconEvent::Click {
            position,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            let size = win_for_tray.outer_size().unwrap_or_default();
            let mut x = position.x as i32 - (size.width as i32 / 2);
            let mut y = position.y as i32 - size.height as i32 - 32;

            if let Ok(Some(monitor)) = win_for_tray.primary_monitor() {
                let mon_pos = monitor.position();
                let mon_size = monitor.size();
                let max_x = mon_pos.x + mon_size.width as i32 - size.width as i32;
                let max_y = mon_pos.y + mon_size.height as i32 - size.height as i32;
                x = x.clamp(mon_pos.x, max_x);
                y = y.clamp(mon_pos.y, max_y);
            }

            let _ = win_for_tray.set_position(tauri::Position::Physical(
                tauri::PhysicalPosition::new(x, y),
            ));
            let _ = win_for_tray.show();
            let _ = win_for_tray.set_focus();
        }
    });

    Ok(())
}
