import { createSignal, onMount, onCleanup, For, Show, createMemo } from 'solid-js';
import { A } from '@solidjs/router';
import { bk, currentUser } from '../lib/backend.ts';
import { startFocus } from '../lib/focusTimer';
import { formatTime } from '../lib/theme';
import {
    RepeatIcon,
    PlayIcon,
    EditIcon,
    TrashIcon,
    XIcon,
    PlusIcon,
} from '../components/Icons';

const PX_PER_MIN = 64 / 60; // 64px per hour
const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;
const TIMELINE_HOURS = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
    (_, i) => TIMELINE_START_HOUR + i
);

function Dashboard() {
    const [events, setEvents] = createSignal([] as any[]);
    const [todos, setTodos] = createSignal([] as any[]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [selectedDay, setSelectedDay] = createSignal(0); // -1=yesterday, 0=today, 1=tomorrow
    const [editingTask, setEditingTask] = createSignal<any>(null);
    const [editTitle, setEditTitle] = createSignal('');
    const [editDescription, setEditDescription] = createSignal('');
    const [editPriority, setEditPriority] = createSignal('P2');
    const [editDeadlineDate, setEditDeadlineDate] = createSignal('');
    const [editDeadlineTime, setEditDeadlineTime] = createSignal('');

    const hr = new Date().getHours();
    const greeting = hr < 12 ? 'Good Morning' : hr < 18 ? 'Good Afternoon' : 'Good Evening';

    // ── Data fetching ─────────────────────────────────────────────────────────

    async function fetchData() {
        setIsLoading(true);
        try {
            const [eventRecords, todoRecords] = await Promise.all([
                bk.collection('Calendar').getFullList({
                    filter: `user = "${currentUser()?.id}"`,
                    sort: 'Start',
                    expand: 'Tasks',
                }),
                bk.collection('Todo').getFullList({
                    filter: `user = "${currentUser()?.id}"`,
                    sort: '-created',
                }),
            ]);
            setEvents(eventRecords);
            setTodos(todoRecords);
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        } finally {
            setIsLoading(false);
        }
    }

    async function quickCompleteTask(taskId: string) {
        const task = todos().find(t => t.id === taskId);
        if (task?.Recurrence && task.Recurrence !== 'none' && task.Deadline) {
            const next = new Date(task.Deadline);
            if (task.Recurrence === 'daily') next.setDate(next.getDate() + 1);
            else if (task.Recurrence === 'weekly') next.setDate(next.getDate() + 7);
            else if (task.Recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
            if (task.RecurrenceEndDate && next > new Date(task.RecurrenceEndDate)) {
                await bk.collection('Todo').update(taskId, { Completed: true });
            } else {
                await bk.collection('Todo').update(taskId, { Deadline: next.toISOString(), Completed: false });
            }
        } else {
            await bk.collection('Todo').update(taskId, { Completed: true });
        }
        fetchData();
        window.dispatchEvent(new Event('dataChanged'));
    }

    function openEditTask(task: any) {
        setEditTitle(task.Title || '');
        setEditDescription(task.Description || '');
        setEditPriority(task.Priority || 'P2');
        if (task.Deadline) {
            const d = new Date(task.Deadline);
            setEditDeadlineDate(d.toISOString().split('T')[0]);
            setEditDeadlineTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
        } else {
            setEditDeadlineDate('');
            setEditDeadlineTime('');
        }
        setEditingTask(task);
    }

    async function saveEditedTask() {
        const task = editingTask();
        if (!task) return;
        const deadline = editDeadlineDate()
            ? new Date(`${editDeadlineDate()}T${editDeadlineTime() || '00:00'}:00`).toISOString()
            : undefined;
        await bk.collection('Todo').update(task.id, {
            Title: editTitle(),
            Description: editDescription(),
            Priority: editPriority() as `P${number}`,
            Deadline: deadline,
        });
        setEditingTask(null);
        fetchData();
        window.dispatchEvent(new Event('dataChanged'));
    }

    async function deleteTask(taskId: string) {
        await bk.collection('Todo').delete(taskId);
        fetchData();
        window.dispatchEvent(new Event('dataChanged'));
    }

    function getEventDurationMins(e: any): number {
        if (!e.Start || !e.End) return 25;
        return Math.max(1, Math.round((new Date(e.End).getTime() - new Date(e.Start).getTime()) / 60000));
    }

    onMount(() => {
        fetchData();
        const handler = () => fetchData();
        window.addEventListener('itemCreated', handler);
        window.addEventListener('dataChanged', handler);
        onCleanup(() => {
            window.removeEventListener('itemCreated', handler);
            window.removeEventListener('dataChanged', handler);
        });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    const priorityColor = (p: string) =>
        p === 'P1' ? '#e03e3e' : p === 'P3' ? 'var(--color-success)' : 'var(--color-warning)';

    function formatDuration(mins: number): string {
        if (!mins || mins <= 0) return '';
        const h = Math.floor(mins / 60), m = mins % 60;
        return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    }

    function formatTotalWork(mins: number): string {
        const h = Math.floor(mins / 60), m = mins % 60;
        return `${h}:${String(m).padStart(2, '0')}`;
    }

    function taskHasTime(task: any): boolean {
        if (!task.Deadline) return false;
        const d = new Date(task.Deadline);
        return d.getHours() !== 0 || d.getMinutes() !== 0;
    }

    function getTopPx(date: Date): number {
        const mins = date.getHours() * 60 + date.getMinutes() - TIMELINE_START_HOUR * 60;
        const totalMins = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
        return Math.max(0, Math.min(mins * PX_PER_MIN, totalMins * PX_PER_MIN));
    }

    function getHeightPx(durationMins: number): number {
        return Math.max(20, durationMins * PX_PER_MIN);
    }

    // ── Computed data ─────────────────────────────────────────────────────────

    const viewDate = createMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + selectedDay());
        return d;
    });

    const viewDateLabel = createMemo(() => {
        const sd = selectedDay();
        if (sd === -1) return 'Yesterday';
        if (sd === 0) return 'Today';
        if (sd === 1) return 'Tomorrow';
        return viewDate().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    });

    const viewDateEvents = createMemo(() => {
        const vd = viewDate(), next = new Date(vd);
        next.setDate(vd.getDate() + 1);
        return events()
            .filter(e => { const s = new Date(e.Start); return s >= vd && s < next; })
            .sort((a, b) => new Date(a.Start).getTime() - new Date(b.Start).getTime());
    });

    const viewDateTasks = createMemo(() => {
        const vd = viewDate(), next = new Date(vd);
        next.setDate(vd.getDate() + 1);
        return todos()
            .filter(t => {
                if (t.Completed) return false;
                if (!t.Deadline) return false;
                const d = new Date(t.Deadline);
                return d >= vd && d < next;
            })
            .sort((a, b) => new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime());
    });

    const overdueTasks = createMemo(() => {
        if (selectedDay() !== 0) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return todos().filter(t => !t.Completed && t.Deadline && new Date(t.Deadline) < today);
    });

    const totalWorkMins = createMemo(() =>
        viewDateTasks().reduce((acc: number, t: any) => acc + (t.Duration || 0), 0)
    );

    const weekData = createMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Array.from({ length: 8 }, (_, i) => i - 1).map(offset => {
            const d = new Date(today);
            d.setDate(today.getDate() + offset);
            const next = new Date(d);
            next.setDate(d.getDate() + 1);
            const dayEvents = events().filter(e => {
                if (e.AllDay) return false;
                const s = new Date(e.Start);
                return s >= d && s < next;
            });
            const dayTasks = todos().filter(t => {
                if (t.Completed || !t.Deadline) return false;
                const dl = new Date(t.Deadline);
                return dl >= d && dl < next;
            });
            return { offset, date: new Date(d), events: dayEvents, tasks: dayTasks };
        });
    });

    const upcomingItems = createMemo(() => {
        const base = viewDate();
        const sel = selectedDay();
        const tomorrow = new Date(base);
        tomorrow.setDate(base.getDate() + 1);
        const cutoff = new Date(base);
        cutoff.setDate(base.getDate() + 8);

        const getDayInfo = (date: Date): { label: string; offset: number } => {
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const baseStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
            const delta = Math.round((dayStart.getTime() - baseStart.getTime()) / 86400000);
            const label = delta === 1 ? 'Tomorrow'
                : delta === 2 ? date.toLocaleDateString('en-US', { weekday: 'long' })
                : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return { label, offset: sel + delta };
        };

        const items: Array<{ type: 'event' | 'task'; data: any; date: Date; dayLabel: string; offset: number }> = [];

        events().forEach(e => {
            const s = new Date(e.Start);
            if (s >= tomorrow && s < cutoff) {
                const { label, offset } = getDayInfo(s);
                items.push({ type: 'event', data: e, date: s, dayLabel: label, offset });
            }
        });
        todos().forEach(t => {
            if (t.Completed || !t.Deadline) return;
            const d = new Date(t.Deadline);
            if (d >= tomorrow && d < cutoff) {
                const { label, offset } = getDayInfo(d);
                items.push({ type: 'task', data: t, date: d, dayLabel: label, offset });
            }
        });

        return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 14);
    });

    // ── JSX ───────────────────────────────────────────────────────────────────

    return (
        <div
            class="h-full w-full flex flex-col gap-5 overflow-hidden playful-page"
            style={{
                "--color-bg": "#fffaf6",
                "--color-bg-secondary": "#fff8ff",
                "--color-bg-tertiary": "#f4ecff",
                "--color-surface": "#fff8ff",
                "--color-surface-hover": "#f7edff",
                "--color-border": "#e8d9ff",
                "--color-border-hover": "#d8bff8",
                "--color-text": "#2f2152",
                "--color-text-secondary": "#6d5c95",
                "--color-text-muted": "#9a88be",
                "--color-accent": "#7c4dff",
                "--color-accent-hover": "#6942d8",
                "--color-accent-muted": "rgba(124,77,255,0.15)",
                "--color-accent-text": "#ffffff",
                "--color-warning": "#ff9f1c",
                "--color-success": "#11b98f",
            }}
        >

            {/* ── Top bar ── */}
            <div class="flex items-center gap-4 flex-wrap">
                <div class="flex-1 min-w-0">
                    <h1 class="text-lg font-semibold" style={{ "color": "var(--color-text)" }}>{greeting}</h1>
                    <p class="text-xs mt-0.5" style={{ "color": "var(--color-text-muted)" }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>



                {/* Stats */}
                <div class="flex items-center gap-3 text-xs shrink-0" style={{ "color": "var(--color-text-muted)" }}>
                    <Show when={totalWorkMins() > 0}>
                        <span>
                            Work: <span class="font-semibold" style={{ "color": "var(--color-text)" }}>{formatTotalWork(totalWorkMins())}</span>
                        </span>
                        <span style={{ "opacity": "0.4" }}>·</span>
                    </Show>
                    <span>{viewDateTasks().length} task{viewDateTasks().length !== 1 ? 's' : ''}</span>
                    <Show when={overdueTasks().length > 0}>
                        <span class="px-2 py-0.5 rounded-full font-semibold" style={{ "background": "rgba(224,62,62,0.12)", "color": "#e03e3e" }}>
                            {overdueTasks().length} overdue
                        </span>
                    </Show>
                </div>
            </div>

            {/* ── Week strip ── */}
            <div class="flex gap-1.5 overflow-x-auto shrink-0" style={{ "scrollbar-width": "none" }}>
                <For each={weekData()}>
                    {(day) => {
                        const isSelected = () => selectedDay() === day.offset;
                        return (
                            <button
                                onClick={() => setSelectedDay(day.offset)}
                                class="shrink-0 flex flex-col items-center gap-0.5 rounded-xl px-3.5 py-2.5 transition-all duration-150"
                                style={{
                                    "min-width": "64px",
                                    "background": isSelected() ? "var(--color-accent)" : "var(--color-bg-secondary)",
                                    "border": `1px solid ${isSelected() ? "var(--color-accent)" : "var(--color-border)"}`,
                                }}
                            >
                                <span
                                    class="text-[10px] font-semibold uppercase tracking-wide"
                                    style={{ "color": isSelected() ? "var(--color-accent-text)" : "var(--color-text-muted)" }}
                                >
                                    {day.offset === -1 ? 'Yest' : day.offset === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span
                                    class="text-lg font-bold leading-none"
                                    style={{ "color": isSelected() ? "var(--color-accent-text)" : "var(--color-text)" }}
                                >
                                    {day.date.getDate()}
                                </span>
                                <div class="flex gap-0.5 items-center mt-0.5" style={{ "min-height": "8px" }}>
                                    <For each={day.events.slice(0, 3)}>
                                        {(e) => (
                                            <div
                                                class="w-1.5 h-1.5 rounded-full"
                                                style={{ "background": isSelected() ? "rgba(255,255,255,0.75)" : (e.Color || "var(--color-accent)") }}
                                            />
                                        )}
                                    </For>
                                    <Show when={day.tasks.length > 0 && day.events.length === 0}>
                                        <div
                                            class="w-1.5 h-1.5 rounded-full"
                                            style={{ "background": isSelected() ? "rgba(255,255,255,0.5)" : "var(--color-text-muted)", "opacity": "0.6" }}
                                        />
                                    </Show>
                                </div>
                            </button>
                        );
                    }}
                </For>
            </div>

            <Show when={isLoading()}>
                <div class="flex items-center justify-center h-64" style={{ "color": "var(--color-text-muted)" }}>
                    <div class="animate-pulse text-sm">Loading...</div>
                </div>
            </Show>

            <Show when={!isLoading()}>
                {/* ── Two-column body ── */}
                <div
                    class="flex rounded-xl overflow-hidden flex-1 min-h-0"
                    style={{ "border": "1px solid var(--color-border)" }}
                >
                    {/* ─────────────────── LEFT: Task list ─────────────────── */}
                    <div
                        class="flex flex-col shrink-0"
                        style={{ "width": "340px", "border-right": "1px solid var(--color-border)" }}
                    >
                        {/* Column header */}
                        <div
                            class="flex items-center justify-between px-4 py-3 shrink-0"
                            style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)" }}
                        >
                            <span class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>
                                {viewDateLabel()}'s plan
                            </span>
                            <A
                                href="/todo"
                                class="flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium transition-all hover:opacity-80"
                                style={{ "background": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                            >
                                <PlusIcon class="w-3 h-3" /> Add
                            </A>
                        </div>

                        <div class="flex-1 overflow-y-auto" style={{ "background": "var(--color-bg)" }}>

                            {/* Overdue */}
                            <Show when={overdueTasks().length > 0}>
                                <div class="pt-3 px-3">
                                    <div class="text-[10px] font-bold uppercase tracking-widest px-1 mb-1.5" style={{ "color": "#e03e3e" }}>
                                        Overdue · {overdueTasks().length}
                                    </div>
                                    <div class="space-y-0.5">
                                        <For each={overdueTasks().slice(0, 5)}>
                                            {(task) => (
                                                <div
                                                    class="group flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-default"
                                                    style={{ "background": "rgba(224,62,62,0.06)", "border-left": "3px solid #e03e3e" }}
                                                >
                                                    <button
                                                        onClick={() => quickCompleteTask(task.id)}
                                                        class="w-4 h-4 rounded-full shrink-0 hover:opacity-60 transition-opacity"
                                                        style={{ "border": "2px solid #e03e3e" }}
                                                        title="Complete"
                                                    />
                                                    <div class="flex-1 min-w-0">
                                                        <div class="text-xs truncate" style={{ "color": "var(--color-text)" }}>{task.Title}</div>
                                                        <div class="text-[10px] mt-0.5" style={{ "color": "#e03e3e", "opacity": "0.8" }}>
                                                            {new Date(task.Deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            {' · '}{task.Priority}
                                                        </div>
                                                    </div>
                                                    <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                        <button onClick={() => openEditTask(task)} class="w-6 h-6 flex items-center justify-center rounded" style={{ "color": "var(--color-text-muted)" }} title="Edit">
                                                            <EditIcon class="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => startFocus(task.id, task.Title, task.Duration || 25, 'task')} class="w-6 h-6 flex items-center justify-center rounded" style={{ "color": "var(--color-accent)" }} title="Focus">
                                                            <PlayIcon class="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                        <Show when={overdueTasks().length > 5}>
                                            <A href="/todo" class="block text-center text-[10px] py-1 hover:underline" style={{ "color": "var(--color-text-muted)" }}>
                                                +{overdueTasks().length - 5} more overdue
                                            </A>
                                        </Show>
                                    </div>
                                </div>
                                <div class="mx-3 my-2 h-px" style={{ "background": "var(--color-border)" }} />
                            </Show>

                            {/* Day tasks */}
                            <Show when={viewDateTasks().length > 0}>
                                <div class="pt-3 px-3 pb-4 space-y-1">
                                    <For each={viewDateTasks()}>
                                        {(task) => {
                                            const isPast = selectedDay() === 0 && taskHasTime(task) && new Date(task.Deadline) < new Date();
                                            return (
                                                <div
                                                    class="group flex items-center gap-2.5 px-2 py-2.5 rounded-lg cursor-default transition-opacity duration-150"
                                                    style={{
                                                        "background": "var(--color-bg-secondary)",
                                                        "border-left": `3px solid ${priorityColor(task.Priority)}`,
                                                        "opacity": isPast ? "0.5" : "1",
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => quickCompleteTask(task.id)}
                                                        class="w-4 h-4 rounded-full shrink-0 hover:opacity-60 transition-opacity"
                                                        style={{ "border": `2px solid ${priorityColor(task.Priority)}` }}
                                                        title="Complete"
                                                    />
                                                    <div class="flex-1 min-w-0">
                                                        <div class="text-xs font-medium truncate" style={{ "color": "var(--color-text)" }}>{task.Title}</div>
                                                        <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <Show when={taskHasTime(task)}>
                                                                <span class="text-[10px] tabular-nums" style={{ "color": "var(--color-text-muted)" }}>
                                                                    {formatTime(new Date(task.Deadline))}
                                                                </span>
                                                            </Show>
                                                            <Show when={task.Duration}>
                                                                <span
                                                                    class="text-[10px] px-1.5 py-px rounded"
                                                                    style={{ "background": "var(--color-bg-tertiary)", "color": "var(--color-text-muted)" }}
                                                                >
                                                                    {formatDuration(task.Duration)}
                                                                </span>
                                                            </Show>
                                                            <Show when={task.Recurrence && task.Recurrence !== 'none'}>
                                                                <RepeatIcon class="w-2.5 h-2.5" style={{ "color": "var(--color-text-muted)" }} />
                                                            </Show>
                                                        </div>
                                                    </div>
                                                    <div class="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                        <button onClick={() => openEditTask(task)} class="w-6 h-6 flex items-center justify-center rounded" style={{ "color": "var(--color-text-muted)" }} title="Edit">
                                                            <EditIcon class="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => startFocus(task.id, task.Title, task.Duration || 25, 'task')} class="w-6 h-6 flex items-center justify-center rounded" style={{ "color": "var(--color-accent)" }} title="Focus">
                                                            <PlayIcon class="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => deleteTask(task.id)} class="w-6 h-6 flex items-center justify-center rounded hover:text-red-400 transition-colors" style={{ "color": "var(--color-text-muted)" }} title="Delete">
                                                            <TrashIcon class="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </For>
                                </div>
                            </Show>

                            <Show when={viewDateTasks().length === 0 && overdueTasks().length === 0}>
                                <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <div class="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ "background": "var(--color-bg-secondary)" }}>
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ "color": "var(--color-text-muted)" }}>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <p class="text-sm" style={{ "color": "var(--color-text-muted)" }}>
                                        Nothing planned for {viewDateLabel().toLowerCase()}
                                    </p>
                                    <A
                                        href="/todo"
                                        class="mt-3 text-xs px-3 py-1.5 rounded-lg font-medium"
                                        style={{ "background": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                                    >
                                        + Schedule tasks
                                    </A>
                                </div>
                            </Show>

                            {/* ── Coming Up ── */}
                            <Show when={upcomingItems().length > 0}>
                                <div class="mx-3 my-2 h-px" style={{ "background": "var(--color-border)" }} />
                                <div class="px-3 pb-4">
                                    <div class="text-[10px] font-bold uppercase tracking-widest px-1 mb-2" style={{ "color": "var(--color-text-muted)" }}>
                                        Coming Up
                                    </div>
                                    <For each={upcomingItems()}>
                                        {(item) => (
                                            item.type === 'event' ? (
                                                <button
                                                    onClick={() => setSelectedDay(item.offset)}
                                                    class="w-full text-left px-2 py-2.5 rounded-lg mb-1.5 hover:opacity-80 transition-opacity overflow-hidden"
                                                    style={{
                                                        "background": (item.data.Color || 'var(--color-accent)') + '12',
                                                        "border-left": `3px solid ${item.data.Color || 'var(--color-accent)'}`,
                                                    }}
                                                >
                                                    <div class="pl-1.5">
                                                        <div class="text-xs font-semibold truncate" style={{ "color": item.data.Color || 'var(--color-accent)' }}>
                                                            {item.data.EventName}
                                                        </div>
                                                        <div class="text-[10px] mt-0.5 flex items-center gap-1" style={{ "color": "var(--color-text-muted)" }}>
                                                            <span>{item.dayLabel}</span>
                                                            <span style={{ "opacity": "0.4" }}>·</span>
                                                            <span>{item.data.AllDay ? 'All day' : formatTime(item.date)}</span>
                                                            {item.data.End && !item.data.AllDay ? (
                                                                <><span style={{ "opacity": "0.4" }}>·</span><span>{formatDuration(Math.max(1, Math.round((new Date(item.data.End).getTime() - item.date.getTime()) / 60000)))}</span></>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedDay(item.offset)}
                                                    class="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1 text-left hover:opacity-80 transition-opacity"
                                                    style={{ "background": "var(--color-bg-secondary)" }}
                                                >
                                                    <div class="w-2 h-2 rounded-full shrink-0" style={{ "background": priorityColor(item.data.Priority) }} />
                                                    <div class="flex-1 min-w-0">
                                                        <div class="text-xs truncate" style={{ "color": "var(--color-text)" }}>{item.data.Title}</div>
                                                        <div class="text-[10px] mt-0.5 flex items-center gap-1" style={{ "color": "var(--color-text-muted)" }}>
                                                            <span>{item.dayLabel}</span>
                                                            {taskHasTime(item.data) ? (<><span style={{ "opacity": "0.4" }}>·</span><span>{formatTime(item.date)}</span></>) : null}
                                                            <span style={{ "opacity": "0.4" }}>·</span>
                                                            <span style={{ "color": priorityColor(item.data.Priority), "opacity": "0.8" }}>{item.data.Priority}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </div>

                    {/* ─────────────────── RIGHT: Day timeline ─────────────────── */}
                    <div class="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ "background": "var(--color-bg)" }}>

                        {/* Timeline header */}
                        <div
                            class="flex items-center justify-between px-4 py-3 shrink-0"
                            style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)" }}
                        >
                            <span class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>
                                {viewDate().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </span>
                            <Show when={viewDateEvents().length > 0}>
                                <A href="/calendar" class="text-xs hover:underline" style={{ "color": "var(--color-text-muted)" }}>
                                    {viewDateEvents().length} event{viewDateEvents().length !== 1 ? 's' : ''}
                                </A>
                            </Show>
                        </div>

                        {/* All-day events */}
                        <Show when={viewDateEvents().some(e => e.AllDay)}>
                            <div class="px-4 py-2 flex flex-wrap gap-1.5 shrink-0" style={{ "border-bottom": "1px solid var(--color-border)" }}>
                                <For each={viewDateEvents().filter(e => e.AllDay)}>
                                    {(event) => (
                                        <span
                                            class="text-xs px-2 py-0.5 rounded-full font-medium"
                                            style={{
                                                "background": (event.Color || 'var(--color-accent)') + '22',
                                                "color": event.Color || 'var(--color-accent)',
                                            }}
                                        >
                                            {event.EventName}
                                        </span>
                                    )}
                                </For>
                            </div>
                        </Show>

                        {/* Scrollable time grid */}
                        <div class="flex-1 overflow-y-auto">
                            <div class="relative" style={{ "height": `${(TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 64 + 10}px`, "padding-top": "20px" }}>

                                {/* Hour lines */}
                                <For each={TIMELINE_HOURS}>
                                    {(hour) => (
                                        <div
                                            class="absolute left-0 right-0 flex items-start"
                                            style={{ "top": `${(hour - TIMELINE_START_HOUR) * 64}px`, "height": "64px" }}
                                        >
                                            <span
                                                class="w-16 text-[10px] tabular-nums text-right pr-3 shrink-0 select-none"
                                                style={{ "color": "var(--color-text-muted)", "margin-top": "-7px" }}
                                            >
                                                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                            </span>
                                            <div class="flex-1 h-px" style={{ "background": "var(--color-border)" }} />
                                        </div>
                                    )}
                                </For>

                                {/* Calendar event blocks */}
                                <For each={viewDateEvents().filter(e => !e.AllDay)}>
                                    {(event) => {
                                        const startTime = new Date(event.Start);
                                        const top = getTopPx(startTime);
                                        const dur = getEventDurationMins(event);
                                        const height = getHeightPx(dur);
                                        const color = event.Color || 'var(--color-accent)';
                                        return (
                                            <div
                                                class="absolute right-2 rounded-md px-2 py-1.5 overflow-hidden"
                                                style={{
                                                    "left": "68px",
                                                    "top": `${top}px`,
                                                    "height": `${height}px`,
                                                    "background": color + '1a',
                                                    "border-left": `3px solid ${color}`,
                                                }}
                                            >
                                                <div class="text-xs font-semibold truncate" style={{ "color": color }}>{event.EventName}</div>
                                                <Show when={height > 32}>
                                                    <div class="text-[10px] mt-0.5" style={{ "color": "var(--color-text-muted)" }}>
                                                        {formatTime(startTime)} · {formatDuration(dur)}
                                                    </div>
                                                </Show>
                                            </div>
                                        );
                                    }}
                                </For>

                                {/* Task time blocks */}
                                <For each={viewDateTasks().filter(t => taskHasTime(t))}>
                                    {(task, idx) => {
                                        const startTime = new Date(task.Deadline);
                                        const top = getTopPx(startTime);
                                        const dur = task.Duration || 25;
                                        const height = getHeightPx(dur);
                                        const color = priorityColor(task.Priority);
                                        // Stagger slightly so overlapping tasks are visible
                                        const leftPad = 68 + (idx() % 2) * 5;
                                        return (
                                            <div
                                                class="absolute right-2 rounded-md px-2 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                                style={{
                                                    "left": `${leftPad}px`,
                                                    "top": `${top}px`,
                                                    "height": `${height}px`,
                                                    "background": color + '14',
                                                    "border": `1px solid ${color}35`,
                                                    "border-left": `3px solid ${color}`,
                                                }}
                                                onClick={() => openEditTask(task)}
                                                title={`${task.Title} · ${formatDuration(dur)}`}
                                            >
                                                <div class="text-xs font-medium truncate" style={{ "color": "var(--color-text)" }}>{task.Title}</div>
                                                <Show when={height > 32}>
                                                    <div class="text-[10px] mt-0.5" style={{ "color": "var(--color-text-muted)" }}>
                                                        {formatTime(startTime)}{dur ? ` · ${formatDuration(dur)}` : ''}
                                                    </div>
                                                </Show>
                                            </div>
                                        );
                                    }}
                                </For>

                                {/* NOW line (today only) */}
                                <Show when={selectedDay() === 0}>
                                    <div
                                        class="absolute left-0 right-0 flex items-center pointer-events-none"
                                        style={{ "top": `${getTopPx(new Date())}px`, "z-index": "3" }}
                                    >
                                        <span
                                            class="w-16 text-[10px] font-bold text-right pr-2 shrink-0 tabular-nums"
                                            style={{ "color": "var(--color-accent)" }}
                                        >
                                            {formatTime(new Date())}
                                        </span>
                                        <div class="flex-1 h-[2px]" style={{ "background": "var(--color-accent)" }} />
                                        <div class="w-2 h-2 rounded-full shrink-0 mr-2" style={{ "background": "var(--color-accent)" }} />
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            {/* ── Edit task drawer ─────────────────────────────────────────── */}
            <Show when={editingTask()}>
                <div
                    class="fixed inset-0 z-40"
                    style={{ "background": "rgba(0,0,0,0.4)" }}
                    onClick={() => setEditingTask(null)}
                />
            </Show>
            <div
                class="fixed top-[32px] right-0 h-[calc(100vh-32px)] z-[45] flex flex-col"
                style={{
                    "width": "min(420px, 100vw)",
                    "background": "var(--color-bg-secondary)",
                    "border-left": "1px solid var(--color-border)",
                    "box-shadow": "-4px 0 24px rgba(0,0,0,0.3)",
                    "opacity": editingTask() ? "1" : "0",
                    "transform": editingTask() ? "translate3d(0, 0, 0)" : "translate3d(16px, 0, 0)",
                    "transition": "opacity 0.2s ease-out, transform 0.2s ease-out",
                    "pointer-events": editingTask() ? "auto" : "none",
                }}
            >
                <div style={{ "overflow-y": "auto", "height": "100%" }}>
                    <div
                        class="sticky top-0 p-4 flex items-center justify-between"
                        style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)" }}
                    >
                        <h2 class="text-base font-bold" style={{ "color": "var(--color-text)" }}>Edit Task</h2>
                        <button
                            onClick={() => setEditingTask(null)}
                            class="w-8 h-8 flex items-center justify-center rounded-lg"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            <XIcon class="w-5 h-5" />
                        </button>
                    </div>
                    <div class="p-5 space-y-4">
                        <div>
                            <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Title</label>
                            <input
                                type="text"
                                value={editTitle()}
                                onInput={(e) => setEditTitle(e.currentTarget.value)}
                                class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                                style={{ "background": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Description</label>
                            <textarea
                                value={editDescription()}
                                onInput={(e) => setEditDescription(e.currentTarget.value)}
                                rows="3"
                                class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                                style={{ "background": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Priority</label>
                            <div class="flex gap-2">
                                <For each={['P1', 'P2', 'P3']}>
                                    {(p) => (
                                        <button
                                            type="button"
                                            onClick={() => setEditPriority(p)}
                                            class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                                            style={{
                                                "background": editPriority() === p ? `${priorityColor(p)}20` : "var(--color-bg-tertiary)",
                                                "color": editPriority() === p ? priorityColor(p) : "var(--color-text-muted)",
                                                "border": `1px solid ${editPriority() === p ? priorityColor(p) : 'var(--color-border)'}`,
                                            }}
                                        >{p}</button>
                                    )}
                                </For>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Due Date &amp; Time</label>
                            <div class="flex gap-2">
                                <input
                                    type="date"
                                    value={editDeadlineDate()}
                                    onInput={(e) => setEditDeadlineDate(e.currentTarget.value)}
                                    class="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    style={{ "background": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                />
                                <input
                                    type="time"
                                    value={editDeadlineTime()}
                                    onInput={(e) => setEditDeadlineTime(e.currentTarget.value)}
                                    class="w-28 rounded-lg px-3 py-2 text-sm focus:outline-none"
                                    style={{ "background": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                />
                            </div>
                            <Show when={editDeadlineDate()}>
                                <button
                                    type="button"
                                    onClick={() => { setEditDeadlineDate(''); setEditDeadlineTime(''); }}
                                    class="text-xs mt-1.5 hover:underline"
                                    style={{ "color": "var(--color-text-muted)" }}
                                >Clear date</button>
                            </Show>
                        </div>
                        <button
                            onClick={saveEditedTask}
                            class="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200"
                            style={{ "background": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
