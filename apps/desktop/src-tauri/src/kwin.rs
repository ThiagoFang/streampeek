use std::env;

const WINDOW_CAPTION: &str = "StreamPeek";

/// Detect KDE Plasma on Wayland. Call once at startup, cache the result.
pub fn is_kde_wayland() -> bool {
    env::var("XDG_CURRENT_DESKTOP")
        .map(|v| v.split(':').any(|s| s == "KDE"))
        .unwrap_or(false)
        && env::var("XDG_SESSION_TYPE")
            .map(|v| v == "wayland")
            .unwrap_or(false)
}

/// Prepare a reactive KWin script that will move the StreamPeek window
/// as soon as it appears. Must be called BEFORE win.show().
/// Returns a guard whose cleanup() unloads the script.
pub async fn prepare_move(
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<KwinScriptGuard, Box<dyn std::error::Error + Send + Sync>> {
    let script_content = format!(
        r#"function tryMove(client) {{
    if (client.caption === "{WINDOW_CAPTION}") {{
        client.frameGeometry = {{ x: {x}, y: {y}, width: {width}, height: {height} }};
    }}
}}
workspace.windowAdded.connect(tryMove);
var existing = workspace.windowList ? workspace.windowList() : (workspace.clientList ? workspace.clientList() : []);
for (var i = 0; i < existing.length; i++) {{
    tryMove(existing[i]);
}}"#
    );

    let script_path = env::temp_dir().join(format!(
        "streampeek_kwin_move_{}.js",
        std::process::id()
    ));
    std::fs::write(&script_path, &script_content)?;

    let connection = zbus::Connection::session().await?;
    let proxy = zbus::Proxy::new(
        &connection,
        "org.kde.KWin",
        "/Scripting",
        "org.kde.kwin.Scripting",
    )
    .await?;

    let _: Result<bool, _> = proxy.call("unloadScript", &("streampeek_move",)).await;

    let path_str = script_path.to_str().ok_or("invalid temp path")?;
    let _script_id: i32 = proxy
        .call("loadScript", &(path_str, "streampeek_move"))
        .await?;

    let _: () = proxy.call("start", &()).await?;

    let _ = std::fs::remove_file(&script_path);

    Ok(KwinScriptGuard { proxy })
}

pub struct KwinScriptGuard {
    proxy: zbus::Proxy<'static>,
}

impl KwinScriptGuard {
    /// Unload the script after the window has been positioned.
    pub async fn cleanup(self) {
        let _: Result<bool, _> = self
            .proxy
            .call("unloadScript", &("streampeek_move",))
            .await;
    }
}
