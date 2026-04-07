import { createSignal, onMount, For, Show, createEffect } from 'solid-js';
import { A } from '@solidjs/router';
import { bk, currentUser } from '../lib/backend.ts';
import {
    CheckCircleIcon,
    CheckIcon,
    CalendarIcon,
    DashboardIcon,
    WarningIcon,
    RepeatIcon,
    BoltIcon,
    TagIcon,
    ClockIcon,
    RobotIcon
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
        recurringTasks: 0,
        freeTimePercent: 100
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
                    filter: `user = "${currentUser()?.id}"`,
                    expand: 'Tasks,Tags',
                    sort: 'Start'
                }),
                bk.collection('Todo').getFullList({
                    filter: `user = "${currentUser()?.id}"`,
                    expand: 'Tags',
                    sort: '-created'
                }),
                bk.collection('Tags').getFullList({
                    filter: `user = "${currentUser()?.id}"`
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

            // Calculate free time percentage for today
            const todayEvents = eventRecords.filter(e => {
                const eventDate = new Date(e.Start);
                return eventDate >= today && eventDate < tomorrow;
            });

            let totalScheduledMinutes = 0;
            todayEvents.forEach(event => {
                const start = new Date(event.Start);
                const end = new Date(event.End);
                const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                totalScheduledMinutes += durationMinutes;
            });

            const totalMinutesInDay = 24 * 60;
            const freeTimePercent = Math.round(((totalMinutesInDay - totalScheduledMinutes) / totalMinutesInDay) * 100);

            setStats({
                completedToday,
                totalTasks: todoRecords.filter(t => !t.Completed).length,
                eventsToday,
                upcomingDeadlines,
                highPriorityTasks,
                completionRate,
                avgTasksPerDay,
                recurringTasks,
                freeTimePercent: Math.max(0, Math.min(100, freeTimePercent))
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
        // Find the task to check if it's recurring
        const task = todos().find(t => t.id === taskId);
        
        if (task && task.Recurrence && task.Recurrence !== 'none' && task.Deadline) {
            // Handle recurring task - reschedule to next occurrence
            const currentDeadline = new Date(task.Deadline);
            let nextDeadline = new Date(currentDeadline);
            
            // Calculate next occurrence
            switch (task.Recurrence) {
                case 'daily':
                    nextDeadline.setDate(nextDeadline.getDate() + 1);
                    break;
                case 'weekly':
                    nextDeadline.setDate(nextDeadline.getDate() + 7);
                    break;
                case 'monthly':
                    nextDeadline.setMonth(nextDeadline.getMonth() + 1);
                    break;
            }
            
            // Check if next deadline exceeds recurrence end date
            if (task.RecurrenceEndDate) {
                const endDate = new Date(task.RecurrenceEndDate);
                if (nextDeadline > endDate) {
                    // If past end date, just mark as complete
                    await bk.collection('Todo').update(taskId, { Completed: true });
                    fetchDashboardData();
                    return;
                }
            }
            
            // Update to next deadline and keep uncompleted
            await bk.collection('Todo').update(taskId, {
                Deadline: nextDeadline.toISOString(),
                Completed: false
            });
        } else {
            // Normal task - just mark as complete
            await bk.collection('Todo').update(taskId, { Completed: true });
        }
        
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

    function getTodayTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return todos()
            .filter(t => {
                if (t.Completed) return false;
                if (!t.Deadline) return false;
                const deadline = new Date(t.Deadline);
                return deadline >= today && deadline < tomorrow;
            })
            .sort((a, b) => {
                const priorityOrder = { P1: 0, P2: 1, P3: 2 };
                const aPriority = priorityOrder[a.Priority as keyof typeof priorityOrder] ?? 3;
                const bPriority = priorityOrder[b.Priority as keyof typeof priorityOrder] ?? 3;
                return aPriority - bPriority;
            });
    }

    function getUpcomingTasks() {
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return todos()
            .filter(t => {
                if (t.Completed) return false;
                if (!t.Deadline) return false;
                const deadline = new Date(t.Deadline);
                return deadline >= tomorrow;
            })
            .sort((a, b) => {
                // Sort by priority first (P1 > P2 > P3)
                const priorityOrder = { P1: 0, P2: 1, P3: 2 };
                const aPriority = priorityOrder[a.Priority as keyof typeof priorityOrder] ?? 3;
                const bPriority = priorityOrder[b.Priority as keyof typeof priorityOrder] ?? 3;
                if (aPriority !== bPriority) return aPriority - bPriority;
                
                // Then by deadline
                if (a.Deadline && b.Deadline) {
                    return new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime();
                }
                return 0;
            })
            .slice(0, 10);
    }

    function getNoDeadlineTasks() {
        return todos()
            .filter(t => !t.Completed && !t.Deadline)
            .sort((a, b) => {
                const priorityOrder = { P1: 0, P2: 1, P3: 2 };
                const aPriority = priorityOrder[a.Priority as keyof typeof priorityOrder] ?? 3;
                const bPriority = priorityOrder[b.Priority as keyof typeof priorityOrder] ?? 3;
                return aPriority - bPriority;
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
                interval = setInterval(fetchDashboardData, settings().refreshInterval * 60 * 1000) as unknown as number;
            }
        });

        return () => {
            if (interval) clearInterval(interval);
        };
    });

    return (
        <div class="flex-1 w-full">
            {/* Header */}
            <div class="mb-6">
                <div>
                    <h1 class="text-2xl font-bold mb-1" style={{ "color": "var(--color-text)" }}>{greeting}</h1>
                    <p class="text-sm" style={{ "color": "var(--color-text-muted)" }}>{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    })}</p>
                </div>
            </div>

            <Show when={isLoading()}>
                <div class="flex items-center justify-center h-64">
                    <DashboardIcon class="w-10 h-10 animate-pulse" style={{ "color": "var(--color-text-muted)" }} />
                </div>
            </Show>

            <Show when={!isLoading()}>
                {/* Stats Grid */}
                <Show when={settings().showCompletedToday || settings().showActiveTasks || settings().showEventsToday || settings().showUpcomingDeadlines}>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <Show when={settings().showCompletedToday}>
                            <div class="rounded-xl p-4 transition-all duration-300" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <CheckCircleIcon class="w-5 h-5 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                                <div class="text-2xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().completedToday}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Done Today</div>
                            </div>
                        </Show>

                        <Show when={settings().showActiveTasks}>
                            <div class="rounded-xl p-4 transition-all duration-300" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <BoltIcon class="w-5 h-5 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                                <div class="text-2xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().totalTasks}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Active Tasks</div>
                            </div>
                        </Show>

                        <Show when={settings().showEventsToday}>
                            <div class="rounded-xl p-4 transition-all duration-300" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <CalendarIcon class="w-5 h-5 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                                <div class="text-2xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().eventsToday}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Events Today</div>
                            </div>
                        </Show>

                        <Show when={settings().showUpcomingDeadlines}>
                            <div class="rounded-xl p-4 transition-all duration-300" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <ClockIcon class="w-5 h-5 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                                <div class="text-2xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().upcomingDeadlines}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Due This Week</div>
                            </div>
                        </Show>
                    </div>
                </Show>

                {/* Extended Stats */}
                <Show when={settings().showStreak || settings().showHighPriority || settings().showAvgTasks || settings().showRecurring}>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <Show when={settings().showStreak}>
                            <div class="rounded-lg p-3" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <div class="text-base mb-0.5">🔥</div>
                                <div class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>{streak()}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Day Streak</div>
                            </div>
                        </Show>

                        <Show when={settings().showHighPriority}>
                            <div class="rounded-lg p-3" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <WarningIcon class="w-5 h-5 text-red-400 mb-0.5" />
                                <div class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().highPriorityTasks}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>High Priority</div>
                            </div>
                        </Show>

                        <Show when={settings().showAvgTasks}>
                            <div class="rounded-lg p-3" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <DashboardIcon class="w-5 h-5 text-cyan-400 mb-0.5" />
                                <div class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().avgTasksPerDay}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Avg/Day</div>
                            </div>
                        </Show>

                        <Show when={settings().showRecurring}>
                            <div class="rounded-lg p-3" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <RepeatIcon class="w-5 h-5 text-purple-400 mb-0.5" />
                                <div class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().recurringTasks}</div>
                                <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Recurring</div>
                            </div>
                        </Show>

                        <div class="rounded-lg p-3" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                            <div class="text-base mb-0.5">⏰</div>
                            <div class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().freeTimePercent}%</div>
                            <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Free Today</div>
                        </div>
                    </div>
                </Show>

                {/* Overdue Tasks Alert */}
                <Show when={settings().showOverdueAlert && getOverdueTasks().length > 0}>
                    <div class="mb-5 rounded-xl p-5" style={{ "background-color": "var(--color-surface)", "border": "1px solid rgba(239,68,68,0.3)" }}>
                        <div class="flex items-start gap-3">
                            <WarningIcon class="w-6 h-6 text-red-400 shrink-0" />
                            <div class="flex-1">
                                <h3 class="text-base font-bold text-red-400 mb-2">
                                    {getOverdueTasks().length} Overdue {getOverdueTasks().length === 1 ? 'Task' : 'Tasks'}
                                </h3>
                                <div class="space-y-1.5">
                                    <For each={getOverdueTasks().slice(0, 3)}>
                                        {(task) => (
                                            <div class="flex items-center justify-between p-2 rounded-lg" style={{ "background-color": "var(--color-bg-tertiary)" }}>
                                                <span class="text-sm" style={{ "color": "var(--color-text)" }}>{task.Title}</span>
                                                <button
                                                    onClick={() => quickCompleteTask(task.id)}
                                                    class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors duration-200"
                                                >
                                                    Complete
                                                </button>
                                            </div>
                                        )}
                                    </For>
                                </div>
                                <Show when={getOverdueTasks().length > 3}>
                                    <A href="/todo" class="text-xs text-red-400 hover:text-red-300 mt-2 inline-block">
                                        View all {getOverdueTasks().length} overdue tasks →
                                    </A>
                                </Show>
                            </div>
                        </div>
                    </div>
                </Show>

                {/* Productivity Progress */}
                <Show when={settings().showProgressBar}>
                    <div class="rounded-xl p-5 mb-6" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h3 class="text-base font-bold" style={{ "color": "var(--color-text)" }}>Progress</h3>
                                <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Task completion rate</p>
                            </div>
                            <div class="text-2xl font-bold" style={{ "color": "var(--color-text)" }}>{stats().completionRate}%</div>
                        </div>
                        <div class="w-full rounded-full h-2.5 overflow-hidden" style={{ "background-color": "var(--color-bg-tertiary)" }}>
                            <div 
                                class="h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats().completionRate}%`, "background-color": "var(--color-accent)" }}
                            ></div>
                        </div>
                    </div>
                </Show>

                <Show when={settings().showTodaySchedule}>
                    <div class="mb-6">
                        {/* Today's Schedule */}
                        <div class="rounded-xl p-5" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-base font-bold flex items-center gap-2" style={{ "color": "var(--color-text)" }}><CalendarIcon class="w-4 h-4" /> Today's Schedule</h3>
                                <A href="/calendar" class="text-xs" style={{ "color": "var(--color-accent)" }}>
                                    View Calendar →
                                </A>
                        </div>
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            <Show when={getTodayEvents().length > 0}>
                                <For each={getTodayEvents()}>
                                    {(event) => (
                                        <div class="p-3 rounded-lg transition-all duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                            <div class="flex items-start gap-3">
                                                <div 
                                                    class="w-4 h-4 rounded-full mt-1 shrink-0"
                                                    style={{ 'background-color': event.Color || '#3b82f6' }}
                                                ></div>
                                                <div class="flex-1">
                                                    <h4 class="font-semibold text-sm" style={{ "color": "var(--color-text)" }}>{event.EventName}</h4>
                                                    <Show when={event.Description}>
                                                        <p class="text-xs mt-0.5" style={{ "color": "var(--color-text-secondary)" }}>{event.Description}</p>
                                                    </Show>
                                                    <Show when={!event.AllDay}>
                                                        <p class="text-sm text-gray-500 mt-2 flex items-center gap-1">
                                                            <ClockIcon class="w-4 h-4" /> {new Date(event.Start).toLocaleTimeString('en-US', { 
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
                                                            <div class="text-xs text-gray-500 flex items-center gap-1">
                                                                <CheckIcon class="w-3 h-3" /> {event.expand.Tasks.filter((t: any) => t.Completed).length}/{event.expand.Tasks.length} tasks
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
                                <div class="text-center py-8" style={{ "color": "var(--color-text-muted)" }}>
                                    <div class="text-3xl mb-1">🎉</div>
                                    <p class="text-sm">No events today</p>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
                </Show>

                <Show when={settings().showPriorityTasks || settings().showTopTags}>
                    <div class="grid grid-cols-1 gap-6 mb-8">
                    {/* Tasks Section */}
                    <Show when={settings().showPriorityTasks}>
                        <div class="space-y-6">
                            {/* Today's Tasks */}
                            <div class="rounded-xl p-5" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-base font-bold flex items-center gap-2" style={{ "color": "var(--color-text)" }}>
                                        <CheckCircleIcon class="w-4 h-4" style={{ "color": "var(--color-accent)" }} /> Today's Tasks
                                    </h3>
                                    <A href="/todo" class="text-xs" style={{ "color": "var(--color-accent)" }}>
                                        View All →
                                    </A>
                                </div>
                                <div class="space-y-3 max-h-96 overflow-y-auto">
                                    <Show when={getTodayTasks().length > 0}>
                                        <For each={getTodayTasks()}>
                                            {(task) => (
                                                <div class="p-3 rounded-lg transition-all duration-200" style={{ "background-color": "var(--color-accent-muted)", "border": "1px solid var(--color-accent)30" }}>
                                                    <div class="flex items-start justify-between gap-3">
                                                        <div class="flex-1 min-w-0">
                                                            <div class="flex items-center gap-2 mb-1">
                                                                <button
                                                                    onClick={() => quickCompleteTask(task.id)}
                                                                    class="w-5 h-5 rounded border-2 border-blue-400 hover:border-emerald-500 hover:bg-emerald-500/20 transition-all duration-200 shrink-0"
                                                                ></button>
                                                                <h4 class="font-semibold text-white truncate">{task.Title}</h4>
                                                            </div>
                                                            <Show when={task.Description}>
                                                                <p class="text-xs text-gray-400 mb-2 line-clamp-2">{task.Description}</p>
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
                                                                    <span class="text-xs text-blue-400 flex items-center gap-1">
                                                                        <CalendarIcon class="w-3 h-3" /> Today
                                                                    </span>
                                                                </Show>
                                                                <Show when={task.Recurrence && task.Recurrence !== 'none'}>
                                                                    <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                        <RepeatIcon class="w-3 h-3" /> {task.Recurrence}
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
                                    <Show when={getTodayTasks().length === 0}>
                                        <div class="text-center py-6" style={{ "color": "var(--color-text-muted)" }}>
                                            <div class="text-3xl mb-1">☀️</div>
                                            <p class="text-sm">No tasks due today</p>
                                        </div>
                                    </Show>
                                </div>
                            </div>

                            {/* Upcoming Tasks */}
                            <div class="rounded-xl p-5" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-base font-bold flex items-center gap-2" style={{ "color": "var(--color-text)" }}>
                                        <BoltIcon class="w-4 h-4 text-amber-400" /> Upcoming
                                    </h3>
                                    <A href="/todo" class="text-xs" style={{ "color": "var(--color-accent)" }}>
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
                                                                    <span class="text-xs text-gray-500 flex items-center gap-1">
                                                                        <CalendarIcon class="w-3 h-3" /> {new Date(task.Deadline).toLocaleDateString()}
                                                                    </span>
                                                                </Show>
                                                        <Show when={task.Recurrence && task.Recurrence !== 'none'}>
                                                            <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <RepeatIcon class="w-3 h-3" /> {task.Recurrence}
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
                                        <div class="text-center py-6" style={{ "color": "var(--color-text-muted)" }}>
                                            <div class="text-3xl mb-1">✨</div>
                                            <p class="text-sm">No upcoming tasks</p>
                                        </div>
                                    </Show>
                                </div>
                            </div>

                            {/* Tasks Without Deadline */}
                            <Show when={getNoDeadlineTasks().length > 0}>
                                <div class="rounded-xl p-5" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                                    <div class="flex items-center justify-between mb-3">
                                        <h3 class="text-base font-bold flex items-center gap-2" style={{ "color": "var(--color-text)" }}>
                                            <BoltIcon class="w-4 h-4" style={{ "color": "var(--color-text-muted)" }} /> No Deadline
                                        </h3>
                                        <A href="/todo" class="text-xs" style={{ "color": "var(--color-accent)" }}>
                                            View All →
                                        </A>
                                    </div>
                                    <div class="space-y-3 max-h-96 overflow-y-auto">
                                        <For each={getNoDeadlineTasks()}>
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
                                                                <Show when={task.Recurrence && task.Recurrence !== 'none'}>
                                                                    <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                        <RepeatIcon class="w-3 h-3" /> {task.Recurrence}
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
                                    </div>
                                </div>
                            </Show>
                        </div>
                    </Show>

                    {/* Top Tags */}
                    <Show when={settings().showTopTags}>
                        <div class="rounded-xl p-5" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-base font-bold flex items-center gap-2" style={{ "color": "var(--color-text)" }}><TagIcon class="w-4 h-4" /> Top Tags</h3>
                            <A href="/tags" class="text-xs" style={{ "color": "var(--color-accent)" }}>
                                Manage →
                            </A>
                        </div>
                        <div class="space-y-2">
                            <Show when={getTopTags().length > 0}>
                                <For each={getTopTags()}>
                                    {(tag) => (
                                        <div class="flex items-center justify-between p-2.5 rounded-lg transition-all duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                            <div class="flex items-center gap-2">
                                                <div 
                                                    class="w-3 h-3 rounded-full"
                                                    style={{ 'background-color': tag.color }}
                                                ></div>
                                                <span class="text-sm font-medium" style={{ "color": "var(--color-text)" }}>{tag.name}</span>
                                            </div>
                                            <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                                {tag.count}
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </Show>
                            <Show when={getTopTags().length === 0}>
                                <div class="text-center py-6" style={{ "color": "var(--color-text-muted)" }}>
                                    <TagIcon class="w-6 h-6 mx-auto mb-1" />
                                    <p class="text-sm">No tags yet</p>
                                    <A href="/tags" class="text-xs mt-1 inline-block" style={{ "color": "var(--color-accent)" }}>
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
                    <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <A 
                            href="/ai" 
                            class="rounded-xl p-4 transition-all duration-300"
                            style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}
                        >
                            <RobotIcon class="w-6 h-6 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                            <h4 class="text-sm font-bold mb-0.5" style={{ "color": "var(--color-text)" }}>AI Assistant</h4>
                            <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Brain dump & insights</p>
                        </A>

                        <A 
                            href="/calendar" 
                            class="rounded-xl p-4 transition-all duration-300"
                            style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}
                        >
                            <CalendarIcon class="w-6 h-6 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                            <h4 class="text-sm font-bold mb-0.5" style={{ "color": "var(--color-text)" }}>Plan Your Day</h4>
                            <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Schedule new events</p>
                        </A>

                        <A 
                            href="/timemachine" 
                            class="rounded-xl p-4 transition-all duration-300"
                            style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}
                        >
                            <ClockIcon class="w-6 h-6 mb-1.5" style={{ "color": "var(--color-accent)" }} />
                            <h4 class="text-sm font-bold mb-0.5" style={{ "color": "var(--color-text)" }}>Reflect</h4>
                            <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Review progress</p>
                        </A>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
export default Dashboard;
