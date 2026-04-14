import { createSignal, onMount, onCleanup, For, Show, createMemo } from 'solid-js';
import { A } from '@solidjs/router';
import { bk, currentUser } from '../lib/backend.ts';
import { startFocus } from '../lib/focusTimer';
import { formatTime } from '../lib/theme';
import {
    RepeatIcon,
    PlayIcon,
} from '../components/Icons';

function Dashboard() {
    const [events, setEvents] = createSignal([] as any[]);
    const [todos, setTodos] = createSignal([] as any[]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [calView, setCalView] = createSignal<'week' | 'month'>(
        (localStorage.getItem('dashCalView') as 'week' | 'month') || 'week'
    );
    const [currentDate, setCurrentDate] = createSignal(new Date());

    let greeting = "";
    const time = new Date().getHours();
    if (time >= 0 && time < 12) greeting = "Good Morning";
    else if (time >= 12 && time < 18) greeting = "Good Afternoon";
    else greeting = "Good Evening";

    async function fetchData() {
        setIsLoading(true);
        try {
            const [eventRecords, todoRecords] = await Promise.all([
                bk.collection('Calendar').getFullList({
                    filter: `user = "${currentUser()?.id}"`,
                    sort: 'Start'
                }),
                bk.collection('Todo').getFullList({
                    filter: `user = "${currentUser()?.id}"`,
                    sort: '-created'
                }),
            ]);
            setEvents(eventRecords);
            setTodos(todoRecords);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function quickCompleteTask(taskId: string) {
        const task = todos().find(t => t.id === taskId);
        if (task && task.Recurrence && task.Recurrence !== 'none' && task.Deadline) {
            const currentDeadline = new Date(task.Deadline);
            let nextDeadline = new Date(currentDeadline);
            switch (task.Recurrence) {
                case 'daily': nextDeadline.setDate(nextDeadline.getDate() + 1); break;
                case 'weekly': nextDeadline.setDate(nextDeadline.getDate() + 7); break;
                case 'monthly': nextDeadline.setMonth(nextDeadline.getMonth() + 1); break;
            }
            if (task.RecurrenceEndDate && nextDeadline > new Date(task.RecurrenceEndDate)) {
                await bk.collection('Todo').update(taskId, { Completed: true });
            } else {
                await bk.collection('Todo').update(taskId, { Deadline: nextDeadline.toISOString(), Completed: false });
            }
        } else {
            await bk.collection('Todo').update(taskId, { Completed: true });
        }
        fetchData();
    }

    function toggleCalView() {
        const next = calView() === 'week' ? 'month' : 'week';
        setCalView(next);
        localStorage.setItem('dashCalView', next);
    }

    // --- Calendar helpers ---
    function getMonthDays() {
        const d = currentDate();
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
        const days: (Date | null)[] = [];
        for (let i = 0; i < startOffset; i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        return days;
    }

    function getWeekDays() {
        const d = currentDate();
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((day + 6) % 7));
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const dd = new Date(monday);
            dd.setDate(monday.getDate() + i);
            days.push(dd);
        }
        return days;
    }

    function isToday(d: Date | null) {
        if (!d) return false;
        const t = new Date();
        return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    }

    function isSameDay(a: Date, b: Date) {
        return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    }

    function getEventsForDate(d: Date) {
        return events().filter(e => {
            const start = new Date(e.Start);
            return isSameDay(start, d);
        });
    }

    function navigateCal(dir: number) {
        const d = new Date(currentDate());
        if (calView() === 'month') {
            d.setMonth(d.getMonth() + dir);
        } else {
            d.setDate(d.getDate() + dir * 7);
        }
        setCurrentDate(d);
    }

    // --- Task/Event getters ---
    function getUpcomingEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 7);
        return events().filter(e => {
            const d = new Date(e.Start);
            return d >= tomorrow && d <= weekLater;
        }).sort((a, b) => new Date(a.Start).getTime() - new Date(b.Start).getTime()).slice(0, 8);
    }

    function getActiveTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return todos()
            .filter(t => {
                if (t.Completed) return false;
                // Exclude tasks due today (they go in "Due Today") and overdue
                if (t.Deadline) {
                    const d = new Date(t.Deadline);
                    if (d < tomorrow) return false; // due today or overdue
                }
                return true;
            })
            .sort((a, b) => {
                const po = { P1: 0, P2: 1, P3: 2 };
                const ap = po[a.Priority as keyof typeof po] ?? 3;
                const bp = po[b.Priority as keyof typeof po] ?? 3;
                if (ap !== bp) return ap - bp;
                if (a.Deadline && b.Deadline) return new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime();
                if (a.Deadline) return -1;
                if (b.Deadline) return 1;
                return 0;
            })
            .slice(0, 15);
    }

    function getOverdueTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return todos().filter(t => {
            if (!t.Deadline || t.Completed) return false;
            return new Date(t.Deadline) < today;
        });
    }

    // --- Today View helpers ---
    function getTodayTimeline() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const items: Array<{
            type: 'event' | 'task';
            time: Date | null;
            hasTime: boolean;
            data: any;
        }> = [];

        events().forEach(e => {
            const start = new Date(e.Start);
            if (start >= today && start < tomorrow) {
                items.push({ type: 'event', time: e.AllDay ? null : start, hasTime: !e.AllDay, data: e });
            }
        });

        todos().filter(t => !t.Completed && t.Deadline).forEach(t => {
            const d = new Date(t.Deadline);
            if (d >= today && d < tomorrow) {
                const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                items.push({ type: 'task', time: hasTime ? d : null, hasTime, data: t });
            }
        });

        return items.sort((a, b) => {
            if (a.hasTime && b.hasTime) return a.time!.getTime() - b.time!.getTime();
            if (a.hasTime) return -1;
            if (b.hasTime) return 1;
            return 0;
        });
    }

    function getDayProgress() {
        const now = new Date();
        return Math.round((now.getHours() * 60 + now.getMinutes()) / (24 * 60) * 100);
    }

    function getEventDurationMins(event: any): number {
        if (!event.Start || !event.End) return 25;
        return Math.max(1, Math.round((new Date(event.End).getTime() - new Date(event.Start).getTime()) / 60000));
    }

    onMount(() => {
        fetchData();
        const handleItemCreated = () => fetchData();
        window.addEventListener('itemCreated', handleItemCreated);
        onCleanup(() => window.removeEventListener('itemCreated', handleItemCreated));
    });

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const priorityDot = (p: string) => {
        if (p === 'P1') return '#e03e3e';
        if (p === 'P3') return 'var(--color-success)';
        return 'var(--color-warning)';
    };

    const calTitle = createMemo(() => {
        const d = currentDate();
        if (calView() === 'month') {
            return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        const week = getWeekDays();
        const s = week[0];
        const e = week[6];
        if (s.getMonth() === e.getMonth()) {
            return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
        }
        return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    });

    return (
        <div class="flex-1 w-full max-w-5xl mx-auto pt-6 lg:pt-8">
            {/* Header */}
            <div class="mb-6 lg:mb-8">
                <h1 class="text-xl lg:text-2xl font-semibold" style={{ "color": "var(--color-text)" }}>{greeting}</h1>
                <p class="text-xs lg:text-sm mt-0.5" style={{ "color": "var(--color-text-muted)" }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>

            <Show when={isLoading()}>
                <div class="flex items-center justify-center h-64" style={{ "color": "var(--color-text-muted)" }}>
                    <div class="animate-pulse text-sm">Loading...</div>
                </div>
            </Show>

            <Show when={!isLoading()}>
                {/* ── TODAY VIEW ── */}
                <div class="mb-6 lg:mb-8">
                    <div class="flex items-center justify-between mb-2">
                        <h2 class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>Today</h2>
                        <div class="flex items-center gap-2">
                            <Show when={getOverdueTasks().length > 0}>
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full" style={{ "background-color": "var(--color-danger-muted)", "color": "var(--color-danger)" }}>
                                    {getOverdueTasks().length} overdue
                                </span>
                            </Show>
                            <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>{getDayProgress()}% of day</span>
                        </div>
                    </div>
                    {/* Day progress bar */}
                    <div class="h-0.5 rounded-full mb-4 overflow-hidden" style={{ "background-color": "var(--color-bg-tertiary)" }}>
                        <div
                            class="h-full rounded-full"
                            style={{ "width": `${getDayProgress()}%`, "background-color": "var(--color-accent)" }}
                        />
                    </div>

                    <div class="space-y-1.5">
                        {/* Overdue items */}
                        <Show when={getOverdueTasks().length > 0}>
                            <For each={getOverdueTasks().slice(0, 3)}>
                                {(task) => (
                                    <div class="group glass flex items-center gap-3 py-2.5 px-3 rounded-xl card-hover">
                                        <span class="w-12 text-[10px] font-semibold shrink-0 text-right" style={{ "color": "var(--color-danger)" }}>overdue</span>
                                        <div class="w-1 h-8 rounded-full shrink-0" style={{ "background-color": priorityDot(task.Priority) }} />
                                        <div class="flex-1 min-w-0">
                                            <div class="text-sm font-medium truncate" style={{ "color": "var(--color-text)" }}>{task.Title}</div>
                                            <div class="text-xs" style={{ "color": "var(--color-danger)" }}>
                                                {new Date(task.Deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {task.Priority}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => startFocus(task.id, task.Title, task.Duration || 25, 'task')}
                                            class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 shrink-0"
                                            style={{ "background": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                                            title={`Start focus session: ${task.Duration || 25} min`}
                                        >
                                            <PlayIcon class="w-3 h-3" />
                                            Focus
                                        </button>
                                        <button
                                            onClick={() => quickCompleteTask(task.id)}
                                            class="w-[18px] h-[18px] rounded-full shrink-0 hover:opacity-70 transition-opacity"
                                            style={{ "border": "2px solid var(--color-danger)" }}
                                            title="Complete"
                                        />
                                    </div>
                                )}
                            </For>
                            <Show when={getOverdueTasks().length > 3}>
                                <A href="/todo" class="block text-center text-xs py-1" style={{ "color": "var(--color-text-muted)" }}>
                                    +{getOverdueTasks().length - 3} more overdue
                                </A>
                            </Show>
                        </Show>

                        {/* Today's timeline: events + tasks sorted chronologically */}
                        <For each={getTodayTimeline()}>
                            {(item) => (
                                <div class="group glass flex items-center gap-3 py-2.5 px-3 rounded-xl card-hover">
                                    <span class="w-12 text-[10px] font-medium shrink-0 text-right tabular-nums" style={{ "color": "var(--color-text-muted)" }}>
                                        {item.hasTime
                                            ? formatTime(item.time!)
                                            : '—'
                                        }
                                    </span>
                                    <div
                                        class="w-1 h-8 rounded-full shrink-0"
                                        style={{
                                            "background-color": item.type === 'event'
                                                ? (item.data.Color || 'var(--color-accent)')
                                                : priorityDot(item.data.Priority)
                                        }}
                                    />
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm font-medium truncate" style={{ "color": "var(--color-text)" }}>
                                            {item.type === 'event' ? item.data.EventName : item.data.Title}
                                        </div>
                                        <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                            {item.type === 'event'
                                                ? (item.data.AllDay ? 'All day' : (() => {
                                                    const dur = getEventDurationMins(item.data);
                                                    return dur < 60 ? `${dur}m` : `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}`;
                                                })())
                                                : `${item.data.Priority}${item.data.Duration ? ` · ${item.data.Duration}min` : ''}`
                                            }
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => item.type === 'event'
                                            ? startFocus(item.data.id, item.data.EventName, getEventDurationMins(item.data), 'event')
                                            : startFocus(item.data.id, item.data.Title, item.data.Duration || 25, 'task')
                                        }
                                        class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 shrink-0"
                                        style={{ "background": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                                        title="Start focus session"
                                    >
                                        <PlayIcon class="w-3 h-3" />
                                        Focus
                                    </button>
                                    <Show when={item.type === 'task'}>
                                        <button
                                            onClick={() => quickCompleteTask(item.data.id)}
                                            class="w-[18px] h-[18px] rounded-full shrink-0 hover:opacity-70 transition-opacity"
                                            style={{ "border": "2px solid var(--color-accent)" }}
                                            title="Complete"
                                        />
                                    </Show>
                                </div>
                            )}
                        </For>

                        <Show when={getTodayTimeline().length === 0 && getOverdueTasks().length === 0}>
                            <div class="glass py-6 text-center rounded-xl">
                                <p class="text-sm" style={{ "color": "var(--color-text-muted)" }}>Nothing scheduled for today</p>
                                <p class="text-xs mt-1" style={{ "color": "var(--color-text-muted)", "opacity": "0.6" }}>Enjoy your free day</p>
                            </div>
                        </Show>
                    </div>
                </div>

                {/* ── LOWER GRID ── */}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Left column: Calendar + Upcoming Events */}
                    <div class="lg:col-span-2 space-y-5 lg:space-y-6">
                        {/* Mini Calendar */}
                        <div class="glass rounded-xl p-4 lg:p-5">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>{calTitle()}</h3>
                                <div class="flex items-center gap-0.5">
                                    <button
                                        onClick={() => navigateCal(-1)}
                                        class="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                        style={{ "color": "var(--color-text-secondary)" }}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date())}
                                        class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                                        style={{ "color": "var(--color-accent)" }}
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => navigateCal(1)}
                                        class="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                        style={{ "color": "var(--color-text-secondary)" }}
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                    <div class="w-px h-4 mx-1.5" style={{ "background-color": "var(--color-border)" }}></div>
                                    <button
                                        onClick={toggleCalView}
                                        class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                                        style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)" }}
                                    >
                                        {calView() === 'week' ? 'Month' : 'Week'}
                                    </button>
                                </div>
                            </div>

                            {/* Day headers */}
                            <div class="grid grid-cols-7 mb-1">
                                <For each={dayNames}>
                                    {(name) => (
                                        <div class="text-center text-[11px] py-1 font-medium" style={{ "color": "var(--color-text-muted)" }}>{name}</div>
                                    )}
                                </For>
                            </div>

                            {/* Month view */}
                            <Show when={calView() === 'month'}>
                                <div class="grid grid-cols-7">
                                    <For each={getMonthDays()}>
                                        {(day) => (
                                            <div class="text-center py-1">
                                                <Show when={day !== null}>
                                                    <div
                                                        class="inline-flex flex-col items-center justify-center w-8 h-8 rounded-full text-xs relative cursor-default"
                                                        style={{
                                                            "background-color": isToday(day) ? "var(--color-accent)" : "transparent",
                                                            "color": isToday(day) ? "var(--color-accent-text)" : "var(--color-text)",
                                                            "font-weight": isToday(day) ? "600" : "400"
                                                        }}
                                                    >
                                                        {day!.getDate()}
                                                        <Show when={getEventsForDate(day!).length > 0 && !isToday(day)}>
                                                            <div class="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ "background-color": "var(--color-accent)" }}></div>
                                                        </Show>
                                                    </div>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>

                            {/* Week view */}
                            <Show when={calView() === 'week'}>
                                <div class="grid grid-cols-7">
                                    <For each={getWeekDays()}>
                                        {(day) => (
                                            <div class="text-center py-1">
                                                <div
                                                    class="inline-flex flex-col items-center justify-center w-8 h-8 rounded-full text-xs relative cursor-default"
                                                    style={{
                                                        "background-color": isToday(day) ? "var(--color-accent)" : "transparent",
                                                        "color": isToday(day) ? "var(--color-accent-text)" : "var(--color-text)",
                                                        "font-weight": isToday(day) ? "600" : "400"
                                                    }}
                                                >
                                                    {day.getDate()}
                                                    <Show when={getEventsForDate(day).length > 0 && !isToday(day)}>
                                                        <div class="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ "background-color": "var(--color-accent)" }}></div>
                                                    </Show>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>

                        {/* Upcoming Events (tomorrow onward) */}
                        <Show when={getUpcomingEvents().length > 0}>
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <h3 class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>Upcoming</h3>
                                    <A href="/calendar" class="text-xs font-medium hover:underline" style={{ "color": "var(--color-accent)" }}>
                                        View Calendar
                                    </A>
                                </div>
                                <div class="space-y-1.5">
                                    <For each={getUpcomingEvents()}>
                                        {(event) => {
                                            const eventDate = new Date(event.Start);
                                            return (
                                                <div class="group glass flex items-center gap-3 py-2.5 px-3 rounded-xl card-hover">
                                                    <div class="w-1 h-8 rounded-full shrink-0" style={{ "background-color": event.Color || 'var(--color-accent)' }}></div>
                                                    <div class="flex-1 min-w-0">
                                                        <div class="text-sm font-medium truncate" style={{ "color": "var(--color-text)" }}>{event.EventName}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => startFocus(event.id, event.EventName, getEventDurationMins(event), 'event')}
                                                        class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 shrink-0"
                                                        style={{ "background": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                                                        title="Start focus session"
                                                    >
                                                        <PlayIcon class="w-3 h-3" />
                                                        Focus
                                                    </button>
                                                    <div class="text-xs shrink-0" style={{ "color": "var(--color-text-muted)" }}>
                                                        {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        <Show when={!event.AllDay}>
                                                            <span class="ml-1 hidden sm:inline">
                                                                {formatTime(eventDate)}
                                                            </span>
                                                        </Show>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </For>
                                </div>
                            </div>
                        </Show>
                    </div>

                    {/* Right column: Upcoming Tasks */}
                    <div class="space-y-5 lg:space-y-6">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>Upcoming Tasks</h3>
                                <A href="/todo" class="text-xs font-medium hover:underline" style={{ "color": "var(--color-accent)" }}>
                                    View All
                                </A>
                            </div>
                            <div class="space-y-1.5">
                                <Show when={getActiveTasks().length > 0}>
                                    <For each={getActiveTasks()}>
                                        {(task) => (
                                            <div class="group glass flex items-center gap-2.5 py-2.5 px-3 rounded-xl card-hover">
                                                <button
                                                    onClick={() => quickCompleteTask(task.id)}
                                                    class="w-[18px] h-[18px] rounded-full shrink-0 hover:opacity-70 transition-opacity"
                                                    style={{ "border": "2px solid var(--color-border-hover)" }}
                                                    title="Complete"
                                                />
                                                <div class="flex-1 min-w-0">
                                                    <div class="text-sm truncate" style={{ "color": "var(--color-text)" }}>{task.Title}</div>
                                                    <Show when={task.Deadline}>
                                                        <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                                            {new Date(task.Deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            <Show when={task.Recurrence && task.Recurrence !== 'none'}>
                                                                <span class="ml-1.5 inline-flex items-center gap-0.5">
                                                                    <RepeatIcon class="w-3 h-3" /> {task.Recurrence}
                                                                </span>
                                                            </Show>
                                                        </div>
                                                    </Show>
                                                    <Show when={task.Subtasks && task.Subtasks.length > 0}>
                                                        <div class="flex items-center gap-1.5 mt-1">
                                                            <div class="flex-1 h-1 rounded-full overflow-hidden" style={{ "background-color": "var(--color-bg-tertiary)" }}>
                                                                <div
                                                                    class="h-full rounded-full transition-all duration-300"
                                                                    style={{
                                                                        "width": `${(task.Subtasks.filter((s: any) => s.completed).length / task.Subtasks.length) * 100}%`,
                                                                        "background-color": task.Subtasks.filter((s: any) => s.completed).length === task.Subtasks.length ? "var(--color-success)" : "var(--color-accent)"
                                                                    }}
                                                                />
                                                            </div>
                                                            <span class="text-[10px] shrink-0" style={{ "color": "var(--color-text-muted)" }}>
                                                                {task.Subtasks.filter((s: any) => s.completed).length}/{task.Subtasks.length}
                                                            </span>
                                                        </div>
                                                    </Show>
                                                </div>
                                                <button
                                                    onClick={() => startFocus(task.id, task.Title, task.Duration || 25, 'task')}
                                                    class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80 shrink-0"
                                                    style={{ "background": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                                                    title={`Start focus session: ${task.Duration || 25} min`}
                                                >
                                                    <PlayIcon class="w-3 h-3" />
                                                    Focus
                                                </button>
                                                <div class="w-2 h-2 rounded-full shrink-0" style={{ "background-color": priorityDot(task.Priority) }}></div>
                                            </div>
                                        )}
                                    </For>
                                </Show>
                                <Show when={getActiveTasks().length === 0}>
                                    <div class="glass py-8 text-center rounded-xl">
                                        <p class="text-sm" style={{ "color": "var(--color-text-muted)" }}>All caught up!</p>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
export default Dashboard;
