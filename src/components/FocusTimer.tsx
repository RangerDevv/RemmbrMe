import { Show, createMemo, createSignal, createEffect, For, onMount, onCleanup } from 'solid-js';
import { focusSession, pauseFocus, resumeFocus, stopFocus } from '../lib/focusTimer';
import { XIcon } from './Icons';
import { bk, currentUser } from '../lib/backend';
import { timerThemes, getTimerTheme, setTimerTheme, currentTimerThemeId } from '../lib/timerThemes';

// Fullscreen ring dimensions
const FS_R = 120;
const FS_C = 2 * Math.PI * FS_R;

// Mini ring dimensions
const MINI_R = 45;
const MINI_C = 2 * Math.PI * MINI_R;

export default function FocusTimer() {
    const [fullscreen, setFullscreen] = createSignal(false);
    const [upcoming, setUpcoming] = createSignal<any[]>([]);
    const [showThemePicker, setShowThemePicker] = createSignal(false);
    const session = focusSession;

    const theme = createMemo(() => getTimerTheme());

    const remaining = createMemo(() => {
        const s = session();
        if (!s) return 0;
        return Math.max(0, s.durationSecs - s.elapsedSecs);
    });

    const progress = createMemo(() => {
        const s = session();
        if (!s || s.durationSecs === 0) return 0;
        return s.elapsedSecs / s.durationSecs;
    });

    const timeStr = createMemo(() => {
        const r = remaining();
        const m = Math.floor(r / 60);
        const s = r % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    });

    const fsDashOffset = createMemo(() => FS_C * (1 - progress()));
    const miniDashOffset = createMemo(() => MINI_C * (1 - progress()));

    const isDone = createMemo(() => session()?.status === 'done');
    const arcColor = createMemo(() => isDone() ? theme().arcColorDone : theme().arcColor);
    const arcGlow = createMemo(() => isDone() ? theme().arcGlowDone : theme().arcGlow);
    const miniGlow = createMemo(() => isDone() ? theme().miniGlowDone : theme().miniGlow);
    const ambientColor = createMemo(() => isDone() ? theme().ambientDone : theme().ambientActive);

    async function fetchUpcoming() {
        try {
            const userId = currentUser()?.id;
            if (!userId) return;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [todos, events] = await Promise.all([
                bk.collection('Todo').getFullList({ filter: `user = "${userId}"`, sort: 'Deadline' }),
                bk.collection('Calendar').getFullList({ filter: `user = "${userId}"`, sort: 'Start' }),
            ]);

            const items: any[] = [];
            todos.filter((t: any) => {
                if (t.Completed) return false;
                if (!t.Deadline) return false;
                const d = new Date(t.Deadline);
                return d >= today && d < tomorrow;
            }).forEach((t: any) => {
                items.push({ type: 'task', title: t.Title, priority: t.Priority, time: t.Deadline, id: t.id });
            });
            events.filter((e: any) => {
                const d = new Date(e.Start);
                return d >= today && d < tomorrow;
            }).forEach((e: any) => {
                items.push({ type: 'event', title: e.EventName, color: e.Color, time: e.Start, id: e.id });
            });
            items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            setUpcoming(items);
        } catch (_) {}
    }

    // Fetch upcoming when fullscreen opens
    createEffect(() => {
        if (fullscreen() && session()) fetchUpcoming();
    });

    async function handleComplete() {
        const s = session();
        if (!s) return;
        if (s.type === 'task') {
            try {
                await bk.collection('Todo').update(s.taskId, { Completed: true });
                window.dispatchEvent(new Event('itemCreated'));
            } catch (_) {}
        }
        stopFocus();
    }

    function handleStop() {
        setFullscreen(false);
        stopFocus();
    }

    // Keyboard: F = toggle fullscreen, Esc = close fullscreen
    onMount(() => {
        const handler = (e: KeyboardEvent) => {
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
            if (!session()) return;
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setFullscreen(v => !v);
            }
            if (e.key === 'Escape' && fullscreen()) {
                e.preventDefault();
                if (showThemePicker()) { setShowThemePicker(false); return; }
                setFullscreen(false);
            }
        };
        document.addEventListener('keydown', handler);
        onCleanup(() => document.removeEventListener('keydown', handler));
    });

    const priorityColor = (p: string) => {
        if (p === 'P1') return '#e03e3e';
        if (p === 'P3') return 'var(--color-success)';
        return 'var(--color-warning)';
    };

    // Derive a readable overlay bg for controls based on theme brightness
    const controlBg = createMemo(() => {
        const t = theme();
        // If theme is light (Minimal), use dark overlay; otherwise use light
        if (t.id === 'minimal') return 'rgba(0,0,0,0.08)';
        return 'rgba(255,255,255,0.07)';
    });
    const controlText = createMemo(() => {
        const t = theme();
        if (t.id === 'minimal') return 'rgba(0,0,0,0.55)';
        return 'rgba(255,255,255,0.55)';
    });

    return (
        <Show when={session()}>

            {/* ══════════════════════════════════
                FULLSCREEN MODE
            ══════════════════════════════════ */}
            <Show when={fullscreen()}>
                <div
                    class={`fixed inset-0 z-200 flex${theme().rootClass ? ' ' + theme().rootClass : ''}`}
                    style={{ "background": theme().background }}
                >
                    {/* Ambient glow behind ring */}
                    <div
                        class="pointer-events-none absolute inset-0 transition-all duration-700"
                        style={{
                            "background": `radial-gradient(ellipse 55% 60% at 38% 50%, ${ambientColor()} 0%, transparent 70%)`,
                        }}
                    />

                    {/* ── Timer panel (left/center) ── */}
                    <div class="flex-1 relative overflow-hidden">

                        {/* Top bar */}
                        <div class="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
                            <span
                                class="text-[11px] font-bold uppercase tracking-[0.22em]"
                                style={{ "color": theme().accentLabel, "opacity": "0.80" }}
                            >
                                Focus Session
                            </span>
                            <div class="flex items-center gap-2">
                                {/* Theme picker toggle */}
                                <button
                                    onClick={() => setShowThemePicker(v => !v)}
                                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                                    style={{ "background": controlBg(), "color": controlText() }}
                                    title="Change timer theme"
                                >
                                    <span
                                        class="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ "background-color": theme().arcColor }}
                                    />
                                    {theme().name}
                                </button>
                                <button
                                    onClick={() => setFullscreen(false)}
                                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-75"
                                    style={{ "background": controlBg(), "color": controlText() }}
                                    title="Minimize (F)"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                                        <polyline points="4 14 10 14 10 20" />
                                        <polyline points="20 10 14 10 14 4" />
                                        <line x1="10" y1="14" x2="3" y2="21" />
                                        <line x1="21" y1="3" x2="14" y2="10" />
                                    </svg>
                                    Minimize
                                </button>
                                <button
                                    onClick={handleStop}
                                    class="p-2 rounded-xl transition-all hover:opacity-70"
                                    style={{ "background": controlBg(), "color": controlText() }}
                                    title="End session"
                                >
                                    <XIcon class="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Theme picker dropdown */}
                        <Show when={showThemePicker()}>
                            <div
                                class="absolute top-18 right-6 z-20 rounded-2xl p-3 shadow-2xl"
                                style={{
                                    "background": theme().id === 'minimal'
                                        ? 'rgba(245,245,242,0.97)'
                                        : 'rgba(10,10,16,0.92)',
                                    "border": `1px solid ${theme().id === 'minimal' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
                                    "backdrop-filter": "blur(24px)",
                                    "min-width": "260px",
                                }}
                            >
                                <p
                                    class="text-[10px] font-bold uppercase tracking-[0.20em] mb-2.5 px-1"
                                    style={{ "color": theme().id === 'minimal' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)' }}
                                >
                                    Timer Theme
                                </p>
                                <div class="grid grid-cols-4 gap-1.5">
                                    <For each={timerThemes}>
                                        {(t) => (
                                            <button
                                                onClick={() => { setTimerTheme(t.id); setShowThemePicker(false); }}
                                                class="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:opacity-90"
                                                style={{
                                                    "background": currentTimerThemeId() === t.id
                                                        ? (theme().id === 'minimal' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)')
                                                        : 'transparent',
                                                    "border": `1.5px solid ${currentTimerThemeId() === t.id ? t.preview : 'transparent'}`,
                                                    "box-shadow": currentTimerThemeId() === t.id ? `0 0 8px ${t.preview}60` : 'none',
                                                }}
                                                title={t.name}
                                            >
                                                <span
                                                    class="w-6 h-6 rounded-full shrink-0"
                                                    style={{ "background-color": t.preview }}
                                                />
                                                <span
                                                    class="text-[9px] font-medium leading-tight text-center"
                                                    style={{ "color": theme().id === 'minimal' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.55)' }}
                                                >
                                                    {t.name}
                                                </span>
                                            </button>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </Show>

                        {/* Centered body */}
                        <div class="absolute inset-0 flex flex-col items-center justify-center px-8 gap-4">

                            {/* Responsive ring */}
                            <div
                                class="relative shrink-0"
                                style={{ "width": "clamp(160px, 38vh, 300px)", "height": "clamp(160px, 38vh, 300px)" }}
                            >
                                <svg width="100%" height="100%" viewBox="0 0 300 300" style={{ "transform": "rotate(-90deg)" }}>
                                    <circle cx="150" cy="150" r={FS_R + 18}
                                        fill="none"
                                        stroke={theme().id === 'minimal' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.025)'}
                                        stroke-width="1"
                                    />
                                    <circle cx="150" cy="150" r={FS_R}
                                        fill="none" stroke={theme().arcTrackColor} stroke-width="12" />
                                    <circle
                                        cx="150" cy="150" r={FS_R}
                                        fill="none"
                                        stroke={arcColor()}
                                        stroke-width="12"
                                        stroke-linecap="round"
                                        stroke-dasharray={`${FS_C}`}
                                        stroke-dashoffset={fsDashOffset()}
                                        style={{
                                            "transition": "stroke-dashoffset 1s linear, stroke 0.5s ease",
                                            "filter": arcGlow(),
                                        }}
                                    />
                                </svg>
                                {/* Center content overlaid on ring */}
                                <div class="absolute inset-0 flex flex-col items-center justify-center">
                                    <Show when={!isDone()}>
                                        <span
                                            class="font-bold tabular-nums"
                                            style={{
                                                "font-size": "clamp(1.8rem, 9vh, 4.5rem)",
                                                "line-height": "1",
                                                "letter-spacing": "-0.04em",
                                                "color": theme().centerTimeColor,
                                            }}
                                        >
                                            {timeStr()}
                                        </span>
                                        <span
                                            class="text-xs mt-1.5 uppercase tracking-[0.18em]"
                                            style={{ "color": theme().labelColor }}
                                        >
                                            {session()?.status === 'paused' ? 'paused' : 'remaining'}
                                        </span>
                                    </Show>
                                    <Show when={isDone()}>
                                        <svg class="w-12 h-12 mb-1" fill="none" stroke={theme().arcColorDone} stroke-width="1.5" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                        <span class="text-lg font-bold" style={{ "color": theme().arcColorDone }}>Complete!</span>
                                    </Show>
                                </div>
                            </div>

                            {/* Task name + meta */}
                            <div class="text-center">
                                <h2
                                    class="font-semibold max-w-sm mb-1"
                                    style={{
                                        "font-size": "clamp(1rem, 3vh, 1.5rem)",
                                        "color": theme().titleColor,
                                    }}
                                >
                                    {session()?.title}
                                </h2>
                                <p class="text-sm" style={{ "color": theme().labelColor }}>
                                    {session()?.type === 'event' ? 'Calendar event' : 'Task'}
                                    {' · '}
                                    {Math.round((session()?.durationSecs ?? 0) / 60)} min session
                                </p>
                            </div>

                            {/* Action controls */}
                            <Show when={!isDone()}>
                                <div class="flex items-center gap-3 flex-wrap justify-center">
                                    <button
                                        onClick={() => session()?.status === 'active' ? pauseFocus() : resumeFocus()}
                                        class="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold transition-all"
                                        style={{
                                            "background-color": theme().arcColor,
                                            "color": theme().id === 'minimal' ? '#ffffff' : theme().centerTimeColor,
                                            "box-shadow": theme().arcGlow !== 'none'
                                                ? `0 0 28px ${theme().arcColor}55`
                                                : 'none',
                                        }}
                                    >
                                        {session()?.status === 'active' ? '⏸  Pause' : '▶  Resume'}
                                    </button>
                                    <button
                                        onClick={handleStop}
                                        class="px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-75"
                                        style={{ "background": controlBg(), "color": controlText() }}
                                    >
                                        End
                                    </button>
                                </div>
                            </Show>
                            <Show when={isDone()}>
                                <div class="flex items-center gap-3 flex-wrap justify-center">
                                    <Show when={session()?.type === 'task'}>
                                        <button
                                            onClick={handleComplete}
                                            class="flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-semibold transition-all"
                                            style={{
                                                "background-color": theme().arcColorDone,
                                                "color": theme().id === 'minimal' ? '#ffffff' : theme().centerTimeColor,
                                                "box-shadow": theme().arcGlowDone !== 'none'
                                                    ? `0 0 24px ${theme().arcColorDone}55`
                                                    : 'none',
                                            }}
                                        >
                                            ✓ Mark Complete & Close
                                        </button>
                                    </Show>
                                    <button
                                        onClick={handleStop}
                                        class="px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-75"
                                        style={{ "background": controlBg(), "color": controlText() }}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </Show>

                            {/* Keyboard hint */}
                            <p class="text-[11px] tracking-wide select-none" style={{ "color": theme().labelColor, "opacity": "0.35" }}>
                                Press F to minimize · Esc to close fullscreen
                            </p>

                        </div>{/* end centered body */}
                    </div>{/* end timer panel */}

                    {/* ── Up Next panel (right) ── */}
                    <div
                        class="w-72 flex flex-col py-8 px-10 overflow-y-auto shrink-0"
                        style={{
                            "border-left": `1px solid ${theme().id === 'minimal' ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`,
                            "background": theme().panelBg,
                        }}
                    >
                        <h3
                            class="text-[10px] p-5 font-bold uppercase tracking-[0.22em] mb-5"
                            style={{ "color": theme().labelColor }}
                        >
                            Up Next Today
                        </h3>

                        <Show when={upcoming().length === 0}>
                            <div class="flex-1 flex items-center justify-center">
                                <p
                                    class="text-sm text-center leading-relaxed"
                                    style={{ "color": theme().labelColor, "opacity": "0.4" }}
                                >
                                    Nothing else<br />scheduled today
                                </p>
                            </div>
                        </Show>

                        <div class="space-y-1.5">
                            <For each={upcoming()}>
                                {(item) => {
                                    const isCurrent = item.id === session()?.taskId;
                                    const t = new Date(item.time);
                                    const hasTime = t.getHours() !== 0 || t.getMinutes() !== 0;
                                    return (
                                        <div
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                                            style={{
                                                "background": isCurrent
                                                    ? `${theme().arcColor}18`
                                                    : (theme().id === 'minimal' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'),
                                                "border": `1px solid ${isCurrent
                                                    ? theme().arcColor
                                                    : (theme().id === 'minimal' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)')}`,
                                            }}
                                        >
                                            <div
                                                class="w-1 h-7 rounded-full shrink-0"
                                                style={{
                                                    "background-color": item.type === 'event'
                                                        ? (item.color || theme().arcColor)
                                                        : priorityColor(item.priority),
                                                }}
                                            />
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium truncate" style={{ "color": isCurrent ? theme().arcColor : theme().titleColor }}>
                                                    {item.title}
                                                </p>
                                                <p class="text-[11px] mt-0.5" style={{ "color": theme().labelColor }}>
                                                    {hasTime
                                                        ? t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                                                        : item.type === 'task' ? item.priority : 'All day'
                                                    }
                                                </p>
                                            </div>
                                            <Show when={isCurrent}>
                                                <span
                                                    class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                                                    style={{ "background": theme().arcColor, "color": theme().centerTimeColor }}
                                                >
                                                    Now
                                                </span>
                                            </Show>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                </div>
            </Show>

            {/* ══════════════════════════════════
                MINI WIDGET (bottom-right)
            ══════════════════════════════════ */}
            <Show when={!fullscreen()}>
                <div
                    class="fixed bottom-6 right-6 z-50 glass rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                        "border": "1px solid var(--color-border-hover)",
                        "width": "236px",
                    }}
                >
                    {/* Thin accent progress bar along the top */}
                    <div
                        class="h-0.5"
                        style={{
                            "background": theme().progressGradient,
                            "opacity": session()?.status === 'active' ? "1" : "0.3",
                            "width": `${progress() * 100}%`,
                            "transition": "width 1s linear, opacity 0.3s ease",
                        }}
                    />

                    <div class="p-4">
                        {/* Header row */}
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[10px] font-bold uppercase tracking-widest" style={{ "color": theme().accentLabel }}>
                                Focus
                            </span>
                            <div class="flex items-center gap-1">
                                {/* Expand button */}
                                <button
                                    onClick={() => setFullscreen(true)}
                                    class="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                    style={{ "color": "var(--color-text-muted)" }}
                                    title="Expand fullscreen (F)"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                        <polyline points="15 3 21 3 21 9" />
                                        <polyline points="9 21 3 21 3 15" />
                                        <line x1="21" y1="3" x2="14" y2="10" />
                                        <line x1="3" y1="21" x2="10" y2="14" />
                                    </svg>
                                </button>
                                {/* End button */}
                                <button
                                    onClick={handleStop}
                                    class="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                    style={{ "color": "var(--color-text-muted)" }}
                                    title="End session"
                                >
                                    <XIcon class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Ring + info side-by-side */}
                        <div class="flex items-center gap-4">
                            {/* Mini ring */}
                            <div class="relative shrink-0">
                                <svg width="72" height="72" viewBox="0 0 100 100" style={{ "transform": "rotate(-90deg)" }}>
                                    <circle cx="50" cy="50" r={MINI_R}
                                        fill="none" stroke={theme().arcTrackColor} stroke-width="8" />
                                    <circle
                                        cx="50" cy="50" r={MINI_R}
                                        fill="none"
                                        stroke={arcColor()}
                                        stroke-width="8"
                                        stroke-linecap="round"
                                        stroke-dasharray={`${MINI_C}`}
                                        stroke-dashoffset={miniDashOffset()}
                                        style={{
                                            "transition": "stroke-dashoffset 1s linear, stroke 0.3s ease",
                                            "filter": miniGlow(),
                                        }}
                                    />
                                </svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center">
                                    <Show when={!isDone()}>
                                        <span class="text-base font-bold tabular-nums leading-none" style={{ "color": "var(--color-text)" }}>
                                            {timeStr()}
                                        </span>
                                    </Show>
                                    <Show when={isDone()}>
                                        <span class="text-xl" style={{ "color": theme().arcColorDone }}>✓</span>
                                    </Show>
                                </div>
                            </div>

                            {/* Task info + control */}
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium leading-tight truncate mb-0.5" style={{ "color": "var(--color-text)" }}>
                                    {session()?.title}
                                </p>
                                <p class="text-[11px] mb-2.5" style={{ "color": "var(--color-text-muted)" }}>
                                    {session()?.status === 'paused'
                                        ? 'Paused'
                                        : session()?.status === 'done'
                                            ? 'Done!'
                                            : `${Math.round((session()?.durationSecs ?? 0) / 60)} min`}
                                </p>

                                <Show when={!isDone()}>
                                    <button
                                        onClick={() => session()?.status === 'active' ? pauseFocus() : resumeFocus()}
                                        class="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                                    >
                                        {session()?.status === 'active' ? '⏸  Pause' : '▶  Resume'}
                                    </button>
                                </Show>
                                <Show when={isDone() && session()?.type === 'task'}>
                                    <button
                                        onClick={handleComplete}
                                        class="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{ "background-color": "var(--color-success)", "color": "white" }}
                                    >
                                        ✓ Complete
                                    </button>
                                </Show>
                                <Show when={isDone() && session()?.type === 'event'}>
                                    <button
                                        onClick={handleStop}
                                        class="w-full py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-75"
                                        style={{ "background": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)" }}
                                    >
                                        Dismiss
                                    </button>
                                </Show>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

        </Show>
    );
}
