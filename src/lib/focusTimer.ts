import { createSignal } from 'solid-js';

export interface FocusSession {
    taskId: string;
    title: string;
    durationSecs: number;
    elapsedSecs: number;
    status: 'active' | 'paused' | 'done';
    type: 'task' | 'event';
}

export const [focusSession, setFocusSession] = createSignal<FocusSession | null>(null);

let timerInterval: ReturnType<typeof setInterval> | null = null;

export function startFocus(taskId: string, title: string, durationMins: number, type: 'task' | 'event' = 'task') {
    stopFocus();
    const mins = durationMins > 0 ? durationMins : 25;
    setFocusSession({
        taskId,
        title,
        durationSecs: mins * 60,
        elapsedSecs: 0,
        status: 'active',
        type,
    });
    timerInterval = setInterval(() => {
        setFocusSession(prev => {
            if (!prev || prev.status !== 'active') return prev;
            const next = prev.elapsedSecs + 1;
            if (next >= prev.durationSecs) {
                clearInterval(timerInterval!);
                timerInterval = null;
                return { ...prev, elapsedSecs: prev.durationSecs, status: 'done' };
            }
            return { ...prev, elapsedSecs: next };
        });
    }, 1000);
}

export function pauseFocus() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    setFocusSession(prev => prev ? { ...prev, status: 'paused' } : null);
}

export function resumeFocus() {
    const s = focusSession();
    if (!s || s.status === 'done') return;
    setFocusSession(prev => prev ? { ...prev, status: 'active' } : null);
    timerInterval = setInterval(() => {
        setFocusSession(prev => {
            if (!prev || prev.status !== 'active') return prev;
            const next = prev.elapsedSecs + 1;
            if (next >= prev.durationSecs) {
                clearInterval(timerInterval!);
                timerInterval = null;
                return { ...prev, elapsedSecs: prev.durationSecs, status: 'done' };
            }
            return { ...prev, elapsedSecs: next };
        });
    }, 1000);
}

export function stopFocus() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    setFocusSession(null);
}
