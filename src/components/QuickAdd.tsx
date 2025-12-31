import { createSignal, Show } from 'solid-js';
import { pb, currentUser } from '../lib/pocketbase';

function QuickAdd() {
    const [showModal, setShowModal] = createSignal(false);
    const [quickInput, setQuickInput] = createSignal('');
    const [isProcessing, setIsProcessing] = createSignal(false);

    async function handleQuickAdd() {
        const input = quickInput().trim();
        if (!input) return;

        setIsProcessing(true);

        try {
            // Simple heuristic: if it contains time words, create event, otherwise create task
            const hasTime = /\d{1,2}:\d{2}|am|pm|morning|afternoon|evening|tomorrow|today|next week/i.test(input);
            
            if (hasTime) {
                // Create as event
                const today = new Date();
                const start = new Date();
                start.setHours(9, 0, 0, 0);
                const end = new Date(start);
                end.setHours(10, 0, 0, 0);

                await pb.collection('Calendar').create({
                    EventName: input,
                    Description: '',
                    AllDay: false,
                    Start: start.toISOString(),
                    End: end.toISOString(),
                    Location: { lat: 0, lon: 0 },
                    Color: '#3b82f6',
                    Tasks: [],
                    user: currentUser()?.id
                });
                
                setShowModal(false);
                setQuickInput('');
                window.location.href = '/calendar';
            } else {
                // Create as task
                await pb.collection('Todo').create({
                    Title: input,
                    Description: '',
                    Completed: false,
                    Priority: 'P2',
                    Deadline: '',
                    Tags: [],
                    Recurrence: '',
                    RecurrenceEndDate: null,
                    user: currentUser()?.id
                });
                
                setShowModal(false);
                setQuickInput('');
                window.location.href = '/todo';
            }
        } catch (error) {
            console.error('Error creating quick item:', error);
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setShowModal(true)}
                class="fixed bottom-8 right-8 w-16 h-16 bg-zinc-900 border-2 border-zinc-800 rounded-full hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all duration-200 z-50 flex items-center justify-center text-3xl text-white"
                title="Quick Add (Ctrl+K)"
            >
                +
            </button>

            {/* Quick Add Modal */}
            <Show when={showModal()}>
                <div 
                    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div 
                        class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-2xl font-bold text-white">⚡ Quick Add</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <p class="text-sm text-gray-400 mb-4">
                            Type anything - we'll figure out if it's a task or event!
                        </p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleQuickAdd();
                        }}>
                            <textarea
                                value={quickInput()}
                                onInput={(e) => setQuickInput(e.currentTarget.value)}
                                placeholder="Example: Meet John tomorrow at 3pm&#10;or: Buy groceries"
                                rows="3"
                                autofocus
                                class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none mb-4"
                            ></textarea>

                            <div class="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isProcessing() || !quickInput().trim()}
                                    class="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {isProcessing() ? 'Adding...' : 'Add'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    class="px-6 py-3 bg-zinc-800 text-gray-300 font-semibold rounded-lg hover:bg-zinc-700 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div class="mt-4 text-xs text-gray-500 text-center">
                                Tip: Mention times for events, otherwise it becomes a task
                            </div>
                        </form>
                    </div>
                </div>
            </Show>
        </>
    );
}

export default QuickAdd;
