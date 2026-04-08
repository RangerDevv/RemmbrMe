import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';

const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Quick Add (task or event)', category: 'Global' },
    { keys: ['N'], description: 'New task', category: 'Global' },
    { keys: ['E'], description: 'New event', category: 'Global' },
    { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Global' },
    { keys: ['G', 'then', 'H'], description: 'Go to Dashboard', category: 'Navigation' },
    { keys: ['G', 'then', 'T'], description: 'Go to Tasks', category: 'Navigation' },
    { keys: ['G', 'then', 'C'], description: 'Go to Calendar', category: 'Navigation' },
    { keys: ['G', 'then', 'S'], description: 'Go to Schedule', category: 'Navigation' },
    { keys: ['G', 'then', 'A'], description: 'Go to AI Assistant', category: 'Navigation' },
    { keys: ['←'], description: 'Previous month/week', category: 'Calendar' },
    { keys: ['→'], description: 'Next month/week', category: 'Calendar' },
    { keys: ['T'], description: 'Go to today', category: 'Calendar' },
    { keys: ['M'], description: 'Switch to month view', category: 'Calendar' },
    { keys: ['W'], description: 'Switch to week view', category: 'Calendar' },
    { keys: ['Esc'], description: 'Close modal / cancel', category: 'Global' },
];

export default function KeyboardShortcuts() {
    const [showHelp, setShowHelp] = createSignal(false);
    let gPending = false;
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    function isInputFocused(): boolean {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        if ((el as HTMLElement).isContentEditable) return true;
        return false;
    }

    function navigate(path: string) {
        // Use location.assign to trigger SolidJS router
        window.location.hash = '';
        if (window.location.pathname !== path) {
            window.location.pathname = path;
        }
    }

    function navigateAndDispatch(path: string, eventName: string) {
        if (window.location.pathname === path) {
            document.dispatchEvent(new CustomEvent(eventName));
        } else {
            // Navigate first, then dispatch after page loads
            window.location.pathname = path;
            // The page's onMount will run; we queue the event for after mount
            setTimeout(() => document.dispatchEvent(new CustomEvent(eventName)), 300);
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        // Never intercept when typing in inputs
        if (isInputFocused()) {
            // Exception: Escape should still work
            if (e.key === 'Escape') {
                (document.activeElement as HTMLElement)?.blur();
            }
            return;
        }

        // Don't intercept if any modifier is held (except for Ctrl+K which is in QuickAdd)
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // ? — Show help
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
            e.preventDefault();
            setShowHelp(!showHelp());
            return;
        }

        // Escape — close help modal
        if (e.key === 'Escape') {
            if (showHelp()) {
                e.preventDefault();
                setShowHelp(false);
                return;
            }
            // Dispatch to pages to close their modals
            document.dispatchEvent(new CustomEvent('kb:escape'));
            return;
        }

        // G-prefix navigation (two-key combo like vim/GitHub)
        if (gPending) {
            gPending = false;
            if (gTimeout) clearTimeout(gTimeout);
            gTimeout = null;

            e.preventDefault();
            switch (e.key.toLowerCase()) {
                case 'h': navigate('/'); break;
                case 't': navigate('/todo'); break;
                case 'c': navigate('/calendar'); break;
                case 's': navigate('/schedule'); break;
                case 'a': navigate('/ai'); break;
            }
            return;
        }

        if (e.key === 'g') {
            gPending = true;
            gTimeout = setTimeout(() => { gPending = false; }, 800);
            return;
        }

        // N — New task
        if (e.key === 'n') {
            e.preventDefault();
            navigateAndDispatch('/todo', 'kb:new-task');
            return;
        }

        // E — New event
        if (e.key === 'e') {
            e.preventDefault();
            const calPath = window.location.pathname === '/schedule' ? '/schedule' : '/calendar';
            navigateAndDispatch(calPath, 'kb:new-event');
            return;
        }

        // Calendar shortcuts (only when on calendar/schedule page)
        const isCalendarPage = window.location.pathname === '/calendar' || window.location.pathname === '/schedule';
        if (!isCalendarPage) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('kb:calendar-prev'));
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('kb:calendar-next'));
            return;
        }
        if (e.key === 't') {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('kb:calendar-today'));
            return;
        }
        if (e.key === 'm') {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('kb:calendar-month'));
            return;
        }
        if (e.key === 'w') {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('kb:calendar-week'));
            return;
        }
    }

    onMount(() => {
        document.addEventListener('keydown', handleKeyDown);
        const handleShowHelp = () => setShowHelp(true);
        document.addEventListener('kb:show-help', handleShowHelp);
        onCleanup(() => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('kb:show-help', handleShowHelp);
            if (gTimeout) clearTimeout(gTimeout);
        });
    });

    const categories = () => {
        const cats: Record<string, typeof shortcuts> = {};
        for (const s of shortcuts) {
            if (!cats[s.category]) cats[s.category] = [];
            cats[s.category].push(s);
        }
        return cats;
    };

    return (
        <Show when={showHelp()}>
            <div 
                class="fixed inset-0 z-[100] flex items-center justify-center"
                style={{ "background-color": "rgba(0,0,0,0.6)", "backdrop-filter": "blur(4px)" }}
                onClick={() => setShowHelp(false)}
            >
                <div 
                    class="rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
                    style={{ "background-color": "var(--color-bg-secondary)", "border": "1px solid var(--color-border)" }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold" style={{ "color": "var(--color-text)" }}>Keyboard Shortcuts</h2>
                        <button 
                            onClick={() => setShowHelp(false)}
                            class="text-2xl transition-colors duration-200"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            ×
                        </button>
                    </div>
                    <For each={Object.entries(categories())}>
                        {([category, items]) => (
                            <div class="mb-5">
                                <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" style={{ "color": "var(--color-text-muted)" }}>
                                    {category}
                                </h3>
                                <div class="space-y-2">
                                    <For each={items}>
                                        {(shortcut) => (
                                            <div class="flex items-center justify-between py-1.5">
                                                <span class="text-sm" style={{ "color": "var(--color-text-secondary)" }}>
                                                    {shortcut.description}
                                                </span>
                                                <div class="flex items-center gap-1">
                                                    <For each={shortcut.keys}>
                                                        {(key) => (
                                                            key === 'then' 
                                                                ? <span class="text-xs px-1" style={{ "color": "var(--color-text-muted)" }}>then</span>
                                                                : <kbd 
                                                                    class="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-xs font-mono font-medium"
                                                                    style={{ 
                                                                        "background-color": "var(--color-bg-tertiary)", 
                                                                        "color": "var(--color-text)", 
                                                                        "border": "1px solid var(--color-border)",
                                                                        "box-shadow": "0 1px 0 var(--color-border)"
                                                                    }}
                                                                >
                                                                    {key}
                                                                </kbd>
                                                        )}
                                                    </For>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        )}
                    </For>
                    <div class="pt-4 text-center" style={{ "border-top": "1px solid var(--color-border)" }}>
                        <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                            Press <kbd class="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-xs font-mono" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text)" }}>?</kbd> to toggle this dialog
                        </span>
                    </div>
                </div>
            </div>
        </Show>
    );
}
