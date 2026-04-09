import { Show, Switch, Match, createMemo, createSignal, createEffect, For, onMount, onCleanup } from 'solid-js';
import { focusSession, pauseFocus, resumeFocus, stopFocus } from '../lib/focusTimer';
import { XIcon } from './Icons';
import { bk, currentUser } from '../lib/backend';
import { timerThemes, getTimerTheme, setTimerTheme, currentTimerThemeId, SPACE_STARS } from '../lib/timerThemes';

// ─── Ring dimensions ───────────────────────────────────────────────
const FS_R = 120;
const FS_C = 2 * Math.PI * FS_R;
const MINI_R = 45;
const MINI_C = 2 * Math.PI * MINI_R;

// ─── Pie helpers ───────────────────────────────────────────────────
// frac = remaining fraction (0–1). Sector starts at 12 o'clock, sweeps CW.
function pieSectorPath(frac: number): string {
    const cx = 150, cy = 150, r = 118;
    if (frac <= 0) return '';
    if (frac >= 1) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
    const svgAngleDeg = frac * 360 - 90;
    const rad = svgAngleDeg * Math.PI / 180;
    const ex = cx + r * Math.cos(rad);
    const ey = cy + r * Math.sin(rad);
    const large = frac > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`;
}

// clock-face tick: 12 marks at every 30° (i=0 = 12 o'clock = top = SVG 270°)
function pieTick(i: number, inner: number, outer: number) {
    const svgDeg = i * 30 - 90; // 0 = top in SVG
    const rad = svgDeg * Math.PI / 180;
    const cx = 150, cy = 150;
    return {
        x1: cx + inner * Math.cos(rad),
        y1: cy + inner * Math.sin(rad),
        x2: cx + outer * Math.cos(rad),
        y2: cy + outer * Math.sin(rad),
    };
}

// ─── Gauge helpers ─────────────────────────────────────────────────
// Gauge: 270° arc from SVG angle 135° (lower-left) to 45° (lower-right), CW
const G_CX = 160, G_CY = 150, G_R = 105;
const G_START = 135, G_SWEEP = 270;

function gaugePt(angleDeg: number, r = G_R) {
    const rad = angleDeg * Math.PI / 180;
    return { x: G_CX + r * Math.cos(rad), y: G_CY + r * Math.sin(rad) };
}

function gaugeArcPath(frac: number): string {
    const f = Math.max(0, Math.min(1, frac));
    if (f <= 0.001) return '';
    const endAngle = G_START + f * G_SWEEP;
    const s = gaugePt(G_START);
    if (f >= 0.999) {
        const e = gaugePt(G_START + G_SWEEP);
        return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${G_R} ${G_R} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
    }
    const e = gaugePt(endAngle);
    const large = f * G_SWEEP > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${G_R} ${G_R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function gaugeTrackPath(): string {
    const s = gaugePt(G_START);
    const e = gaugePt(G_START + G_SWEEP);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${G_R} ${G_R} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ─── FocusTimer ────────────────────────────────────────────────────
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

    // Controls overlay (minimize / end buttons)
    const controlBg = createMemo(() =>
        theme().id === 'minimal'
            ? 'rgba(0,0,0,0.07)'
            : 'rgba(255,255,255,0.07)'
    );
    const controlText = createMemo(() =>
        theme().id === 'minimal'
            ? 'rgba(0,0,0,0.50)'
            : 'rgba(255,255,255,0.55)'
    );
    // Whether text-on-dark-panels should be light
    const isLight = createMemo(() => theme().id === 'minimal' || theme().visualStyle === 'waves');

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
                if (t.Completed || !t.Deadline) return false;
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

    // ── Shared action buttons ─────────────────────────────────────
    const ActionButtons = () => (
        <>
            <Show when={!isDone()}>
                <div class="flex items-center gap-3 flex-wrap justify-center">
                    <button
                        onClick={() => session()?.status === 'active' ? pauseFocus() : resumeFocus()}
                        class="flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold transition-all"
                        style={{
                            "background-color": arcColor(),
                            "color": '#ffffff',
                            "box-shadow": arcGlow() !== 'none' ? `0 0 28px ${arcColor()}55` : 'none',
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
                                "color": '#ffffff',
                                "box-shadow": `0 0 24px ${theme().arcColorDone}55`,
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
        </>
    );

    // ═══════════════════════════════════════════════════════════════
    // VISUAL RENDERER  ·  ring
    // ═══════════════════════════════════════════════════════════════
    const RingVisual = () => {
        const t = theme();
        const gradId = 'swGrad_' + t.id;

        return (
            <div
                class="relative shrink-0"
                style={{ "width": "clamp(160px, 38vh, 300px)", "height": "clamp(160px, 38vh, 300px)" }}
            >
                <svg width="100%" height="100%" viewBox="0 0 300 300" style={{ "transform": "rotate(-90deg)" }}>
                    {/* Synthwave gradient def */}
                    <Show when={!!t.strokeGradient}>
                        <defs>
                            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color={t.strokeGradient![0]} />
                                <stop offset="100%" stop-color={t.strokeGradient![1]} />
                            </linearGradient>
                        </defs>
                    </Show>

                    {/* Aurora / Neon outer ghost rings */}
                    <For each={t.extraRings ?? []}>
                        {(er) => (
                            <circle
                                cx="150" cy="150"
                                r={FS_R + er.radiusOffset}
                                fill="none"
                                stroke={arcColor()}
                                stroke-width={er.strokeWidth}
                                opacity={er.opacity}
                                style={er.animated ? { animation: 'timerNeonHalo 2s ease-in-out infinite' } : undefined}
                            />
                        )}
                    </For>

                    {/* Outer decorative ring */}
                    <circle cx="150" cy="150" r={FS_R + 18}
                        fill="none"
                        stroke={isLight() ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.025)'}
                        stroke-width="1"
                    />
                    {/* Track */}
                    <circle cx="150" cy="150" r={FS_R}
                        fill="none" stroke={t.arcTrackColor} stroke-width="12"
                    />
                    {/* Progress arc */}
                    <circle
                        cx="150" cy="150" r={FS_R}
                        fill="none"
                        stroke={t.strokeGradient ? `url(#${gradId})` : arcColor()}
                        stroke-width="12"
                        stroke-linecap="round"
                        stroke-dasharray={`${FS_C}`}
                        stroke-dashoffset={fsDashOffset()}
                        style={{
                            "transition": "stroke-dashoffset 1s linear, stroke 0.5s ease",
                            "filter": arcGlow() !== 'none' ? arcGlow() : undefined,
                        }}
                    />
                </svg>

                {/* Center overlay */}
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <Show when={!isDone()}>
                        <span
                            class="font-bold tabular-nums"
                            style={{
                                "font-size": "clamp(1.8rem, 9vh, 4.5rem)",
                                "line-height": "1",
                                "letter-spacing": "-0.04em",
                                "color": t.centerTimeColor,
                            }}
                        >
                            {timeStr()}
                        </span>
                        <span class="text-xs mt-1.5 uppercase tracking-[0.18em]" style={{ "color": t.labelColor }}>
                            {session()?.status === 'paused' ? 'paused' : 'remaining'}
                        </span>
                    </Show>
                    <Show when={isDone()}>
                        <svg class="w-12 h-12 mb-1" fill="none" stroke={t.arcColorDone} stroke-width="1.5" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <span class="text-lg font-bold" style={{ "color": t.arcColorDone }}>Complete!</span>
                    </Show>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // VISUAL RENDERER  ·  pie  (Time Timer™ style)
    // ═══════════════════════════════════════════════════════════════
    const PieVisual = () => {
        const t = theme();
        const remaining = createMemo(() => 1 - progress());
        const ticks = Array.from({ length: 12 }, (_, i) => i);

        return (
            <div class="relative shrink-0" style={{ "width": "clamp(220px, 42vh, 320px)", "height": "clamp(220px, 42vh, 320px)" }}>
                <svg width="100%" height="100%" viewBox="0 0 300 300">
                    {/* Outer rim */}
                    <circle cx="150" cy="150" r="138" fill="none"
                        stroke="rgba(255,255,255,0.10)" stroke-width="1"
                    />
                    {/* Background disc */}
                    <circle cx="150" cy="150" r="130"
                        fill="rgba(255,255,255,0.05)"
                    />
                    {/* Pie sector — remaining time */}
                    <path
                        d={pieSectorPath(remaining())}
                        fill={isDone() ? t.arcColorDone : t.arcColor}
                        style={{ "transition": "d 0.5s ease" }}
                    />
                    {/* Clock-face tick marks */}
                    <For each={ticks}>
                        {(i) => {
                            const isPrimary = i % 3 === 0;
                            const tk = pieTick(i, isPrimary ? 122 : 126, 136);
                            return (
                                <line
                                    x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2}
                                    stroke="rgba(255,255,255,0.55)"
                                    stroke-width={isPrimary ? 2 : 1}
                                    stroke-linecap="round"
                                />
                            );
                        }}
                    </For>
                    {/* Center hub — white disc */}
                    <circle cx="150" cy="150" r="28" fill="white" />
                    <circle cx="150" cy="150" r="6" fill="#1a1a1a" />
                    {/* Needle — points toward end of remaining arc */}
                    {(() => {
                        const svgAngle = (remaining() * 360 - 90) * Math.PI / 180;
                        const tx = 150 + 108 * Math.cos(svgAngle);
                        const ty = 150 + 108 * Math.sin(svgAngle);
                        const bx = 150 - 18 * Math.cos(svgAngle);
                        const by = 150 - 18 * Math.sin(svgAngle);
                        return (
                            <line
                                x1={bx.toFixed(2)} y1={by.toFixed(2)}
                                x2={tx.toFixed(2)} y2={ty.toFixed(2)}
                                stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round"
                            />
                        );
                    })()}
                </svg>
                {/* Time in center hub overlay */}
                <div class="absolute inset-0 flex items-center justify-center">
                    <Show when={!isDone()}>
                        <span
                            class="tabular-nums font-bold select-none"
                            style={{ "font-size": "clamp(0.75rem, 2.2vh, 1.1rem)", "color": "#1a1a1a", "letter-spacing": "-0.03em" }}
                        >
                            {timeStr()}
                        </span>
                    </Show>
                    <Show when={isDone()}>
                        <span style={{ "color": t.arcColorDone, "font-size": "1.4rem" }}>✓</span>
                    </Show>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // VISUAL RENDERER  ·  gauge  (speedometer style)
    // ═══════════════════════════════════════════════════════════════
    const GaugeVisual = () => {
        const t = theme();
        const ticks = Array.from({ length: 11 }, (_, i) => i); // 0–10

        return (
            <div class="flex flex-col items-center gap-1 w-full">
                {/* Large time above gauge */}
                <div class="text-center mb-1">
                    <span
                        class="font-bold tabular-nums"
                        style={{
                            "font-size": "clamp(2.8rem, 11vh, 5.5rem)",
                            "line-height": "1",
                            "letter-spacing": "-0.04em",
                            "color": t.centerTimeColor,
                        }}
                    >
                        {timeStr()}
                    </span>
                    <span class="block text-xs uppercase tracking-[0.22em] mt-1.5" style={{ "color": t.labelColor }}>
                        {isDone() ? 'complete' : session()?.status === 'paused' ? 'paused' : 'remaining'}
                    </span>
                </div>

                {/* Gauge SVG */}
                <svg
                    viewBox="0 15 320 200"
                    style={{ "width": "clamp(260px, 58vw, 440px)", "height": "auto", "overflow": "visible" }}
                >
                    {/* Track */}
                    <path
                        d={gaugeTrackPath()}
                        fill="none"
                        stroke={t.arcTrackColor}
                        stroke-width="14"
                        stroke-linecap="round"
                    />
                    {/* Filled arc */}
                    <path
                        d={gaugeArcPath(1 - progress())}
                        fill="none"
                        stroke={isDone() ? t.arcColorDone : t.arcColor}
                        stroke-width="14"
                        stroke-linecap="round"
                        style={{ "transition": "d 1s linear" }}
                    />
                    {/* Tick marks */}
                    <For each={ticks}>
                        {(i) => {
                            const angle = G_START + i * (G_SWEEP / 10);
                            const inner = gaugePt(angle, G_R + 10);
                            const outer = gaugePt(angle, G_R + 22);
                            const isPrimary = i === 0 || i === 5 || i === 10;
                            return (
                                <line
                                    x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
                                    x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
                                    stroke="rgba(255,255,255,0.35)"
                                    stroke-width={isPrimary ? 2.5 : 1.5}
                                    stroke-linecap="round"
                                />
                            );
                        }}
                    </For>
                    {/* Needle */}
                    {(() => {
                        const needleAngle = G_START + (1 - progress()) * G_SWEEP;
                        const tip = gaugePt(needleAngle, G_R - 8);
                        const tail = gaugePt(needleAngle + 180, 18);
                        return (
                            <>
                                <line
                                    x1={tail.x.toFixed(2)} y1={tail.y.toFixed(2)}
                                    x2={tip.x.toFixed(2)} y2={tip.y.toFixed(2)}
                                    stroke={t.needleColor ?? '#fbbf24'}
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    style={{ "transition": "x2 1s linear, y2 1s linear" }}
                                />
                                <circle cx={G_CX} cy={G_CY} r="7"
                                    fill={t.needleColor ?? '#fbbf24'}
                                />
                            </>
                        );
                    })()}
                </svg>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // VISUAL RENDERER  ·  bignum  (Space / Terminal / Fire)
    // ═══════════════════════════════════════════════════════════════
    const BigNumVisual = () => {
        const t = theme();
        const tf = t.timeFont ?? {};

        return (
            <div class="relative flex flex-col items-center">
                {/* Stars (Space theme) */}
                <Show when={t.decorativeElement === 'stars'}>
                    <svg
                        class="absolute inset-0 w-full h-full pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ "position": "absolute", "width": "100vw", "height": "100vh", "left": "50%", "top": "50%", "transform": "translate(-50%, -50%)" }}
                    >
                        <For each={SPACE_STARS}>
                            {(s) => (
                                <circle
                                    cx={`${s.x}%`} cy={`${s.y}%`} r={s.r}
                                    fill="rgba(255,255,255,0.75)"
                                    style={s.twinkle
                                        ? { animation: `timerStarTwinkle ${2 + (s.x % 3)}s ease-in-out infinite`, "animation-delay": `${(s.y * 0.08).toFixed(1)}s` }
                                        : undefined}
                                />
                            )}
                        </For>
                    </svg>
                </Show>

                {/* Scanlines overlay (Terminal theme) */}
                <Show when={t.decorativeElement === 'scanlines'}>
                    <div
                        class="timer-scan-overlay"
                        style={{
                            "position": "absolute",
                            "inset": "-100vh -100vw",
                            "pointer-events": "none",
                            "z-index": "5",
                        }}
                    />
                </Show>

                {/* Giant time digits */}
                <span
                    class="tabular-nums relative"
                    style={{
                        "font-size": "clamp(5rem, 22vh, 13rem)",
                        "line-height": "0.9",
                        "font-family": tf.fontFamily ?? 'inherit',
                        "font-weight": tf.fontWeight ?? '900',
                        "letter-spacing": tf.letterSpacing ?? '-0.05em',
                        "color": t.centerTimeColor,
                        "text-shadow": tf.textShadow
                            ? tf.textShadow
                            : undefined,
                        "animation": t.id === 'terminal' ? 'timerPhosphor 8s steps(1) infinite' : undefined,
                        "z-index": "10",
                    }}
                >
                    {timeStr()}
                </span>

                {/* Status label */}
                <span
                    class="uppercase tracking-[0.20em] text-xs mt-3 relative"
                    style={{
                        "color": t.labelColor,
                        "font-family": tf.fontFamily ?? 'inherit',
                        "z-index": "10",
                    }}
                >
                    {isDone()
                        ? (t.id === 'terminal' ? '[ COMPLETE ]' : 'complete')
                        : session()?.status === 'paused'
                            ? (t.id === 'terminal' ? '[ PAUSED ]' : 'paused')
                            : (t.id === 'terminal' ? '[ RUNNING ]' : 'focus')}
                </span>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // VISUAL RENDERER  ·  waves  (Sunset — animated wave layers)
    // ═══════════════════════════════════════════════════════════════
    const WavesVisual = () => {
        const t = theme();

        return (
            <div class="relative flex flex-col items-center justify-center z-10">
                <span
                    class="font-bold tabular-nums"
                    style={{
                        "font-size": "clamp(4rem, 18vh, 10rem)",
                        "line-height": "0.9",
                        "letter-spacing": "-0.04em",
                        "color": t.centerTimeColor,
                        "text-shadow": "0 2px 24px rgba(0,0,0,0.25)",
                    }}
                >
                    {timeStr()}
                </span>
                <span class="text-sm uppercase tracking-[0.22em] mt-2 font-medium" style={{ "color": "rgba(255,255,255,0.70)" }}>
                    {isDone() ? 'complete' : session()?.status === 'paused' ? 'paused' : 'remaining'}
                </span>
                {/* Wave layers rendered here, behind via absolute parent wrapping */}
                <div
                    class="pointer-events-none"
                    style={{ "position": "absolute", "inset": "0 0 0 0", "z-index": "-1" }}
                />
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // VISUAL RENDERER  ·  zen  (breathing orb)
    // ═══════════════════════════════════════════════════════════════
    const ZenVisual = () => {
        const t = theme();
        const orbColors = t.zenOrbColors ?? ['#312e81', '#1e1b4b'];

        return (
            <div class="relative flex items-center justify-center">
                {/* Outer halo */}
                <div
                    class="absolute rounded-full"
                    style={{
                        "width": "clamp(260px, 52vh, 380px)",
                        "height": "clamp(260px, 52vh, 380px)",
                        "background": `radial-gradient(circle, ${arcColor()}1a 0%, ${arcColor()}06 55%, transparent 100%)`,
                        "animation": "timerZenPulse2 5s ease-in-out infinite",
                    }}
                />
                {/* Inner orb */}
                <div
                    class="absolute rounded-full"
                    style={{
                        "width": "clamp(180px, 36vh, 260px)",
                        "height": "clamp(180px, 36vh, 260px)",
                        "background": `radial-gradient(circle at 40% 38%, ${orbColors[0]} 0%, ${orbColors[1]} 60%, transparent 100%)`,
                        "animation": "timerZenPulse 4s ease-in-out infinite",
                        "box-shadow": `0 0 60px ${arcColor()}30, 0 0 120px ${arcColor()}14`,
                    }}
                />
                {/* Time overlay */}
                <div class="relative z-10 flex flex-col items-center">
                    <Show when={!isDone()}>
                        <span
                            class="tabular-nums font-light"
                            style={{
                                "font-size": "clamp(2.6rem, 11vh, 5.5rem)",
                                "letter-spacing": "0.06em",
                                "color": t.centerTimeColor,
                                "line-height": "1",
                            }}
                        >
                            {timeStr()}
                        </span>
                        <span class="text-xs uppercase tracking-[0.30em] mt-2" style={{ "color": t.labelColor }}>
                            {session()?.status === 'paused' ? 'paused' : 'breathe'}
                        </span>
                    </Show>
                    <Show when={isDone()}>
                        <span class="text-4xl mb-1" style={{ "color": t.arcColorDone }}>✦</span>
                        <span class="text-sm font-light tracking-[0.20em]" style={{ "color": t.arcColorDone }}>complete</span>
                    </Show>
                </div>
            </div>
        );
    };

    // ══════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════
    return (
        <Show when={session()}>

            {/* ════════════════════════════════════
                FULLSCREEN MODE
            ════════════════════════════════════ */}
            <Show when={fullscreen()}>
                <div
                    class="fixed inset-0 z-200 flex"
                    style={{
                        "background": theme().background,
                        "transition": "none",
                    }}
                >
                    {/* Ambient glow */}
                    <div
                        class="pointer-events-none absolute inset-0 transition-all duration-700"
                        style={{
                            "background": `radial-gradient(ellipse 55% 60% at 38% 50%, ${ambientColor()} 0%, transparent 70%)`,
                        }}
                    />

                    {/* Wave background layers (waves visual only) */}
                    <Show when={theme().visualStyle === 'waves'}>
                        <div class="pointer-events-none absolute inset-0 flex flex-col justify-end overflow-hidden">
                            {(() => {
                                const wc = theme().waveColors ?? ['rgba(150,50,0,0.4)', 'rgba(180,70,0,0.35)', 'rgba(220,100,20,0.28)'];
                                return (
                                    <>
                                        {/* Layer 1 - front (darkest) */}
                                        <svg viewBox="0 0 960 200" preserveAspectRatio="none"
                                            style={{ "position": "absolute", "bottom": "0", "width": "100%", "height": "clamp(120px, 28vh, 220px)", animation: 'timerWave1 7s ease-in-out infinite' }}>
                                            <path d="M 0 80 C 120 55, 240 110, 480 80 S 840 50, 960 80 L 960 200 L 0 200 Z" fill={wc[0]} />
                                        </svg>
                                        {/* Layer 2 - mid */}
                                        <svg viewBox="0 0 960 200" preserveAspectRatio="none"
                                            style={{ "position": "absolute", "bottom": "0", "width": "100%", "height": "clamp(90px, 22vh, 180px)", animation: 'timerWave2 9s ease-in-out infinite' }}>
                                            <path d="M 0 100 C 100 75, 220 125, 480 100 S 840 72, 960 100 L 960 200 L 0 200 Z" fill={wc[1]} />
                                        </svg>
                                        {/* Layer 3 - back (lightest) */}
                                        <svg viewBox="0 0 960 200" preserveAspectRatio="none"
                                            style={{ "position": "absolute", "bottom": "0", "width": "100%", "height": "clamp(65px, 16vh, 140px)", animation: 'timerWave3 6s ease-in-out infinite' }}>
                                            <path d="M 0 115 C 80 95, 200 135, 480 115 S 840 92, 960 115 L 960 200 L 0 200 Z" fill={wc[2]} />
                                        </svg>
                                    </>
                                );
                            })()}
                        </div>
                    </Show>

                    {/* ── Timer panel ── */}
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
                                    <span class="w-2.5 h-2.5 rounded-full shrink-0" style={{ "background-color": theme().preview }} />
                                    {theme().name}
                                </button>
                                {/* Minimize */}
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
                                {/* End */}
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
                                    "background": theme().id === 'minimal' || theme().visualStyle === 'waves'
                                        ? 'rgba(245,240,230,0.97)'
                                        : 'rgba(10,10,16,0.94)',
                                    "border": `1px solid ${isLight() ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
                                    "backdrop-filter": "blur(24px)",
                                    "min-width": "280px",
                                }}
                            >
                                <p
                                    class="text-[10px] font-bold uppercase tracking-[0.20em] mb-2.5 px-1"
                                    style={{ "color": isLight() ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.35)' }}
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
                                                        ? (isLight() ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.10)')
                                                        : 'transparent',
                                                    "border": `1.5px solid ${currentTimerThemeId() === t.id ? t.preview : 'transparent'}`,
                                                    "box-shadow": currentTimerThemeId() === t.id ? `0 0 8px ${t.preview}55` : 'none',
                                                }}
                                                title={t.name}
                                            >
                                                <span class="w-6 h-6 rounded-full shrink-0" style={{ "background-color": t.preview }} />
                                                <span
                                                    class="text-[9px] font-medium leading-tight text-center"
                                                    style={{ "color": isLight() ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.55)' }}
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
                        <div class="absolute inset-0 flex flex-col items-center justify-center px-8 gap-5">

                            {/* ── Visual switch ── */}
                            <Switch fallback={<RingVisual />}>
                                <Match when={theme().visualStyle === 'pie'}>
                                    <PieVisual />
                                </Match>
                                <Match when={theme().visualStyle === 'gauge'}>
                                    <GaugeVisual />
                                </Match>
                                <Match when={theme().visualStyle === 'bignum'}>
                                    <BigNumVisual />
                                </Match>
                                <Match when={theme().visualStyle === 'waves'}>
                                    <WavesVisual />
                                </Match>
                                <Match when={theme().visualStyle === 'zen'}>
                                    <ZenVisual />
                                </Match>
                            </Switch>

                            {/* Task info (common for all, except gauge which already shows time) */}
                            <div class="text-center">
                                <h2
                                    class="font-semibold max-w-sm mb-1"
                                    style={{
                                        "font-size": "clamp(0.95rem, 2.8vh, 1.4rem)",
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

                            {/* Action buttons */}
                            <ActionButtons />

                            {/* Keyboard hint */}
                            <p class="text-[11px] tracking-wide select-none" style={{ "color": theme().labelColor, "opacity": "0.30" }}>
                                Press F to minimize · Esc to close fullscreen
                            </p>

                        </div>
                    </div>

                    {/* ── Up Next panel ── */}
                    <div
                        class="w-72 flex flex-col py-8 px-10 overflow-y-auto shrink-0"
                        style={{
                            "border-left": `1px solid ${isLight() ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`,
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
                                <p class="text-sm text-center leading-relaxed" style={{ "color": theme().labelColor, "opacity": "0.40" }}>
                                    Nothing else<br />scheduled today
                                </p>
                            </div>
                        </Show>
                        <div class="space-y-1.5">
                            <For each={upcoming()}>
                                {(item) => {
                                    const isCurrent = item.id === session()?.taskId;
                                    const t2 = new Date(item.time);
                                    const hasTime = t2.getHours() !== 0 || t2.getMinutes() !== 0;
                                    return (
                                        <div
                                            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                                            style={{
                                                "background": isCurrent
                                                    ? `${theme().arcColor}18`
                                                    : (isLight() ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'),
                                                "border": `1px solid ${isCurrent
                                                    ? theme().arcColor
                                                    : (isLight() ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)')}`,
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
                                                        ? t2.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                                                        : item.type === 'task' ? item.priority : 'All day'}
                                                </p>
                                            </div>
                                            <Show when={isCurrent}>
                                                <span
                                                    class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                                                    style={{ "background": theme().arcColor, "color": "#fff" }}
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

            {/* ════════════════════════════════════
                MINI WIDGET (bottom-right)
            ════════════════════════════════════ */}
            <Show when={!fullscreen()}>
                <div
                    class="fixed bottom-6 right-6 z-50 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                        "background": theme().panelBg,
                        "border": `1px solid ${theme().arcColor}22`,
                        "width": "236px",
                        "backdrop-filter": "blur(16px)",
                        "-webkit-backdrop-filter": "blur(16px)",
                        "transition": "none",
                    }}
                >
                    {/* Progress bar */}
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
                        {/* Header */}
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[10px] font-bold uppercase tracking-widest" style={{ "color": theme().accentLabel }}>
                                Focus
                            </span>
                            <div class="flex items-center gap-1">
                                <button
                                    onClick={() => setFullscreen(true)}
                                    class="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                    style={{ "color": theme().labelColor }}
                                    title="Expand (F)"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                        <polyline points="15 3 21 3 21 9" />
                                        <polyline points="9 21 3 21 3 15" />
                                        <line x1="21" y1="3" x2="14" y2="10" />
                                        <line x1="3" y1="21" x2="10" y2="14" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleStop}
                                    class="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                                    style={{ "color": theme().labelColor }}
                                    title="End session"
                                >
                                    <XIcon class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Ring + info */}
                        <div class="flex items-center gap-4">
                            {/* Mini ring */}
                            <div class="relative shrink-0">
                                <svg width="72" height="72" viewBox="0 0 100 100" style={{ "transform": "rotate(-90deg)" }}>
                                    <circle cx="50" cy="50" r={MINI_R}
                                        fill="none" stroke={theme().arcTrackColor} stroke-width="8"
                                    />
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
                                            "filter": miniGlow() !== 'none' ? miniGlow() : undefined,
                                        }}
                                    />
                                </svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center">
                                    <Show when={!isDone()}>
                                <span class="text-base font-bold tabular-nums leading-none" style={{ "color": theme().titleColor }}>
                                            {timeStr()}
                                        </span>
                                    </Show>
                                    <Show when={isDone()}>
                                        <span class="text-xl" style={{ "color": theme().arcColorDone }}>✓</span>
                                    </Show>
                                </div>
                            </div>

                            {/* Info + control */}
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium leading-tight truncate mb-0.5" style={{ "color": theme().titleColor }}>
                                    {session()?.title}
                                </p>
                                <p class="text-[11px] mb-2.5" style={{ "color": theme().labelColor }}>
                                    {session()?.status === 'paused'
                                        ? 'Paused'
                                        : isDone()
                                            ? 'Done!'
                                            : `${Math.round((session()?.durationSecs ?? 0) / 60)} min`}
                                </p>
                                <Show when={!isDone()}>
                                    <button
                                        onClick={() => session()?.status === 'active' ? pauseFocus() : resumeFocus()}
                                        class="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{ "background-color": arcColor(), "color": "#ffffff" }}
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
                                        style={{ "background": theme().arcTrackColor, "color": theme().labelColor }}
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
