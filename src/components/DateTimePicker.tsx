import { createSignal, createMemo, onMount, onCleanup, For, Show } from 'solid-js';

// ─── Types ─────────────────────────────────────────────────────────
export interface DateTimePickerProps {
    /** YYYY-MM-DD */
    date: string;
    /** HH:mm (24-h) — omit or "" to hide time */
    time?: string;
    onDateChange: (date: string) => void;
    onTimeChange?: (time: string) => void;
    /** Show time input? (default: true if onTimeChange provided) */
    showTime?: boolean;
    label?: string;
    required?: boolean;
    /** Earliest selectable date (YYYY-MM-DD) */
    minDate?: string;
    /** Earliest selectable time (HH:mm) — only enforced when date === minDate */
    minTime?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function pad2(n: number) { return String(n).padStart(2, '0'); }
function toYMD(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function parseYMD(s: string) {
    const p = s.split('-').map(Number);
    return { y: p[0], m: p[1] - 1, d: p[2] };
}
function isToday(y: number, m: number, d: number) {
    const t = new Date();
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
}

function formatDisplay(date: string, time?: string) {
    if (!date) return 'Pick a date';
    const { y, m, d } = parseYMD(date);
    const dayName = new Date(y, m, d).toLocaleDateString('en-US', { weekday: 'short' });
    let s = `${dayName}, ${MONTHS[m]} ${d}, ${y}`;
    if (time) s += ` · ${formatTimeTo12h(time)}`;
    return s;
}

// Generate hours array in 12h format (5-min increments)
const HOURS_12 = (() => {
    const hrs: { label: string; value: string }[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 5) {
            const ampm = h < 12 ? 'AM' : 'PM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const label = `${h12}:${pad2(m)} ${ampm}`;
            const value = `${pad2(h)}:${pad2(m)}`;
            hrs.push({ label, value });
        }
    }
    return hrs;
})();

function formatTimeTo12h(time24: string): string {
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return time24;
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${pad2(m)} ${ampm}`;
}

function parse12hTo24h(input: string): string | null {
    const trimmed = input.trim();
    // Try 24h format first: HH:MM
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const h = parseInt(match24[1], 10);
        const m = parseInt(match24[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return `${pad2(h)}:${pad2(m)}`;
    }
    // Try 12h format: H:MM AM/PM or H AM/PM
    const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)$/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        const m = match12[2] ? parseInt(match12[2], 10) : 0;
        const isPM = /^p/i.test(match12[3]);
        if (h < 1 || h > 12 || m < 0 || m > 59) return null;
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        return `${pad2(h)}:${pad2(m)}`;
    }
    return null;
}

// ─── Component ─────────────────────────────────────────────────────
export default function DateTimePicker(props: DateTimePickerProps) {
    const [open, setOpen] = createSignal(false);
    const [view, setView] = createSignal<'calendar' | 'year' | 'time'>('calendar');
    const [customTimeInput, setCustomTimeInput] = createSignal('');
    const [customTimeError, setCustomTimeError] = createSignal(false);
    const showTime = () => props.showTime !== false && !!props.onTimeChange;

    // Calendar navigation state
    const parsed = createMemo(() => {
        if (props.date) return parseYMD(props.date);
        const t = new Date();
        return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
    });
    const [navYear, setNavYear] = createSignal(parsed().y);
    const [navMonth, setNavMonth] = createSignal(parsed().m);

    // Time scroll ref
    let timeListRef: HTMLDivElement | undefined;
    let containerRef: HTMLDivElement | undefined;

    // Sync nav when date prop changes
    createMemo(() => {
        if (props.date) {
            const p = parseYMD(props.date);
            setNavYear(p.y);
            setNavMonth(p.m);
        }
    });

    // Click outside handler
    function handleClickOutside(e: MouseEvent) {
        if (containerRef && !containerRef.contains(e.target as Node)) {
            setOpen(false);
            setView('calendar');
        }
    }
    onMount(() => document.addEventListener('mousedown', handleClickOutside));
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));

    // Nav helpers
    function prevMonth() {
        if (navMonth() === 0) { setNavMonth(11); setNavYear(y => y - 1); }
        else setNavMonth(m => m - 1);
    }
    function nextMonth() {
        if (navMonth() === 11) { setNavMonth(0); setNavYear(y => y + 1); }
        else setNavMonth(m => m + 1);
    }
    function goToday() {
        const t = new Date();
        setNavYear(t.getFullYear());
        setNavMonth(t.getMonth());
        selectDay(t.getDate());
    }

    // Check if a given calendar day is before minDate
    function isDayDisabled(y: number, m: number, d: number): boolean {
        if (!props.minDate) return false;
        return toYMD(y, m, d) < props.minDate;
    }

    // Check if currently on the same date as minDate (for time filtering)
    const isOnMinDate = createMemo(() => {
        if (!props.minDate || !props.date) return false;
        return props.date === props.minDate;
    });

    function selectDay(d: number) {
        const ymd = toYMD(navYear(), navMonth(), d);
        if (isDayDisabled(navYear(), navMonth(), d)) return;
        props.onDateChange(ymd);
        // If we moved to minDate and our current time is before minTime, bump it
        if (props.minTime && props.minDate === ymd && props.time && props.time < props.minTime) {
            props.onTimeChange?.(props.minTime);
        }
        if (!showTime()) {
            setOpen(false);
            setView('calendar');
        }
    }

    function isTimeDisabled(value: string): boolean {
        if (!isOnMinDate() || !props.minTime) return false;
        return value < props.minTime;
    }

    function selectTime(value: string) {
        if (isTimeDisabled(value)) return;
        props.onTimeChange?.(value);
        setOpen(false);
        setView('calendar');
    }

    function openTimePicker() {
        setView('time');
        setCustomTimeInput(props.time ? formatTimeTo12h(props.time) : '');
        setCustomTimeError(false);
        // Scroll to current time
        requestAnimationFrame(() => {
            if (timeListRef) {
                const cur = props.time || '09:00';
                const idx = HOURS_12.findIndex(h => h.value === cur);
                if (idx > 0) {
                    const el = timeListRef.children[idx] as HTMLElement;
                    el?.scrollIntoView({ block: 'center' });
                }
            }
        });
    }

    function handleCustomTimeSubmit() {
        const parsed = parse12hTo24h(customTimeInput());
        if (parsed) {
            if (isTimeDisabled(parsed)) {
                setCustomTimeError(true);
                return;
            }
            selectTime(parsed);
            setCustomTimeError(false);
        } else {
            setCustomTimeError(true);
        }
    }

    // Build calendar grid
    const calendarDays = createMemo(() => {
        const y = navYear(), m = navMonth();
        const totalDays = daysInMonth(y, m);
        const startDay = firstDayOfMonth(y, m);
        const prevMonthDays = daysInMonth(y, m === 0 ? 11 : m - 1, );

        const cells: { day: number; current: boolean; disabled?: boolean }[] = [];

        // Previous month trailing days
        for (let i = startDay - 1; i >= 0; i--) {
            cells.push({ day: prevMonthDays - i, current: false });
        }
        // Current month
        for (let d = 1; d <= totalDays; d++) {
            cells.push({ day: d, current: true });
        }
        // Next month leading days (fill to 42 = 6 rows)
        const remaining = 42 - cells.length;
        for (let d = 1; d <= remaining; d++) {
            cells.push({ day: d, current: false });
        }
        return cells;
    });

    const selectedDay = createMemo(() => {
        if (!props.date) return -1;
        const p = parseYMD(props.date);
        if (p.y === navYear() && p.m === navMonth()) return p.d;
        return -1;
    });

    // Year picker grid
    const yearRange = createMemo(() => {
        const center = navYear();
        const start = center - 6;
        return Array.from({ length: 12 }, (_, i) => start + i);
    });

    return (
        <div class="relative" ref={containerRef!}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => {
                    setOpen(v => !v);
                    if (!open()) setView('calendar');
                }}
                class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-all duration-150 cursor-pointer"
                style={{
                    "background-color": "var(--color-bg-tertiary)",
                    "color": props.date ? "var(--color-text)" : "var(--color-text-muted)",
                    "border": `1px solid ${open() ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
            >
                {/* Calendar icon */}
                <svg class="w-4 h-4 shrink-0" style={{ "color": "var(--color-accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span class="flex-1 truncate">{formatDisplay(props.date, showTime() ? props.time : undefined)}</span>
                {/* Chevron */}
                <svg class="w-3.5 h-3.5 shrink-0 transition-transform" style={{ "color": "var(--color-text-muted)", "transform": open() ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Dropdown */}
            <Show when={open()}>
                <div
                    class="absolute z-50 mt-1.5 rounded-xl shadow-2xl overflow-hidden"
                    style={{
                        "background": "var(--color-bg-secondary)",
                        "border": "1px solid var(--color-border-hover)",
                        "width": "296px",
                        "backdrop-filter": "blur(24px)",
                        "-webkit-backdrop-filter": "blur(24px)",
                    }}
                >
                    {/* ═══ Calendar View ═══ */}
                    <Show when={view() === 'calendar'}>
                        {/* Header: month/year + nav arrows */}
                        <div class="flex items-center justify-between px-3.5 pt-3 pb-1.5">
                            <button
                                type="button"
                                onClick={prevMonth}
                                class="p-1.5 rounded-lg transition-colors hover:opacity-70"
                                style={{ "color": "var(--color-text-secondary)" }}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('year')}
                                class="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
                                style={{ "color": "var(--color-text)" }}
                            >
                                {MONTHS_FULL[navMonth()]} {navYear()}
                                <svg class="w-3 h-3" style={{ "color": "var(--color-text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                onClick={nextMonth}
                                class="p-1.5 rounded-lg transition-colors hover:opacity-70"
                                style={{ "color": "var(--color-text-secondary)" }}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>

                        {/* Weekday headers */}
                        <div class="grid grid-cols-7 px-3 mb-0.5">
                            <For each={WEEKDAYS}>
                                {(wd) => (
                                    <div class="text-center text-[10px] font-semibold py-1 uppercase tracking-wider" style={{ "color": "var(--color-text-muted)" }}>
                                        {wd}
                                    </div>
                                )}
                            </For>
                        </div>

                        {/* Day grid */}
                        <div class="grid grid-cols-7 px-2.5 pb-2">
                            <For each={calendarDays()}>
                                {(cell) => {
                                    const isSelected = () => cell.current && cell.day === selectedDay();
                                    const today = cell.current && isToday(navYear(), navMonth(), cell.day);
                                    const disabled = !cell.current || isDayDisabled(navYear(), navMonth(), cell.day);
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => !disabled && selectDay(cell.day)}
                                            class="relative w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-all duration-150"
                                            style={{
                                                "color": disabled
                                                    ? "var(--color-text-muted)"
                                                    : isSelected()
                                                        ? "var(--color-accent-text)"
                                                        : "var(--color-text)",
                                                "opacity": disabled ? "0.3" : "1",
                                                "background": isSelected()
                                                    ? "var(--color-accent)"
                                                    : today
                                                        ? "var(--color-accent-muted)"
                                                        : "transparent",
                                                "font-weight": today || isSelected() ? "700" : "500",
                                                "cursor": disabled ? "default" : "pointer",
                                                "text-decoration": disabled && cell.current ? "line-through" : "none",
                                            }}
                                            disabled={disabled}
                                        >
                                            {cell.day}
                                            {/* Today dot */}
                                            <Show when={today && !isSelected}>
                                                <span
                                                    class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                                                    style={{ "background": "var(--color-accent)" }}
                                                />
                                            </Show>
                                        </button>
                                    );
                                }}
                            </For>
                        </div>

                        {/* Footer: Today button + time toggle */}
                        <div
                            class="flex items-center justify-between px-3.5 py-2.5"
                            style={{ "border-top": "1px solid var(--color-border)" }}
                        >
                            <button
                                type="button"
                                onClick={goToday}
                                class="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                                style={{ "color": "var(--color-accent)", "background": "var(--color-accent-muted)" }}
                            >
                                Today
                            </button>

                            <Show when={showTime()}>
                                <button
                                    type="button"
                                    onClick={openTimePicker}
                                    class="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                                    style={{ "color": "var(--color-accent)", "background": "var(--color-accent-muted)" }}
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    {props.time ? formatTimeTo12h(props.time) : 'Set time'}
                                </button>
                            </Show>
                        </div>
                    </Show>

                    {/* ═══ Year/Month View ═══ */}
                    <Show when={view() === 'year'}>
                        <div class="p-3">
                            {/* Year nav */}
                            <div class="flex items-center justify-between mb-3">
                                <button type="button" onClick={() => setNavYear(y => y - 12)} class="p-1 rounded-lg hover:opacity-70" style={{ "color": "var(--color-text-secondary)" }}>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
                                </button>
                                <span class="text-xs font-semibold" style={{ "color": "var(--color-text-muted)" }}>
                                    {yearRange()[0]}–{yearRange()[yearRange().length - 1]}
                                </span>
                                <button type="button" onClick={() => setNavYear(y => y + 12)} class="p-1 rounded-lg hover:opacity-70" style={{ "color": "var(--color-text-secondary)" }}>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
                                </button>
                            </div>
                            {/* Year grid */}
                            <div class="grid grid-cols-4 gap-1 mb-3">
                                <For each={yearRange()}>
                                    {(yr) => {
                                        const isCurrent = yr === navYear();
                                        const isThisYear = yr === new Date().getFullYear();
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => setNavYear(yr)}
                                                class="py-1.5 rounded-lg text-xs font-medium transition-all"
                                                style={{
                                                    "background": isCurrent ? "var(--color-accent)" : isThisYear ? "var(--color-accent-muted)" : "transparent",
                                                    "color": isCurrent ? "var(--color-accent-text)" : "var(--color-text)",
                                                    "font-weight": isCurrent || isThisYear ? "700" : "500",
                                                }}
                                            >
                                                {yr}
                                            </button>
                                        );
                                    }}
                                </For>
                            </div>
                            {/* Month grid */}
                            <div class="grid grid-cols-4 gap-1">
                                <For each={MONTHS}>
                                    {(mn, idx) => {
                                        const isCurrent = idx() === navMonth() && navYear() === (props.date ? parseYMD(props.date).y : new Date().getFullYear());
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => { setNavMonth(idx()); setView('calendar'); }}
                                                class="py-1.5 rounded-lg text-xs font-medium transition-all"
                                                style={{
                                                    "background": isCurrent ? "var(--color-accent)" : "transparent",
                                                    "color": isCurrent ? "var(--color-accent-text)" : "var(--color-text)",
                                                    "font-weight": isCurrent ? "700" : "500",
                                                }}
                                            >
                                                {mn}
                                            </button>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </Show>

                    {/* ═══ Time Picker View ═══ */}
                    <Show when={view() === 'time'}>
                        <div class="p-3">
                            <div class="flex items-center justify-between mb-2">
                                <button
                                    type="button"
                                    onClick={() => setView('calendar')}
                                    class="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
                                    style={{ "color": "var(--color-accent)" }}
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                    Calendar
                                </button>
                                <span class="text-xs font-semibold" style={{ "color": "var(--color-text-muted)" }}>Select Time</span>
                            </div>
                            {/* Custom time input */}
                            <div class="flex gap-1.5 mb-2">
                                <input
                                    type="text"
                                    value={customTimeInput()}
                                    onInput={(e) => { setCustomTimeInput(e.currentTarget.value); setCustomTimeError(false); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomTimeSubmit(); } }}
                                    placeholder="e.g. 2:30 PM"
                                    class="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none transition-colors duration-150"
                                    style={{
                                        "background": "var(--color-bg-tertiary)",
                                        "color": "var(--color-text)",
                                        "border": `1px solid ${customTimeError() ? '#ef4444' : 'var(--color-border)'}`,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleCustomTimeSubmit}
                                    class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                                    style={{ "background": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                                >
                                    Set
                                </button>
                            </div>
                            <div
                                ref={timeListRef!}
                                class="overflow-y-auto rounded-lg"
                                style={{ "max-height": "210px", "background": "var(--color-bg-tertiary)" }}
                            >
                                <For each={HOURS_12}>
                                    {(slot) => {
                                        const isActive = props.time === slot.value;
                                        const disabled = isTimeDisabled(slot.value);
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => !disabled && selectTime(slot.value)}
                                                class="w-full text-left px-3.5 py-2 text-sm transition-all"
                                                style={{
                                                    "background": isActive ? "var(--color-accent)" : "transparent",
                                                    "color": disabled ? "var(--color-text-muted)" : isActive ? "var(--color-accent-text)" : "var(--color-text)",
                                                    "font-weight": isActive ? "600" : "400",
                                                    "opacity": disabled ? "0.35" : "1",
                                                    "cursor": disabled ? "not-allowed" : "pointer",
                                                    "text-decoration": disabled ? "line-through" : "none",
                                                }}
                                                disabled={disabled}
                                            >
                                                {slot.label}
                                            </button>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

// ─── Date-only variant (simpler trigger) ───────────────────────────
export function DatePicker(props: {
    date: string;
    onDateChange: (date: string) => void;
    label?: string;
    required?: boolean;
}) {
    return (
        <DateTimePicker
            date={props.date}
            onDateChange={props.onDateChange}
            showTime={false}
            label={props.label}
            required={props.required}
        />
    );
}
