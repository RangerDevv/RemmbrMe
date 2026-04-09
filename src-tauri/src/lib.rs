// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::sync::{Arc, Mutex};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

static PHONE_APP: &str = include_str!("phone_app.html");

// ─── Shared axum state ───────────────────────────────────────────────────────

#[derive(Clone)]
struct AxumState {
    token: String,
    data: Arc<Mutex<String>>,
    app: AppHandle,
}

// ─── Tauri-managed sync handle ───────────────────────────────────────────────

pub struct SyncServerHandle {
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    info: Option<SyncInfo>,
    live_data: Option<Arc<Mutex<String>>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SyncInfo {
    pub url: String,
    pub token: String,
}

// ─── HTTP query param types ──────────────────────────────────────────────────

#[derive(Deserialize)]
struct TokenQuery {
    token: Option<String>,
}

// ─── HTTP handlers ───────────────────────────────────────────────────────────

async fn handle_root(
    State(state): State<AxumState>,
    Query(q): Query<TokenQuery>,
) -> Response {
    if q.token.as_deref() != Some(&state.token) {
        return Html(
            r#"<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
            <div style="text-align:center"><h2 style="font-size:1.5rem;margin-bottom:.5rem">&#9940; Invalid Token</h2>
            <p style="color:#94a3b8">Scan the QR code from the app again.</p></div></body></html>"#,
        )
        .into_response();
    }
    Html(PHONE_APP).into_response()
}

async fn handle_get_data(
    State(state): State<AxumState>,
    Query(q): Query<TokenQuery>,
) -> Response {
    if q.token.as_deref() != Some(&state.token) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }
    let data = state.data.lock().unwrap().clone();
    (
        StatusCode::OK,
        [
            ("Content-Type", "application/json"),
            ("Access-Control-Allow-Origin", "*"),
        ],
        data,
    )
        .into_response()
}

async fn handle_post_data(
    State(state): State<AxumState>,
    Query(q): Query<TokenQuery>,
    body: String,
) -> Response {
    if q.token.as_deref() != Some(&state.token) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }
    *state.data.lock().unwrap() = body.clone();
    let _ = state.app.emit("sync:data-received", body);
    (
        StatusCode::OK,
        [("Access-Control-Allow-Origin", "*")],
        "Synced",
    )
        .into_response()
}

async fn handle_options() -> Response {
    (
        StatusCode::NO_CONTENT,
        [
            ("Access-Control-Allow-Origin", "*"),
            ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
            ("Access-Control-Allow-Headers", "Content-Type"),
        ],
        "",
    )
        .into_response()
}

// ─── Tauri commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn start_sync_server(
    data: String,
    sync_handle: tauri::State<'_, Mutex<SyncServerHandle>>,
    app: AppHandle,
) -> Result<SyncInfo, String> {
    // Stop any existing server first
    {
        let mut guard = sync_handle.lock().map_err(|e| e.to_string())?;
        if let Some(tx) = guard.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }

    let ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    let port = 4321u16;

    // Generate a cryptographically random 32-hex-char token
    let token: String = (0..16)
        .map(|_| format!("{:02x}", rand::random::<u8>()))
        .collect();

    let live_data = Arc::new(Mutex::new(data));
    let axum_state = AxumState {
        token: token.clone(),
        data: Arc::clone(&live_data),
        app,
    };

    let router = Router::new()
        .route("/", get(handle_root))
        .route(
            "/api/data",
            get(handle_get_data)
                .post(handle_post_data)
                .options(handle_options),
        )
        .with_state(axum_state);

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    tauri::async_runtime::spawn(async move {
        match tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await {
            Ok(listener) => {
                let _ = axum::serve(listener, router)
                    .with_graceful_shutdown(async move {
                        shutdown_rx.await.ok();
                    })
                    .await;
            }
            Err(e) => eprintln!("[RemmbrMe] Sync server failed to bind port {}: {}", port, e),
        }
    });

    let info = SyncInfo {
        url: format!("http://{}:{}", ip, port),
        token: token.clone(),
    };

    let mut guard = sync_handle.lock().map_err(|e| e.to_string())?;
    guard.shutdown_tx = Some(shutdown_tx);
    guard.info = Some(info.clone());
    guard.live_data = Some(live_data);

    Ok(info)
}

#[tauri::command]
fn stop_sync_server(
    sync_handle: tauri::State<'_, Mutex<SyncServerHandle>>,
) -> Result<(), String> {
    let mut guard = sync_handle.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = guard.shutdown_tx.take() {
        let _ = tx.send(());
    }
    guard.info = None;
    guard.live_data = None;
    Ok(())
}

#[tauri::command]
fn get_sync_info(
    sync_handle: tauri::State<'_, Mutex<SyncServerHandle>>,
) -> Option<SyncInfo> {
    sync_handle.lock().ok()?.info.clone()
}

#[tauri::command]
fn update_sync_data(
    data: String,
    sync_handle: tauri::State<'_, Mutex<SyncServerHandle>>,
) -> Result<(), String> {
    let guard = sync_handle.lock().map_err(|e| e.to_string())?;
    if let Some(live_data) = &guard.live_data {
        *live_data.lock().map_err(|e| e.to_string())? = data;
    }
    Ok(())
}

#[tauri::command]
fn generate_qr_svg(text: String) -> Result<String, String> {
    use qrcode::{EcLevel, QrCode};
    use qrcode::render::svg;

    let code = QrCode::with_error_correction_level(text.as_bytes(), EcLevel::M)
        .map_err(|e| e.to_string())?;

    let svg_str = code
        .render::<svg::Color<'_>>()
        .min_dimensions(200, 200)
        .dark_color(svg::Color("#111827"))
        .light_color(svg::Color("#f9fafb"))
        .quiet_zone(true)
        .build();

    // Strip fixed pixel dimensions so the SVG scales with CSS;
    // the qrcode crate already includes a viewBox so this is safe.
    let svg_responsive = make_svg_responsive(&svg_str);
    Ok(svg_responsive)
}

fn make_svg_responsive(svg: &str) -> String {
    // Replace the first width="NNN" / width="NNNpx" on the <svg> element with 100%
    let replace_attr = |s: &str, attr: &str| -> String {
        let needle = format!(" {}=\"", attr);
        if let Some(pos) = s.find(&needle) {
            let start = pos + needle.len();
            if let Some(end) = s[start..].find('"') {
                let mut out = s.to_string();
                out.replace_range(pos..pos + needle.len() + end + 1,
                    &format!(" {}=\"100%\"", attr));
                return out;
            }
        }
        s.to_string()
    };
    let s = replace_attr(svg, "width");
    replace_attr(&s, "height")
}

// ─── App entry point ─────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(SyncServerHandle {
            shutdown_tx: None,
            info: None,
            live_data: None,
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_sync_server,
            stop_sync_server,
            get_sync_info,
            update_sync_data,
            generate_qr_svg,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

