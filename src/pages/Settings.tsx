import { createSignal, onMount, createEffect, For } from 'solid-js';
import { A } from '@solidjs/router';
import ConfirmModal from '../components/ConfirmModal';
import { themes, currentThemeId, setTheme, getUserName, setUserName, isUse24hTime, setUse24hTime } from '../lib/theme';
import { timerThemes, currentTimerThemeId, setTimerTheme } from '../lib/timerThemes';
import { getStorageMode, setStorageMode, getPocketBaseUrl, setPocketBaseUrl, reinitBackend } from '../lib/backend';
import { 
    DashboardIcon, 
    CheckCircleIcon, 
    BoltIcon, 
    CalendarIcon, 
    ClockIcon,
    WarningIcon,
    RepeatIcon,
    TagIcon,
    SettingsIcon
} from '../components/Icons';

interface DashboardSettings {
    showCompletedToday: boolean;
    showActiveTasks: boolean;
    showEventsToday: boolean;
    showUpcomingDeadlines: boolean;
    showStreak: boolean;
    showHighPriority: boolean;
    showAvgTasks: boolean;
    showRecurring: boolean;
    showOverdueAlert: boolean;
    showProgressBar: boolean;
    showTodaySchedule: boolean;
    showPriorityTasks: boolean;
    showTopTags: boolean;
    showQuickActions: boolean;
    autoRefresh: boolean;
    refreshInterval: number; // in minutes
}

const DEFAULT_SETTINGS: DashboardSettings = {
    showCompletedToday: true,
    showActiveTasks: true,
    showEventsToday: true,
    showUpcomingDeadlines: true,
    showStreak: true,
    showHighPriority: true,
    showAvgTasks: true,
    showRecurring: true,
    showOverdueAlert: true,
    showProgressBar: true,
    showTodaySchedule: true,
    showPriorityTasks: true,
    showTopTags: true,
    showQuickActions: true,
    autoRefresh: true,
    refreshInterval: 5
};

