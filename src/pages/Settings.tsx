import { createSignal, onMount, createEffect } from 'solid-js';
import { A } from '@solidjs/router';

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
        if (confirm('Reset all settings to defaults?')) {
            setSettings(DEFAULT_SETTINGS);
        }
    }

    function updateSetting(key: keyof DashboardSettings, value: boolean | number) {
        setSettings({ ...settings(), [key]: value });
    }

    return (
        <div class="flex-1 w-full max-w-4xl">
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-4xl font-bold text-white mb-2">⚙️ Settings</h1>
                        <p class="text-gray-400">Customize your dashboard experience</p>
                    </div>
                    <div class="text-sm">
                        {saved() ? (
                            <span class="text-green-400 flex items-center gap-2">
                                <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Saved
                            </span>
                        ) : (
                            <span class="text-gray-500">Autosave enabled</span>
                        )}
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                {/* Dashboard Widgets */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 class="text-2xl font-bold text-white mb-4">📊 Dashboard Widgets</h2>
                    <p class="text-sm text-gray-400 mb-6">Choose which widgets to display on your dashboard</p>

                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-white mb-3">Main Stats Cards</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">✅</span>
                                    <span class="text-white">Completed Today</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showCompletedToday}
                                    onChange={(e) => updateSetting('showCompletedToday', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📋</span>
                                    <span class="text-white">Active Tasks</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showActiveTasks}
                                    onChange={(e) => updateSetting('showActiveTasks', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📅</span>
                                    <span class="text-white">Events Today</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showEventsToday}
                                    onChange={(e) => updateSetting('showEventsToday', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">⏰</span>
                                    <span class="text-white">Due This Week</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showUpcomingDeadlines}
                                    onChange={(e) => updateSetting('showUpcomingDeadlines', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>
                        </div>

                        <h3 class="text-lg font-semibold text-white mb-3 mt-6">Extended Stats</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">🔥</span>
                                    <span class="text-white">Day Streak</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showStreak}
                                    onChange={(e) => updateSetting('showStreak', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">🚨</span>
                                    <span class="text-white">High Priority</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showHighPriority}
                                    onChange={(e) => updateSetting('showHighPriority', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📊</span>
                                    <span class="text-white">Avg Tasks/Day</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showAvgTasks}
                                    onChange={(e) => updateSetting('showAvgTasks', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">🔁</span>
                                    <span class="text-white">Recurring Tasks</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showRecurring}
                                    onChange={(e) => updateSetting('showRecurring', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>
                        </div>

                        <h3 class="text-lg font-semibold text-white mb-3 mt-6">Dashboard Sections</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">⚠️</span>
                                    <span class="text-white">Overdue Alert</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showOverdueAlert}
                                    onChange={(e) => updateSetting('showOverdueAlert', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📈</span>
                                    <span class="text-white">Progress Bar</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showProgressBar}
                                    onChange={(e) => updateSetting('showProgressBar', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📅</span>
                                    <span class="text-white">Today's Schedule</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showTodaySchedule}
                                    onChange={(e) => updateSetting('showTodaySchedule', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">✅</span>
                                    <span class="text-white">Priority Tasks</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showPriorityTasks}
                                    onChange={(e) => updateSetting('showPriorityTasks', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">🏷️</span>
                                    <span class="text-white">Top Tags</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showTopTags}
                                    onChange={(e) => updateSetting('showTopTags', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>

                            <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors duration-200 cursor-pointer">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">⚡</span>
                                    <span class="text-white">Quick Actions</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings().showQuickActions}
                                    onChange={(e) => updateSetting('showQuickActions', e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Auto-Refresh Settings */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 class="text-2xl font-bold text-white mb-4">🔄 Auto-Refresh</h2>
                    <p class="text-sm text-gray-400 mb-6">Configure automatic dashboard updates</p>

                    <div class="space-y-4">
                        <label class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg">
                            <div>
                                <span class="text-white font-medium">Enable Auto-Refresh</span>
                                <p class="text-xs text-gray-500 mt-1">Automatically update dashboard data</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings().autoRefresh}
                                onChange={(e) => updateSetting('autoRefresh', e.currentTarget.checked)}
                                class="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            />
                        </label>

                        <div class="p-3 bg-black/50 border border-zinc-700 rounded-lg">
                            <label class="block text-white font-medium mb-2">Refresh Interval</label>
                            <div class="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={settings().refreshInterval}
                                    onInput={(e) => updateSetting('refreshInterval', parseInt(e.currentTarget.value))}
                                    class="flex-1"
                                    disabled={!settings().autoRefresh}
                                />
                                <span class="text-white font-semibold min-w-[80px] text-right">
                                    {settings().refreshInterval} min{settings().refreshInterval !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">
                                Dashboard will refresh every {settings().refreshInterval} minute{settings().refreshInterval !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div class="flex justify-center">
                    <button
                        onClick={resetToDefaults}
                        class="px-8 py-4 bg-zinc-800 text-gray-300 font-semibold rounded-xl hover:bg-zinc-700 transition-all duration-200"
                    >
                        🔄 Reset to Defaults
                    </button>
                </div>

                {/* Preview Link */}
                <div class="text-center">
                    <A href="/" class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-200">
                        <span>←</span>
                        <span>Back to Dashboard</span>
                    </A>
                </div>
            </div>
        </div>
    );
}

export default Settings;
