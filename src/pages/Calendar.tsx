import { createSignal, onMount, For, Show } from 'solid-js';
import { pb, currentUser } from '../lib/pocketbase';
import { refreshNotifications } from '../lib/notifications';
import ConfirmModal from '../components/ConfirmModal';

function Calendar() {

    const [events, setEvents] = createSignal([] as any[]);
    const [currentDate, setCurrentDate] = createSignal(new Date());
    const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
    const [showEventModal, setShowEventModal] = createSignal(false);
    const [viewMode, setViewMode] = createSignal<'month' | 'week'>('month');
    const [hoveredEvent, setHoveredEvent] = createSignal<any>(null);
    const [quickViewEvent, setQuickViewEvent] = createSignal<any>(null);
    
    // Form fields
    const [eventName, setEventName] = createSignal('');
    const [description, setDescription] = createSignal('');
    const [allDay, setAllDay] = createSignal(false);
    const [startDate, setStartDate] = createSignal('');
    const [startTime, setStartTime] = createSignal('');
    const [endDate, setEndDate] = createSignal('');
    const [endTime, setEndTime] = createSignal('');
    const [location, setLocation] = createSignal({ lat: 0, lon: 0 });
    const [selectedTasks, setSelectedTasks] = createSignal<string[]>([]);
    const [todoItems, setTodoItems] = createSignal([] as any[]);
    const [eventColor, setEventColor] = createSignal('#3b82f6');
    const [focusMode, setFocusMode] = createSignal(false);
    const [newTasks, setNewTasks] = createSignal<{title: string, completed: boolean}[]>([]);
    const [newTaskInput, setNewTaskInput] = createSignal('');
    const [editingEvent, setEditingEvent] = createSignal<any>(null);
    const [showEditEventModal, setShowEditEventModal] = createSignal(false);
    const [locationLat, setLocationLat] = createSignal(0);
    const [locationLon, setLocationLon] = createSignal(0);
    const [quickAddTasks, setQuickAddTasks] = createSignal<string[]>([]);
    const [linkedTaskIds, setLinkedTaskIds] = createSignal<string[]>([]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [recurrence, setRecurrence] = createSignal('none');
    const [recurrenceEndDate, setRecurrenceEndDate] = createSignal('');
    const [allTags, setAllTags] = createSignal([] as any[]);
    const [showTasksModal, setShowTasksModal] = createSignal(false);
    const [selectedDateTasks, setSelectedDateTasks] = createSignal<Date | null>(null);
    const [confirmDelete, setConfirmDelete] = createSignal({ show: false, eventId: '' });
    let isFetchingTodos = false;
    
    const colorPresets = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Purple', value: '#a855f7' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Orange', value: '#f97316' },
        { name: 'Yellow', value: '#eab308' },
        { name: 'Green', value: '#22c55e' },
        { name: 'Cyan', value: '#06b6d4' },
    ];

    async function fetchEvents() {
        try {
            console.log('Fetching events...');
            const records = await pb.collection('Calendar').getFullList({
                expand: 'Tasks,Tags',
                sort: 'Start'
            });
            console.log('Events fetched:', records.length, records);
            
            // Expand recurring events into instances
            const expandedEvents: any[] = [];
            const viewEndDate = new Date();
            viewEndDate.setMonth(viewEndDate.getMonth() + 3); // Show 3 months ahead
            
            for (const event of records) {
                expandedEvents.push(event); // Add original event
                
                // If event has recurrence, generate instances
                if (event.Recurrence && event.Recurrence !== 'none') {
                    const startDate = new Date(event.Start);
                    const endEventDate = event.RecurrenceEndDate ? new Date(event.RecurrenceEndDate) : viewEndDate;
                    const eventDuration = new Date(event.End).getTime() - new Date(event.Start).getTime();
                    
                    let currentDate = new Date(startDate);
                    let instanceCount = 0;
                    const maxInstances = 100;
                    
                    while (currentDate <= endEventDate && instanceCount < maxInstances) {
                        // Generate next occurrence
                        switch (event.Recurrence) {
                            case 'daily':
                                currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
                                break;
                            case 'weekly':
                                currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                                break;
                            case 'monthly':
                                const nextMonth = new Date(currentDate);
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                currentDate = nextMonth;
                                break;
                        }
                        
                        if (currentDate > endEventDate || currentDate > viewEndDate) break;
                        
                        // Create instance
                        const instance = {
                            ...event,
                            id: `${event.id}-recur-${instanceCount}`,
                            Start: currentDate.toISOString(),
                            End: new Date(currentDate.getTime() + eventDuration).toISOString(),
                            isRecurringInstance: true,
                            originalEventId: event.id
                        };
                        
                        expandedEvents.push(instance);
                        instanceCount++;
                    }
                }
            }
            
            // Force a clean update by clearing first
            setEvents([]);
            await new Promise(resolve => setTimeout(resolve, 5));
            setEvents(expandedEvents);
            
            console.log('Events signal after fetch (with recurring):', expandedEvents.length);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    }

    async function fetchTodos() {
        if (isFetchingTodos) {
            console.log('Already fetching todos, skipping...');
            return;
        }
        
        isFetchingTodos = true;
        try {
            const items = await pb.collection('Todo').getFullList({
                filter: `user = "${currentUser()?.id}"`,
                expand: 'Tags'
            });
            console.log('Fetched todos:', items.length);
            console.log('All todos:', items.map(t => ({
                title: t.Title,
                deadline: t.Deadline,
                hasDeadline: !!t.Deadline
            })));
            console.log('Todos with deadlines:', items.filter(t => t.Deadline).map(t => ({
                title: t.Title,
                deadline: t.Deadline
            })));
            setTodoItems(items);
        } catch (error) {
            console.error('Error fetching todos:', error);
        } finally {
            isFetchingTodos = false;
        }
    }
    
    function getTasksForDate(date: Date): any[] {
        const filtered = todoItems().filter(task => {
            if (!task.Deadline) return false;
            
            // Parse the deadline - it's in UTC
            const deadline = new Date(task.Deadline);
            const checkDate = new Date(date);
            
            // Get the local date parts from the deadline (this converts from UTC to local time)
            const deadlineYear = deadline.getFullYear();
            const deadlineMonth = deadline.getMonth();
            const deadlineDay = deadline.getDate();
            
            // Compare with check date
            return deadlineYear === checkDate.getFullYear() &&
                   deadlineMonth === checkDate.getMonth() &&
                   deadlineDay === checkDate.getDate();
        });
        
        // Debug logging
        if (filtered.length > 0) {
            console.log('Tasks for date:', date, filtered);
        }
        
        return filtered;
    }
    
    async function toggleTaskCompletion(taskId: string, currentStatus: boolean) {
        await pb.collection('Todo').update(taskId, {
            Completed: !currentStatus,
            CompletedAt: !currentStatus ? new Date().toISOString() : null
        });
        await fetchTodos();
        refreshNotifications();
    }
    
    async function fetchTags() {
        try {
            const tags = await pb.collection('Tags').getFullList({
                filter: `user = "${currentUser()?.id}"`
            });
            setAllTags(tags);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    }

    async function createEvent() {
        const start = allDay() 
            ? new Date(startDate()).toISOString() 
            : new Date(`${startDate()}T${startTime()}`).toISOString();
        const end = allDay() 
            ? new Date(endDate()).toISOString() 
            : new Date(`${endDate()}T${endTime()}`).toISOString();

        // Create inline tasks first
        const createdTaskIds: string[] = [];
        for (const taskTitle of quickAddTasks()) {
            if (taskTitle.trim()) {
                const taskRecord = await pb.collection('Todo').create({
                    Title: taskTitle,
                    Description: '',
                    Completed: false,
                    Priority: 'P2',
                });
                createdTaskIds.push(taskRecord.id);
            }
        }

        // Combine created tasks with linked tasks
        const allTaskIds = [...createdTaskIds, ...linkedTaskIds()];

        const data = {
            EventName: eventName(),
            Description: description(),
            AllDay: allDay(),
            Start: start,
            End: end,
            Location: { lat: locationLat() || 0, lon: locationLon() || 0 },
            Tasks: allTaskIds,
            Color: eventColor() || '#3b82f6',
            Tags: selectedTags() || [],
            Recurrence: recurrence() === 'none' ? null : recurrence(),
            RecurrenceEndDate: recurrenceEndDate() || null,
            user: currentUser()?.id
        };

        const record = await pb.collection('Calendar').create(data);
        
        // Recurring instances are generated virtually in fetchEvents()
        
        fetchEvents();
        fetchTodos();
        refreshNotifications();
        resetForm();
        setShowEventModal(false);
    }

    async function updateEvent() {
        if (!editingEvent()) return;

        const start = allDay() 
            ? new Date(startDate()).toISOString() 
            : new Date(`${startDate()}T${startTime()}`).toISOString();
        const end = allDay() 
            ? new Date(endDate()).toISOString() 
            : new Date(`${endDate()}T${endTime()}`).toISOString();

        // Create inline tasks first
        const createdTaskIds: string[] = [];
        for (const taskTitle of quickAddTasks()) {
            if (taskTitle.trim()) {
                const taskRecord = await pb.collection('Todo').create({
                    Title: taskTitle,
                    Description: '',
                    Completed: false,
                    Priority: 'P2',
                });
                createdTaskIds.push(taskRecord.id);
            }
        }

        // Combine created tasks with linked tasks
        const allTaskIds = [...createdTaskIds, ...linkedTaskIds()];

        const data = {
            EventName: eventName(),
            Description: description(),
            AllDay: allDay(),
            Start: start,
            End: end,
            Location: { lat: locationLat() || 0, lon: locationLon() || 0 },
            Tasks: allTaskIds,
            Color: eventColor() || '#3b82f6',
            Tags: selectedTags() || [],
            Recurrence: recurrence() === 'none' ? null : recurrence(),
            RecurrenceEndDate: recurrenceEndDate() || null,
            user: currentUser()?.id
        };

        await pb.collection('Calendar').update(editingEvent().id, data);
        await fetchEvents();
        await fetchTodos();
        
        // Refresh quickViewEvent if it was showing this event
        const updatedEvent = await pb.collection('Calendar').getOne(editingEvent().id, {
            expand: 'Tasks,Tags'
        });
        setQuickViewEvent(updatedEvent);
        
        refreshNotifications();
        resetForm();
        setShowEditEventModal(false);
        setEditingEvent(null);
    }

    async function deleteEvent(id: string) {
        setConfirmDelete({ show: true, eventId: id });
    }

    async function confirmDeleteEvent() {
        const eventId = confirmDelete().eventId;
        if (eventId) {
            await pb.collection('Calendar').delete(eventId);
            setQuickViewEvent(null);
            setQuickViewEvent(null);
            fetchEvents();
            refreshNotifications();
        }
        setConfirmDelete({ show: false, eventId: '' });
    }

    function startEditingEvent(event: any) {
        setEditingEvent(event);
        setEventName(event.EventName);
        setDescription(event.Description || '');
        setAllDay(event.AllDay);
        
        const startDateTime = new Date(event.Start);
        const endDateTime = new Date(event.End);
        
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setEndDate(endDateTime.toISOString().split('T')[0]);

        if (!event.AllDay) {
            setStartTime(startDateTime.toTimeString().slice(0, 5));
            setEndTime(endDateTime.toTimeString().slice(0, 5));
        }
        
        setLocationLat(event.Location?.lat || 0);
        setLocationLon(event.Location?.lon || 0);
        setEventColor(event.Color || '#3b82f6');
        setLinkedTaskIds(event.Tasks || []);
        setQuickAddTasks([]);
        setSelectedTags(event.expand?.Tags?.map((t: any) => t.id) || []);
        setRecurrence(event.Recurrence || 'none');
        setRecurrenceEndDate(event.RecurrenceEndDate || '');
        
        setQuickViewEvent(null);
        setShowEditEventModal(true);
    }

    function resetForm() {
        setEventName('');
        setDescription('');
        setAllDay(false);
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        setLocation({ lat: 0, lon: 0 });
        setSelectedTasks([]);
        setEventColor('#3b82f6');
        setNewTasks([]);
        setNewTaskInput('');
        setLocationLat(0);
        setLocationLon(0);
        setQuickAddTasks([]);
        setLinkedTaskIds([]);
        setEditingEvent(null);
        setSelectedTags([]);
        setRecurrence('none');
        setRecurrenceEndDate('');
    }

    async function toggleTaskCompletion(taskId: string, currentStatus: boolean) {
        await pb.collection('Todo').update(taskId, {
            Completed: !currentStatus,
            CompletedAt: !currentStatus ? new Date().toISOString() : null
        });
        
        // Refresh all data
        await fetchTodos();
        await fetchEvents(); // This will update the events signal with fresh expand data
        
        // Refresh quickViewEvent if it's open
        if (quickViewEvent()) {
            try {
                const refreshed = await pb.collection('Calendar').getOne(quickViewEvent()!.id, {
                    expand: 'Tasks,Tags'
                });
                setQuickViewEvent(refreshed);
            } catch (error) {
                console.error('Error refreshing quick view event:', error);
            }
        }
    }

    async function openEventModal(eventId: string) {
        try {
            const event = await pb.collection('Calendar').getOne(eventId, {
                expand: 'Tasks,Tags'
            });
            setQuickViewEvent(event);
        } catch (error) {
            console.error('Error fetching event:', error);
        }
    }

    function getEventsForDate(date: Date): any[] {
        return events().filter(event => {
            const eventStart = new Date(event.Start);
            const eventEnd = new Date(event.End);
            const checkDate = new Date(date);
            
            // Create new date objects for comparison to avoid mutation
            const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            const eventEndDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
            const checkDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
            
            // Check if date falls within event range
            const isInRange = checkDay >= eventStartDay && checkDay <= eventEndDay;
            
            // Focus mode: only show events with incomplete tasks
            if (focusMode() && isInRange) {
                const expandedTasks = event.expand?.Tasks || [];
                return expandedTasks.some((task: any) => !task.Completed);
            }
            
            return isInRange;
        });
    }

    function getDaysInMonth(date: Date): Date[] {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: Date[] = [];

        // Add previous month's days
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
            days.push(prevDate);
        }

        // Add current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        // Add next month's days to complete the grid
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push(new Date(year, month + 1, i));
        }

        return days;
    }

    // Generate break blocks for unscheduled time
    function getEventsWithBreaks(date: Date): any[] {
        const dayEvents = getEventsForDate(date);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Sort events by start time
        const sortedEvents = [...dayEvents].sort((a, b) => 
            new Date(a.Start).getTime() - new Date(b.Start).getTime()
        );

        const result: any[] = [];
        let currentTime = dayStart.getTime();

        sortedEvents.forEach((event) => {
            const eventStart = new Date(event.Start);
            const eventEnd = new Date(event.End);
            
            // Cap event times to current day
            const displayStart = eventStart < dayStart ? dayStart : eventStart;
            const displayEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
            
            const displayStartTime = displayStart.getTime();
            const displayEndTime = displayEnd.getTime();

            // Add break block if there's a gap
            if (currentTime < displayStartTime) {
                result.push({
                    id: `break-${currentTime}`,
                    EventName: '🌴 Break',
                    Description: 'Free time',
                    Start: new Date(currentTime).toISOString(),
                    End: new Date(displayStartTime).toISOString(),
                    AllDay: false,
                    Color: '#1a1a1a',
                    isBreak: true,
                    Tasks: []
                });
            }

            // Add the actual event
            result.push(event);
            currentTime = Math.max(currentTime, displayEndTime);
        });

        // Add final break block if day isn't fully scheduled
        if (currentTime < dayEnd.getTime()) {
            result.push({
                id: `break-${currentTime}`,
                EventName: '🌴 Break',
                Description: 'Free time',
                Start: new Date(currentTime).toISOString(),
                End: dayEnd.toISOString(),
                AllDay: false,
                Color: '#1a1a1a',
                isBreak: true,
                Tasks: []
            });
        }

        return result;
    }

    function previousMonth() {
        setCurrentDate(new Date(currentDate().getFullYear(), currentDate().getMonth() - 1));
    }

    function nextMonth() {
        setCurrentDate(new Date(currentDate().getFullYear(), currentDate().getMonth() + 1));
    }

    function goToToday() {
        setCurrentDate(new Date());
    }

    function getWeekDays(): Date[] {
        const current = new Date(currentDate());
        // Set to start of week (Sunday) 
        const dayOfWeek = current.getDay();
        const sunday = new Date(current);
        sunday.setDate(current.getDate() - dayOfWeek);
        sunday.setHours(0, 0, 0, 0);
        
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(sunday.getTime() + i * 24 * 60 * 60 * 1000);
            days.push(day);
        }
        return days;
    }

    function previousWeek() {
        const newDate = new Date(currentDate().getTime() - 7 * 24 * 60 * 60 * 1000);
        setCurrentDate(newDate);
    }

    function nextWeek() {
        const newDate = new Date(currentDate().getTime() + 7 * 24 * 60 * 60 * 1000);
        setCurrentDate(newDate);
    }

    onMount(async () => {
        console.log('Calendar mounted, fetching data...');
        setIsLoading(true);
        await fetchEvents();
        await fetchTodos();
        await fetchTags();
        setIsLoading(false);
        console.log('Events after mount:', events().length);
    });

    return (
        <div class="flex-1 w-full">
            <div class="mb-6 flex items-center justify-between">
                <h1 class="text-4xl font-bold text-white">📅 Calendar</h1>
                <div class="flex gap-2">
                    <button
                        onClick={async () => {
                            await fetchTodos();
                            await fetchEvents();
                        }}
                        class="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200 text-sm"
                        title="Refresh tasks and events"
                    >
                        🔄
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode() === 'month' ? 'week' : 'month')}
                        class="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200 text-sm"
                    >
                        {viewMode() === 'month' ? '📆 Week' : '🗓️ Month'}
                    </button>
                    <button
                        onClick={() => {
                            setShowEventModal(true);
                            const today = new Date();
                            setStartDate(today.toISOString().split('T')[0]);
                            setEndDate(today.toISOString().split('T')[0]);
                        }}
                        class="px-4 py-1.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 active:scale-95 transition-all duration-200 text-sm"
                    >
                        + New Event
                    </button>
                </div>
            </div>

            {/* Calendar Header */}
            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (viewMode() === 'month') {
                                    previousMonth();
                                } else {
                                    previousWeek();
                                }
                            }}
                            class="px-2 py-1 bg-black border border-zinc-800 rounded text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200"
                        >
                            ←
                        </button>
                        <h2 class="text-xl font-bold text-white min-w-[280px] text-center">
                            <Show when={viewMode() === 'month'}>
                                {currentDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Show>
                            <Show when={viewMode() === 'week'}>
                                {(() => {
                                    const weekDays = getWeekDays();
                                    const firstDay = weekDays[0];
                                    const lastDay = weekDays[6];
                                    const sameMonth = firstDay.getMonth() === lastDay.getMonth();
                                    if (sameMonth) {
                                        return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
                                    } else {
                                        return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                                    }
                                })()}
                            </Show>
                        </h2>
                        <button
                            onClick={() => {
                                if (viewMode() === 'month') {
                                    nextMonth();
                                } else {
                                    nextWeek();
                                }
                            }}
                            class="px-2 py-1 bg-black border border-zinc-800 rounded text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200"
                        >
                            →
                        </button>
                        <button
                            onClick={goToToday}
                            class="px-3 py-1 bg-black border border-zinc-800 rounded text-gray-400 hover:text-white hover:border-zinc-700 transition-all duration-200 text-sm ml-2"
                        >
                            Today
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            onClick={() => setFocusMode(!focusMode())}
                            class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                focusMode() 
                                    ? 'bg-purple-600 text-white border-purple-600' 
                                    : 'bg-black text-gray-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                            }`}
                        >
                            {focusMode() ? '🎯 Focus' : '👁️ All'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Views */}
            <Show when={isLoading()}>
                <div class="flex items-center justify-center h-64 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <div class="text-center">
                        <div class="text-4xl mb-3 animate-pulse">📅</div>
                        <div class="text-gray-400">Loading events...</div>
                    </div>
                </div>
            </Show>
            <Show when={!isLoading()}>
            <Show when={viewMode() === 'month'}>
                <div class="flex gap-6">
                    {/* Month Grid */}
                    <div class="flex-1">
                        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            {/* Day headers */}
                            <div class="grid grid-cols-7 border-b border-zinc-800 bg-black">
                                <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}>
                                    {(day) => (
                                        <div class="p-3 text-center text-sm font-semibold text-gray-400">
                                            {day}
                                        </div>
                                    )}
                                </For>
                            </div>

                            {/* Calendar grid */}
                            <div class="grid grid-cols-7">
                                <For each={getDaysInMonth(currentDate())}>
                                    {(day) => {
                                        const isCurrentMonth = day.getMonth() === currentDate().getMonth();
                                        const isToday = day.toDateString() === new Date().toDateString();
                                        const dayEvents = getEventsForDate(day);
                                        const tasksForDay = getTasksForDate(day);
                                        const taskCount = tasksForDay.length;

                                        return (
                                            <div
                                                class={`min-h-[120px] border-r border-b border-zinc-800 p-2 transition-all duration-200 ${
                                                    isCurrentMonth 
                                                        ? 'bg-zinc-900 hover:bg-zinc-900/80 cursor-pointer' 
                                                        : 'bg-black/50'
                                                }`}
                                                onClick={() => {
                                                    setSelectedDate(day);
                                                }}
                                            >
                                                <div class="flex items-center justify-between mb-1">
                                                    <div class={`text-sm font-medium ${
                                                        isToday 
                                                            ? 'bg-white text-black w-6 h-6 rounded-full flex items-center justify-center font-bold' 
                                                            : isCurrentMonth ? 'text-white' : 'text-gray-600'
                                                    }`}>
                                                        {day.getDate()}
                                                    </div>
                                                    <Show when={taskCount > 0}>
                                                        <div 
                                                            class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-medium cursor-pointer hover:bg-blue-500/30 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDateTasks(day);
                                                                setShowTasksModal(true);
                                                            }}
                                                        >
                                                            {taskCount}✓
                                                        </div>
                                                    </Show>
                                                </div>
                                                <div class="space-y-1">
                                                    <For each={dayEvents.slice(0, 3)}>
                                                        {(event) => {
                                                            const totalTasks = event.expand?.Tasks?.length || 0;
                                                            const completedTasks = event.expand?.Tasks?.filter((t: any) => t.Completed).length || 0;
                                                            const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
                                                            
                                                            return (
                                                                <div
                                                                    class="text-xs px-2 py-1 rounded transition-all duration-200 hover:opacity-80 cursor-pointer"
                                                                    style={{ 
                                                                        'background-color': event.Color || '#3b82f6',
                                                                        opacity: allTasksCompleted ? 0.6 : 0.9
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEventModal(event.id);
                                                                    }}
                                                                    onMouseEnter={() => setHoveredEvent(event)}
                                                                    onMouseLeave={() => setHoveredEvent(null)}
                                                                >
                                                                    <div class={`truncate font-medium ${allTasksCompleted ? 'line-through' : ''}`}>
                                                                        {allTasksCompleted ? '✓ ' : ''}{event.EventName}
                                                                    </div>
                                                                    <Show when={totalTasks > 0}>
                                                                        <div class="text-[10px] opacity-75 mt-0.5">
                                                                            ✓ {completedTasks}/{totalTasks} tasks
                                                                        </div>
                                                                    </Show>
                                                                </div>
                                                            );
                                                        }}
                                                    </For>
                                                    <Show when={dayEvents.length > 3}>
                                                        <div class="text-xs text-gray-500 px-2">
                                                            +{dayEvents.length - 3} more
                                                        </div>
                                                    </Show>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar for selected date */}
                    <Show when={selectedDate()}>
                        <div class="w-80 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit sticky top-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-white">
                                    {selectedDate()!.toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </h3>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    class="text-gray-400 hover:text-white transition-colors duration-200"
                                >
                                    ✕
                                </button>
                            </div>
                            <div class="space-y-2 max-h-[600px] overflow-y-auto">
                                <For each={getEventsWithBreaks(selectedDate()!)}>
                                    {(event) => {
                                        const totalTasks = event.expand?.Tasks?.length || 0;
                                        const completedTasks = event.expand?.Tasks?.filter((t: any) => t.Completed).length || 0;
                                        const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
                                        const isBreak = event.isBreak || false;
                                        
                                        return (
                                        <div
                                            class={`p-3 rounded-lg border transition-all duration-200 ${
                                                isBreak 
                                                    ? 'border-dashed border-zinc-700 bg-zinc-900/30' 
                                                    : 'border-zinc-800 hover:border-zinc-700 cursor-pointer'
                                            }`}
                                            style={{ 
                                                'background-color': isBreak ? 'transparent' : `${event.Color}15`, 
                                                opacity: isBreak ? 0.6 : (allTasksCompleted ? 0.7 : 1) 
                                            }}
                                            onClick={() => !isBreak && openEventModal(event.id)}
                                        >
                                            <div class="flex items-start gap-2">
                                                <div 
                                                    class={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isBreak ? 'bg-gray-700' : ''}`}
                                                    style={{ 'background-color': isBreak ? '#404040' : event.Color }}
                                                ></div>
                                                <div class="flex-1">
                                                    <h4 class={`font-semibold ${isBreak ? 'text-gray-500 italic' : 'text-white'} ${allTasksCompleted && !isBreak ? 'line-through' : ''}`}>
                                                        {allTasksCompleted && !isBreak ? '✓ ' : ''}{event.EventName}
                                                    </h4>
                                                    <Show when={!event.AllDay}>
                                                        <p class="text-xs text-gray-400 mt-1">
                                                            {new Date(event.Start).toLocaleTimeString('en-US', { 
                                                                hour: 'numeric', 
                                                                minute: '2-digit' 
                                                            })} - {new Date(event.End).toLocaleTimeString('en-US', { 
                                                                hour: 'numeric', 
                                                                minute: '2-digit' 
                                                            })}
                                                        </p>
                                                    </Show>
                                                    <Show when={!isBreak && event.expand?.Tasks?.length > 0}>
                                                        <div class="mt-2 space-y-1">
                                                            <For each={event.expand.Tasks}>
                                                                {(task: any) => (
                                                                    <div class="text-xs text-gray-400 flex items-center gap-1">
                                                                        <span class={task.Completed ? 'text-green-400' : 'text-gray-500'}>
                                                                            {task.Completed ? '✓' : '○'}
                                                                        </span>
                                                                        <span class={task.Completed ? 'line-through opacity-60' : ''}>
                                                                            {task.Title}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </Show>
                                                    <Show when={event.expand?.Tasks?.length > 0}>
                                                        <div class="mt-2 space-y-1">
                                                            <For each={event.expand.Tasks}>
                                                                {(task: any) => (
                                                                    <label class="flex items-center gap-2 text-xs cursor-pointer hover:text-white transition-colors duration-200">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={task.Completed}
                                                                            onChange={() => toggleTaskCompletion(task.id, task.Completed)}
                                                                            class="w-3 h-3 rounded border-zinc-700 bg-black"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                        <span class={task.Completed ? 'line-through text-gray-500' : 'text-gray-400'}>
                                                                            {task.Title}
                                                                        </span>
                                                                    </label>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </Show>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    }}
                                </For>
                                <Show when={getEventsWithBreaks(selectedDate()!).length === 0}>
                                    <p class="text-gray-500 text-center py-8">No events for this day</p>
                                </Show>
                            </div>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Week View */}
            <Show when={viewMode() === 'week'}>
                <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    {/* Week header */}
                    <div class="overflow-x-auto">
                        <div class="grid grid-cols-8 border-b border-zinc-800 bg-black min-w-[800px]">
                            <div class="p-3 border-r border-zinc-800"></div>
                            <For each={getWeekDays()}>
                                {(day) => {
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    const tasksForDay = getTasksForDate(day);
                                    const taskCount = tasksForDay.length;
                                    const incompleteTasks = tasksForDay.filter(t => !t.Completed).length;
                                    return (
                                        <div 
                                            class={`p-3 text-center border-r border-zinc-800 relative ${isToday ? 'bg-white/5' : ''} ${taskCount > 0 ? 'cursor-pointer hover:bg-zinc-800/50' : ''} transition-colors duration-200`}
                                            onClick={() => {
                                                if (taskCount > 0) {
                                                    setSelectedDateTasks(day);
                                                    setShowTasksModal(true);
                                                }
                                            }}
                                        >
                                            <div class="text-sm font-semibold text-gray-400">
                                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div class={`text-lg font-bold mt-1 ${
                                                isToday 
                                                    ? 'bg-white text-black w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                                                    : 'text-white'
                                            }`}>
                                                {day.getDate()}
                                            </div>
                                            <Show when={taskCount > 0}>
                                                <div class="mt-2 flex items-center justify-center gap-1">
                                                    <div class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        incompleteTasks === 0 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    }`}>
                                                        <span>✓</span>
                                                        <span>{taskCount}</span>
                                                    </div>
                                                </div>
                                            </Show>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>
                    </div>

                    {/* Time slots with scaled events */}
                    <div class="max-h-[600px] overflow-y-auto overflow-x-auto relative">
                        <div class="min-w-[800px]">
                            <For each={Array.from({ length: 24 }, (_, i) => i)}>
                                {(hour) => (
                                    <div class="grid grid-cols-8 border-b border-zinc-800">
                                        <div class="p-3 border-r border-zinc-800 text-sm text-gray-400">
                                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                        </div>
                                        <For each={getWeekDays()}>
                                            {(day) => {
                                                const dayEvents = getEventsWithBreaks(day);
                                                const dayTasks = getTasksForDate(day);
                                                
                                                return (
                                                    <div class="relative border-r border-zinc-800 min-h-[60px] hover:bg-zinc-900/50 transition-colors duration-200">
                                                        {/* Render Events */}
                                                        <For each={dayEvents}>
                                                            {(event) => {
                                                                const eventStart = new Date(event.Start);
                                                                const eventEnd = new Date(event.End);
                                                                
                                                                // Cap event to current day only
                                                                const startOfDay = new Date(day);
                                                                startOfDay.setHours(0, 0, 0, 0);
                                                                const endOfDay = new Date(day);
                                                                endOfDay.setHours(23, 59, 59, 999);
                                                                const displayStart = eventStart < startOfDay ? startOfDay : eventStart;
                                                                const displayEnd = eventEnd > endOfDay ? endOfDay : eventEnd;
                                                                
                                                                const eventStartHour = displayStart.getHours();
                                                                const eventEndHour = displayEnd.getHours();
                                                                const eventStartMinute = displayStart.getMinutes();
                                                                const eventEndMinute = displayEnd.getMinutes();
                                                                
                                                                // Calculate if event should appear in this hour slot
                                                                const eventStartsInThisHour = eventStartHour === hour;
                                                                
                                                                if (!event.AllDay && !eventStartsInThisHour) {
                                                                    return null;
                                                                }

                                                                // For all-day events, only show in hour 0
                                                                if (event.AllDay && hour !== 0) {
                                                                    return null;
                                                                }

                                                                // Calculate height and position
                                                                let height = 60; // Default 1 hour
                                                                let topOffset = 0;

                                                                if (!event.AllDay) {
                                                                    const durationMs = displayEnd.getTime() - displayStart.getTime();
                                                                    const durationHours = durationMs / (1000 * 60 * 60);
                                                                    height = Math.max(30, durationHours * 60); // 60px per hour
                                                                    
                                                                    // Offset within the hour based on minutes
                                                                    topOffset = (eventStartMinute / 60) * 60;
                                                                }

                                                                const totalTasks = event.expand?.Tasks?.length || 0;
                                                                const completedTasks = event.expand?.Tasks?.filter((t: any) => t.Completed).length || 0;
                                                                const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
                                                                const isBreak = event.isBreak || false;

                                                                return (
                                                                <div
                                                                    class={`absolute left-0 right-0 mx-1 text-xs px-2 py-1 rounded overflow-hidden z-10 ${
                                                                        isBreak 
                                                                            ? 'border border-dashed border-zinc-700 bg-zinc-900/30'
                                                                            : 'cursor-pointer hover:opacity-80 transition-all duration-200'
                                                                    }`}
                                                                    style={{ 
                                                                        'background-color': isBreak ? 'transparent' : (event.Color || '#3b82f6'),
                                                                        'top': `${topOffset}px`,
                                                                        'height': `${height}px`,
                                                                        'opacity': isBreak ? 0.5 : (allTasksCompleted ? 0.6 : 0.9)
                                                                    }}
                                                                    onClick={() => !isBreak && openEventModal(event.id)}
                                                                >
                                                                    <div class={`font-medium truncate ${allTasksCompleted && !isBreak ? 'line-through' : ''} ${isBreak ? 'text-gray-500 italic' : ''}`}>
                                                                        {allTasksCompleted && !isBreak ? '✓ ' : ''}{event.EventName}
                                                                    </div>
                                                                    <Show when={!event.AllDay && !isBreak}>
                                                                        <div class="text-[10px] opacity-75">
                                                                            {new Date(event.Start).toLocaleTimeString('en-US', { 
                                                                                hour: 'numeric', 
                                                                                minute: '2-digit' 
                                                                            })}
                                                                            {height > 40 && (
                                                                                <span> - {new Date(event.End).toLocaleTimeString('en-US', { 
                                                                                    hour: 'numeric', 
                                                                                    minute: '2-digit' 
                                                                                })}</span>
                                                                            )}
                                                                        </div>
                                                                    </Show>
                                                                    <Show when={!isBreak && totalTasks > 0 && height > 50}>
                                                                        <div class="text-[10px] opacity-70 mt-1">
                                                                            ✓ {completedTasks}/{totalTasks} tasks
                                                                        </div>
                                                                    </Show>
                                                                    <Show when={height > 80 && event.expand?.Tasks?.length > 0}>
                                                                        <div class="mt-1 space-y-0.5 border-t border-white/10 pt-1">
                                                                            <For each={event.expand.Tasks.slice(0, 3)}>
                                                                                {(task: any) => (
                                                                                    <div class="text-[10px] opacity-70 flex items-center gap-1 truncate">
                                                                                        <span class={task.Completed ? 'text-green-300' : 'text-white/50'}>
                                                                                            {task.Completed ? '✓' : '○'}
                                                                                        </span>
                                                                                        <span class={task.Completed ? 'line-through' : ''}>
                                                                                            {task.Title}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </For>
                                                                        </div>
                                                                    </Show>
                                                                    <Show when={height > 60 && event.Description}>
                                                                        <div class="text-[10px] opacity-60 mt-1 line-clamp-2">
                                                                            {event.Description}
                                                                        </div>
                                                                    </Show>
                                                                </div>
                                                            );
                                                        }}
                                                    </For>
                                                    
                                                    {/* Render Tasks */}
                                                    <For each={dayTasks}>
                                                        {(task) => {
                                                            const deadline = new Date(task.Deadline);
                                                            const taskHour = deadline.getHours();
                                                            const taskMinute = deadline.getMinutes();
                                                            
                                                            // Only show task in its hour slot
                                                            if (taskHour !== hour) {
                                                                return null;
                                                            }
                                                            
                                                            // Calculate position and height (30 min block)
                                                            const topOffset = (taskMinute / 60) * 60;
                                                            const height = 30;
                                                            
                                                            return (
                                                                <div
                                                                    class="absolute left-0 right-0 mx-1 text-xs px-2 py-1 rounded overflow-hidden z-10 cursor-pointer hover:opacity-80 transition-all duration-200 border-l-2"
                                                                    style={{ 
                                                                        'background-color': task.Priority === 'P1' ? '#ef444420' : task.Priority === 'P2' ? '#f9731620' : '#22c55e20',
                                                                        'border-left-color': task.Priority === 'P1' ? '#ef4444' : task.Priority === 'P2' ? '#f97316' : '#22c55e',
                                                                        'top': `${topOffset}px`,
                                                                        'height': `${height}px`,
                                                                        'opacity': task.Completed ? 0.5 : 0.9
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedDateTasks(day);
                                                                        setShowTasksModal(true);
                                                                    }}
                                                                >
                                                                    <div class={`font-medium truncate ${task.Completed ? 'line-through' : ''}`}>
                                                                        {task.Completed ? '✓ ' : '📋 '}{task.Title}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    </For>
                                                </div>
                                            );
                                        }}
                                    </For>
                                </div>
                            )}
                        </For>
                        </div>
                    </div>
                </div>
            </Show>
            </Show>

            {/* Hover Tooltip */}
            <Show when={hoveredEvent() && !quickViewEvent()}>
                <div 
                    class="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl pointer-events-none"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <h4 class="font-semibold text-white mb-1">{hoveredEvent()!.EventName}</h4>
                    <Show when={hoveredEvent()!.Description}>
                        <p class="text-sm text-gray-400 mb-2">{hoveredEvent()!.Description}</p>
                    </Show>
                    <p class="text-xs text-gray-500">
                        {new Date(hoveredEvent()!.Start).toLocaleString()} - {new Date(hoveredEvent()!.End).toLocaleString()}
                    </p>
                    <Show when={hoveredEvent()!.expand?.Tasks?.length > 0}>
                        <div class="mt-2 pt-2 border-t border-zinc-800">
                            <p class="text-xs text-gray-400 mb-1">Tasks:</p>
                            <For each={hoveredEvent()!.expand.Tasks}>
                                {(task: any) => (
                                    <div class="text-xs text-gray-500">
                                        {task.Completed ? '✓' : '○'} {task.Title}
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Quick View Modal */}
            <Show when={quickViewEvent()}>
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setQuickViewEvent(null)}>
                    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-start gap-3">
                                <div 
                                    class="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                                    style={{ 'background-color': quickViewEvent()!.Color }}
                                ></div>
                                <div>
                                    <h3 class="text-2xl font-bold text-white">{quickViewEvent()!.EventName}</h3>
                                    <Show when={quickViewEvent()!.Description}>
                                        <p class="text-gray-400 mt-2">{quickViewEvent()!.Description}</p>
                                    </Show>
                                </div>
                            </div>
                            <button
                                onClick={() => setQuickViewEvent(null)}
                                class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div class="space-y-3 mb-4">
                            <div class="flex items-center gap-2 text-gray-400">
                                <span>📅</span>
                                <span class="text-sm">
                                    {new Date(quickViewEvent()!.Start).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </span>
                            </div>
                            <Show when={!quickViewEvent()!.AllDay}>
                                <div class="flex items-center gap-2 text-gray-400">
                                    <span>🕐</span>
                                    <span class="text-sm">
                                        {new Date(quickViewEvent()!.Start).toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit' 
                                        })} - {new Date(quickViewEvent()!.End).toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
                                </div>
                            </Show>
                            <Show when={quickViewEvent()!.Location?.lat !== 0 || quickViewEvent()!.Location?.lon !== 0}>
                                <div class="flex items-center gap-2 text-gray-400">
                                    <span>📍</span>
                                    <span class="text-sm">
                                        {quickViewEvent()!.Location.lat}, {quickViewEvent()!.Location.lon}
                                    </span>
                                </div>
                            </Show>
                        </div>

                        <Show when={quickViewEvent()!.expand?.Tasks?.length > 0}>
                            <div class="border-t border-zinc-800 pt-4 mb-4">
                                <h4 class="text-sm font-semibold text-gray-400 mb-3">Tasks</h4>
                                <div class="space-y-2">
                                    <For each={quickViewEvent()!.expand.Tasks}>
                                        {(task: any) => (
                                            <label class="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg transition-colors duration-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={task.Completed}
                                                    onChange={() => toggleTaskCompletion(task.id, task.Completed)}
                                                    class="w-4 h-4 rounded border-zinc-700 bg-black"
                                                />
                                                <span class={`flex-1 ${task.Completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                                    {task.Title}
                                                </span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </div>
                        </Show>

                        <div class="flex gap-2">
                            <button
                                onClick={() => startEditingEvent(quickViewEvent())}
                                class="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                ✏️ Edit Event
                            </button>
                            <button
                                onClick={() => deleteEvent(quickViewEvent()!.id)}
                                class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Edit Event Modal */}
            <Show when={showEditEventModal()}>
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowEditEventModal(false)}>
                    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-2xl font-bold text-white">✏️ Edit Event</h2>
                            <button
                                onClick={() => {
                                    setShowEditEventModal(false);
                                    resetForm();
                                }}
                                class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            updateEvent();
                        }}>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Event Name:</label>
                                <input
                                    type="text"
                                    value={eventName()}
                                    onInput={(e) => setEventName(e.currentTarget.value)}
                                    required
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Description:</label>
                                <textarea
                                    value={description()}
                                    onInput={(e) => setDescription(e.currentTarget.value)}
                                    rows="3"
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200 resize-none"
                                ></textarea>
                            </div>

                            <div class="mb-4">
                                <label class="flex items-center text-sm font-medium text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={allDay()}
                                        onChange={(e) => setAllDay(e.currentTarget.checked)}
                                        class="mr-2 w-4 h-4 rounded border-zinc-700 bg-black text-purple-500 focus:ring-0 focus:ring-offset-0"
                                    />
                                    All Day Event
                                </label>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Start Date:</label>
                                    <input
                                        type="date"
                                        value={startDate()}
                                        onInput={(e) => setStartDate(e.currentTarget.value)}
                                        required
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                                <Show when={!allDay()}>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-2">Start Time:</label>
                                        <input
                                            type="time"
                                            value={startTime()}
                                            onInput={(e) => setStartTime(e.currentTarget.value)}
                                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                        />
                                    </div>
                                </Show>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">End Date:</label>
                                    <input
                                        type="date"
                                        value={endDate()}
                                        onInput={(e) => setEndDate(e.currentTarget.value)}
                                        required
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                                <Show when={!allDay()}>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-2">End Time:</label>
                                        <input
                                            type="time"
                                            value={endTime()}
                                            onInput={(e) => setEndTime(e.currentTarget.value)}
                                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                        />
                                    </div>
                                </Show>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Latitude:</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={locationLat()}
                                        onInput={(e) => setLocationLat(parseFloat(e.currentTarget.value) || 0)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Longitude:</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={locationLon()}
                                        onInput={(e) => setLocationLon(parseFloat(e.currentTarget.value) || 0)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Event Color:</label>
                                <div class="flex gap-2 flex-wrap">
                                    <For each={colorPresets}>
                                        {(color) => (
                                            <button
                                                type="button"
                                                onClick={() => setEventColor(color.value)}
                                                class={`w-10 h-10 rounded-lg transition-all duration-200 border-2 ${
                                                    eventColor() === color.value 
                                                        ? 'border-white scale-110' 
                                                        : 'border-transparent hover:border-zinc-600'
                                                }`}
                                                style={{ 'background-color': color.value }}
                                            />
                                        )}
                                    </For>
                                    <input
                                        type="color"
                                        value={eventColor()}
                                        onInput={(e) => setEventColor(e.currentTarget.value)}
                                        class="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Quick Add Tasks:</label>
                                <div class="space-y-2">
                                    <For each={quickAddTasks()}>
                                        {(task, index) => (
                                            <div class="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={task}
                                                    onInput={(e) => {
                                                        const updated = [...quickAddTasks()];
                                                        updated[index()] = e.currentTarget.value;
                                                        setQuickAddTasks(updated);
                                                    }}
                                                    placeholder="Enter task title..."
                                                    class="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = quickAddTasks().filter((_: any, i: any) => i !== index());
                                                        setQuickAddTasks(updated);
                                                    }}
                                                    class="text-red-400 hover:text-red-300 transition-colors duration-200"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </For>
                                    <button
                                        type="button"
                                        onClick={() => setQuickAddTasks([...quickAddTasks(), ''])}
                                        class="w-full border border-dashed border-zinc-700 rounded-lg px-4 py-2 text-gray-400 hover:border-zinc-500 hover:text-white transition-all duration-200"
                                    >
                                        + Add Task
                                    </button>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Link Existing Tasks:</label>
                                <div class="max-h-32 overflow-y-auto space-y-2 bg-black border border-zinc-700 rounded-lg p-2">
                                    <For each={todoItems()}>
                                        {(todo) => (
                                            <label class="flex items-center p-2 hover:bg-zinc-900 rounded-lg transition-colors duration-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={linkedTaskIds().includes(todo.id)}
                                                    onChange={(e) => {
                                                        if (e.currentTarget.checked) {
                                                            setLinkedTaskIds([...linkedTaskIds(), todo.id]);
                                                        } else {
                                                            setLinkedTaskIds(linkedTaskIds().filter((id: any) => id !== todo.id));
                                                        }
                                                    }}
                                                    class="mr-2 w-4 h-4 rounded border-zinc-700 bg-black text-purple-500 focus:ring-0 focus:ring-offset-0"
                                                />
                                                <span class="text-white text-sm">{todo.Title}</span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Recurrence:</label>
                                <select
                                    value={recurrence()}
                                    onInput={(e) => setRecurrence(e.currentTarget.value)}
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                >
                                    <option value="none">No Recurrence</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <Show when={recurrence() !== 'none'}>
                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Recurrence End Date (Optional):</label>
                                    <input
                                        type="date"
                                        value={recurrenceEndDate()}
                                        onInput={(e) => setRecurrenceEndDate(e.currentTarget.value)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                            </Show>

                            <button
                                type="submit"
                                class="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 active:scale-95 transition-all duration-200"
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            </Show>

            {/* Event Creation Modal */}
            <Show when={showEventModal()}>
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowEventModal(false)}>
                    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-2xl font-bold text-white">Create Event</h2>
                            <button
                                onClick={() => {
                                    setShowEventModal(false);
                                    resetForm();
                                }}
                                class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            createEvent();
                        }}>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Event Name:</label>
                                <input
                                    type="text"
                                    value={eventName()}
                                    onInput={(e) => setEventName(e.currentTarget.value)}
                                    required
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Description:</label>
                                <textarea
                                    value={description()}
                                    onInput={(e) => setDescription(e.currentTarget.value)}
                                    rows="3"
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200 resize-none"
                                ></textarea>
                            </div>

                            <div class="mb-4">
                                <label class="flex items-center text-sm font-medium text-gray-400">
                                    <input
                                        type="checkbox"
                                        checked={allDay()}
                                        onChange={(e) => setAllDay(e.currentTarget.checked)}
                                        class="mr-2 w-4 h-4 rounded border-zinc-700 bg-black text-purple-500 focus:ring-0 focus:ring-offset-0"
                                    />
                                    All Day Event
                                </label>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Start Date:</label>
                                    <input
                                        type="date"
                                        value={startDate()}
                                        onInput={(e) => setStartDate(e.currentTarget.value)}
                                        required
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                                <Show when={!allDay()}>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-2">Start Time:</label>
                                        <input
                                            type="time"
                                            value={startTime()}
                                            onInput={(e) => setStartTime(e.currentTarget.value)}
                                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                        />
                                    </div>
                                </Show>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">End Date:</label>
                                    <input
                                        type="date"
                                        value={endDate()}
                                        onInput={(e) => setEndDate(e.currentTarget.value)}
                                        required
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                                <Show when={!allDay()}>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-400 mb-2">End Time:</label>
                                        <input
                                            type="time"
                                            value={endTime()}
                                            onInput={(e) => setEndTime(e.currentTarget.value)}
                                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                        />
                                    </div>
                                </Show>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Latitude:</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={locationLat()}
                                        onInput={(e) => setLocationLat(parseFloat(e.currentTarget.value) || 0)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Longitude:</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={locationLon()}
                                        onInput={(e) => setLocationLon(parseFloat(e.currentTarget.value) || 0)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Event Color:</label>
                                <div class="flex gap-2 flex-wrap">
                                    <For each={colorPresets}>
                                        {(color) => (
                                            <button
                                                type="button"
                                                onClick={() => setEventColor(color.value)}
                                                class={`w-10 h-10 rounded-lg transition-all duration-200 border-2 ${
                                                    eventColor() === color.value 
                                                        ? 'border-white scale-110' 
                                                        : 'border-transparent hover:border-zinc-600'
                                                }`}
                                                style={{ 'background-color': color.value }}
                                            />
                                        )}
                                    </For>
                                    <input
                                        type="color"
                                        value={eventColor()}
                                        onInput={(e) => setEventColor(e.currentTarget.value)}
                                        class="w-10 h-10 rounded-lg cursor-pointer border-2 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Quick Add Tasks:</label>
                                <div class="space-y-2">
                                    <For each={quickAddTasks()}>
                                        {(task, index) => (
                                            <div class="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={task}
                                                    onInput={(e) => {
                                                        const updated = [...quickAddTasks()];
                                                        updated[index()] = e.currentTarget.value;
                                                        setQuickAddTasks(updated);
                                                    }}
                                                    placeholder="Enter task title..."
                                                    class="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = quickAddTasks().filter((_: any, i: any) => i !== index());
                                                        setQuickAddTasks(updated);
                                                    }}
                                                    class="text-red-400 hover:text-red-300 transition-colors duration-200"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </For>
                                    <button
                                        type="button"
                                        onClick={() => setQuickAddTasks([...quickAddTasks(), ''])}
                                        class="w-full border border-dashed border-zinc-700 rounded-lg px-4 py-2 text-gray-400 hover:border-zinc-500 hover:text-white transition-all duration-200"
                                    >
                                        + Add Task
                                    </button>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Link Existing Tasks:</label>
                                <div class="max-h-32 overflow-y-auto space-y-2 bg-black border border-zinc-700 rounded-lg p-2">
                                    <For each={todoItems()}>
                                        {(todo) => (
                                            <label class="flex items-center p-2 hover:bg-zinc-900 rounded-lg transition-colors duration-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={linkedTaskIds().includes(todo.id)}
                                                    onChange={(e) => {
                                                        if (e.currentTarget.checked) {
                                                            setLinkedTaskIds([...linkedTaskIds(), todo.id]);
                                                        } else {
                                                            setLinkedTaskIds(linkedTaskIds().filter((id: any) => id !== todo.id));
                                                        }
                                                    }}
                                                    class="mr-2 w-4 h-4 rounded border-zinc-700 bg-black text-purple-500 focus:ring-0 focus:ring-offset-0"
                                                />
                                                <span class="text-white text-sm">{todo.Title}</span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Recurrence:</label>
                                <select
                                    value={recurrence()}
                                    onInput={(e) => setRecurrence(e.currentTarget.value)}
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                >
                                    <option value="none">No Recurrence</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            <Show when={recurrence() !== 'none'}>
                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Recurrence End Date (Optional):</label>
                                    <input
                                        type="date"
                                        value={recurrenceEndDate()}
                                        onInput={(e) => setRecurrenceEndDate(e.currentTarget.value)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    />
                                </div>
                            </Show>

                            <button
                                type="submit"
                                class="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-200 active:scale-95 transition-all duration-200"
                            >
                                Create Event
                            </button>
                        </form>
                    </div>
                </div>
            </Show>

            {/* Tasks Modal */}
            <Show when={showTasksModal() && selectedDateTasks()}>
                <div
                    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => {
                        setShowTasksModal(false);
                        setSelectedDateTasks(null);
                    }}
                >
                    <div
                        class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
                            <h2 class="text-2xl font-bold text-white">
                                Tasks Due: {selectedDateTasks()!.toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowTasksModal(false);
                                    setSelectedDateTasks(null);
                                }}
                                class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl w-8 h-8 flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                        <div class="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                            <Show when={getTasksForDate(selectedDateTasks()!).length === 0}>
                                <div class="text-center py-8 text-gray-400">
                                    No tasks due on this date
                                </div>
                            </Show>
                            <div class="space-y-3">
                                <For each={getTasksForDate(selectedDateTasks()!)}>
                                    {(task) => {
                                        const deadline = new Date(task.Deadline);
                                        // Check if time is set by checking if hours/minutes are not midnight
                                        const hasTime = deadline.getHours() !== 0 || deadline.getMinutes() !== 0;
                                        
                                        return (
                                            <div class="bg-black border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all duration-200">
                                                <div class="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={task.Completed}
                                                        onChange={() => toggleTaskCompletion(task.id, task.Completed)}
                                                        class="w-5 h-5 mt-1 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 bg-black cursor-pointer transition-all duration-200"
                                                    />
                                                    <div class="flex-1">
                                                        <div class="flex items-start justify-between">
                                                            <h3 class={`text-lg font-semibold transition-all duration-200 ${
                                                                task.Completed ? 'text-gray-500 line-through' : 'text-white'
                                                            }`}>
                                                                {task.Title}
                                                            </h3>
                                                            <div class="flex items-center gap-2">
                                                                <span class={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    task.Priority === 'P1' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                                                    task.Priority === 'P2' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                                }`}>
                                                                    {task.Priority}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Show when={task.Description}>
                                                            <p class={`text-sm mt-1 ${task.Completed ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                                                                {task.Description}
                                                            </p>
                                                        </Show>
                                                        <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                            <Show when={hasTime}>
                                                                <span>⏰ {deadline.toLocaleTimeString('en-US', { 
                                                                    hour: 'numeric', 
                                                                    minute: '2-digit' 
                                                                })}</span>
                                                            </Show>
                                                            <Show when={!hasTime}>
                                                                <span>📅 Anytime today</span>
                                                            </Show>
                                                        </div>
                                                        <Show when={task.expand?.Tags && task.expand.Tags.length > 0}>
                                                            <div class="flex flex-wrap gap-1 mt-2">
                                                                <For each={task.expand.Tags}>
                                                                    {(tag: any) => (
                                                                        <span
                                                                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                                                            style={{ 
                                                                                'background-color': `${tag.color}40`, 
                                                                                'border': `1px solid ${tag.color}60` 
                                                                            }}
                                                                        >
                                                                            <div
                                                                                class="w-1.5 h-1.5 rounded-full"
                                                                                style={{ 'background-color': tag.color }}
                                                                            />
                                                                            {tag.name}
                                                                        </span>
                                                                    )}
                                                                </For>
                                                            </div>
                                                        </Show>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            <ConfirmModal 
                show={confirmDelete().show}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                onConfirm={confirmDeleteEvent}
                onCancel={() => setConfirmDelete({ show: false, eventId: '' })}
            />
        </div>
    );
}

export default Calendar;
