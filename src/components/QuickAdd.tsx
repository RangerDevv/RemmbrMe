import { createSignal, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { bk, currentUser } from '../lib/backend.ts';

interface ParsedData {
    type: 'task' | 'event';
    title: string;
    priority?: 'P1' | 'P2' | 'P3';
    date?: Date;
    time?: { hours: number; minutes: number };
    duration?: number;
    tags?: string[];
    confidence: number;
}

function QuickAdd() {
    const [showModal, setShowModal] = createSignal(false);
    const [quickInput, setQuickInput] = createSignal('');
    const [isProcessing, setIsProcessing] = createSignal(false);
    const [parsedData, setParsedData] = createSignal<ParsedData | null>(null);
    const [showSuccess, setShowSuccess] = createSignal(false);
    const [successMessage, setSuccessMessage] = createSignal('');

    // Keyboard shortcut: Ctrl/Cmd + K
    onMount(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowModal(true);
            }
            if (e.key === 'Escape' && showModal()) {
                setShowModal(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
    });

    // Smart parsing with real-time preview
    createEffect(() => {
        const input = quickInput().trim();
        if (!input) {
            setParsedData(null);
            return;
        }

        const parsed = parseInput(input);
        setParsedData(parsed);
    });

    function parseInput(input: string): ParsedData {
        const lowerInput = input.toLowerCase();
        
        // Priority detection
        let priority: 'P1' | 'P2' | 'P3' = 'P2';
        if (/urgent|important|asap|critical|!!!/i.test(input)) {
            priority = 'P1';
        } else if (/low priority|someday|maybe|when possible/i.test(input)) {
            priority = 'P3';
        }

        // Time detection (various formats)
        const timePatterns = [
            /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
            /(\d{1,2})\s*(am|pm)/i,
            /(morning|afternoon|evening|noon|night)/i
        ];

        let time: { hours: number; minutes: number } | undefined;
        let hasTimeIndicator = false;

        for (const pattern of timePatterns) {
            const match = input.match(pattern);
            if (match) {
                hasTimeIndicator = true;
                if (match[1] && match[2]) {
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const period = match[3]?.toLowerCase();
                    
                    if (period === 'pm' && hours < 12) hours += 12;
                    if (period === 'am' && hours === 12) hours = 0;
                    
                    time = { hours, minutes };
                } else if (match[1]) {
                    let hours = parseInt(match[1]);
                    const period = match[2]?.toLowerCase();
                    
                    if (period === 'pm' && hours < 12) hours += 12;
                    if (period === 'am' && hours === 12) hours = 0;
                    
                    time = { hours, minutes: 0 };
                } else if (match[1]) {
                    const timeWord = match[1].toLowerCase();
                    time = {
                        hours: timeWord === 'morning' ? 9 : 
                               timeWord === 'afternoon' ? 14 : 
                               timeWord === 'evening' ? 18 : 
                               timeWord === 'noon' ? 12 : 20,
                        minutes: 0
                    };
                }
                break;
            }
        }

        // Date detection
        let date: Date | undefined;
        const today = new Date();
        
        if (/\btoday\b/i.test(input)) {
            date = new Date(today);
        } else if (/\btomorrow\b/i.test(input)) {
            date = new Date(today);
            date.setDate(date.getDate() + 1);
        } else if (/\bnext week\b/i.test(input)) {
            date = new Date(today);
            date.setDate(date.getDate() + 7);
        } else if (/\bmonday\b/i.test(input)) {
            date = getNextWeekday(today, 1);
        } else if (/\btuesday\b/i.test(input)) {
            date = getNextWeekday(today, 2);
        } else if (/\bwednesday\b/i.test(input)) {
            date = getNextWeekday(today, 3);
        } else if (/\bthursday\b/i.test(input)) {
            date = getNextWeekday(today, 4);
        } else if (/\bfriday\b/i.test(input)) {
            date = getNextWeekday(today, 5);
        } else if (/\bsaturday\b/i.test(input)) {
            date = getNextWeekday(today, 6);
        } else if (/\bsunday\b/i.test(input)) {
            date = getNextWeekday(today, 0);
        }

        // Duration detection
        let duration = 60; // default 1 hour
        const durationMatch = input.match(/(\d+)\s*(hour|hr|minute|min)/i);
        if (durationMatch) {
            const amount = parseInt(durationMatch[1]);
            const unit = durationMatch[2].toLowerCase();
            duration = unit.startsWith('hour') || unit === 'hr' ? amount * 60 : amount;
        }

        // Tag detection
        const tags: string[] = [];
        const tagMatches = input.match(/#(\w+)/g);
        if (tagMatches) {
            tags.push(...tagMatches.map(t => t.slice(1)));
        }

        // Event indicators
        const eventKeywords = [
            'meeting', 'call', 'appointment', 'lunch', 'dinner', 'breakfast',
            'conference', 'interview', 'presentation', 'workshop', 'class',
            'meet', 'catch up', 'hangout', 'party', 'event'
        ];
        
        const hasEventKeyword = eventKeywords.some(keyword => 
            lowerInput.includes(keyword)
        );

        // Determine type and confidence
        let type: 'task' | 'event' = 'task';
        let confidence = 0.5;

        if (hasTimeIndicator || hasEventKeyword || date) {
            type = 'event';
            confidence = 0.7;
            if (hasTimeIndicator && date) confidence = 0.95;
            if (hasTimeIndicator && hasEventKeyword) confidence = 0.9;
        }

        // Clean title (remove parsed elements)
        let title = input;
        if (tagMatches) {
            tagMatches.forEach(tag => {
                title = title.replace(tag, '');
            });
        }
        title = title.replace(/urgent|important|asap|critical|low priority/gi, '').trim();
        
        return {
            type,
            title,
            priority,
            date,
            time,
            duration,
            tags,
            confidence
        };
    }

    function getNextWeekday(date: Date, targetDay: number): Date {
        const result = new Date(date);
        const currentDay = result.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        result.setDate(result.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
        return result;
    }

    async function handleQuickAdd() {
        const input = quickInput().trim();
        if (!input) return;

        setIsProcessing(true);

        try {
            const parsed = parsedData();
            if (!parsed) return;

            if (parsed.type === 'event') {
                const start = new Date();
                
                if (parsed.date) {
                    start.setFullYear(parsed.date.getFullYear(), parsed.date.getMonth(), parsed.date.getDate());
                }
                
                if (parsed.time) {
                    start.setHours(parsed.time.hours, parsed.time.minutes, 0, 0);
                } else {
                    start.setHours(9, 0, 0, 0);
                }

                const end = new Date(start);
                end.setMinutes(end.getMinutes() + (parsed.duration || 60));

                await bk.collection('Calendar').create({
                    EventName: parsed.title,
                    Description: '',
                    AllDay: false,
                    Start: start.toISOString(),
                    End: end.toISOString(),
                    Location: { lat: 0, lon: 0 },
                    Color: parsed.priority === 'P1' ? '#ef4444' : 
                           parsed.priority === 'P3' ? '#22c55e' : '#3b82f6',
                    Tasks: [],
                    Tags: [],
                    Recurrence: 'none',
                    user: currentUser()?.id
                });

                setSuccessMessage(`Event "${parsed.title}" created! 📅`);
            } else {
                let deadline: string | undefined;
                if (parsed.date && parsed.time) {
                    const deadlineDate = new Date(parsed.date);
                    deadlineDate.setHours(parsed.time.hours, parsed.time.minutes, 0, 0);
                    deadline = deadlineDate.toISOString();
                } else if (parsed.date) {
                    const deadlineDate = new Date(parsed.date);
                    deadlineDate.setHours(23, 59, 0, 0);
                    deadline = deadlineDate.toISOString();
                }

                await bk.collection('Todo').create({
                    Title: parsed.title,
                    Description: '',
                    Completed: false,
                    Priority: parsed.priority || 'P2',
                    Deadline: deadline,
                    Tags: [],
                    Recurrence: 'none',
                    user: currentUser()?.id
                });

                setSuccessMessage(`Task "${parsed.title}" created! ✓`);
            }

            // Show success animation
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setShowModal(false);
                setQuickInput('');
                
                // Refresh the page to show new item
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            }, 1500);

        } catch (error) {
            console.error('Error creating quick item:', error);
            alert('Failed to create item. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    }

    function formatPreview() {
        const parsed = parsedData();
        if (!parsed) return null;

        const parts = [];
        
        if (parsed.date) {
            parts.push(parsed.date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: parsed.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            }));
        }
        
        if (parsed.time) {
            const hours = parsed.time.hours % 12 || 12;
            const period = parsed.time.hours >= 12 ? 'PM' : 'AM';
            parts.push(`${hours}:${parsed.time.minutes.toString().padStart(2, '0')} ${period}`);
        }
        
        if (parsed.duration && parsed.type === 'event') {
            parts.push(`(${parsed.duration}min)`);
        }

        return parts.join(' ');
    }

    return (
        <>
            {/* Floating Action Button with pulse animation */}
            <button
                onClick={() => setShowModal(true)}
                class="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 active:scale-95 transition-all duration-200 z-50 flex items-center justify-center text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 group"
                title="Quick Add (Ctrl+K)"
            >
                <svg class="w-7 h-7 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Quick Add Modal */}
            <Show when={showModal()}>
                <div 
                    class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setShowModal(false)}
                >
                    <Show when={!showSuccess()}>
                        <div 
                            class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-slide-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div class="flex items-center justify-between mb-6">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 class="text-2xl font-bold text-white">Quick Add</h2>
                                        <p class="text-xs text-gray-500">Natural language parsing</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                                >
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleQuickAdd();
                            }}>
                                <div class="relative mb-4">
                                    <textarea
                                        ref={(el) => el && el.focus()}
                                        value={quickInput()}
                                        onInput={(e) => setQuickInput(e.currentTarget.value)}
                                        placeholder="Try: 'Meeting with John tomorrow at 3pm' or 'Buy groceries #urgent'"
                                        rows="2"
                                        class="w-full bg-zinc-950 border-2 border-zinc-700 rounded-xl px-5 py-4 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
                                    ></textarea>
                                </div>

                                {/* Real-time preview */}
                                <Show when={parsedData()}>
                                    <div class="mb-6 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
                                        <div class="flex items-start gap-3">
                                            <Show when={parsedData()!.type === 'event'}>
                                                <div class="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            </Show>
                                            <Show when={parsedData()!.type === 'task'}>
                                                <div class="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                </div>
                                            </Show>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="text-sm font-semibold text-gray-400">
                                                        Creating {parsedData()!.type}
                                                    </span>
                                                    <span class={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        parsedData()!.priority === 'P1' ? 'bg-red-500/20 text-red-400' :
                                                        parsedData()!.priority === 'P3' ? 'bg-green-500/20 text-green-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                        {parsedData()!.priority}
                                                    </span>
                                                    <div class="flex-1 h-px bg-zinc-800"></div>
                                                    <span class="text-xs text-gray-600">
                                                        {Math.round(parsedData()!.confidence * 100)}% confident
                                                    </span>
                                                </div>
                                                <h3 class="text-white font-medium mb-1 truncate">{parsedData()!.title}</h3>
                                                <Show when={formatPreview()}>
                                                    <div class="flex items-center gap-2 text-sm text-gray-400">
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {formatPreview()}
                                                    </div>
                                                </Show>
                                                <Show when={parsedData()!.tags && parsedData()!.tags!.length > 0}>
                                                    <div class="flex gap-1 mt-2">
                                                        {parsedData()!.tags!.map(tag => (
                                                            <span class="px-2 py-0.5 bg-zinc-800 text-gray-400 rounded text-xs">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </Show>
                                            </div>
                                        </div>
                                    </div>
                                </Show>

                                <div class="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isProcessing() || !quickInput().trim()}
                                        class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing() ? (
                                            <>
                                                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Create {parsedData()?.type || 'item'}
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        class="px-6 py-3.5 bg-zinc-800 text-gray-300 font-semibold rounded-xl hover:bg-zinc-700 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div class="mt-4 pt-4 border-t border-zinc-800 text-xs text-gray-500">
                                    <div class="grid grid-cols-2 gap-2">
                                        <div>💡 Use <kbd class="px-1.5 py-0.5 bg-zinc-800 rounded">Ctrl+K</kbd> to open</div>
                                        <div>📅 Mention times for events</div>
                                        <div>🏷️ Use #tags for organization</div>
                                        <div>⚡ Say "urgent" for high priority</div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </Show>

                    {/* Success Animation */}
                    <Show when={showSuccess()}>
                        <div class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-3xl p-12 max-w-md w-full shadow-2xl animate-scale-in text-center">
                            <div class="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 class="text-2xl font-bold text-white mb-2">Success!</h3>
                            <p class="text-gray-400">{successMessage()}</p>
                        </div>
                    </Show>
                </div>
            </Show>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-up {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes bounce-in {
                    0% {
                        transform: scale(0);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                kbd {
                    font-family: ui-monospace, monospace;
                }
            `}</style>
        </>
    );
}

export default QuickAdd;
