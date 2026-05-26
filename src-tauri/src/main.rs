// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Disable WebKitGTK DMA-BUF renderer and hardware compositing on Linux.
    // Both can cause a completely blank/gray window on systems where GPU/EGL
    // support is limited (e.g. VMs, some compositors, older drivers).
    #[cfg(target_os = "linux")]
    {
        // SAFETY: called before any threads are spawned (before tauri::Builder)
        unsafe {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    remmbrme_lib::run()
}
