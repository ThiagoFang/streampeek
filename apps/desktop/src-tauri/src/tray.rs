use image::GenericImageView;
use ksni::MenuItem;
use std::sync::OnceLock;
use tokio::sync::mpsc;

pub enum TrayAction {
    ShowWindow { x: i32, y: i32 },
    Quit,
}

static ICON_WHITE: OnceLock<ksni::Icon> = OnceLock::new();
static ICON_ACTIVE: OnceLock<ksni::Icon> = OnceLock::new();

fn get_icon_white() -> &'static ksni::Icon {
    ICON_WHITE.get_or_init(|| png_to_ksni_icon(include_bytes!("../icons/logo_streampeek_white.png")))
}

fn get_icon_active() -> &'static ksni::Icon {
    ICON_ACTIVE.get_or_init(|| png_to_ksni_icon(include_bytes!("../icons/logo_streampeek_active.png")))
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
        // RGBA → ARGB (network byte order / big-endian)
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
