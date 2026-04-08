import { createSignal, For, Show, onCleanup } from "solid-js";
import { bk } from "../lib/backend";
import { currentUser } from "../lib/backend";

interface TagSelectorProps {
    allTags: () => any[];
    selectedTags: () => string[];
    setSelectedTags: (tags: string[]) => void;
    onTagCreated?: () => void;
}

const TAG_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#6366f1', '#a855f7', '#f43f5e', '#84cc16'
];

export default function TagSelector(props: TagSelectorProps) {
    const [isOpen, setIsOpen] = createSignal(false);
    const [search, setSearch] = createSignal('');
    const [isCreating, setIsCreating] = createSignal(false);
    const [newTagColor, setNewTagColor] = createSignal('#3b82f6');
    let containerRef: HTMLDivElement | undefined;

    const filteredTags = () => {
        const q = search().toLowerCase();
        if (!q) return props.allTags();
        return props.allTags().filter((t: any) => t.name.toLowerCase().includes(q));
    };

    const canCreateNew = () => {
        const q = search().trim();
        if (!q) return false;
        return !props.allTags().some((t: any) => t.name.toLowerCase() === q.toLowerCase());
    };

    function toggleTag(tagId: string) {
        if (props.selectedTags().includes(tagId)) {
            props.setSelectedTags(props.selectedTags().filter(id => id !== tagId));
        } else {
            props.setSelectedTags([...props.selectedTags(), tagId]);
        }
    }

    async function createTag() {
        const name = search().trim();
        if (!name) return;
        try {
            const record = await bk.collection('Tags').create({
                name,
                color: newTagColor(),
                user: currentUser()?.id
            });
            props.setSelectedTags([...props.selectedTags(), record.id]);
            props.onTagCreated?.();
            setSearch('');
            setIsCreating(false);
        } catch (error) {
            console.error('Error creating tag:', error);
        }
    }

    async function deleteTag(tagId: string, e: MouseEvent) {
        e.stopPropagation();
        try {
            await bk.collection('Tags').delete(tagId);
            props.setSelectedTags(props.selectedTags().filter(id => id !== tagId));
            props.onTagCreated?.();
        } catch (error) {
            console.error('Error deleting tag:', error);
        }
    }

    // Close dropdown when clicking outside
    function handleClickOutside(e: MouseEvent) {
        if (containerRef && !containerRef.contains(e.target as Node)) {
            setIsOpen(false);
            setIsCreating(false);
            setSearch('');
        }
    }

    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));

    const selectedTagObjects = () => props.allTags().filter((t: any) => props.selectedTags().includes(t.id));

    return (
        <div ref={containerRef} class="relative">
            <label class="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Tags</label>

            {/* Selected tags display / trigger */}
            <div
                class="flex flex-wrap gap-1.5 p-2 rounded-lg min-h-[38px] cursor-pointer transition-colors duration-200 items-center"
                style={{
                    "background-color": "var(--color-bg-tertiary)",
                    "border": `1px solid ${isOpen() ? "var(--color-accent)" : "var(--color-border)"}`,
                }}
                onClick={() => setIsOpen(!isOpen())}
            >
                <For each={selectedTagObjects()}>
                    {(tag) => (
                        <span
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{
                                "background-color": `${tag.color}90`,
                                "border": `1px solid ${tag.color}`,
                            }}
                        >
                            <div class="w-1.5 h-1.5 rounded-full" style={{ "background-color": tag.color }} />
                            {tag.name}
                            <button
                                type="button"
                                class="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTag(tag.id);
                                }}
                            >
                                ×
                            </button>
                        </span>
                    )}
                </For>
                <Show when={selectedTagObjects().length === 0}>
                    <span class="text-xs" style={{ color: "var(--color-text-muted)" }}>Select or create tags...</span>
                </Show>
                <div class="ml-auto flex items-center">
                    <svg class="w-3.5 h-3.5 transition-transform duration-200" style={{
                        color: "var(--color-text-muted)",
                        transform: isOpen() ? "rotate(180deg)" : "rotate(0deg)"
                    }} viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>

            {/* Dropdown */}
            <Show when={isOpen()}>
                <div
                    class="absolute z-50 left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden"
                    style={{
                        "background-color": "var(--color-surface)",
                        "border": "1px solid var(--color-border)",
                        "backdrop-filter": "blur(20px)",
                    }}
                >
                    {/* Search input */}
                    <div class="p-2" style={{ "border-bottom": "1px solid var(--color-border)" }}>
                        <input
                            type="text"
                            value={search()}
                            onInput={(e) => {
                                setSearch(e.currentTarget.value);
                                setIsCreating(false);
                            }}
                            placeholder="Search or create tag..."
                            class="w-full rounded-md px-3 py-1.5 text-sm focus:outline-none"
                            style={{
                                "background-color": "var(--color-bg-tertiary)",
                                "color": "var(--color-text)",
                                "border": "1px solid var(--color-border)",
                            }}
                            autofocus
                        />
                    </div>

                    {/* Tag list */}
                    <div class="max-h-48 overflow-y-auto p-1">
                        <For each={filteredTags()}>
                            {(tag) => (
                                <div
                                    class="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors duration-150 group"
                                    style={{
                                        "background-color": props.selectedTags().includes(tag.id) ? "var(--color-accent-muted)" : "transparent",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!props.selectedTags().includes(tag.id))
                                            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = props.selectedTags().includes(tag.id) ? "var(--color-accent-muted)" : "transparent";
                                    }}
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    <div class="w-3 h-3 rounded-full flex-shrink-0" style={{ "background-color": tag.color }} />
                                    <span class="text-sm flex-1 truncate" style={{ color: "var(--color-text)" }}>{tag.name}</span>
                                    <Show when={props.selectedTags().includes(tag.id)}>
                                        <svg class="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-accent)" }} viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                        </svg>
                                    </Show>
                                    <button
                                        type="button"
                                        class="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded"
                                        style={{ color: "var(--color-danger)" }}
                                        onClick={(e) => deleteTag(tag.id, e)}
                                        title="Delete tag"
                                    >
                                        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </For>

                        <Show when={filteredTags().length === 0 && !canCreateNew()}>
                            <div class="px-3 py-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                                No tags yet. Type to create one.
                            </div>
                        </Show>
                    </div>

                    {/* Create new tag */}
                    <Show when={canCreateNew()}>
                        <div style={{ "border-top": "1px solid var(--color-border)" }}>
                            <Show when={!isCreating()}>
                                <button
                                    type="button"
                                    class="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors duration-150"
                                    style={{ color: "var(--color-accent)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    onClick={() => setIsCreating(true)}
                                >
                                    <span class="text-base">+</span>
                                    Create "{search().trim()}"
                                </button>
                            </Show>
                            <Show when={isCreating()}>
                                <div class="p-3 space-y-2">
                                    <div class="flex items-center gap-2">
                                        <div class="w-4 h-4 rounded-full flex-shrink-0" style={{ "background-color": newTagColor() }} />
                                        <span class="text-sm font-medium" style={{ color: "var(--color-text)" }}>{search().trim()}</span>
                                    </div>
                                    <div class="flex gap-1.5 flex-wrap">
                                        <For each={TAG_COLORS}>
                                            {(color) => (
                                                <button
                                                    type="button"
                                                    class="w-6 h-6 rounded-full transition-all duration-150"
                                                    style={{
                                                        "background-color": color,
                                                        "border": newTagColor() === color ? "2px solid white" : "2px solid transparent",
                                                        "transform": newTagColor() === color ? "scale(1.2)" : "scale(1)",
                                                    }}
                                                    onClick={() => setNewTagColor(color)}
                                                />
                                            )}
                                        </For>
                                    </div>
                                    <button
                                        type="button"
                                        class="w-full text-sm font-medium py-1.5 rounded-md transition-colors duration-150"
                                        style={{
                                            "background-color": "var(--color-accent)",
                                            "color": "var(--color-accent-text)",
                                        }}
                                        onClick={createTag}
                                    >
                                        Create Tag
                                    </button>
                                </div>
                            </Show>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
