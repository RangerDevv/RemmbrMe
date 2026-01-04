import { createSignal, onMount, For, Show, createEffect } from 'solid-js';
import { A } from '@solidjs/router';
import { bk, currentUser } from '../lib/backend.ts';

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
    refreshInterval: number;
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

// Add relative time helper to Date prototype
declare global {
    interface Date {
        toRelativeTime(): string;
    }
}

Date.prototype.toRelativeTime = function() {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - this.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

function Dashboard() {
    const [events, setEvents] = createSignal([] as any[]);
    const [todos, setTodos] = createSignal([] as any[]);
    const [tags, setTags] = createSignal([] as any[]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [streak, setStreak] = createSignal(0);
    const [settings, setSettings] = createSignal<DashboardSettings>(DEFAULT_SETTINGS);
    const [stats, setStats] = createSignal({
        completedToday: 0,
        totalTasks: 0,
        eventsToday: 0,
        upcomingDeadlines: 0,
        highPriorityTasks: 0,
        completionRate: 0,
        avgTasksPerDay: 0,
        recurringTasks: 0
    });

    let greeting = "";
    const time = new Date().getHours();
    if (time >= 0 && time < 12) {
        greeting = "Good Morning";
    } else if (time >= 12 && time < 18) {
        greeting = "Good Afternoon";
    } else {
        greeting = "Good Evening";
    }

    async function fetchDashboardData() {
        setIsLoading(true);
        try {
            const [eventRecords, todoRecords, tagRecords] = await Promise.all([
                bk.collection('Calendar').getFullList({
                    filter: `user = ${currentUser()?.id}`,
                    expand: 'Tasks,Tags',
                    sort: 'Start'
                }),
                bk.collection('Todo').getFullList({
                    filter: `user = ${currentUser()?.id}`,
                    expand: 'Tags',
                    sort: '-created'
                }),
                bk.collection('Tags').getFullList({
                    filter: `user = ${currentUser()?.id}` //TODO: A lot of filtering is being done by user, maybe do this by default
                })
            ]);

            setEvents(eventRecords);
            setTodos(todoRecords);
            setTags(tagRecords);

            // Calculate stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const eventsToday = eventRecords.filter(e => {
                const eventDate = new Date(e.Start);
                return eventDate >= today && eventDate < tomorrow;
            }).length;

            const completedToday = todoRecords.filter(t => {
                if (!t.Completed || !t.updated) return false;
                const completedDate = new Date(t.updated);
                return completedDate >= today && completedDate < tomorrow;
            }).length;

            const upcomingDeadlines = todoRecords.filter(t => {
                if (!t.Deadline || t.Completed) return false;
                const deadline = new Date(t.Deadline);
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                return deadline <= nextWeek;
            }).length;

            const highPriorityTasks = todoRecords.filter(t => 
                !t.Completed && t.Priority === 'P1'
            ).length;

            const completedTasks = todoRecords.filter(t => t.Completed).length;
            const totalTasks = todoRecords.length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            const recurringTasks = todoRecords.filter(t => 
                t.Recurrence && t.Recurrence !== 'none'
            ).length;

            // Calculate average tasks per day (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentCompletedTasks = todoRecords.filter(t => {
                if (!t.Completed || !t.updated) return false;
                const completedDate = new Date(t.updated);
                return completedDate >= sevenDaysAgo;
            }).length;
            const avgTasksPerDay = Math.round(recentCompletedTasks / 7);

            setStats({
                completedToday,
                totalTasks: todoRecords.filter(t => !t.Completed).length,
                eventsToday,
                upcomingDeadlines,
                highPriorityTasks,
                completionRate,
                avgTasksPerDay,
                recurringTasks
            });

            // Calculate streak
            calculateStreak(todoRecords);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function calculateStreak(todoRecords: any[]) {
        const completedDates = new Set(
            todoRecords
                .filter(t => t.Completed && t.updated)
                .map(t => new Date(t.updated).toISOString().split('T')[0])
        );

        let currentStreak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (completedDates.has(dateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        setStreak(currentStreak);
    }

    async function quickCompleteTask(taskId: string) {
        await bk.collection('Todo').update(taskId, { Completed: true });
        fetchDashboardData();
    }

    function getTodayEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return events().filter(e => {
            const eventDate = new Date(e.Start);
            return eventDate >= today && eventDate < tomorrow;
        }).sort((a, b) => new Date(a.Start).getTime() - new Date(b.Start).getTime());
    }

    function getUpcomingTasks() {
        return todos()
            .filter(t => !t.Completed)
            .sort((a, b) => {
                // Sort by priority first (P1 > P2 > P3)
                const priorityOrder = { P1: 0, P2: 1, P3: 2 };
                const aPriority = priorityOrder[a.Priority as keyof typeof priorityOrder] ?? 3;
                const bPriority = priorityOrder[b.Priority as keyof typeof priorityOrder] ?? 3;
                if (aPriority !== bPriority) return aPriority - bPriority;
                
                // Then by deadline
                if (a.Deadline && !b.Deadline) return -1;
                if (!a.Deadline && b.Deadline) return 1;
                if (a.Deadline && b.Deadline) {
                    return new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime();
                }
                return 0;
            })
            .slice(0, 5);
    }

    function getOverdueTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return todos().filter(t => {
            if (!t.Deadline || t.Completed) return false;
            const deadline = new Date(t.Deadline);
            return deadline < today;
        });
    }

    function getTopTags() {
        const tagCounts = new Map();
        
        todos().forEach(task => {
            if (task.expand?.Tags) {
                task.expand.Tags.forEach((tag: any) => {
                    tagCounts.set(tag.id, {
                        ...tag,
                        count: (tagCounts.get(tag.id)?.count || 0) + 1
                    });
                });
            }
        });

        return Array.from(tagCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    onMount(() => {
        // Load settings
        const savedSettings = localStorage.getItem('dashboardSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }

        fetchDashboardData();
        
        // Auto-refresh based on settings
        let interval: number | undefined;
        createEffect(() => {
            if (interval) clearInterval(interval);
            if (settings().autoRefresh) {
                interval = setInterval(fetchDashboardData, settings().refreshInterval * 60 * 1000);
            }
        });

        return () => {
            if (interval) clearInterval(interval);
        };
    });

    return (
        <div class="flex-1 w-full">
            {/* Header */}
            <div class="mb-8">
                <div>
                    <h1 class="text-5xl font-bold text-white mb-2">{greeting} 👋</h1>
                    <p class="text-xl text-gray-400">{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    })}</p>
                </div>
            </div>

            <Show when={isLoading()}>
                <div class="flex items-center justify-center h-64">
                    <div class="text-4xl animate-pulse">📊</div>
                </div>
            </Show>

            <Show when={!isLoading()}>
                {/* Stats Grid */}
                <Show when={settings().showCompletedToday || settings().showActiveTasks || settings().showEventsToday || settings().showUpcomingDeadlines}>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Show when={settings().showCompletedToday}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                                <div class="text-gray-400 text-2xl mb-2">✅</div>
                                <div class="text-3xl font-bold text-white mb-1">{stats().completedToday}</div>
                                <div class="text-sm text-gray-400">Completed Today</div>
                            </div>
                        </Show>

                        <Show when={settings().showActiveTasks}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                                <div class="text-gray-400 text-2xl mb-2">📋</div>
                                <div class="text-3xl font-bold text-white mb-1">{stats().totalTasks}</div>
                                <div class="text-sm text-gray-400">Active Tasks</div>
                            </div>
                        </Show>

                        <Show when={settings().showEventsToday}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                                <div class="text-gray-400 text-2xl mb-2">📅</div>
                                <div class="text-3xl font-bold text-white mb-1">{stats().eventsToday}</div>
                                <div class="text-sm text-gray-400">Events Today</div>
                            </div>
                        </Show>

                        <Show when={settings().showUpcomingDeadlines}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                                <div class="text-gray-400 text-2xl mb-2">⏰</div>
                                <div class="text-3xl font-bold text-white mb-1">{stats().upcomingDeadlines}</div>
                                <div class="text-sm text-gray-400">Due This Week</div>
                            </div>
                        </Show>
                    </div>
                </Show>

                {/* Extended Stats */}
                <Show when={settings().showStreak || settings().showHighPriority || settings().showAvgTasks || settings().showRecurring}>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Show when={settings().showStreak}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div class="text-red-400 text-xl mb-1">🔥</div>
                                <div class="text-2xl font-bold text-white">{streak()}</div>
                                <div class="text-xs text-gray-500">Day Streak</div>
                            </div>
                        </Show>

                        <Show when={settings().showHighPriority}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div class="text-red-400 text-xl mb-1">🚨</div>
                                <div class="text-2xl font-bold text-white">{stats().highPriorityTasks}</div>
                                <div class="text-xs text-gray-500">High Priority</div>
                            </div>
                        </Show>

                        <Show when={settings().showAvgTasks}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div class="text-cyan-400 text-xl mb-1">📊</div>
                                <div class="text-2xl font-bold text-white">{stats().avgTasksPerDay}</div>
                                <div class="text-xs text-gray-500">Avg Tasks/Day</div>
                            </div>
                        </Show>

                        <Show when={settings().showRecurring}>
                            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div class="text-purple-400 text-xl mb-1">🔁</div>
                                <div class="text-2xl font-bold text-white">{stats().recurringTasks}</div>
                                <div class="text-xs text-gray-500">Recurring</div>
                            </div>
                        </Show>
                    </div>
                </Show>

                {/* Overdue Tasks Alert */}
                <Show when={settings().showOverdueAlert && getOverdueTasks().length > 0}>
                    <div class="mb-6 bg-zinc-900 border border-red-900/50 rounded-2xl p-6">
                        <div class="flex items-start gap-4">
                            <div class="text-3xl">⚠️</div>
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-red-400 mb-2">
                                    {getOverdueTasks().length} Overdue {getOverdueTasks().length === 1 ? 'Task' : 'Tasks'}
                                </h3>
                                <div class="space-y-2">
                                    <For each={getOverdueTasks().slice(0, 3)}>
                                        {(task) => (
                                            <div class="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                                                <span class="text-white text-sm">{task.Title}</span>
                                                <button
                                                    onClick={() => quickCompleteTask(task.id)}
                                                    class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors duration-200"
                                                >
                                                    Complete
                                                </button>
                                            </div>
                                        )}
                                    </For>
                                </div>
                                <Show when={getOverdueTasks().length > 3}>
                                    <A href="/todo" class="text-sm text-red-400 hover:text-red-300 mt-2 inline-block">
                                        View all {getOverdueTasks().length} overdue tasks →
                                    </A>
                                </Show>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* Productivity Progress */}
                <Show when={settings().showProgressBar}>
                    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h3 class="text-xl font-bold text-white">Overall Progress</h3>
                                <p class="text-sm text-gray-400">Your task completion rate</p>
                            </div>
                            <div class="text-4xl font-bold text-white">{stats().completionRate}%</div>
                        </div>
                        <div class="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
                            <div 
                                class="h-full bg-zinc-600 rounded-full transition-all duration-500"
                                style={{ width: `${stats().completionRate}%` }}
                            ></div>
                        </div>
                    </div>
                </Show>

                <Show when={settings().showTodaySchedule}>
                    <div class="mb-6">
                        {/* Today's Schedule */}
                        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-white">📅 Today's Schedule</h3>
                                <A href="/calendar" class="text-sm text-blue-400 hover:text-blue-300">
                                    View Calendar →
                                </A>
                        </div>
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            <Show when={getTodayEvents().length > 0}>
                                <For each={getTodayEvents()}>
                                    {(event) => (
                                        <div class="p-4 bg-black/50 border border-zinc-700 rounded-xl hover:border-zinc-600 transition-all duration-200">
                                            <div class="flex items-start gap-3">
                                                <div 
                                                    class="w-4 h-4 rounded-full mt-1 shrink-0"
                                                    style={{ 'background-color': event.Color || '#3b82f6' }}
                                                ></div>
                                                <div class="flex-1">
                                                    <h4 class="font-semibold text-white text-lg">{event.EventName}</h4>
                                                    <Show when={event.Description}>
                                                        <p class="text-sm text-gray-400 mt-1">{event.Description}</p>
                                                    </Show>
                                                    <Show when={!event.AllDay}>
                                                        <p class="text-sm text-gray-500 mt-2">
                                                            ⏰ {new Date(event.Start).toLocaleTimeString('en-US', { 
                                                                hour: 'numeric', 
                                                                minute: '2-digit' 
                                                            })} - {new Date(event.End).toLocaleTimeString('en-US', { 
                                                                hour: 'numeric', 
                                                                minute: '2-digit' 
                                                            })}
                                                        </p>
                                                    </Show>
                                                    <Show when={event.expand?.Tasks?.length > 0}>
                                                        <div class="flex items-center gap-2 mt-2">
                                                            <div class="text-xs text-gray-500">
                                                                ✓ {event.expand.Tasks.filter((t: any) => t.Completed).length}/{event.expand.Tasks.length} tasks
                                                            </div>
                                                            <div class="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                                <div 
                                                                    class="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                                    style={{ 
                                                                        width: `${(event.expand.Tasks.filter((t: any) => t.Completed).length / event.expand.Tasks.length) * 100}%` 
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </Show>
                                                    <Show when={event.expand?.Tags && event.expand.Tags.length > 0}>
                                                        <div class="flex flex-wrap gap-1.5 mt-2">
                                                            <For each={event.expand.Tags}>
                                                                {(tag: any) => (
                                                                    <span
                                                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                                                        style={{ 'background-color': `${tag.color}40`, 'border': `1px solid ${tag.color}60` }}
                                                                    >
                                                                        <div class="w-1.5 h-1.5 rounded-full" style={{ 'background-color': tag.color }}></div>
                                                                        {tag.name}
                                                                    </span>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </Show>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                            <Show when={getTodayEvents().length === 0}>
                                <div class="text-center py-12 text-gray-500">
                                    <div class="text-4xl mb-2">🎉</div>
                                    <p>No events today - free day!</p>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
                </Show>

                <Show when={settings().showPriorityTasks || settings().showTopTags}>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Upcoming Tasks */}
                    <Show when={settings().showPriorityTasks}>
                        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold text-white">📋 Priority Tasks</h3>
                            <A href="/todo" class="text-sm text-blue-400 hover:text-blue-300">
                                View All →
                            </A>
                        </div>
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            <Show when={getUpcomingTasks().length > 0}>
                                <For each={getUpcomingTasks()}>
                                    {(task) => (
                                        <div class="p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-all duration-200">
                                            <div class="flex items-start justify-between gap-3">
                                                <div class="flex-1 min-w-0">
                                                    <div class="flex items-center gap-2 mb-1">
                                                        <button
                                                            onClick={() => quickCompleteTask(task.id)}
                                                            class="w-5 h-5 rounded border-2 border-zinc-600 hover:border-emerald-500 hover:bg-emerald-500/20 transition-all duration-200 shrink-0"
                                                        ></button>
                                                        <h4 class="font-semibold text-white truncate">{task.Title}</h4>
                                                    </div>
                                                    <Show when={task.Description}>
                                                        <p class="text-xs text-gray-500 mb-2 line-clamp-2">{task.Description}</p>
                                                    </Show>
                                                    <div class="flex items-center gap-2 flex-wrap">
                                                        <span class={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            task.Priority === 'P1' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                                            task.Priority === 'P2' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                        }`}>
                                                            {task.Priority}
                                                        </span>
                                                        <Show when={task.Deadline}>
                                                            <span class="text-xs text-gray-500">
                                                                📅 {new Date(task.Deadline).toLocaleDateString()}
                                                            </span>
                                                        </Show>
                                                        <Show when={task.Recurrence && task.Recurrence !== 'none'}>
                                                            <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                                                                🔁 {task.Recurrence}
                                                            </span>
                                                        </Show>
                                                    </div>
                                                    <Show when={task.expand?.Tags && task.expand.Tags.length > 0}>
                                                        <div class="flex flex-wrap gap-1 mt-2">
                                                            <For each={task.expand.Tags}>
                                                                {(tag: any) => (
                                                                    <span
                                                                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                                                        style={{ 'background-color': `${tag.color}40` }}
                                                                    >
                                                                        <div class="w-1 h-1 rounded-full" style={{ 'background-color': tag.color }}></div>
                                                                        {tag.name}
                                                                    </span>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </Show>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                            <Show when={getUpcomingTasks().length === 0}>
                                <div class="text-center py-12 text-gray-500">
                                    <div class="text-4xl mb-2">✨</div>
                                    <p>All caught up!</p>
                                </div>
                            </Show>
                        </div>
                    </div>
                    </Show>

                    {/* Top Tags */}
                    <Show when={settings().showTopTags}>
                        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:p-8">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold text-white">🏷️ Top Tags</h3>
                            <A href="/tags" class="text-sm text-blue-400 hover:text-blue-300">
                                Manage →
                            </A>
                        </div>
                        <div class="space-y-3">
                            <Show when={getTopTags().length > 0}>
                                <For each={getTopTags()}>
                                    {(tag) => (
                                        <div class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-all duration-200">
                                            <div class="flex items-center gap-3">
                                                <div 
                                                    class="w-4 h-4 rounded-full"
                                                    style={{ 'background-color': tag.color }}
                                                ></div>
                                                <span class="text-white font-medium">{tag.name}</span>
                                            </div>
                                            <div class="text-gray-400 text-sm">
                                                {tag.count} {tag.count === 1 ? 'task' : 'tasks'}
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                            <Show when={getTopTags().length === 0}>
                                <div class="text-center py-8 text-gray-500">
                                    <div class="text-3xl mb-2">🏷️</div>
                                    <p class="text-sm">No tags yet</p>
                                    <A href="/tags" class="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                                        Create your first tag →
                                    </A>
                                </div>
                            </Show>
                        </div>
                    </div>
                    </Show>
                    </div>
                </Show>

                {/* Quick Actions */}
                <Show when={settings().showQuickActions}>
                    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <A 
                            href="/ai" 
                            class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-200"
                        >
                            <div class="text-3xl mb-2">🤖</div>
                            <h4 class="text-xl font-bold text-white mb-1">AI Assistant</h4>
                            <p class="text-sm text-gray-400">Brain dump & get insights</p>
                        </A>

                        <A 
                            href="/calendar" 
                            class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-200"
                        >
                            <div class="text-3xl mb-2">📅</div>
                            <h4 class="text-xl font-bold text-white mb-1">Plan Your Day</h4>
                            <p class="text-sm text-gray-400">Schedule new events</p>
                        </A>

                        <A 
                            href="/timemachine" 
                            class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-200"
                        >
                            <div class="text-3xl mb-2">⏰</div>
                            <h4 class="text-xl font-bold text-white mb-1">Reflect</h4>
                            <p class="text-sm text-gray-400">Review your progress</p>
                        </A>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
export default Dashboard;
