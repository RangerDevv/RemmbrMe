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
    const [overrideType, setOverrideType] = createSignal<'task' | 'event' | null>(null);
    const [errorMessage, setErrorMessage] = createSignal('');

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
            setOverrideType(null);
            return;
        }

        const parsed = parseInput(input);
        setParsedData(parsed);
    });

    function parseInput(input: string): ParsedData {
        const lowerInput = input.toLowerCase();
        
        // Priority detection - expanded patterns
        let priority: 'P1' | 'P2' | 'P3' = 'P2';
        if (/urgent|important|asap|critical|!!!|high\s*pri(ority)?|must\s*do|p1\b/i.test(input)) {
            priority = 'P1';
        } else if (/low\s*pri(ority)?|someday|maybe|when\s*possible|no\s*rush|whenever|p3\b/i.test(input)) {
            priority = 'P3';
        }

        // Time detection - improved patterns with better ordering
        const timePatterns = [
            { re: /(\d{1,2}):(\d{2})\s*(am|pm)/i, type: 'hh:mm ampm' },
            { re: /(\d{1,2}):(\d{2})/i, type: 'hh:mm' },
            { re: /(\d{1,2})\s*(am|pm)/i, type: 'hh ampm' },
            { re: /\b(morning|afternoon|evening|noon|midnight|night|eod|end\s*of\s*day)\b/i, type: 'word' }
        ];

        let time: { hours: number; minutes: number } | undefined;
        let hasTimeIndicator = false;

        for (const { re, type } of timePatterns) {
            const match = input.match(re);
            if (match) {
                hasTimeIndicator = true;
                if (type === 'hh:mm ampm') {
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const period = match[3].toLowerCase();
                    if (period === 'pm' && hours < 12) hours += 12;
                    else if (period === 'am' && hours === 12) hours = 0;
                    time = { hours, minutes };
                } else if (type === 'hh:mm') {
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    if (hours < 8) hours += 12; // 1:00-7:59 assumed PM
                    time = { hours, minutes };
                } else if (type === 'hh ampm') {
                    let hours = parseInt(match[1]);
                    const period = match[2].toLowerCase();
                    if (period === 'pm' && hours < 12) hours += 12;
                    else if (period === 'am' && hours === 12) hours = 0;
                    time = { hours, minutes: 0 };
                } else if (type === 'word') {
                    const timeWord = match[1].toLowerCase();
                    const wordMap: Record<string, number> = {
                        morning: 9, afternoon: 14, evening: 18,
                        noon: 12, midnight: 0, night: 20,
                        eod: 17, 'end of day': 17
                    };
                    time = { hours: wordMap[timeWord] || 9, minutes: 0 };
                }
                break;
            }
        }

        // Date detection - expanded patterns
        let date: Date | undefined;
        const today = new Date();
        
        // Check for explicit date formats first (MM/DD, MM-DD, Month Day)
        const explicitDateMatch = input.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
        const monthNameMatch = input.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/i);
        
        if (explicitDateMatch) {
            const month = parseInt(explicitDateMatch[1]) - 1;
            const day = parseInt(explicitDateMatch[2]);
            const year = explicitDateMatch[3] ? parseInt(explicitDateMatch[3]) : today.getFullYear();
            date = new Date(year < 100 ? year + 2000 : year, month, day);
        } else if (monthNameMatch) {
            const monthNames: Record<string, number> = {
                jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
                apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
                aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9,
                october: 9, nov: 10, november: 10, dec: 11, december: 11
            };
            const month = monthNames[monthNameMatch[1].toLowerCase()];
            const day = parseInt(monthNameMatch[2]);
            const year = monthNameMatch[3] ? parseInt(monthNameMatch[3]) : today.getFullYear();
            date = new Date(year, month, day);
        } else if (/\btoday\b/i.test(input)) {
            date = new Date(today);
        } else if (/\btomorrow\b|tmrw\b|tmr\b/i.test(input)) {
            date = new Date(today);
            date.setDate(date.getDate() + 1);
        } else if (/\bday after tomorrow\b/i.test(input)) {
            date = new Date(today);
            date.setDate(date.getDate() + 2);
        } else if (/\bnext week\b/i.test(input)) {
            date = new Date(today);
            date.setDate(date.getDate() + 7);
        } else if (/\bthis weekend\b/i.test(input)) {
            date = getNextWeekday(today, 6);
        } else if (/\b(mon(day)?)\b/i.test(input)) {
            date = getNextWeekday(today, 1);
        } else if (/\b(tue(s(day)?)?)\b/i.test(input)) {
            date = getNextWeekday(today, 2);
        } else if (/\b(wed(nesday)?)\b/i.test(input)) {
            date = getNextWeekday(today, 3);
        } else if (/\b(thu(rs(day)?)?)\b/i.test(input)) {
            date = getNextWeekday(today, 4);
        } else if (/\b(fri(day)?)\b/i.test(input)) {
            date = getNextWeekday(today, 5);
        } else if (/\b(sat(urday)?)\b/i.test(input)) {
            date = getNextWeekday(today, 6);
        } else if (/\b(sun(day)?)\b/i.test(input)) {
            date = getNextWeekday(today, 0);
        }

        // Duration detection - handle "2:00 to 3:00", "2-3", "2 to 3", or explicit duration
        let duration = 60; // default 1 hour
        
        // Check for time range formats like "2:00 to 3:00", "2 to 3", "2-3"
        const rangeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?/i);
        if (rangeMatch) {
            let startHour = parseInt(rangeMatch[1]);
            const startMin = rangeMatch[2] ? parseInt(rangeMatch[2]) : 0;
            let endHour = parseInt(rangeMatch[3]);
            const endMin = rangeMatch[4] ? parseInt(rangeMatch[4]) : 0;
            
            // Assume PM for both if < 12
            if (startHour < 12) startHour += 12;
            if (endHour < 12) endHour += 12;
            
            // Calculate duration
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            duration = endMinutes - startMinutes;
            
            // If duration is negative, assume end time is next day or wrong calculation
            if (duration <= 0) duration = 60;
            
            // Use the start time as the main time
            if (!time) {
                time = { hours: startHour, minutes: startMin };
                hasTimeIndicator = true;
            }
        } else {
            // Check for explicit duration like "2 hours" or "30 minutes"
            const durationMatch = input.match(/(\d+)\s*(hour|hr|minute|min)/i);
            if (durationMatch) {
                const amount = parseInt(durationMatch[1]);
                const unit = durationMatch[2].toLowerCase();
                duration = unit.startsWith('hour') || unit === 'hr' ? amount * 60 : amount;
            }
        }

        // Tag detection
        const tags: string[] = [];
        const tagMatches = input.match(/#(\w+)/g);
        if (tagMatches) {
            tags.push(...tagMatches.map(t => t.slice(1)));
        }

        // Event indicators - expanded
        const eventKeywords = [
            'meeting', 'call', 'appointment', 'lunch', 'dinner', 'breakfast',
            'conference', 'interview', 'presentation', 'workshop', 'class',
            'meet', 'catch up', 'hangout', 'party', 'event', 'session',
            'training', 'seminar', 'webinar', 'standup', 'sync', 'huddle',
            'brunch', 'happy hour', 'demo', 'review meeting', 'retro',
            'one on one', '1:1', '1-on-1', 'coffee chat', 'date night',
            'gym', 'workout', 'yoga', 'run', 'walk', 'hike'
        ];
        
        // Task indicators - expanded
        const taskKeywords = [
            'buy', 'get', 'pick up', 'finish', 'complete', 'submit', 'send',
            'review', 'check', 'read', 'write', 'prepare', 'plan', 'organize',
            'clean', 'fix', 'update', 'install', 'download', 'upload', 'call back',
            'email', 'text', 'message', 'remind', 'book', 'schedule', 'pay',
            'renew', 'cancel', 'return', 'deliver', 'todo', 'task', 'do',
            'make', 'create', 'setup', 'set up', 'configure', 'deploy',
            'research', 'look into', 'figure out', 'investigate', 'debug',
            'refactor', 'test', 'implement', 'design', 'draft', 'edit',
            'proofread', 'approve', 'sign', 'apply', 'register', 'order'
        ];
        
        const hasEventKeyword = eventKeywords.some(keyword => 
            lowerInput.includes(keyword)
        );
        
        const hasTaskKeyword = taskKeywords.some(keyword => 
            lowerInput.includes(keyword)
        );

        // Determine type and confidence
        let type: 'task' | 'event' = 'task';
        let confidence = 0.6;

        // If has explicit task keyword, it's definitely a task
        if (hasTaskKeyword) {
            type = 'task';
            confidence = 0.85;
            if (date || time) confidence = 0.9; // Task with deadline
        }
        // If has event keyword, it's likely an event
        else if (hasEventKeyword) {
            type = 'event';
            confidence = 0.85;
            if (hasTimeIndicator && date) confidence = 0.95;
        }
        // If has time AND date, check for event phrasing (with, at, @)
        else if (hasTimeIndicator && date) {
            // If phrase includes "with", "at", "@" it's likely a meeting/event
            if (/\bwith\b|\bat\b|@/i.test(input)) {
                type = 'event';
                confidence = 0.85;
            } else {
                // Otherwise default to task with deadline
                type = 'task';
                confidence = 0.75;
            }
        }
        // Just has date or time but no clear indicators - default to task with deadline
        else if (date || hasTimeIndicator) {
            type = 'task';
            confidence = 0.7;
        }

        // Clean title (remove parsed elements)
        let title = input;
        if (tagMatches) {
            tagMatches.forEach(tag => {
                title = title.replace(tag, '');
            });
        }
        // Remove priority words
        title = title.replace(/\b(urgent|important|asap|critical|low\s*priority|high\s*priority|no\s*rush|p[123])\b/gi, '');
        // Remove time expressions
        title = title.replace(/\b(at\s+)?\d{1,2}:\d{2}\s*(am|pm)?/gi, '');
        title = title.replace(/\b(at\s+)?\d{1,2}\s*(am|pm)/gi, '');
        title = title.replace(/\b(morning|afternoon|evening|noon|midnight|night|eod|end\s*of\s*day)\b/gi, '');
        // Remove date expressions
        title = title.replace(/\b(today|tomorrow|tmrw|tmr|day after tomorrow|next week|this weekend)\b/gi, '');
        title = title.replace(/\b(mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?)\b/gi, '');
        title = title.replace(/\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+\d{1,2}(,?\s*\d{4})?\b/gi, '');
        title = title.replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '');
        // Remove duration expressions
        title = title.replace(/\b(for\s+)?\d+\s*(hours?|hrs?|minutes?|mins?)\b/gi, '');
        // Remove time ranges
        title = title.replace(/\d{1,2}(:\d{2})?\s*(-|to)\s*\d{1,2}(:\d{2})?/gi, '');
        // Clean up extra whitespace and trailing prepositions
        title = title.replace(/\b(at|on|for|by|from)\s*$/gi, '');
        title = title.replace(/\s{2,}/g, ' ').trim();
        
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

            // Use override type if set, otherwise use parsed type
            const finalType = overrideType() || parsed.type;

            if (finalType === 'event') {
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
            setOverrideType(null);
            setTimeout(() => {
                setShowSuccess(false);
                setShowModal(false);
                setQuickInput('');
                
                // Dispatch custom event to notify other components
                window.dispatchEvent(new CustomEvent('itemCreated', { 
                    detail: { type: finalType, title: parsed.title } 
                }));
            }, 1500);

        } catch (error) {
            console.error('Error creating quick item:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to create item. Please try again.';
            setErrorMessage(errorMsg);
            
            // Clear error after 5 seconds
            setTimeout(() => {
                setErrorMessage('');
            }, 5000);
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
            {/* Floating Action Button */}
            <button
                onClick={() => setShowModal(true)}
                class="fixed bottom-5 right-5 lg:bottom-8 lg:right-8 w-12 h-12 lg:w-14 lg:h-14 rounded-full active:scale-95 transition-all duration-200 z-50 flex items-center justify-center shadow-lg group" style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                title="Quick Add (Ctrl+K)"
            >
                <svg class="w-6 h-6 lg:w-7 lg:h-7 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Quick Add Modal */}
            <Show when={showModal()}>
                <div 
                    class="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50 animate-fade-in"
                    onClick={() => setShowModal(false)}
                >
                    <Show when={!showSuccess()}>
                        <div 
                            class="rounded-t-2xl lg:rounded-xl p-5 lg:p-6 w-full lg:max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div class="flex items-center justify-between mb-5">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center" style={{ "background-color": "var(--color-accent)" }}>
                                        <svg class="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 class="text-lg lg:text-xl font-bold" style={{ "color": "var(--color-text)" }}>Quick Add</h2>
                                        <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>Natural language parsing</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    class="transition-colors p-2 rounded-lg" style={{ "color": "var(--color-text-muted)" }}
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
                                        ref={(el) => el && setTimeout(() => el.focus(), 100)}
                                        value={quickInput()}
                                        onInput={(e) => setQuickInput(e.currentTarget.value)}
                                        placeholder="Try: 'Meeting with John tomorrow at 3pm' or 'Buy groceries #urgent'"
                                        rows="2"
                                        autofocus
                                        class="w-full rounded-xl px-5 py-4 text-lg focus:outline-none resize-none transition-all" style={{ "background-color": "var(--color-bg-tertiary)", "border": "2px solid var(--color-border)", "color": "var(--color-text)" }}
                                    ></textarea>
                                </div>

                                {/* Real-time preview */}
                                <Show when={parsedData()}>
                                    <div class="mb-6 rounded-xl p-4" style={{ "background-color": "var(--color-bg-secondary)", "border": "1px solid var(--color-border)" }}>
                                        <div class="flex items-start gap-3">
                                            <Show when={(overrideType() || parsedData()!.type) === 'event'}>
                                                <div class="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            </Show>
                                            <Show when={(overrideType() || parsedData()!.type) === 'task'}>
                                                <div class="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                </div>
                                            </Show>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span class="text-sm font-semibold" style={{ "color": "var(--color-text-secondary)" }}>
                                                        Creating {overrideType() || parsedData()!.type}
                                                    </span>
                                                    <span class={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        parsedData()!.priority === 'P1' ? 'bg-red-500/20 text-red-400' :
                                                        parsedData()!.priority === 'P3' ? 'bg-green-500/20 text-green-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                        {parsedData()!.priority}
                                                    </span>
                                                    <div class="flex-1 h-px" style={{ "background-color": "var(--color-border)" }}></div>
                                                    <Show when={!overrideType()}>
                                                        <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                                            {Math.round(parsedData()!.confidence * 100)}% confident
                                                        </span>
                                                    </Show>
                                                </div>
                                                <h3 class="font-medium mb-1 truncate" style={{ "color": "var(--color-text)" }}>{parsedData()!.title}</h3>
                                                <Show when={formatPreview()}>
                                                    <div class="flex items-center gap-2 text-sm" style={{ "color": "var(--color-text-secondary)" }}>
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {formatPreview()}
                                                    </div>
                                                </Show>
                                                <Show when={parsedData()!.tags && parsedData()!.tags!.length > 0}>
                                                    <div class="flex gap-1 mt-2">
                                                        {parsedData()!.tags!.map(tag => (
                                                            <span class="px-2 py-0.5 rounded text-xs" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)" }}>
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </Show>
                                                
                                                {/* Type override buttons */}
                                                <div class="flex gap-2 mt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOverrideType((overrideType() || parsedData()!.type) === 'task' ? null : 'task')}
                                                        class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            (overrideType() || parsedData()!.type) === 'task'
                                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                                : 'bg-zinc-800/50 text-gray-500 border border-zinc-700'
                                                        }`}
                                                    >
                                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                        Task
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOverrideType((overrideType() || parsedData()!.type) === 'event' ? null : 'event')}
                                                        class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            (overrideType() || parsedData()!.type) === 'event'
                                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                : 'bg-zinc-800/50 text-gray-500 border border-zinc-700'
                                                        }`}
                                                    >
                                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Event
                                                    </button>
                                                </div>
                                                
                                                {/* Error Message */}
                                                <Show when={errorMessage()}>
                                                    <div class="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                                        <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <div class="flex-1">
                                                            <p class="text-red-400 text-sm font-medium">Error</p>
                                                            <p class="text-red-300 text-sm mt-1">{errorMessage()}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setErrorMessage('')}
                                                            class="text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
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
                                        class="flex-1 font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2" style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
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
                                                Create {overrideType() || parsedData()?.type || 'item'}
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        class="px-6 py-3 font-semibold rounded-xl transition-all duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)" }}
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div class="mt-4 pt-4 text-xs" style={{ "border-top": "1px solid var(--color-border)", "color": "var(--color-text-muted)" }}>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>💡 Use <kbd class="px-1.5 py-0.5 rounded" style={{ "background-color": "var(--color-bg-tertiary)" }}>Ctrl+K</kbd> to open</div>
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
                        <div class="rounded-xl p-10 max-w-md w-full shadow-2xl animate-scale-in text-center" style={{ "background-color": "var(--color-surface)", "border": "1px solid var(--color-border)" }}>
                            <div class="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 class="text-xl font-bold mb-2" style={{ "color": "var(--color-text)" }}>Success!</h3>
                            <p style={{ "color": "var(--color-text-secondary)" }}>{successMessage()}</p>
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
