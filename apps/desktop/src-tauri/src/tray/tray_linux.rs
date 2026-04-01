use image::GenericImageView;
use ksni::MenuItem;
use std::sync::OnceLock;
use tauri::Manager;
use tokio::sync::mpsc;

use crate::kwin;
use crate::AppState;

pub enum TrayAction {
    ShowWindow { x: i32, y: i32 },
    Quit,
}

static ICON_WHITE: OnceLock<ksni::Icon> = OnceLock::new();
static ICON_ACTIVE: OnceLock<ksni::Icon> = OnceLock::new();

fn get_icon_white() -> &'static ksni::Icon {
    ICON_WHITE.get_or_init(|| png_to_ksni_icon(include_bytes!("../../icons/logo_streampeek_white.png")))
}

fn get_icon_active() -> &'static ksni::Icon {
    ICON_ACTIVE.get_or_init(|| png_to_ksni_icon(include_bytes!("../../icons/logo_streampeek_active.png")))
}

pub struct StreamPeekTray {
    pub has_online: bool,
    sender: mpsc::UnboundedSender<TrayAction>,
}

impl StreamPeekTray {
    pub fn new(sender: mpsc::UnboundedSender<TrayAction>) -> Self {
        Self {
            has_online: false,
            sender,
        }
    }
}

impl ksni::Tray for StreamPeekTray {
    fn id(&self) -> String {
        "streampeek".into()
    }

    fn title(&self) -> String {
        "StreamPeek".into()
    }

    fn icon_pixmap(&self) -> Vec<ksni::Icon> {
        let icon = if self.has_online {
            get_icon_active()
        } else {
            get_icon_white()
        };
        vec![icon.clone()]
    }

    fn activate(&mut self, x: i32, y: i32) {
        let _ = self.sender.send(TrayAction::ShowWindow { x, y });
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        vec![
            MenuItem::Standard(ksni::menu::StandardItem {
                label: "Mostrar janela".into(),
                activate: Box::new(|tray: &mut Self| {
                    let _ = tray.sender.send(TrayAction::ShowWindow { x: 0, y: 0 });
                }),
                ..Default::default()
            }),
            MenuItem::Separator,
            MenuItem::Standard(ksni::menu::StandardItem {
                label: "Sair".into(),
                activate: Box::new(|tray: &mut Self| {
                    let _ = tray.sender.send(TrayAction::Quit);
                }),
                ..Default::default()
            }),
        ]
    }
}

fn png_to_ksni_icon(png_bytes: &[u8]) -> ksni::Icon {
    let img = image::load_from_memory(png_bytes).expect("failed to decode PNG");
    let (width, height) = img.dimensions();
    let rgba = img.to_rgba8();
    let mut argb_data = Vec::with_capacity((width * height * 4) as usize);

    for pixel in rgba.chunks_exact(4) {
        argb_data.push(pixel[3]); // A
        argb_data.push(pixel[0]); // R
        argb_data.push(pixel[1]); // G
        argb_data.push(pixel[2]); // B
    }

    ksni::Icon {
        width: width as i32,
        height: height as i32,
        data: argb_data,
    }
}

pub fn setup(
    app: &tauri::App,
    win: &tauri::WebviewWindow,
) -> Result<(), Box<dyn std::error::Error>> {
    use ksni::TrayMethods;

    let tauri_tray = app.tray_by_id("main").expect("tray not found");
    let _ = tauri_tray.set_visible(false);

    let (tx, mut rx) = mpsc::unbounded_channel::<TrayAction>();
    let tray_instance = StreamPeekTray::new(tx);

    let state = app.state::<AppState>();
    let ksni_handle = state.ksni_handle.clone();

    let app_handle = app.handle().clone();
    let win_for_channel = win.clone();
    let use_kwin = kwin::is_kde_wayland();

    tauri::async_runtime::spawn(async move {
        let handle = match tray_instance.spawn().await {
            Ok(h) => h,
            Err(e) => {
                log::error!("Failed to spawn ksni tray: {}", e);
                return;
            }
        };

        *ksni_handle.lock().await = Some(handle);

        while let Some(action) = rx.recv().await {
            match action {
                TrayAction::ShowWindow { x, y } => {
                    if win_for_channel.is_visible().unwrap_or(false) {
                        let _ = win_for_channel.hide();
                        continue;
                    }

                    let scale = win_for_channel.scale_factor().unwrap_or(1.0);
                    let win_w = (280.0 * scale) as i32;
                    let win_h = (360.0 * scale) as i32;
                    let mut wx = x - (win_w / 2);
                    let mut wy = y - win_h - 32;

                    if let Ok(Some(monitor)) = win_for_channel.primary_monitor() {
                        let mon_pos = monitor.position();
                        let mon_size = monitor.size();
                        let max_x = mon_pos.x + mon_size.width as i32 - win_w;
                        let max_y = mon_pos.y + mon_size.height as i32 - win_h;
                        wx = wx.clamp(mon_pos.x, max_x);
                        wy = wy.clamp(mon_pos.y, max_y);
                    }

                    if use_kwin {
                        match kwin::prepare_move(wx, wy, win_w, win_h).await {
                            Ok(guard) => {
                                let _ = win_for_channel.show();
                                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                                guard.cleanup().await;
                            }
                            Err(e) => {
                                log::warn!("KWin prepare_move failed: {}", e);
                                let _ = win_for_channel.set_position(
                                    tauri::Position::Physical(
                                        tauri::PhysicalPosition::new(wx, wy),
                                    ),
                                );
                                let _ = win_for_channel.show();
                            }
                        }
                    } else {
                        let _ = win_for_channel.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition::new(wx, wy),
                        ));
                        let _ = win_for_channel.show();
                    }

                    let _ = win_for_channel.set_focus();
                }
                TrayAction::Quit => {
                    app_handle.exit(0);
                }
            }
        }
    });

    Ok(())
}
