#[cfg(target_os = "linux")]
mod tray_linux;
#[cfg(not(target_os = "linux"))]
mod tray_native;

#[cfg(target_os = "linux")]
pub use tray_linux::StreamPeekTray;

use tauri::Manager;

fn square_tray_image(png_bytes: &[u8]) -> tauri::Result<tauri::image::Image<'static>> {
    let image = tauri::image::Image::from_bytes(png_bytes)?;
    let (rgba, side) = pad_rgba_to_square(image.rgba(), image.width(), image.height());

    Ok(tauri::image::Image::new_owned(rgba, side, side))
}

fn pad_rgba_to_square(rgba: &[u8], width: u32, height: u32) -> (Vec<u8>, u32) {
    let side = width.max(height);
    let x_offset = (side - width) / 2;
    let y_offset = (side - height) / 2;
    let mut square = vec![0; (side * side * 4) as usize];

    for row in 0..height {
        let source_start = (row * width * 4) as usize;
        let source_end = source_start + (width * 4) as usize;
        let target_start = (((row + y_offset) * side + x_offset) * 4) as usize;
        let target_end = target_start + (width * 4) as usize;
        square[target_start..target_end].copy_from_slice(&rgba[source_start..source_end]);
    }

    (square, side)
}

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
        let tray = match app.tray_by_id("main") {
            Some(t) => t,
            None => return,
        };

        let icon_bytes = if has_online {
            include_bytes!("../../icons/logo_streampeek_active.png").to_vec()
        } else {
            include_bytes!("../../icons/logo_streampeek_white.png").to_vec()
        };

        let image = match square_tray_image(&icon_bytes) {
            Ok(img) => img,
            Err(_) => return,
        };

        let _ = tray.set_icon(Some(image));
    }
}

#[cfg(test)]
mod tests {
    use super::pad_rgba_to_square;

    #[test]
    fn pads_a_portrait_icon_without_changing_its_pixels() {
        let source = vec![
            1, 2, 3, 4, 5, 6, 7, 8, // first row
            9, 10, 11, 12, 13, 14, 15, 16, // second row
            17, 18, 19, 20, 21, 22, 23, 24, // third row
        ];

        let (square, side) = pad_rgba_to_square(&source, 2, 3);

        assert_eq!(side, 3);
        assert_eq!(&square[0..8], &source[0..8]);
        assert_eq!(&square[12..20], &source[8..16]);
        assert_eq!(&square[24..32], &source[16..24]);
        assert_eq!(&square[8..12], &[0, 0, 0, 0]);
        assert_eq!(&square[20..24], &[0, 0, 0, 0]);
        assert_eq!(&square[32..36], &[0, 0, 0, 0]);
    }
}
