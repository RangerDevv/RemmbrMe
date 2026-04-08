import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    class?: string;
    style?: Record<string, string>;
}

export default function CustomSelect(props: CustomSelectProps) {
    const [open, setOpen] = createSignal(false);
    const [focusedIndex, setFocusedIndex] = createSignal(-1);
    let containerRef: HTMLDivElement | undefined;
    let listRef: HTMLDivElement | undefined;

    function selectedLabel() {
        const opt = props.options.find(o => o.value === props.value);
        return opt ? opt.label : props.value;
    }

    function handleClickOutside(e: MouseEvent) {
        if (containerRef && !containerRef.contains(e.target as Node)) {
            setOpen(false);
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (!open()) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setFocusedIndex(props.options.findIndex(o => o.value === props.value));
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(i => Math.min(i + 1, props.options.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (focusedIndex() >= 0) {
                    props.onChange(props.options[focusedIndex()].value);
                    setOpen(false);
                }
                break;
        }
    }

    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside);
    });

    onCleanup(() => {
        document.removeEventListener('mousedown', handleClickOutside);
    });

    return (
        <div ref={containerRef} class={`relative ${props.class || ''}`} style={props.style}>
            <button
                type="button"
                onClick={() => {
                    setOpen(!open());
                    if (!open()) {
                        setFocusedIndex(props.options.findIndex(o => o.value === props.value));
                    }
                }}
                onKeyDown={handleKeyDown}
                class="w-full rounded-lg px-3 py-2 text-sm cursor-pointer text-left focus:outline-none transition-all duration-200 flex items-center justify-between"
                style={{
                    "background-color": "var(--color-bg-tertiary)",
                    "color": "var(--color-text)",
                    "border": open() ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                }}
            >
                <span class="truncate">{selectedLabel()}</span>
                <svg
                    class="w-3.5 h-3.5 ml-2 shrink-0 transition-transform duration-200"
                    style={{
                        "color": "var(--color-text-muted)",
                        "transform": open() ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            <Show when={open()}>
                <div
                    ref={listRef}
                    class="absolute z-50 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
                    style={{
                        "background-color": "var(--color-surface)",
                        "border": "1px solid var(--color-border)",
                        "backdrop-filter": "blur(20px)",
                        "-webkit-backdrop-filter": "blur(20px)",
                    }}
                >
                    <div class="py-1 max-h-48 overflow-y-auto">
                        <For each={props.options}>
                            {(option, index) => (
                                <button
                                    type="button"
                                    onClick={() => {
                                        props.onChange(option.value);
                                        setOpen(false);
                                    }}
                                    onMouseEnter={() => setFocusedIndex(index())}
                                    class="w-full text-left px-3 py-2 text-sm transition-colors duration-100 flex items-center justify-between"
                                    style={{
                                        "background-color": focusedIndex() === index()
                                            ? "var(--color-surface-hover)"
                                            : "transparent",
                                        "color": props.value === option.value
                                            ? "var(--color-accent)"
                                            : "var(--color-text)",
                                    }}
                                >
                                    <span>{option.label}</span>
                                    <Show when={props.value === option.value}>
                                        <svg class="w-3.5 h-3.5 shrink-0" style={{ "color": "var(--color-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </Show>
                                </button>
                            )}
                        </For>
                    </div>
                </div>
            </Show>
        </div>
    );
}
