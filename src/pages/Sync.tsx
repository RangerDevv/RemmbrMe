import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { exportAllData, importAllData } from '../lib/local_driver';


// ─── .rmmb encryption (AES-256-GCM + PBKDF2-SHA256) ─────────────────────────
// File layout: MAGIC(4) | salt(16) | iv(12) | ciphertext(N)
const RMMB_MAGIC = new Uint8Array([0x52, 0x4d, 0x4d, 0x42]); // "RMMB"
const PBKDF2_ITERATIONS = 600_000;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function encryptData(plaintext: string, passphrase: string): Promise<Uint8Array> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(plaintext),
    );
    const out = new Uint8Array(4 + 16 + 12 + ciphertext.byteLength);
    out.set(RMMB_MAGIC, 0);
    out.set(salt, 4);
    out.set(iv, 20);
    out.set(new Uint8Array(ciphertext), 32);
    return out;
}

async function decryptData(bytes: Uint8Array, passphrase: string): Promise<string> {
    if (bytes[0] !== 0x52 || bytes[1] !== 0x4d || bytes[2] !== 0x4d || bytes[3] !== 0x42) {
        throw new Error('Not a valid .rmmb file — check you selected the right file.');
    }
    const salt = bytes.slice(4, 20);
    const iv = bytes.slice(20, 32);
    const ciphertext = bytes.slice(32);
    const key = await deriveKey(passphrase, salt);
    try {
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return new TextDecoder().decode(plain);
    } catch {
        throw new Error('Decryption failed — wrong passphrase or corrupted file.');
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncInfo {
    url: string;
    token: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sync() {
    // LAN sync
    const [tab, setTab] = createSignal<'lan' | 'backup'>('lan');
    const [serverRunning, setServerRunning] = createSignal(false);
    const [serverInfo, setServerInfo] = createSignal<SyncInfo | null>(null);
    const [qrSvg, setQrSvg] = createSignal('');
    const [lanStatus, setLanStatus] = createSignal('');
    const [lanStatusType, setLanStatusType] = createSignal<'ok' | 'err' | 'info'>('info');
    const [incomingData, setIncomingData] = createSignal<string | null>(null);
    const [serverLoading, setServerLoading] = createSignal(false);

    // Encrypted backup
    const [exportPass, setExportPass] = createSignal('');
    const [importPass, setImportPass] = createSignal('');
    const [showExportPass, setShowExportPass] = createSignal(false);
    const [showImportPass, setShowImportPass] = createSignal(false);
    const [importFile, setImportFile] = createSignal<File | null>(null);
    const [backupStatus, setBackupStatus] = createSignal('');
    const [backupStatusType, setBackupStatusType] = createSignal<'ok' | 'err' | 'info'>('info');
    const [backupLoading, setBackupLoading] = createSignal(false);

    let fileInputRef: HTMLInputElement | undefined;
    let unlisten: (() => void) | null = null;

    onMount(async () => {
        // Restore running server state if page was navigated away
        try {
            const info = await invoke<SyncInfo | null>('get_sync_info');
            if (info) {
                setServerRunning(true);
                setServerInfo(info);
                await refreshQr(info);
                setLanStatusType('ok');
                setLanStatus('Server running — scan the code with your phone');
            }
        } catch { /* not in Tauri */ }

        // Listen for data uploaded by phone — auto-import silently
        try {
            unlisten = await listen<string>('sync:data-received', (event) => {
                try {
                    importAllData(event.payload);
                    setIncomingData('imported');
                    setLanStatusType('ok');
                    setLanStatus('✓ Phone changes synced to desktop');
                    // Clear after 4s
                    setTimeout(() => {
                        if (lanStatus() === '✓ Phone changes synced to desktop') setLanStatus('');
                    }, 4000);
                } catch {
                    setIncomingData(event.payload);
                    setLanStatusType('err');
                    setLanStatus('⚠ Could not auto-import — click Import below');
                }
            });
        } catch { /* not in Tauri */ }
    });

    onCleanup(() => {
        unlisten?.();
    });

    async function refreshQr(info: SyncInfo) {
        try {
            const fullUrl = `${info.url}?token=${info.token}`;
            const svg = await invoke<string>('generate_qr_svg', { text: fullUrl });
            setQrSvg(svg);
        } catch { }
    }

    async function startServer() {
        setServerLoading(true);
        try {
            const data = exportAllData();
            const info = await invoke<SyncInfo>('start_sync_server', { data });
            setServerRunning(true);
            setServerInfo(info);
            setLanStatusType('ok');
            setLanStatus('Server started — scan the QR code with your phone');
            await refreshQr(info);
        } catch (e: any) {
            setLanStatusType('err');
            setLanStatus('Failed to start: ' + String(e));
        } finally {
            setServerLoading(false);
        }
    }

    async function stopServer() {
        try {
            await invoke('stop_sync_server');
        } catch { }
        setServerRunning(false);
        setServerInfo(null);
        setQrSvg('');
        setIncomingData(null);
        setLanStatus('');
    }

    function importIncoming() {
        const data = incomingData();
        if (!data) return;
        try {
            importAllData(data);
            setIncomingData(null);
            setLanStatusType('ok');
            setLanStatus('✓ Phone data imported — restart the app to see changes');
        } catch (e: any) {
            setLanStatusType('err');
            setLanStatus('Import failed: ' + String(e));
        }
    }

    function copyUrl() {
        const info = serverInfo();
        if (!info) return;
        navigator.clipboard.writeText(`${info.url}?token=${info.token}`);
        setLanStatusType('ok');
        setLanStatus('✓ URL copied to clipboard');
    }

    // ─── Encrypted backup handlers ───────────────────────────────────────────

    async function handleExport() {
        if (!exportPass().trim()) {
            setBackupStatusType('err');
            setBackupStatus('Enter a passphrase to protect your backup');
            return;
        }
        setBackupLoading(true);
        setBackupStatus('Encrypting…');
        setBackupStatusType('info');
        try {
            const json = exportAllData();
            const bytes = await encryptData(json, exportPass().trim());
            const blob = new Blob([bytes], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `remmbrme-${new Date().toISOString().slice(0, 10)}.rmmb`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setBackupStatusType('ok');
            setBackupStatus('✓ Backup file downloaded — keep your passphrase safe!');
        } catch (e: any) {
            setBackupStatusType('err');
            setBackupStatus('Export failed: ' + e.message);
        } finally {
            setBackupLoading(false);
        }
    }

    async function handleImport() {
        const file = importFile();
        if (!file) {
            setBackupStatusType('err');
            setBackupStatus('Select a .rmmb backup file first');
            return;
        }
        if (!importPass().trim()) {
            setBackupStatusType('err');
            setBackupStatus('Enter the passphrase used when exporting');
            return;
        }
        setBackupLoading(true);
        setBackupStatus('Decrypting…');
        setBackupStatusType('info');
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const json = await decryptData(bytes, importPass().trim());
            importAllData(json);
            setBackupStatusType('ok');
            setBackupStatus('✓ Data restored — restart the app to see your data');
            setImportFile(null);
            if (fileInputRef) fileInputRef.value = '';
        } catch (e: any) {
            setBackupStatusType('err');
            setBackupStatus(e.message);
        } finally {
            setBackupLoading(false);
        }
    }

    // ─── Styles ──────────────────────────────────────────────────────────────

    const tabActive = `px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150`;
    const tabInactive = `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 opacity-60 hover:opacity-90`;

    const statusColor = (type: 'ok' | 'err' | 'info') => {
        if (type === 'ok') return { bg: 'var(--color-accent-muted)', text: 'var(--color-accent)' };
        if (type === 'err') return { bg: 'rgba(239,68,68,0.15)', text: '#f87171' };
        return { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' };
    };

    return (
        <div class="max-w-2xl">
            <div class="mb-6">
                <h1 class="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Sync & Backup</h1>
                <p class="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Transfer your data to other devices or create encrypted backups.
                </p>
            </div>

            {/* Tab bar */}
            <div
                class="inline-flex gap-1 p-1 rounded-xl mb-6"
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
                <button
                    class={tab() === 'lan' ? tabActive : tabInactive}
                    style={
                        tab() === 'lan'
                            ? { background: 'var(--color-bg-tertiary)', color: 'var(--color-text)' }
                            : { color: 'var(--color-text-secondary)' }
                    }
                    onClick={() => setTab('lan')}
                >
                    📶 LAN Sync
                </button>
                <button
                    class={tab() === 'backup' ? tabActive : tabInactive}
                    style={
                        tab() === 'backup'
                            ? { background: 'var(--color-bg-tertiary)', color: 'var(--color-text)' }
                            : { color: 'var(--color-text-secondary)' }
                    }
                    onClick={() => setTab('backup')}
                >
                    🔐 Encrypted Backup
                </button>
            </div>

            {/* ── LAN Sync tab ─────────────────────────────────────────────── */}
            <Show when={tab() === 'lan'}>
                <div
                    class="rounded-2xl p-6 space-y-5"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                >
                    <div>
                        <h2 class="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                            Use RemmbrMe on your phone
                        </h2>
                        <p class="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Starts a local WiFi server — scan the QR code, then add tasks, events
                            and notes from your phone. Changes sync back automatically.
                        </p>
                    </div>

                    {/* Start / Stop button */}
                    <Show
                        when={!serverRunning()}
                        fallback={
                            <button
                                class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 hover:opacity-80 active:scale-[.98]"
                                style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#f87171',
                                    'border-color': 'rgba(239,68,68,0.3)',
                                }}
                                onClick={stopServer}
                            >
                                <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
                                Stop Server
                            </button>
                        }
                    >
                        <button
                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[.98] disabled:opacity-50"
                            style={{
                                background: 'var(--color-accent)',
                                color: '#fff',
                            }}
                            onClick={startServer}
                            disabled={serverLoading()}
                        >
                            <Show when={serverLoading()} fallback="▶ Start Sync Server">
                                <span class="opacity-80">Starting…</span>
                            </Show>
                        </button>
                    </Show>

                    {/* QR + instructions (when server is running) */}
                    <Show when={serverRunning() && serverInfo()}>
                        <div class="flex flex-col sm:flex-row gap-6 items-start">
                            {/* QR code — constrained box so SVG never overflows */}
                            <div
                                class="rounded-xl p-2.5 flex-shrink-0 overflow-hidden"
                                style={{
                                    background: '#f9fafb',
                                    border: '3px solid var(--color-border)',
                                    width: '208px',
                                    height: '208px',
                                }}
                            >
                                <Show
                                    when={qrSvg()}
                                    fallback={
                                        <div class="w-full h-full flex items-center justify-center"
                                            style={{ color: '#94a3b8', 'font-size': '.8rem' }}>
                                            Generating…
                                        </div>
                                    }
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            'line-height': '0',
                                            display: 'block',
                                        }}
                                        innerHTML={qrSvg()}
                                    />
                                </Show>
                            </div>

                            {/* Instructions */}
                            <div class="space-y-3 flex-1 min-w-0">
                                <div>
                                    <p class="text-xs font-semibold uppercase tracking-wider mb-2.5"
                                        style={{ color: 'var(--color-text-muted)' }}>
                                        How to connect
                                    </p>
                                    <ol class="space-y-1.5">
                                        {(['Connect your phone to the same WiFi',
                                          'Scan the QR code with your camera',
                                          'Add tasks, events and notes from your phone',
                                          'Changes auto-sync back to your desktop'] as const).map((step, i) => (
                                            <li class="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                <span
                                                    class="text-xs font-bold rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center mt-0.5"
                                                    style={{
                                                        background: 'var(--color-accent-muted)',
                                                        color: 'var(--color-accent)',
                                                    }}
                                                >
                                                    {i + 1}
                                                </span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                {/* URL + copy */}
                                <div
                                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-mono"
                                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                                >
                                    <span class="flex-1 truncate">
                                        {serverInfo()!.url}?token=…
                                    </span>
                                    <button
                                        class="text-xs font-semibold hover:opacity-80 flex-shrink-0"
                                        style={{ color: 'var(--color-accent)' }}
                                        onClick={copyUrl}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Incoming data banner — only shown if auto-import failed */}
                        <Show when={incomingData() && incomingData() !== 'imported'}>
                            <div
                                class="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                                style={{
                                    background: 'var(--color-accent-muted)',
                                    border: '1px solid var(--color-accent)',
                                }}
                            >
                                <p class="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                                    📥 Phone changes received
                                </p>
                                <button
                                    class="text-sm font-semibold px-3 py-1 rounded-lg transition-all hover:opacity-80"
                                    style={{
                                        background: 'var(--color-accent)',
                                        color: '#fff',
                                    }}
                                    onClick={importIncoming}
                                >
                                    Import
                                </button>
                            </div>
                        </Show>
                    </Show>

                    {/* Status bar */}
                    <Show when={lanStatus()}>
                        <div
                            class="rounded-xl px-4 py-2.5 text-sm font-medium"
                            style={{
                                background: statusColor(lanStatusType()).bg,
                                color: statusColor(lanStatusType()).text,
                            }}
                        >
                            {lanStatus()}
                        </div>
                    </Show>
                </div>
            </Show>

            {/* ── Encrypted Backup tab ──────────────────────────────────────── */}
            <Show when={tab() === 'backup'}>
                <div class="space-y-4">

                    {/* Export card */}
                    <div
                        class="rounded-2xl p-6 space-y-4"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                    >
                        <div>
                            <h2 class="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                                Export Backup
                            </h2>
                            <p class="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                Exports all your data as an AES-256 encrypted <code class="text-xs px-1 py-0.5 rounded"
                                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    .rmmb
                                </code> file. Store it anywhere — USB, cloud, email.
                            </p>
                        </div>

                        <div class="space-y-2">
                            <label class="text-xs font-semibold uppercase tracking-wider block"
                                style={{ color: 'var(--color-text-muted)' }}>
                                Passphrase
                            </label>
                            <div class="relative">
                                <input
                                    type={showExportPass() ? 'text' : 'password'}
                                    value={exportPass()}
                                    onInput={(e) => setExportPass(e.currentTarget.value)}
                                    placeholder="Choose a strong passphrase…"
                                    class="w-full px-3 py-2.5 pr-10 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 transition-all"
                                    style={{
                                        background: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text)',
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleExport(); }}
                                />
                                <button
                                    type="button"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-80"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                    onClick={() => setShowExportPass(!showExportPass())}
                                >
                                    {showExportPass() ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button
                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[.98] disabled:opacity-50"
                            style={{ background: 'var(--color-accent)', color: '#fff' }}
                            onClick={handleExport}
                            disabled={backupLoading()}
                        >
                            ⬇ Export &amp; Download
                        </button>
                    </div>

                    {/* Import card */}
                    <div
                        class="rounded-2xl p-6 space-y-4"
                        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                    >
                        <div>
                            <h2 class="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                                Restore from Backup
                            </h2>
                            <p class="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                Select a <code class="text-xs px-1 py-0.5 rounded"
                                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                                    .rmmb
                                </code> file and enter the passphrase you used when exporting.
                            </p>
                        </div>

                        {/* File picker */}
                        <div>
                            <label class="text-xs font-semibold uppercase tracking-wider block mb-2"
                                style={{ color: 'var(--color-text-muted)' }}>
                                Backup file
                            </label>
                            <label
                                class="flex items-center gap-3 w-full px-4 py-3 rounded-xl cursor-pointer border-2 border-dashed transition-all duration-150 hover:opacity-80"
                                style={{
                                    'border-color': importFile() ? 'var(--color-accent)' : 'var(--color-border)',
                                    background: 'var(--color-bg-tertiary)',
                                    color: importFile() ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                }}
                            >
                                <span class="text-lg">{importFile() ? '📄' : '📂'}</span>
                                <span class="text-sm font-medium truncate">
                                    {importFile() ? importFile()!.name : 'Choose .rmmb file…'}
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".rmmb,.json"
                                    class="hidden"
                                    onChange={(e) => setImportFile(e.currentTarget.files?.[0] ?? null)}
                                />
                            </label>
                        </div>

                        {/* Passphrase */}
                        <div class="space-y-2">
                            <label class="text-xs font-semibold uppercase tracking-wider block"
                                style={{ color: 'var(--color-text-muted)' }}>
                                Passphrase
                            </label>
                            <div class="relative">
                                <input
                                    type={showImportPass() ? 'text' : 'password'}
                                    value={importPass()}
                                    onInput={(e) => setImportPass(e.currentTarget.value)}
                                    placeholder="Enter passphrase…"
                                    class="w-full px-3 py-2.5 pr-10 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 transition-all"
                                    style={{
                                        background: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text)',
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleImport(); }}
                                />
                                <button
                                    type="button"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-80"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                    onClick={() => setShowImportPass(!showImportPass())}
                                >
                                    {showImportPass() ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button
                            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[.98] disabled:opacity-50"
                            style={{
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                            }}
                            onClick={handleImport}
                            disabled={backupLoading()}
                        >
                            🔓 Decrypt &amp; Restore
                        </button>
                    </div>

                    {/* Backup status */}
                    <Show when={backupStatus()}>
                        <div
                            class="rounded-xl px-4 py-2.5 text-sm font-medium"
                            style={{
                                background: statusColor(backupStatusType()).bg,
                                color: statusColor(backupStatusType()).text,
                            }}
                        >
                            {backupStatus()}
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
