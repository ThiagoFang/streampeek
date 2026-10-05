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

pub fn update_tray_icon(app: &tauri::AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let state = app.state::<crate::AppState>();
        // Read the latest state inside the task so rapid events cannot restore an old badge.
        let online = state.online_streamers.lock().await;
        let unseen = state.unseen_streamers.lock().await;
        let has_online = !online.is_empty();
        let has_unseen = !unseen.is_empty();
        #[cfg(target_os = "linux")]
        if let Some(handle) = state.ksni_handle.lock().await.as_ref() {
            handle
                .update(move |tray| {
                    tray.has_online = has_online;
                    tray.has_unseen = has_unseen;
                })
                .await;
        };
        #[cfg(not(target_os = "linux"))]
        if let Some(tray) = app.tray_by_id("main") {
            if let Ok(image) = tray_image(has_online, has_unseen) {
                let _ = tray.set_icon(Some(image));
            }
        }
    });
}

fn tray_image(has_online: bool, has_unseen: bool) -> tauri::Result<tauri::image::Image<'static>> {
    let bytes: &[u8] = if has_online {
        include_bytes!("../../icons/logo_streampeek_active.png")
    } else {
        include_bytes!("../../icons/logo_streampeek_white.png")
    };
    let image = square_tray_image(bytes)?;
    let mut rgba = image.rgba().to_vec();
    if has_unseen {
        paint_badge(&mut rgba, image.width());
    }
    Ok(tauri::image::Image::new_owned(
        rgba,
        image.width(),
        image.height(),
    ))
}

fn paint_badge(rgba: &mut [u8], side: u32) {
    let radius = side as f32 * 0.15;
    let center = side as f32 - radius - 1.0;
    for y in 0..side {
        for x in 0..side {
            let distance = ((x as f32 - center).powi(2) + (y as f32 - center).powi(2)).sqrt();
            let color = if distance <= radius * 0.75 {
                Some([69, 212, 131, 255])
            } else if distance <= radius {
                Some([37, 37, 43, 255])
            } else {
                None
            };
            if let Some(color) = color {
                let index = ((y * side + x) * 4) as usize;
                rgba[index..index + 4].copy_from_slice(&color);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{pad_rgba_to_square, tray_image};

    #[test]
    fn badge_changes_pixels_without_changing_icon_dimensions() {
        let plain = tray_image(true, false).unwrap();
        let badged = tray_image(true, true).unwrap();
        assert_eq!(plain.width(), badged.width());
        assert_eq!(plain.height(), badged.height());
        assert_ne!(plain.rgba(), badged.rgba());
        assert!(badged
            .rgba()
            .chunks_exact(4)
            .any(|pixel| pixel == [69, 212, 131, 255]));
    }

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
