import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSignal, Show, For } from 'solid-js';
import { pb, currentUser } from '../lib/pocketbase';
import NotificationModal from '../components/NotificationModal';

function AIAssistant() {
    const [apiKey, setApiKey] = createSignal(localStorage.getItem('gemini_api_key') || '');
    const [rambleText, setRambleText] = createSignal('');
    const [isProcessing, setIsProcessing] = createSignal(false);
    const [processingStatus, setProcessingStatus] = createSignal('');
    const [createdItems, setCreatedItems] = createSignal<any[]>([]);
    const [feedbackText, setFeedbackText] = createSignal('');
    const [showFeedback, setShowFeedback] = createSignal(false);
    const [showApiKeyInput, setShowApiKeyInput] = createSignal(!apiKey());
    const [dailyBriefing, setDailyBriefing] = createSignal('');
    const [showBriefing, setShowBriefing] = createSignal(false);
    const [smartSuggestions, setSmartSuggestions] = createSignal<string[]>([]);
    const [notification, setNotification] = createSignal({ show: false, message: '', type: 'info' as 'info' | 'warning' | 'error' | 'success' });

    function saveApiKey() {
        localStorage.setItem('gemini_api_key', apiKey());
        setShowApiKeyInput(false);
    }

    async function processRamble() {
        if (!apiKey()) {
            setNotification({ show: true, message: 'Please set your Gemini API key first!', type: 'warning' });
            setShowApiKeyInput(true);
            return;
        }

        if (!rambleText().trim()) {
            setNotification({ show: true, message: 'Please write something about your day!', type: 'warning' });
            return;
        }

        setIsProcessing(true);
        setProcessingStatus('🤖 Analyzing your message...');
        setCreatedItems([]);

        try {
            const genAI = new GoogleGenerativeAI(apiKey());
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `You are a smart scheduling assistant analyzing someone's thoughts about their day. Extract actionable tasks and calendar events from the following text, and INTELLIGENTLY SCHEDULE events with appropriate times.

IMPORTANT: The calendar uses a time-blocking system where EVERY minute of the day is scheduled. Gaps between events are AUTOMATICALLY filled with break blocks (🌴 Break). DO NOT create separate "break" or "rest" events - just leave gaps between events for natural breaks.

Current context:
- Current date/time: ${new Date().toLocaleString()}
- Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

User's message:
"""
${rambleText()}
"""

Return a JSON object with this EXACT structure:
{
  "todos": [
    {
      "title": "task title",
      "description": "brief description",
      "priority": "P1" | "P2" | "P3",
      "deadline": "YYYY-MM-DD" or null
    }
  ],
  "events": [
    {
      "name": "event name",
      "description": "event description",
      "start": "YYYY-MM-DDTHH:MM:SS",
      "end": "YYYY-MM-DDTHH:MM:SS",
      "allDay": true | false,
      "color": "#3b82f6"
    }
  ]
}

SCHEDULING INTELLIGENCE RULES:
1. **Parse mentioned times**: If user says "3pm", "5 o'clock", "morning", "afternoon", use those times
   
2. **SMART AM/PM INFERENCE** (CRITICAL - prevents scheduling errors):
   - If user just says a number (e.g., "3" or "5") without AM/PM, intelligently infer:
   - Times 1-7: Could be morning OR evening - use context:
     * "meeting at 3" = 3 PM (business hours)
     * "gym at 6" = 6 AM or 6 PM (check if morning person or evening workout)
     * "breakfast at 7" = 7 AM
     * "dinner at 7" = 7 PM
   - Times 8-11: Likely AM for morning, PM for evening activities
     * "class at 9" = 9 AM
     * "study at 9" = could be 9 PM if evening
   - Times 12: Always clarify as noon (12 PM) or midnight (12 AM)
   - DEFAULT SAFE INFERENCE:
     * 1-7 without context = PM (afternoon/evening more common)
     * 8-11 = AM (morning hours)
     * Work/meetings/classes = business hours (9 AM - 5 PM)
     * Social/dinner/evening activities = 6 PM - 10 PM
     * Gym/exercise = 6-8 AM or 5-7 PM
     * Breakfast = 7-9 AM, Lunch = 12-1 PM, Dinner = 6-8 PM
   
3. **Smart defaults for time of day**:
   - "morning" = 9:00 AM - 10:00 AM
   - "afternoon" = 2:00 PM - 3:00 PM
   - "evening" = 6:00 PM - 7:00 PM
   - "night" = 8:00 PM - 9:00 PM
   
4. **Activity-based scheduling** (if no time mentioned):
   - Meetings/calls: 10:00 AM - 11:00 AM (1 hour)
   - Coffee/social: 3:00 PM - 4:00 PM (1 hour)
   - Gym/exercise: 6:00 AM - 7:00 AM or 6:00 PM - 7:00 PM (1 hour)
   - Study/homework: 2:00 PM - 4:00 PM (2 hours)
   - Errands/groceries: 11:00 AM - 12:00 PM (1 hour)
   - Appointments: 10:00 AM - 11:00 AM (1 hour)
   
5. **Duration logic**:
   - Quick tasks (coffee, call): 30-60 minutes
   - Work blocks (study, project): 2-3 hours
   - Social events (dinner, hangout): 2-3 hours
   
6. **BREAK TIME BALANCE** (CRITICAL):
   - DO NOT create events named "Break", "Rest", "Free Time" etc - gaps become breaks automatically!
   - For every 2-3 hours of work, leave at least 15-30 minutes GAP (unscheduled time)
   - Don't schedule back-to-back events for more than 4 hours
   - Leave gaps between events for transition time (will become break blocks automatically)
   - Example: If scheduling study 2pm-4pm, next event should be 4:30pm or later (the 30min gap = break)
   - Healthy ratio: Aim for 15-minute gap per 2 hours of work
   - Only create events for ACTUAL activities (work, meetings, gym, etc), NOT breaks
   
7. **Date parsing**:
   - "tomorrow" = next day
   - "next week" = 7 days from now (default to Monday 9am)
   - "this Friday" = upcoming Friday
   - Specific dates: parse accurately
   
8. **Color coding**:
   - Work/study: #3b82f6 (blue)
   - Personal/social: #ec4899 (pink)
   - Health/exercise: #22c55e (green)
   - Urgent/important: #ef4444 (red)

Guidelines:
- Extract tasks mentioned or implied (e.g., "I need to", "should", "must", "have to")
- ALWAYS assign realistic times to events, even if not explicitly mentioned
- Be smart about scheduling - spread events throughout the day with gaps (breaks happen automatically)
- Prioritize tasks: P1 (urgent/important), P2 (medium), P3 (low)
- Return ONLY valid JSON, no markdown formatting
- If no todos or events found, return empty arrays`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            // Clean up response (remove markdown code blocks if present)
            const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            setProcessingStatus('📦 Parsing AI response...');
            const parsed = JSON.parse(jsonText);

            const created: any[] = [];

            // Create todos
            if (parsed.todos && parsed.todos.length > 0) {
                setProcessingStatus(`📝 Creating ${parsed.todos.length} task(s)...`);
                for (const todo of parsed.todos) {
                    const record = await pb.collection('Todo').create({
                        Title: todo.title,
                        Description: todo.description || '',
                        Completed: false,
                        Priority: todo.priority || 'P2',
                        Deadline: todo.deadline || ''
                    });
                    created.push({ type: 'todo', data: record });
                }
            }

            // Create events
            if (parsed.events && parsed.events.length > 0) {
                setProcessingStatus(`📅 Creating ${parsed.events.length} event(s)...`);
                for (const event of parsed.events) {
                    const record = await pb.collection('Calendar').create({
                        EventName: event.name,
                        Description: event.description || '',
                        AllDay: event.allDay || false,
                        Start: event.start,
                        End: event.end,
                        Location: { lat: 0, lon: 0 },
                        Color: event.color || '#3b82f6',
                        Tasks: []
                    });
                    created.push({ type: 'event', data: record });
                }
            }

            setCreatedItems(created);
            setProcessingStatus('✅ Done!');
            
            if (created.length === 0) {
                setProcessingStatus('💡 No tasks or events detected. Try being more specific!');
            }

        } catch (error: any) {
            console.error('Error processing ramble:', error);
            setProcessingStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }

    async function getFeedback() {
        if (!apiKey()) {
            setNotification({ show: true, message: 'Please set your Gemini API key first!', type: 'warning' });
            setShowApiKeyInput(true);
            return;
        }

        setIsProcessing(true);
        setProcessingStatus('🔍 Analyzing your calendar and tasks...');
        setFeedbackText('');
        setShowFeedback(true);

        try {
            // Fetch recent events and todos
            const events = await pb.collection('Calendar').getFullList({
                expand: 'Tasks',
                sort: '-Start',
                filter: `Start >= '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`
            });

            const todos = await pb.collection('Todo').getFullList({
                sort: '-created'
            });

            const genAI = new GoogleGenerativeAI(apiKey());
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `You are a thoughtful productivity coach. Analyze this person's recent calendar events and tasks, then provide personalized, actionable advice to improve their day.

IMPORTANT CONTEXT: This calendar uses time-blocking where every minute is scheduled. Gaps between events show as "🌴 Break" blocks. Analyze the balance between work and break time.

Recent Events (last 7 days):
${events.map(e => `- ${e.EventName} (${new Date(e.Start).toLocaleDateString()} ${new Date(e.Start).toLocaleTimeString()} - ${new Date(e.End).toLocaleTimeString()}): ${e.Description || 'No description'}`).join('\n')}

All Tasks:
${todos.map(t => `- ${t.Title} [${t.Priority}] ${t.Completed ? '✓ Done' : '○ Pending'}${t.Deadline ? ` - Due: ${new Date(t.Deadline).toLocaleDateString()}` : ''}`).join('\n')}

Provide:
1. **Work-Break Balance Analysis**: 
   - Calculate total work hours vs break time from their events
   - Is the ratio healthy? (Ideal: 2-3 hours work per 15-30 min break)
   - Are they over-scheduling with back-to-back events?
   
2. **Productivity Insights**: What patterns do you notice? Are they balancing work and personal time?

3. **Actionable Suggestions**: 3-5 specific recommendations including:
   - How to improve their break time distribution
   - Suggestions for better spacing between events
   - When to schedule downtime/recovery periods
   
4. **Burnout Prevention**: Are there signs of overwork? Suggest intentional break activities

5. **Motivation**: Encouraging words about what they're doing well

6. **Time Management**: How can they better structure their day with proper breaks?

Keep it personal, warm, and specific to their actual data. Use emojis occasionally. Be encouraging but honest about the need for breaks and rest.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            setFeedbackText(response.text());
            setProcessingStatus('');

        } catch (error: any) {
            console.error('Error getting feedback:', error);
            setProcessingStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }

    async function getDailyBriefing() {
        if (!apiKey()) {
            setNotification({ show: true, message: 'Please set your Gemini API key first!', type: 'warning' });
            setShowApiKeyInput(true);
            return;
        }

        setIsProcessing(true);
        setProcessingStatus('☀️ Preparing your daily briefing...');
        setDailyBriefing('');
        setShowBriefing(true);

        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [events, todos] = await Promise.all([
                pb.collection('Calendar').getFullList({
                    expand: 'Tasks',
                    filter: `Start >= '${today.toISOString()}' && Start < '${tomorrow.toISOString()}'`,
                    sort: 'Start'
                }),
                pb.collection('Todo').getFullList({
                    filter: 'Completed = false',
                    sort: 'Priority'
                })
            ]);

            const genAI = new GoogleGenerativeAI(apiKey());
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `You are a friendly personal assistant providing a morning briefing.

Today's date: ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

IMPORTANT: This calendar uses time-blocking. Unscheduled time automatically becomes break time (🌴 Break). Encourage a healthy work-break balance.

Today's Events:
${events.length > 0 ? events.map(e => `- ${e.EventName} at ${new Date(e.Start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(e.End).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`).join('\n') : 'No events scheduled'}

Active Tasks (by priority):
${todos.length > 0 ? todos.slice(0, 10).map(t => `- [${t.Priority}] ${t.Title}${t.Deadline ? ` (Due: ${new Date(t.Deadline).toLocaleDateString()})` : ''}`).join('\n') : 'No active tasks'}

Provide a friendly, motivating daily briefing that includes:
1. **Good morning greeting** with energy and positivity
2. **Today's Focus**: What should they prioritize? (based on events and deadlines)
3. **Time Blocking Suggestion**: How to structure their day optimally with BREAKS INCLUDED
   - Identify natural break times between events
   - Suggest when to take lunch, short breaks, etc.
   - Warn if events are too back-to-back
4. **Work-Break Balance**: Calculate today's scheduled work time and recommend break frequency
   - Example: "You have 6 hours of events today. Make sure to take a 15-min break every 2 hours!"
5. **Quick Wins**: Identify 2-3 quick tasks they could knock out early
6. **Energy Management**: When to schedule breaks, meals, walks, etc. based on their event density
7. **Motivational Close**: End with an inspiring quote or thought about balance and self-care

Keep it concise (under 300 words), personal, and actionable. Use emojis to make it fun! Emphasize the importance of breaks and rest.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            setDailyBriefing(response.text());
            setProcessingStatus('');

        } catch (error: any) {
            console.error('Error getting briefing:', error);
            setProcessingStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }

    async function getSmartSuggestions() {
        if (!apiKey()) {
            setNotification({ show: true, message: 'Please set your Gemini API key first!', type: 'warning' });
            setShowApiKeyInput(true);
            return;
        }

        setIsProcessing(true);
        setProcessingStatus('🧠 Generating smart suggestions...');

        try {
            const [events, todos] = await Promise.all([
                pb.collection('Calendar').getFullList({
                    expand: 'Tasks',
                    sort: '-Start',
                    limit: 50
                }),
                pb.collection('Todo').getFullList({
                    filter: 'Completed = false',
                    sort: 'Priority'
                })
            ]);

            const genAI = new GoogleGenerativeAI(apiKey());
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const prompt = `Analyze this person's calendar and tasks to provide smart, actionable suggestions.

Recent Events: ${events.slice(0, 10).map(e => e.EventName).join(', ')}
Active Tasks: ${todos.slice(0, 10).map(t => `[${t.Priority}] ${t.Title}`).join(', ')}

Generate 5 specific, actionable suggestions. Return as JSON array:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]

Suggestions should be:
- Specific and actionable
- Related to their actual tasks/events
- Helpful for productivity
- Varied (time management, prioritization, habits, etc.)

Return ONLY the JSON array, no markdown.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const suggestions = JSON.parse(text);
            setSmartSuggestions(suggestions);
            setProcessingStatus('');

        } catch (error: any) {
            console.error('Error getting suggestions:', error);
            setProcessingStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div class="flex-1 w-full max-w-6xl mx-auto">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-white mb-2">🤖 AI Assistant</h1>
                <p class="text-gray-400">Powered by Google Gemini - Organize your thoughts and get personalized feedback</p>
            </div>

            {/* API Key Setup */}
            <Show when={showApiKeyInput()}>
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                    <h2 class="text-xl font-bold text-white mb-3">🔑 API Key Setup</h2>
                    <p class="text-gray-300 text-sm mb-4">
                        Get your free API key from <a href="https://aistudio.google.com/apikey" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Google AI Studio</a>
                    </p>
                    <div class="flex gap-2">
                        <input
                            type="password"
                            value={apiKey()}
                            onInput={(e) => setApiKey(e.currentTarget.value)}
                            placeholder="Enter your Gemini API key..."
                            class="flex-1 bg-black/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={saveApiKey}
                            class="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
                        >
                            Save
                        </button>
                    </div>
                    <Show when={apiKey()}>
                        <button
                            onClick={() => setShowApiKeyInput(false)}
                            class="mt-2 text-sm text-gray-400 hover:text-gray-300"
                        >
                            Hide
                        </button>
                    </Show>
                </div>
            </Show>

            <Show when={!showApiKeyInput() && apiKey()}>
                <button
                    onClick={() => setShowApiKeyInput(true)}
                    class="mb-6 text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2"
                >
                    🔑 Change API Key
                </button>
            </Show>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Ramble Feature */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white">💭 Brain Dump</h2>
                        <button
                            onClick={processRamble}
                            disabled={isProcessing()}
                            class="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isProcessing() ? 'Processing...' : 'Organize'}
                        </button>
                    </div>
                    <p class="text-gray-400 text-sm mb-4">
                        Just start typing about your day, thoughts, or plans. AI will extract tasks and events automatically!
                    </p>
                    <textarea
                        value={rambleText()}
                        onInput={(e) => setRambleText(e.currentTarget.value)}
                        placeholder="Example: Tomorrow I need to finish the project report by 3pm, then meet Sarah for coffee at 5. Also should call mom this week and remember to buy groceries..."
                        rows="10"
                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                    ></textarea>

                    <Show when={processingStatus()}>
                        <div class="mt-4 p-3 bg-black/50 border border-zinc-700 rounded-lg text-gray-300 text-sm">
                            {processingStatus()}
                        </div>
                    </Show>

                    <Show when={createdItems().length > 0}>
                        <div class="mt-4 space-y-2">
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="font-semibold text-white">Created Items:</h3>
                                <a 
                                    href="/calendar"
                                    class="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                                >
                                    View in Calendar →
                                </a>
                            </div>
                            <For each={createdItems()}>
                                {(item) => (
                                    <div class="p-3 bg-black/50 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-all duration-200">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <span class="text-xs font-semibold px-2 py-0.5 rounded" style={{
                                                    'background-color': item.type === 'todo' ? '#3b82f620' : `${item.data.Color || '#3b82f6'}20`,
                                                    'color': item.type === 'todo' ? '#3b82f6' : item.data.Color || '#3b82f6'
                                                }}>
                                                    {item.type === 'todo' ? '📝 Task' : '📅 Event'}
                                                </span>
                                                <div class="text-white mt-2 font-medium">
                                                    {item.type === 'todo' ? item.data.Title : item.data.EventName}
                                                </div>
                                                <Show when={item.data.Description}>
                                                    <div class="text-sm text-gray-400 mt-1">{item.data.Description}</div>
                                                </Show>
                                                <Show when={item.type === 'event' && !item.data.AllDay}>
                                                    <div class="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                        <span>🕐</span>
                                                        <span>
                                                            {new Date(item.data.Start).toLocaleDateString('en-US', { 
                                                                weekday: 'short', 
                                                                month: 'short', 
                                                                day: 'numeric' 
                                                            })}
                                                            {' '}
                                                            {new Date(item.data.Start).toLocaleTimeString('en-US', { 
                                                                hour: 'numeric', 
                                                                minute: '2-digit' 
                                                            })}
                                                            {' - '}
                                                            {new Date(item.data.End).toLocaleTimeString('en-US', { 
                                                                hour: 'numeric', 
                                                                minute: '2-digit' 
                                                            })}
                                                        </span>
                                                    </div>
                                                </Show>
                                                <Show when={item.type === 'todo' && item.data.Deadline}>
                                                    <div class="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                        <span>📅</span>
                                                        <span>Due: {new Date(item.data.Deadline).toLocaleDateString()}</span>
                                                    </div>
                                                </Show>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </div>

                {/* Feedback Feature */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white">💡 Get Feedback</h2>
                        <button
                            onClick={getFeedback}
                            disabled={isProcessing()}
                            class="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isProcessing() ? 'Analyzing...' : 'Analyze My Day'}
                        </button>
                    </div>
                    <p class="text-gray-400 text-sm mb-4">
                        Get AI-powered insights and personalized suggestions to improve your productivity!
                    </p>

                    <Show when={!showFeedback()}>
                        <div class="flex items-center justify-center h-64 border-2 border-dashed border-zinc-700 rounded-lg">
                            <div class="text-center text-gray-500">
                                <div class="text-4xl mb-2">🎯</div>
                                <p>Click "Analyze My Day" to get started</p>
                            </div>
                        </div>
                    </Show>

                    <Show when={showFeedback()}>
                        <div class="bg-black/50 border border-zinc-700 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                            <Show when={isProcessing()}>
                                <div class="text-gray-400 animate-pulse">{processingStatus()}</div>
                            </Show>
                            <Show when={!isProcessing() && feedbackText()}>
                                <div class="text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none">
                                    {feedbackText()}
                                </div>
                            </Show>
                        </div>
                    </Show>
                </div>
            </div>

            {/* Daily Briefing & Smart Suggestions */}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Daily Briefing */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white">☀️ Daily Briefing</h2>
                        <button
                            onClick={getDailyBriefing}
                            disabled={isProcessing()}
                            class="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isProcessing() ? 'Loading...' : 'Get Briefing'}
                        </button>
                    </div>
                    <p class="text-gray-400 text-sm mb-4">
                        Start your day right with an AI-powered briefing tailored to your schedule and tasks!
                    </p>

                    <Show when={!showBriefing()}>
                        <div class="flex items-center justify-center h-64 border-2 border-dashed border-zinc-700 rounded-lg">
                            <div class="text-center text-gray-500">
                                <div class="text-4xl mb-2">☀️</div>
                                <p>Get your personalized daily briefing</p>
                            </div>
                        </div>
                    </Show>

                    <Show when={showBriefing()}>
                        <div class="bg-black/50 border border-zinc-700 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                            <Show when={isProcessing()}>
                                <div class="text-gray-400 animate-pulse">{processingStatus()}</div>
                            </Show>
                            <Show when={!isProcessing() && dailyBriefing()}>
                                <div class="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {dailyBriefing()}
                                </div>
                            </Show>
                        </div>
                    </Show>
                </div>

                {/* Smart Suggestions */}
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-2xl font-bold text-white">🧠 Smart Suggestions</h2>
                        <button
                            onClick={getSmartSuggestions}
                            disabled={isProcessing()}
                            class="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isProcessing() ? 'Thinking...' : 'Generate'}
                        </button>
                    </div>
                    <p class="text-gray-400 text-sm mb-4">
                        Get AI-powered suggestions based on your patterns and workload!
                    </p>

                    <Show when={smartSuggestions().length === 0}>
                        <div class="flex items-center justify-center h-64 border-2 border-dashed border-zinc-700 rounded-lg">
                            <div class="text-center text-gray-500">
                                <div class="text-4xl mb-2">💡</div>
                                <p>Click to get smart suggestions</p>
                            </div>
                        </div>
                    </Show>

                    <Show when={smartSuggestions().length > 0}>
                        <div class="space-y-3">
                            <For each={smartSuggestions()}>
                                {(suggestion, index) => (
                                    <div class="bg-black/50 border border-zinc-700 rounded-lg p-4 hover:border-emerald-600/50 transition-all duration-200">
                                        <div class="flex items-start gap-3">
                                            <span class="text-lg">💡</span>
                                            <div class="flex-1">
                                                <p class="text-gray-300">{suggestion}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </div>
            </div>

            {/* Info Section */}
            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 class="text-lg font-bold text-white mb-3">ℹ️ AI Features</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-400">
                    <div>
                        <h4 class="font-semibold text-white mb-2">💭 Brain Dump</h4>
                        <p class="text-gray-500">
                            Natural language processing to extract tasks and events from your thoughts
                        </p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-white mb-2">💡 Feedback</h4>
                        <p class="text-gray-500">
                            Analyzes 7 days of data for productivity insights and personalized tips
                        </p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-white mb-2">☀️ Daily Briefing</h4>
                        <p class="text-gray-500">
                            Morning briefing with focus areas, time blocking, and energy management
                        </p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-white mb-2">🧠 Smart Suggestions</h4>
                        <p class="text-gray-500">
                            Context-aware recommendations based on your actual calendar and tasks
                        </p>
                    </div>
                </div>
            </div>

            {/* Notification Modal */}
            <NotificationModal
                show={notification().show}
                message={notification().message}
                type={notification().type}
                onClose={() => setNotification({ ...notification(), show: false })}
            />
        </div>
    );
}

export default AIAssistant;
