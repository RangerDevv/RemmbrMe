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
    Html(sync_phone_page()).into_response()
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
        .min_dimensions(256, 256)
        .dark_color(svg::Color("#111827"))
        .light_color(svg::Color("#f9fafb"))
        .quiet_zone(true)
        .build();

    Ok(svg_str)
}

// ─── Phone sync page (served over LAN to mobile browsers) ───────────────────

fn sync_phone_page() -> &'static str {
    r###"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>RemmbrMe Sync</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:#0f172a;color:#e2e8f0;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:1.25rem}
    .card{background:#1e293b;border-radius:1.25rem;padding:1.75rem;
      width:100%;max-width:420px;border:1px solid #334155;
      box-shadow:0 25px 50px rgba(0,0,0,0.4)}
    .header{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem}
    .logo{width:2.5rem;height:2.5rem;background:#6366f1;border-radius:.625rem;
      display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0}
    h1{font-size:1.2rem;font-weight:700;color:#f1f5f9}
    .badge{display:inline-flex;align-items:center;gap:.375rem;background:#0c4a6e;
      color:#7dd3fc;font-size:.72rem;font-weight:600;padding:.25rem .75rem;
      border-radius:9999px;margin-bottom:1.5rem}
    .dot{width:.45rem;height:.45rem;background:#38bdf8;border-radius:50%;
      animation:pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
    .section{margin-bottom:1.25rem}
    .label{font-size:.7rem;font-weight:600;color:#94a3b8;text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:.625rem}
    .btn{width:100%;padding:.75rem 1rem;border-radius:.75rem;border:none;
      font-size:.875rem;font-weight:600;cursor:pointer;
      transition:background .15s,transform .1s;
      display:flex;align-items:center;justify-content:center;gap:.5rem}
    .btn:active{transform:scale(.98)}
    .btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
    .btn-primary{background:#6366f1;color:#fff}
    .btn-primary:hover:not(:disabled){background:#4f46e5}
    .btn-ghost{background:transparent;color:#e2e8f0;
      border:1px solid #334155;margin-top:.5rem}
    .btn-ghost:hover:not(:disabled){background:#334155}
    .drop-zone{width:100%;padding:.875rem;background:#0f172a;
      border:1.5px dashed #475569;border-radius:.75rem;
      text-align:center;cursor:pointer;font-size:.825rem;color:#94a3b8;
      transition:border-color .15s,color .15s;margin-bottom:.5rem}
    .drop-zone:hover{border-color:#6366f1;color:#c7d2fe}
    .drop-zone input{display:none}
    .file-name{font-size:.72rem;color:#818cf8;text-align:center;
      min-height:.9rem;margin-bottom:.25rem;word-break:break-all}
    #status{margin-top:1.1rem;padding:.7rem 1rem;border-radius:.75rem;
      font-size:.825rem;display:none;text-align:center;font-weight:500;line-height:1.4}
    .ok{background:#14532d;color:#86efac;display:block!important}
    .err{background:#7f1d1d;color:#fca5a5;display:block!important}
    .divider{border:none;border-top:1px solid #334155;margin:1.25rem 0}
  </style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">&#128203;</div>
    <h1>RemmbrMe Sync</h1>
  </div>
  <div class="badge"><span class="dot"></span>Connected to your desktop</div>

  <div class="section">
    <div class="label">Download to this device</div>
    <button class="btn btn-primary" id="dlBtn">&#8595; Download Data</button>
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="label">Upload from this device</div>
    <label class="drop-zone">
      &#128193; Choose backup file (.json)
      <input type="file" id="fileInput" accept=".json"/>
    </label>
    <div class="file-name" id="fileName"></div>
    <button class="btn btn-ghost" id="ulBtn" disabled>&#8593; Upload to Desktop</button>
  </div>

  <div id="status"></div>
</div>

<script>
  var params = new URLSearchParams(location.search);
  var token = params.get('token') || '';
  var selectedFile = null;

  function showStatus(msg, ok) {
    var el = document.getElementById('status');
    el.textContent = msg;
    el.className = ok ? 'ok' : 'err';
  }

  document.getElementById('dlBtn').onclick = function() {
    var btn = document.getElementById('dlBtn');
    btn.disabled = true;
    btn.textContent = 'Downloading...';
    fetch('/api/data?token=' + token)
      .then(function(res) {
        if (!res.ok) throw new Error('Server error ' + res.status);
        return res.text();
      })
      .then(function(text) {
        var blob = new Blob([text], {type: 'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'remmbrme-backup-' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('\u2713 Data downloaded successfully!', true);
      })
      .catch(function(e) { showStatus('\u2717 Download failed: ' + e.message, false); })
      .finally(function() { btn.disabled = false; btn.textContent = '\u2193 Download Data'; });
  };

  document.getElementById('fileInput').onchange = function(e) {
    selectedFile = e.target.files[0];
    var btn = document.getElementById('ulBtn');
    var nameEl = document.getElementById('fileName');
    if (selectedFile) {
      nameEl.textContent = selectedFile.name;
      btn.disabled = false;
    } else {
      nameEl.textContent = '';
      btn.disabled = true;
    }
  };

  document.getElementById('ulBtn').onclick = function() {
    if (!selectedFile) return;
    var btn = document.getElementById('ulBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    selectedFile.text()
      .then(function(text) {
        return fetch('/api/data?token=' + token, {
          method: 'POST',
          body: text,
          headers: {'Content-Type': 'application/json'}
        });
      })
      .then(function(res) {
        if (!res.ok) throw new Error('Server error ' + res.status);
        showStatus('\u2713 Data uploaded to desktop!', true);
      })
      .catch(function(e) { showStatus('\u2717 Upload failed: ' + e.message, false); })
      .finally(function() { btn.disabled = false; btn.textContent = '\u2191 Upload to Desktop'; });
  };
</script>
</body>
</html>"###
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

