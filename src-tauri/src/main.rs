// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Fix "Could not create default EGL display: EGL_BAD_PARAMETER" on Linux
    // WebKitGTK's DMA-BUF renderer fails on systems without compatible EGL support
    #[cfg(target_os = "linux")]
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    remmbrme_lib::run()
}