function Settings() {
    const [settings, setSettings] = createSignal<DashboardSettings>(DEFAULT_SETTINGS);
    const [saved, setSaved] = createSignal(false);
    const [isInitialLoad, setIsInitialLoad] = createSignal(true);
    const [confirmReset, setConfirmReset] = createSignal(false);
    const [userName, setLocalUserName] = createSignal(getUserName()());
    const [pbUrl, setPbUrl] = createSignal(getPocketBaseUrl());
    const [storageMode, setLocalStorageMode] = createSignal(getStorageMode());
    const [pbConnecting, setPbConnecting] = createSignal(false);
    const [pbStatus, setPbStatus] = createSignal('');

    onMount(() => {
        loadSettings();
        setIsInitialLoad(false);
    });

    // Autosave whenever settings change
    createEffect(() => {
        if (!isInitialLoad()) {
            const currentSettings = settings();
            localStorage.setItem('dashboardSettings', JSON.stringify(currentSettings));
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        }
    });

    function loadSettings() {
        const saved = localStorage.getItem('dashboardSettings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }

    function resetToDefaults() {
        setConfirmReset(true);
    }

    function confirmResetSettings() {
        setSettings(DEFAULT_SETTINGS);
        setConfirmReset(false);
    }

    function updateSetting(key: keyof DashboardSettings, value: boolean | number) {
        setSettings({ ...settings(), [key]: value });
    }

    function handleNameChange(name: string) {
        setLocalUserName(name);
        setUserName(name);
    }

    async function handleStorageModeChange(mode: string) {
        if (mode === 'pocketbase' && pbUrl()) {
            setPbConnecting(true);
            setPbStatus('');
            try {
                setPocketBaseUrl(pbUrl());
                setStorageMode('pocketbase');
                await reinitBackend();
                setLocalStorageMode('pocketbase');
                setPbStatus('Connected to PocketBase');
            } catch (e: any) {
                setPbStatus('Failed to connect: ' + (e.message || 'Unknown error'));
                setStorageMode('local');
                setLocalStorageMode('local');
            } finally {
                setPbConnecting(false);
            }
        } else {
            setStorageMode('local');
            setLocalStorageMode('local');
            await reinitBackend();
        }
    }

    const ToggleRow = (props: { icon: any; label: string; checked: boolean; onChange: (v: boolean) => void }) => (
        <label class="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
            <div class="flex items-center gap-2">
                <props.icon class="w-4 h-4" style={{ "color": "var(--color-text-muted)" }} />
                <span class="text-sm" style={{ "color": "var(--color-text)" }}>{props.label}</span>
            </div>
            <input
                type="checkbox"
                checked={props.checked}
                onChange={(e) => props.onChange(e.currentTarget.checked)}
                class="w-4 h-4 cursor-pointer"
            />
        </label>
    );

    return (
        <div class="flex-1 w-full max-w-3xl">
            <div class="mb-5">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-xl lg:text-2xl font-bold" style={{ "color": "var(--color-text)" }}>Settings</h1>
                        <p class="text-sm mt-0.5" style={{ "color": "var(--color-text-muted)" }}>Customize your experience</p>
                    </div>
                    <div class="text-xs">
                        {saved() ? (
                            <span class="flex items-center gap-1.5" style={{ "color": "var(--color-accent)" }}>
                                <span class="w-1.5 h-1.5 rounded-full animate-pulse" style={{ "background-color": "var(--color-accent)" }}></span>
                                Saved
                            </span>
                        ) : (
                            <span style={{ "color": "var(--color-text-muted)" }}>Autosave</span>
                        )}
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                {/* Profile Section */}
                <div class="glass rounded-xl p-5">
                    <h2 class="text-base font-bold mb-3 flex items-center gap-2" style={{ "color": "var(--color-text)" }}>
                        <SettingsIcon class="w-4 h-4" /> Profile
                    </h2>
                    <div class="mb-3">
                        <label class="block text-xs font-medium mb-1" style={{ "color": "var(--color-text-secondary)" }}>Display Name</label>
                        <input
                            type="text"
                            value={userName()}
                            onInput={(e) => handleNameChange(e.currentTarget.value)}
                            class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                            placeholder="Your name..."
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium mb-2" style={{ "color": "var(--color-text-secondary)" }}>Time Format</label>
                        <div class="flex rounded-lg overflow-hidden w-fit" style={{ "border": "1px solid var(--color-border)" }}>
                            <button
                                type="button"
                                onClick={() => setUse24hTime(false)}
                                class="px-4 py-2 text-sm font-medium transition-all duration-200"
                                style={{
                                    "background": !isUse24hTime() ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                    "color": !isUse24hTime() ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                                }}
                            >12-hour <span class="opacity-60 text-xs">(1:30 PM)</span></button>
                            <button
                                type="button"
                                onClick={() => setUse24hTime(true)}
                                class="px-4 py-2 text-sm font-medium transition-all duration-200"
                                style={{
                                    "background": isUse24hTime() ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                    "color": isUse24hTime() ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                                }}
                            >24-hour <span class="opacity-60 text-xs">(13:30)</span></button>
                        </div>
                    </div>
                </div>

                {/* Theme Section */}
                <div class="glass rounded-xl p-5">
                    <h2 class="text-base font-bold mb-3" style={{ "color": "var(--color-text)" }}>Theme</h2>
                    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        <For each={themes}>
                            {(theme) => (
                                <button
                                    onClick={() => setTheme(theme.id)}
                                    class="p-3 rounded-lg transition-all duration-300 text-center"
                                    style={{
                                        "background-color": theme.colors.bg,
                                        "border": currentThemeId() === theme.id ? `2px solid ${theme.colors.accent}` : "2px solid transparent",
                                        "box-shadow": currentThemeId() === theme.id ? `0 0 12px ${theme.colors.accent}40` : "none"
                                    }}
                                >
                                    <div class="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ "background-color": theme.colors.accent }}></div>
                                    <span class="text-[10px] font-medium" style={{ "color": theme.colors.text }}>{theme.name}</span>
                                </button>
                            )}
                        </For>
                    </div>
                </div>

                {/* Focus Timer Theme Section */}
                <div class="glass rounded-xl p-5">
                    <h2 class="text-base font-bold mb-1" style={{ "color": "var(--color-text)" }}>Focus Timer Theme</h2>
                    <p class="text-xs mb-3" style={{ "color": "var(--color-text-muted)" }}>
                        Applied to the fullscreen focus session overlay. Can also be changed live during a session.
                    </p>
                    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <For each={timerThemes}>
                            {(t) => (
                                <button
                                    onClick={() => setTimerTheme(t.id)}
                                    class="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200"
                                    style={{
                                        "background": currentTimerThemeId() === t.id
                                            ? `${t.preview}18`
                                            : "var(--color-bg-tertiary)",
                                        "border": currentTimerThemeId() === t.id
                                            ? `2px solid ${t.preview}`
                                            : "2px solid var(--color-border)",
                                        "box-shadow": currentTimerThemeId() === t.id ? `0 0 10px ${t.preview}40` : "none",
                                    }}
                                >
                                    <span
                                        class="w-7 h-7 rounded-full shrink-0"
                                        style={{ "background-color": t.preview }}
                                    />
                                    <span class="text-[10px] font-medium text-center leading-tight" style={{ "color": "var(--color-text-secondary)" }}>
                                        {t.name}
                                    </span>
                                </button>
                            )}
                        </For>
                    </div>
                </div>

                {/* Storage / Backup Section */}
                <div class="glass rounded-xl p-5">
                    <h2 class="text-base font-bold mb-3" style={{ "color": "var(--color-text)" }}>Data & Backup</h2>
                    <div class="space-y-3">
                        <div class="flex gap-2">
                            <button
                                onClick={() => handleStorageModeChange('local')}
                                class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    "background-color": storageMode() === 'local' ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                    "color": storageMode() === 'local' ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                                    "border": `1px solid ${storageMode() === 'local' ? 'transparent' : 'var(--color-border)'}`
                                }}
                            >
                                Local Storage
                            </button>
                            <button
                                onClick={() => { if (pbUrl()) handleStorageModeChange('pocketbase'); }}
                                class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    "background-color": storageMode() === 'pocketbase' ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                    "color": storageMode() === 'pocketbase' ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                                    "border": `1px solid ${storageMode() === 'pocketbase' ? 'transparent' : 'var(--color-border)'}`
                                }}
                            >
                                PocketBase
                            </button>
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1" style={{ "color": "var(--color-text-secondary)" }}>PocketBase URL</label>
                            <input
                                type="url"
                                value={pbUrl()}
                                onInput={(e) => setPbUrl(e.currentTarget.value)}
                                class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-all duration-200"
                                style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                placeholder="https://your-pocketbase.example.com"
                            />
                        </div>
                        {pbStatus() && (
                            <p class={`text-xs ${pbStatus().includes('Failed') ? 'text-red-400' : ''}`} style={{ "color": pbStatus().includes('Failed') ? undefined : "var(--color-accent)" }}>
                                {pbStatus()}
                            </p>
                        )}
                        <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                            Local mode saves data in your browser. PocketBase mode syncs with a remote server for backup.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div class="flex justify-between items-center">
                    <button
                        onClick={resetToDefaults}
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)", "border": "1px solid var(--color-border)" }}
                    >
                        Reset to Defaults
                    </button>
                    <A href="/" class="text-sm flex items-center gap-1" style={{ "color": "var(--color-accent)" }}>
                        <span>←</span> Back to Dashboard
                    </A>
                </div>
            </div>

            <ConfirmModal 
                show={confirmReset()}
                title="Reset Settings"
                message="Are you sure you want to reset all settings to their default values?"
                confirmText="Reset"
                cancelText="Cancel"
                type="warning"
                onConfirm={confirmResetSettings}
                onCancel={() => setConfirmReset(false)}
            />
        </div>
    );
}

export default Settings;
