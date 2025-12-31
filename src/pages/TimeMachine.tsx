import { createSignal, onMount, For, Show } from 'solid-js';
import { pb, currentUser } from '../lib/pocketbase';
import NotificationModal from '../components/NotificationModal';

function TimeMachine() {
    const [events, setEvents] = createSignal([] as any[]);
    const [todos, setTodos] = createSignal([] as any[]);
    const [showNoteModal, setShowNoteModal] = createSignal(false);
    const [futureNotes, setFutureNotes] = createSignal([] as any[]);
    const [noteContent, setNoteContent] = createSignal('');
    const [noteDate, setNoteDate] = createSignal('');
    const [selectedMonth, setSelectedMonth] = createSignal(new Date());
    const [deleteConfirm, setDeleteConfirm] = createSignal({ show: false, noteId: '' });
    const [notification, setNotification] = createSignal<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
        show: false,
        message: '',
        type: 'info'
    });

    async function fetchData() {
        try {
            console.log('Fetching Time Machine data...');
            const eventRecords = await pb.collection('Calendar').getFullList({
                expand: 'Tasks',
                sort: '-Start'
            });
            console.log('Time Machine events fetched:', eventRecords.length);
            setEvents(eventRecords);

            const todoRecords = await pb.collection('Todo').getFullList({
                sort: '-created'
            });
            setTodos(todoRecords);
        } catch (error) {
            console.error('Error fetching Time Machine data:', error);
        }
    }

    async function fetchFutureNotes() {
        try {
            const notes = await pb.collection('FutureNotes').getFullList({
                sort: 'DeliveryDate',
                filter: `user = "${currentUser()?.id}"`
            });
            setFutureNotes(notes);
        } catch (error) {
            console.log('FutureNotes collection may not exist yet:', error);
        }
    }

    async function createFutureNote() {
        if (!noteContent() || !noteDate()) return;

        await pb.collection('FutureNotes').create({
            Content: noteContent(),
            DeliveryDate: new Date(noteDate()).toISOString(),
            Delivered: false
        });

        setNoteContent('');
        setNoteDate('');
        setShowNoteModal(false);
        fetchFutureNotes();
    }

    async function deleteFutureNote(id: string) {
        setDeleteConfirm({ show: true, noteId: id });
    }

    async function confirmDeleteNote() {
        const noteId = deleteConfirm().noteId;
        setDeleteConfirm({ show: false, noteId: '' });
        
        try {
            await pb.collection('FutureNotes').delete(noteId);
            await fetchFutureNotes();
            setNotification({ show: true, message: 'Note deleted successfully', type: 'success' });
        } catch (error) {
            setNotification({ show: true, message: 'Failed to delete note', type: 'error' });
        }
    }

    function getMonthEvents() {
        const month = selectedMonth().getMonth();
        const year = selectedMonth().getFullYear();
        
        return events().filter(event => {
            const eventDate = new Date(event.Start);
            return eventDate.getMonth() === month && eventDate.getFullYear() === year;
        });
    }

    function getMonthTodos() {
        const month = selectedMonth().getMonth();
        const year = selectedMonth().getFullYear();
        
        return todos().filter(todo => {
            if (!todo.created) return false;
            const todoDate = new Date(todo.created);
            return todoDate.getMonth() === month && todoDate.getFullYear() === year;
        });
    }

    function previousMonth() {
        const newDate = new Date(selectedMonth());
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedMonth(newDate);
    }

    function nextMonth() {
        const newDate = new Date(selectedMonth());
        newDate.setMonth(newDate.getMonth() + 1);
        setSelectedMonth(newDate);
    }

    function goToCurrentMonth() {
        setSelectedMonth(new Date());
    }

    function getProductivityScore(): number {
        const monthTodos = getMonthTodos();
        const completedTasks = monthTodos.filter(t => t.Completed).length;
        const totalTasks = monthTodos.length;
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }

    function getStreakDays(): number {
        const monthEvents = getMonthEvents();
        const uniqueDays = new Set<string>();
        
        monthEvents.forEach(event => {
            const eventDate = new Date(event.Start);
            const dateStr = eventDate.toISOString().split('T')[0];
            uniqueDays.add(dateStr);
        });

        return uniqueDays.size;
    }

    function getHeatMapData(): { date: string; count: number; dayOfWeek: number }[] {
        const heatMap: { [key: string]: number } = {};
        const month = selectedMonth().getMonth();
        const year = selectedMonth().getFullYear();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];
            heatMap[dateStr] = 0;
        }

        const monthEvents = getMonthEvents();
        monthEvents.forEach(event => {
            const eventDate = new Date(event.Start);
            const dateStr = eventDate.toISOString().split('T')[0];
            if (heatMap.hasOwnProperty(dateStr)) {
                heatMap[dateStr]++;
            }
        });

        return Object.entries(heatMap).map(([date, count]) => {
            const d = new Date(date);
            return { date, count, dayOfWeek: d.getDay() };
        });
    }

    function getHeatColor(count: number): string {
        if (count === 0) return '#18181b';
        if (count <= 2) return '#3b82f6';
        if (count <= 4) return '#8b5cf6';
        if (count <= 6) return '#ec4899';
        return '#ef4444';
    }

    onMount(() => {
        fetchData();
        fetchFutureNotes();
    });

    return (
        <div class="flex-1 w-full">
            <div class="mb-6 flex items-center justify-between">
                <div>
                    <h1 class="text-4xl font-bold text-white mb-1">⏰ Time Machine</h1>
                    <p class="text-gray-400">Monthly reflection and insights</p>
                </div>
            </div>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <button
                            onClick={previousMonth}
                            class="px-2 py-1 bg-black border border-zinc-800 rounded text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200"
                        >
                            ←
                        </button>
                        <h2 class="text-xl font-bold text-white min-w-[200px] text-center">
                            {selectedMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button
                            onClick={nextMonth}
                            class="px-2 py-1 bg-black border border-zinc-800 rounded text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200"
                        >
                            →
                        </button>
                        <button
                            onClick={goToCurrentMonth}
                            class="px-3 py-1 bg-black border border-zinc-800 rounded text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200 text-sm ml-2"
                        >
                            Current Month
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                    <div class="text-gray-400 text-3xl mb-2">📊</div>
                    <div class="text-3xl font-bold text-white mb-1">{getProductivityScore()}%</div>
                    <div class="text-sm text-gray-400">Tasks Completed This Month</div>
                </div>

                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                    <div class="text-gray-400 text-3xl mb-2">📆</div>
                    <div class="text-3xl font-bold text-white mb-1">{getStreakDays()} days</div>
                    <div class="text-sm text-gray-400">Active Days This Month</div>
                </div>

                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-200">
                    <div class="text-gray-400 text-3xl mb-2">🎯</div>
                    <div class="text-3xl font-bold text-white mb-1">{getMonthEvents().length}</div>
                    <div class="text-sm text-gray-400">Events This Month</div>
                </div>
            </div>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                <h2 class="text-xl font-bold text-white mb-4">📈 Daily Activity</h2>
                
                <div class="grid grid-cols-7 gap-2 mb-2">
                    <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}>
                        {(day) => (
                            <div class="text-center text-xs font-semibold text-gray-400">
                                {day}
                            </div>
                        )}
                    </For>
                </div>

                <div class="grid grid-cols-7 gap-2">
                    <For each={Array.from({ length: getHeatMapData()[0]?.dayOfWeek || 0 })}>
                        {() => <div class="aspect-square"></div>}
                    </For>
                    
                    <For each={getHeatMapData()}>
                        {(day) => (
                            <div
                                class="aspect-square rounded-lg flex flex-col items-center justify-center hover:border-zinc-700 transition-transform duration-200 cursor-pointer border border-zinc-800"
                                style={{ 'background-color': getHeatColor(day.count) }}
                                title={`${new Date(day.date).toLocaleDateString()}: ${day.count} event${day.count !== 1 ? 's' : ''}`}
                            >
                                <div class="text-xs font-semibold text-white">
                                    {new Date(day.date).getDate()}
                                </div>
                                <Show when={day.count > 0}>
                                    <div class="text-[10px] text-white/70">
                                        {day.count}
                                    </div>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>

                <div class="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span>Less</span>
                    <div class="flex gap-1">
                        <div class="w-3 h-3 rounded-sm" style="background-color: #18181b"></div>
                        <div class="w-3 h-3 rounded-sm" style="background-color: #3b82f6"></div>
                        <div class="w-3 h-3 rounded-sm" style="background-color: #8b5cf6"></div>
                        <div class="w-3 h-3 rounded-sm" style="background-color: #ec4899"></div>
                        <div class="w-3 h-3 rounded-sm" style="background-color: #ef4444"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-white">💌 Messages to Future Self</h2>
                    <button
                        onClick={() => setShowNoteModal(true)}
                        class="px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    >
                        + New Note
                    </button>
                </div>

                <div class="space-y-3">
                    <For each={futureNotes()}>
                        {(note) => {
                            const deliveryDate = new Date(note.DeliveryDate);
                            const isDelivered = deliveryDate <= new Date();

                            return (
                                <div class={`p-4 rounded-lg border transition-all duration-200 ${
                                    isDelivered 
                                        ? 'bg-green-500/10 border-green-500/20' 
                                        : 'bg-zinc-800 border-zinc-700'
                                }`}>
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1">
                                            <p class="text-white mb-2">{note.Content}</p>
                                            <p class="text-sm text-gray-400">
                                                {isDelivered ? '✓ ' : '⏰ '}
                                                {deliveryDate.toLocaleDateString('en-US', { 
                                                    weekday: 'long', 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteFutureNote(note.id)}
                                            class="text-red-400 hover:text-red-300 transition-colors duration-200 ml-4"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        }}
                    </For>
                    <Show when={futureNotes().length === 0}>
                        <p class="text-gray-500 text-center py-8">No future notes yet. Create one!</p>
                    </Show>
                </div>
            </div>

            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 class="text-xl font-bold text-white mb-4">📜 Events This Month</h2>
                <div class="space-y-4 max-h-[500px] overflow-y-auto">
                    <For each={getMonthEvents()}>
                        {(event) => (
                            <div class="flex gap-4 items-start">
                                <div 
                                    class="w-3 h-3 rounded-full mt-2 shrink-0"
                                    style={{ 'background-color': event.Color }}
                                ></div>
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h3 class="font-semibold text-white">{event.EventName}</h3>
                                        <Show when={event.expand?.Tasks?.length > 0}>
                                            <span class="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                                                {event.expand.Tasks.filter((t: any) => t.Completed).length}/{event.expand.Tasks.length} tasks
                                            </span>
                                        </Show>
                                    </div>
                                    <p class="text-sm text-gray-400">
                                        {new Date(event.Start).toLocaleDateString('en-US', { 
                                            weekday: 'short', 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                        {!event.AllDay && ` at ${new Date(event.Start).toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit' 
                                        })}`}
                                    </p>
                                    <Show when={event.Description}>
                                        <p class="text-sm text-gray-500 mt-1">{event.Description}</p>
                                    </Show>
                                </div>
                            </div>
                        )}
                    </For>
                    <Show when={getMonthEvents().length === 0}>
                        <p class="text-gray-500 text-center py-8">No events for this month yet</p>
                    </Show>
                </div>
            </div>

            <Show when={showNoteModal()}>
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowNoteModal(false)}>
                    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-2xl font-bold text-white">💌 Message to Future Self</h2>
                            <button
                                onClick={() => setShowNoteModal(false)}
                                class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            createFutureNote();
                        }}>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Your Message:</label>
                                <textarea
                                    value={noteContent()}
                                    onInput={(e) => setNoteContent(e.currentTarget.value)}
                                    required
                                    rows="4"
                                    placeholder="Write a message to your future self..."
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200 resize-none"
                                ></textarea>
                            </div>

                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Delivery Date:</label>
                                <input
                                    type="date"
                                    value={noteDate()}
                                    onInput={(e) => setNoteDate(e.currentTarget.value)}
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                />
                            </div>

                            <button
                                type="submit"
                                class="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 active:scale-95 transition-all duration-200"
                            >
                                Send to Future
                            </button>
                        </form>
                    </div>
                </div>
            </Show>

            {/* Delete Confirmation Modal */}
            <Show when={deleteConfirm().show}>
                <div 
                    class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fadeIn"
                    onClick={() => setDeleteConfirm({ show: false, noteId: '' })}
                >
                    <div 
                        class="bg-zinc-900 border border-red-600/30 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="flex items-start gap-4 mb-6">
                            <div class="text-4xl">⚠️</div>
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-white mb-2">Delete Note?</h3>
                                <p class="text-gray-300 leading-relaxed">
                                    Are you sure you want to delete this future note? This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm({ show: false, noteId: '' })}
                                class="flex-1 px-6 py-2.5 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteNote}
                                class="flex-1 px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-all duration-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </Show>

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

export default TimeMachine;
