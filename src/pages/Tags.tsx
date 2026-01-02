import { createSignal, onMount, For, Show } from 'solid-js';
import { bk, currentUser } from '../lib/backend.ts';

function Tags() {
    const [tags, setTags] = createSignal([] as any[]);
    const [tagName, setTagName] = createSignal('');
    const [tagColor, setTagColor] = createSignal('#3b82f6');
    const [editingTag, setEditingTag] = createSignal<any>(null);

    const colorPresets = [
        '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
        '#f97316', '#eab308', '#22c55e', '#06b6d4',
        '#6366f1', '#a855f7', '#f43f5e', '#84cc16'
    ];

    async function fetchTags() {
        const records = await bk.collection('Tags').getFullList({
            sort: 'created',
            filter: `user = "${currentUser()?.id}"`
        });
        setTags(records);
    }

    async function createTag() {
        if (!tagName().trim()) return;

        await bk.collection('Tags').create({
            name: tagName(),
            color: tagColor(),
            user: currentUser()?.id
        });

        setTagName('');
        setTagColor('#3b82f6');
        fetchTags();
    }

    async function updateTag() {
        if (!editingTag() || !tagName().trim()) return;

        await bk.collection('Tags').update(editingTag().id, {
            name: tagName(),
            color: tagColor()
        });

        setEditingTag(null);
        setTagName('');
        setTagColor('#3b82f6');
        fetchTags();
    }

    async function deleteTag(id: string) {
        if (confirm('Delete this tag? It will be removed from all tasks and events.')) {
            await bk.collection('Tags').delete(id);
            fetchTags();
        }
    }

    function startEditing(tag: any) {
        setEditingTag(tag);
        setTagName(tag.name);
        setTagColor(tag.color);
    }

    function cancelEdit() {
        setEditingTag(null);
        setTagName('');
        setTagColor('#3b82f6');
    }

    onMount(() => {
        fetchTags();
    });

    return (
        <div class="flex-1 w-full max-w-4xl">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-white mb-2">🏷️ Tags</h1>
                <p class="text-gray-400">Organize your tasks and events with colorful tags</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create/Edit Form */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 class="text-xl font-bold text-white mb-4">
                        {editingTag() ? 'Edit Tag' : 'Create New Tag'}
                    </h2>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        editingTag() ? updateTag() : createTag();
                    }}>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-400 mb-2">Tag Name:</label>
                            <input
                                type="text"
                                value={tagName()}
                                onInput={(e) => setTagName(e.currentTarget.value)}
                                required
                                placeholder="e.g., Work, Personal, Urgent..."
                                class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-400 mb-3">Tag Color:</label>
                            <div class="grid grid-cols-6 gap-2">
                                <For each={colorPresets}>
                                    {(color) => (
                                        <button
                                            type="button"
                                            onClick={() => setTagColor(color)}
                                            class={`w-full aspect-square rounded-lg transition-all duration-200 ${
                                                tagColor() === color
                                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110'
                                                    : 'hover:scale-105'
                                            }`}
                                            style={{ 'background-color': color }}
                                        />
                                    )}
                                </For>
                            </div>
                            <input
                                type="color"
                                value={tagColor()}
                                onInput={(e) => setTagColor(e.currentTarget.value)}
                                class="mt-3 w-full h-10 rounded-lg cursor-pointer"
                            />
                        </div>

                        <div class="flex gap-2">
                            <button
                                type="submit"
                                class="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 transition-all duration-200"
                            >
                                {editingTag() ? 'Update Tag' : 'Create Tag'}
                            </button>
                            <Show when={editingTag()}>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    class="px-6 py-3 bg-zinc-800 text-gray-300 font-semibold rounded-lg hover:bg-zinc-700 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            </Show>
                        </div>
                    </form>

                    {/* Preview */}
                    <Show when={tagName()}>
                        <div class="mt-6 p-4 bg-black/50 border border-zinc-700 rounded-lg">
                            <p class="text-xs text-gray-400 mb-2">Preview:</p>
                            <span
                                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                                style={{ 'background-color': `${tagColor()}40`, 'border': `1px solid ${tagColor()}60` }}
                            >
                                <div
                                    class="w-2 h-2 rounded-full"
                                    style={{ 'background-color': tagColor() }}
                                />
                                {tagName()}
                            </span>
                        </div>
                    </Show>
                </div>

                {/* Tags List */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h2 class="text-xl font-bold text-white mb-4">Your Tags ({tags().length})</h2>

                    <div class="space-y-2 max-h-[500px] overflow-y-auto">
                        <For each={tags()}>
                            {(tag) => (
                                <div class="flex items-center justify-between p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-all duration-200">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-4 h-4 rounded-full"
                                            style={{ 'background-color': tag.color }}
                                        />
                                        <span class="text-white font-medium">{tag.name}</span>
                                    </div>
                                    <div class="flex gap-2">
                                        <button
                                            onClick={() => startEditing(tag)}
                                            class="px-3 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteTag(tag.id)}
                                            class="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors duration-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </For>
                        <Show when={tags().length === 0}>
                            <div class="text-center py-12 text-gray-500">
                                <div class="text-4xl mb-2">🏷️</div>
                                <p>No tags yet. Create your first tag!</p>
                            </div>
                        </Show>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Tags;
