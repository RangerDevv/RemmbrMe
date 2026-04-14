import { createSignal, onMount, onCleanup, For, Show, createMemo, createEffect } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { bk, currentUser } from '../lib/backend.ts';
import { refreshNotifications } from '../lib/notifications';
import { formatTime } from '../lib/theme';
import TagSelector from '../components/TagSelector';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import DateTimePicker, { DatePicker } from '../components/DateTimePicker';
import {Todo} from "../lib/models/Todo.ts";
import { 
    CalendarIcon, 
    RepeatIcon, 
    CalendarWeekIcon, 
    CalendarMonthIcon,
    XIcon,
    BoltIcon
} from '../components/Icons';

function Calendar() {

    const routeLocation = useLocation();

    const [events, setEvents] = createSignal([] as any[]);
    const [currentDate, setCurrentDate] = createSignal(new Date());
    const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
    const [showEventModal, setShowEventModal] = createSignal(false);
    const [viewMode, setViewMode] = createSignal<'month' | 'week'>(window.location.pathname === '/schedule' ? 'week' : 'month');
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
    const [selectedTasks, setSelectedTasks] = createSignal<string[]>([]);
    const [todoItems, setTodoItems] = createSignal<Todo<"read">[]>([]);
    const [eventColor, setEventColor] = createSignal('#3b82f6');
    const [focusMode, setFocusMode] = createSignal(false);
    const [newTasks, setNewTasks] = createSignal<{title: string, completed: boolean}[]>([]);
    const [newTaskInput, setNewTaskInput] = createSignal('');
    const [editingEvent, setEditingEvent] = createSignal<any>(null);
    const [quickAddTasks, setQuickAddTasks] = createSignal<string[]>([]);
    const [linkedTaskIds, setLinkedTaskIds] = createSignal<string[]>([]);
    const [isLoading, setIsLoading] = createSignal(true);
    const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [recurrence, setRecurrence] = createSignal('none');
    const [recurrenceEndDate, setRecurrenceEndDate] = createSignal('');
    const [recurrenceDays, setRecurrenceDays] = createSignal<number[]>([]);
    const [allTags, setAllTags] = createSignal([] as any[]);
    const [showTasksModal, setShowTasksModal] = createSignal(false);
    const [selectedDateTasks, setSelectedDateTasks] = createSignal<Date | null>(null);
    const [confirmDelete, setConfirmDelete] = createSignal({ show: false, eventId: '' });
    const [currentTime, setCurrentTime] = createSignal(new Date());
    let isFetchingTodos = false;
    
    // Drag-to-move event state
    const [isDraggingEvent, setIsDraggingEvent] = createSignal(false);
    const [draggingEvent, setDraggingEvent] = createSignal<any>(null);
    const [draggingIsTask, setDraggingIsTask] = createSignal(false);
    const [dragEventStart, setDragEventStart] = createSignal<{ day: Date, hour: number, minutes: number } | null>(null);
    const [dragEventTarget, setDragEventTarget] = createSignal<{ day: Date, hour: number, minutes: number } | null>(null);
    let eventDragMoved = false;
    let weekScrollRef: HTMLDivElement | undefined;

    // Scroll week view to current time when switching to it
    createEffect(() => {
        if (viewMode() === 'week' && weekScrollRef) {
            const now = new Date();
            const scrollTop = Math.max(0, now.getHours() * 60 + now.getMinutes() - 120);
            weekScrollRef.scrollTop = scrollTop;
        }
    });
    
    // Drag-to-resize state
    const [isResizing, setIsResizing] = createSignal(false);
    const [resizingEvent, setResizingEvent] = createSignal<any>(null);
    const [resizeEndTime, setResizeEndTime] = createSignal<{ hour: number, minutes: number } | null>(null);
    
    // Recurrence edit choice dialog
    const [recurrenceChoice, setRecurrenceChoice] = createSignal<{
        show: boolean;
        event: any;
        action: 'edit' | 'drag' | 'resize' | 'delete';
        payload?: any;
    }>({ show: false, event: null, action: 'edit' });
    
    // Sync viewMode with URL when navigating via sidebar
    createEffect(() => {
        const path = routeLocation.pathname;
        setViewMode(path === '/schedule' ? 'week' : 'month');
    });
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
            const records = await bk.collection('Calendar').getFullList({
                expand: 'Tasks,Tags',
                sort: 'Start'
            });
            console.log('Events fetched:', records.length, records);
            
            // Expand recurring events into instances
            const expandedEvents: any[] = [];
            const viewEndDate = new Date();
            viewEndDate.setMonth(viewEndDate.getMonth() + 6); // Show 6 months ahead to ensure events are visible
            
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
                            case 'custom': {
                                const days = event.RecurrencePattern?.days || [];
                                if (days.length === 0) { currentDate = new Date(endEventDate.getTime() + 1); break; }
                                let found = false;
                                for (let i = 1; i <= 7; i++) {
                                    const candidate = new Date(currentDate.getTime() + i * 24 * 60 * 60 * 1000);
                                    if (days.includes(candidate.getDay())) {
                                        currentDate = candidate;
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) currentDate = new Date(endEventDate.getTime() + 1);
                                break;
                            }
                        }
                        
                        if (currentDate > endEventDate || currentDate > viewEndDate) break;
                        
                        // Check for exceptions on this date
                        const exceptions = event.RecurrenceExceptions || [];
                        const instanceDateStr = currentDate.toISOString().split('T')[0];
                        const exception = exceptions.find((ex: any) => ex.date === instanceDateStr);
                        
                        // Skip deleted instances
                        if (exception?.deleted) {
                            instanceCount++;
                            continue;
                        }
                        
                        // Create instance, applying any overrides
                        const instanceStart = exception?.Start ? new Date(exception.Start) : currentDate;
                        const instanceEnd = exception?.End ? new Date(exception.End) : new Date(currentDate.getTime() + eventDuration);
                        
                        const instance = {
                            ...event,
                            id: `${event.id}-recur-${instanceCount}`,
                            Start: instanceStart.toISOString(),
                            End: instanceEnd.toISOString(),
                            EventName: exception?.EventName || event.EventName,
                            Description: exception?.Description !== undefined ? exception.Description : event.Description,
                            Color: exception?.Color || event.Color,
                            AllDay: exception?.AllDay !== undefined ? exception.AllDay : event.AllDay,
                            isRecurringInstance: true,
                            originalEventId: event.id,
                            instanceDate: instanceDateStr,
                            hasException: !!exception
                        };
                        
                        expandedEvents.push(instance);
                        instanceCount++;
                    }
                }
            }
            
            // Update events signal - using a new array reference to trigger reactivity
            setEvents([...expandedEvents]);
            
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
            const items = await bk.collection('Todo').getFullList({
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
    
    async function fetchTags() {
        try {
            const tags = await bk.collection('Tags').getFullList({
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
                const taskRecord = await bk.collection('Todo').create({
                    Title: taskTitle,
                    Description: '',
                    Completed: false,
                    Priority: 'P2',
                    user: currentUser().id
                });
                createdTaskIds.push(taskRecord.id);
                fetchEvents();
                fetchTodos();
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
            Tasks: allTaskIds,
            Color: eventColor() || '#3b82f6',
            Tags: selectedTags() || [],
            Recurrence: recurrence() as "none"|"daily"|"weekly"|"monthly"|"custom",
            RecurrencePattern: recurrence() === 'custom' ? { days: recurrenceDays() } : undefined,
            RecurrenceEndDate: recurrenceEndDate() || undefined,
            user: currentUser()?.id
        };

        await bk.collection('Calendar').create(data);
        
        
        fetchEvents();
        fetchTodos();
        setTimeout(() => refreshNotifications(), 100);
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
                const taskRecord = await bk.collection('Todo').create({
                    Title: taskTitle,
                    Description: '',
                    Completed: false,
                    Priority: 'P2',
                    user: currentUser()?.id
                });
                createdTaskIds.push(taskRecord.id);
                await fetchEvents();
                await fetchTodos();
            }
        }

        // Combine created tasks with linked tasks
        const allTaskIds = [...createdTaskIds, ...linkedTaskIds()];

        // If editing a single instance of a recurring event, detach it
        if (editingEvent()._editingInstance) {
            const parentId = editingEvent().id;
            const instanceDate = editingEvent()._instanceDate;
            await detachRecurringInstance(parentId, instanceDate, {
                EventName: eventName(),
                Description: description(),
                AllDay: allDay(),
                Start: start,
                End: end,
                Color: eventColor() || '#3b82f6',
            });
            resetForm();
            setQuickViewEvent(null);
            setEditingEvent(null);
            return;
        }

        const data = {
            EventName: eventName(),
            Description: description(),
            AllDay: allDay(),
            Start: start,
            End: end,
            Tasks: allTaskIds,
            Color: eventColor() || '#3b82f6',
            Tags: selectedTags() || [],
            Recurrence: recurrence() as "none"|"daily"|"weekly"|"monthly"|"custom",
            RecurrencePattern: recurrence() === 'custom' ? { days: recurrenceDays() } : undefined,
            RecurrenceEndDate: recurrenceEndDate() || undefined,
            user: currentUser()?.id
        };

        await bk.collection('Calendar').update(editingEvent().id, data);
        await fetchEvents();
        await fetchTodos();
        
        setTimeout(() => refreshNotifications(), 100);
        resetForm();
        await fetchEvents();
        await fetchTodos();
        setQuickViewEvent(null);
        setEditingEvent(null);
    }

    async function deleteEvent(id: string) {
        // Check if this is a recurring instance being deleted from quick view
        const qv = quickViewEvent();
        if (qv && qv._editingInstance) {
            setRecurrenceChoice({ show: true, event: { ...qv, originalEventId: qv.id, instanceDate: qv._instanceDate }, action: 'delete', payload: null });
            return;
        }
        setConfirmDelete({ show: true, eventId: id });
    }

    async function confirmDeleteEvent() {
        const eventId = confirmDelete().eventId;
        if (eventId) {
            await bk.collection('Calendar').delete(eventId);
            setQuickViewEvent(null);
            await fetchEvents();
            await fetchTodos();
            setTimeout(() => refreshNotifications(), 100);
        }
        setConfirmDelete({ show: false, eventId: '' });
    }

    function resetForm() {
        setEventName('');
        setDescription('');
        setAllDay(false);
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        setSelectedTasks([]);
        setEventColor('#3b82f6');
        setNewTasks([]);
        setNewTaskInput('');
        setQuickAddTasks([]);
        setLinkedTaskIds([]);
        setEditingEvent(null);
        setSelectedTags([]);
        setRecurrence('none');
        setRecurrenceEndDate('');
        setRecurrenceDays([]);
    }

    // --- Recurrence exception helpers ---
    async function addRecurrenceException(eventId: string, exception: any) {
        const event: any = await bk.collection('Calendar').getOne(eventId, {});
        const exceptions = event.RecurrenceExceptions || [];
        // Replace existing exception for same date, or add new
        const existing = exceptions.findIndex((ex: any) => ex.date === exception.date);
        if (existing >= 0) {
            exceptions[existing] = { ...exceptions[existing], ...exception };
        } else {
            exceptions.push(exception);
        }
        await bk.collection('Calendar').update(eventId, { RecurrenceExceptions: exceptions });
        await fetchEvents();
    }

    // Detach a recurring instance into a standalone event and mark it deleted on the parent
    async function detachRecurringInstance(parentId: string, instanceDate: string, overrides: Record<string, any>) {
        const parent: any = await bk.collection('Calendar').getOne(parentId, { expand: 'Tasks,Tags' });
        // Create a standalone event with the instance's data + any overrides
        await bk.collection('Calendar').create({
            EventName: overrides.EventName ?? parent.EventName,
            Description: overrides.Description ?? (parent.Description || ''),
            AllDay: overrides.AllDay ?? parent.AllDay,
            Start: overrides.Start ?? parent.Start,
            End: overrides.End ?? parent.End,
            Color: overrides.Color ?? (parent.Color || '#3b82f6'),
            Tasks: parent.Tasks || [],
            Tags: parent.Tags || [],
            Recurrence: 'none',
            user: parent.user,
        });
        // Mark this date as deleted on the parent so the series skips it
        await addRecurrenceException(parentId, { date: instanceDate, deleted: true });
    }

    async function handleRecurrenceChoice(choice: 'this' | 'all') {
        const { event, action, payload } = recurrenceChoice();
        const parentId = event.originalEventId || event.id;
        const instanceDate = event.instanceDate;

        if (action === 'edit') {
            if (choice === 'this') {
                // Detach this instance into a standalone event, then open it for editing
                await detachRecurringInstance(parentId, instanceDate, {
                    EventName: event.EventName,
                    Description: event.Description,
                    AllDay: event.AllDay,
                    Start: event.Start,
                    End: event.End,
                    Color: event.Color,
                });
                // Find the newly created standalone event and open it
                const allEvents = events();
                const detached = allEvents.find((e: any) =>
                    !e.isRecurringInstance && e.EventName === event.EventName &&
                    e.Start === event.Start && e.End === event.End
                );
                if (detached) {
                    openEventModal(detached.id);
                }
            } else {
                // Edit all — open modal for parent event
                openEventModal(parentId);
            }
        } else if (action === 'drag') {
            const { dayDelta, minuteDelta } = payload;
            if (choice === 'this') {
                const newStart = new Date(event.Start);
                newStart.setDate(newStart.getDate() + dayDelta);
                newStart.setMinutes(newStart.getMinutes() + minuteDelta);
                const newEnd = new Date(event.End);
                newEnd.setDate(newEnd.getDate() + dayDelta);
                newEnd.setMinutes(newEnd.getMinutes() + minuteDelta);
                await detachRecurringInstance(parentId, instanceDate, {
                    EventName: event.EventName,
                    Description: event.Description,
                    AllDay: event.AllDay,
                    Start: newStart.toISOString(),
                    End: newEnd.toISOString(),
                    Color: event.Color,
                });
            } else {
                const parentEvent: any = await bk.collection('Calendar').getOne(parentId, {});
                const parentStart = new Date(parentEvent.Start);
                const parentEnd = new Date(parentEvent.End);
                parentStart.setDate(parentStart.getDate() + dayDelta);
                parentStart.setMinutes(parentStart.getMinutes() + minuteDelta);
                parentEnd.setDate(parentEnd.getDate() + dayDelta);
                parentEnd.setMinutes(parentEnd.getMinutes() + minuteDelta);
                await bk.collection('Calendar').update(parentId, {
                    Start: parentStart.toISOString(),
                    End: parentEnd.toISOString()
                });
                await fetchEvents();
            }
        } else if (action === 'resize') {
            const { newEndISO } = payload;
            if (choice === 'this') {
                await detachRecurringInstance(parentId, instanceDate, {
                    EventName: event.EventName,
                    Description: event.Description,
                    AllDay: event.AllDay,
                    Start: event.Start,
                    End: newEndISO,
                    Color: event.Color,
                });
            } else {
                await bk.collection('Calendar').update(parentId, { End: newEndISO });
                await fetchEvents();
            }
        } else if (action === 'delete') {
            if (choice === 'this') {
                // Just hide this occurrence — no standalone needed
                await addRecurrenceException(parentId, {
                    date: instanceDate,
                    deleted: true
                });
            } else {
                await bk.collection('Calendar').delete(parentId);
                await fetchEvents();
                await fetchTodos();
            }
        }

        setRecurrenceChoice({ show: false, event: null, action: 'edit' });
    }

    async function toggleTaskCompletion(taskId: string, currentStatus: boolean) {
        await bk.collection('Todo').update(taskId, {
            Completed: !currentStatus,
        });
        
        // Refresh all data
        await fetchTodos();
        await fetchEvents(); 
        
        // Refresh quickViewEvent if it's open
        if (quickViewEvent()) {
            try {
                const refreshed = await bk.collection('Calendar').getOne(quickViewEvent()!.id, {
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
            const event: any = await bk.collection('Calendar').getOne(eventId, {
                expand: 'Tasks,Tags'
            });
            // Populate form signals for inline editing
            setEditingEvent(event);
            setEventName(event.EventName);
            setDescription(event.Description || '');
            setAllDay(event.AllDay);
            
            const startDateTime = new Date(event.Start);
            const endDateTime = new Date(event.End);

            setStartDate(startDateTime.toLocaleString("sv-SE").split(' ')[0]);
            setEndDate(endDateTime.toLocaleString("sv-SE").split(' ')[0]);

            if (!event.AllDay) {
                setStartTime(startDateTime.toTimeString().slice(0, 5));
                setEndTime(endDateTime.toTimeString().slice(0, 5));
            }
            
            setEventColor(event.Color || '#3b82f6');
            setLinkedTaskIds(event.Tasks || []);
            setQuickAddTasks([]);
            setSelectedTags(event.expand?.Tags?.map((t: any) => t.id) || []);
            setRecurrence(event.Recurrence || 'none');
            setRecurrenceEndDate(event.RecurrenceEndDate || '');
            setRecurrenceDays(event.RecurrencePattern?.days || []);
            
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

    // --- Drag-to-move handlers ---
    function getMinutesFromMouseY(e: MouseEvent, cellElement: HTMLElement): number {
        const rect = cellElement.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const fraction = Math.max(0, Math.min(1, relativeY / rect.height));
        return Math.round((fraction * 60) / 15) * 15;
    }

    function handleEventDragStart(e: MouseEvent, event: any, isTask: boolean = false) {
        if (event.isBreak) return;
        e.preventDefault();
        e.stopPropagation();
        eventDragMoved = false;
        const eventStart = isTask ? new Date(event.Deadline) : new Date(event.Start);
        const dayStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
        setDraggingEvent(event);
        setDraggingIsTask(isTask);
        setDragEventStart({ day: dayStart, hour: eventStart.getHours(), minutes: eventStart.getMinutes() });
        setDragEventTarget({ day: dayStart, hour: eventStart.getHours(), minutes: eventStart.getMinutes() });
        setIsDraggingEvent(true);
    }

    function handleEventDragMoveWeek(e: MouseEvent, day: Date, hour: number) {
        if (!isDraggingEvent() || !draggingEvent()) return;
        const cell = e.currentTarget as HTMLElement;
        const minutes = getMinutesFromMouseY(e, cell);
        const start = dragEventStart();
        if (start && (day.getTime() !== start.day.getTime() || hour !== start.hour || minutes !== start.minutes)) {
            eventDragMoved = true;
        }
        setDragEventTarget({ day, hour, minutes });
    }

    function handleEventDragMoveMonth(day: Date) {
        if (!isDraggingEvent() || !draggingEvent()) return;
        const start = dragEventStart();
        if (start && day.getTime() !== start.day.getTime()) {
            eventDragMoved = true;
        }
        const eventStart = new Date(draggingEvent().Start);
        setDragEventTarget({ day, hour: eventStart.getHours(), minutes: eventStart.getMinutes() });
    }

    async function handleEventDragEnd() {
        if (!isDraggingEvent() || !draggingEvent()) {
            setIsDraggingEvent(false);
            setDraggingEvent(null);
            setDraggingIsTask(false);
            setDragEventStart(null);
            setDragEventTarget(null);
            return;
        }

        const event = draggingEvent();
        const isTask = draggingIsTask();
        const start = dragEventStart();
        const target = dragEventTarget();

        if (!start || !target || !eventDragMoved) {
            // No movement — treat as click
            if (isTask) {
                setSelectedDateTasks(start?.day || null);
                setShowTasksModal(true);
            } else if (event.isRecurringInstance) {
                setRecurrenceChoice({ show: true, event, action: 'edit', payload: null });
            } else if (!event.isBreak) {
                openEventModal(event.id);
            }
            setIsDraggingEvent(false);
            setDraggingEvent(null);
            setDraggingIsTask(false);
            setDragEventStart(null);
            setDragEventTarget(null);
            return;
        }

        const startTotalMin = start.hour * 60 + start.minutes;
        const targetTotalMin = target.hour * 60 + target.minutes;
        const minuteDelta = targetTotalMin - startTotalMin;
        const dayDelta = Math.round((target.day.getTime() - start.day.getTime()) / (24 * 60 * 60 * 1000));

        if (minuteDelta === 0 && dayDelta === 0) {
            if (isTask) {
                setSelectedDateTasks(start?.day || null);
                setShowTasksModal(true);
            } else if (event.isRecurringInstance) {
                setRecurrenceChoice({ show: true, event, action: 'edit', payload: null });
            } else if (!event.isBreak) {
                openEventModal(event.id);
            }
            setIsDraggingEvent(false);
            setDraggingEvent(null);
            setDraggingIsTask(false);
            setDragEventStart(null);
            setDragEventTarget(null);
            return;
        }

        if (isTask) {
            // Update task's Deadline
            const taskDeadline = new Date(event.Deadline);
            const newDeadline = new Date(taskDeadline);
            newDeadline.setDate(newDeadline.getDate() + dayDelta);
            newDeadline.setMinutes(newDeadline.getMinutes() + minuteDelta);

            await bk.collection('Todo').update(event.id, {
                Deadline: newDeadline.toISOString()
            });
            await fetchTodos();
        } else if (event.isRecurringInstance) {
            // Show recurrence choice for drag
            setRecurrenceChoice({
                show: true, event, action: 'drag',
                payload: { dayDelta, minuteDelta }
            });
        } else {
            const eventStart = new Date(event.Start);
            const eventEnd = new Date(event.End);
            const newStart = new Date(eventStart);
            newStart.setDate(newStart.getDate() + dayDelta);
            newStart.setMinutes(newStart.getMinutes() + minuteDelta);
            const newEnd = new Date(eventEnd);
            newEnd.setDate(newEnd.getDate() + dayDelta);
            newEnd.setMinutes(newEnd.getMinutes() + minuteDelta);

            await bk.collection('Calendar').update(event.id, {
                Start: newStart.toISOString(),
                End: newEnd.toISOString()
            });
            await fetchEvents();
        }

        setIsDraggingEvent(false);
        setDraggingEvent(null);
        setDraggingIsTask(false);
        setDragEventStart(null);
        setDragEventTarget(null);
    }

    function getDragMovePreview(day: Date, hour: number): { show: boolean, top: number, height: number, color: string } | null {
        if (!isDraggingEvent() || !draggingEvent() || !dragEventTarget() || !eventDragMoved) return null;
        const target = dragEventTarget()!;
        if (target.day.getTime() !== day.getTime() || target.hour !== hour) return null;
        const event = draggingEvent();
        const isTask = draggingIsTask();
        let durationMin: number;
        let color: string;
        if (isTask) {
            durationMin = event.Duration || 30;
            const priorityColor = event.Priority === 'P1' ? '#ef4444' : event.Priority === 'P2' ? '#f97316' : '#22c55e';
            color = priorityColor;
        } else {
            const duration = new Date(event.End).getTime() - new Date(event.Start).getTime();
            durationMin = duration / (1000 * 60);
            color = event.Color || '#3b82f6';
        }
        const top = (target.minutes / 60) * 60;
        const h = Math.max(30, (durationMin / 60) * 60);
        return {
            show: true,
            top,
            height: h,
            color
        };
    }

    // --- Drag-to-resize handlers ---
    function handleResizeStart(e: MouseEvent, event: any) {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizingEvent(event);
        const end = new Date(event.End);
        setResizeEndTime({ hour: end.getHours(), minutes: end.getMinutes() });
    }

    function handleResizeMove(e: MouseEvent, _day: Date, hour: number) {
        if (!isResizing() || !resizingEvent()) return;
        const cell = e.currentTarget as HTMLElement;
        const minutes = getMinutesFromMouseY(e, cell);
        setResizeEndTime({ hour, minutes });
    }

    async function handleResizeEnd() {
        if (!isResizing() || !resizingEvent() || !resizeEndTime()) {
            setIsResizing(false);
            setResizingEvent(null);
            setResizeEndTime(null);
            return;
        }

        const event = resizingEvent();
        const endTime = resizeEndTime()!;
        const eventStart = new Date(event.Start);
        const startTotalMin = eventStart.getHours() * 60 + eventStart.getMinutes();
        let endTotalMin = endTime.hour * 60 + endTime.minutes;
        
        // Ensure minimum 15 min duration
        if (endTotalMin <= startTotalMin + 15) {
            endTotalMin = startTotalMin + 30;
        }

        const newEnd = new Date(eventStart);
        newEnd.setHours(Math.floor(endTotalMin / 60), endTotalMin % 60, 0, 0);

        if (event.isRecurringInstance) {
            // Show recurrence choice for resize
            setRecurrenceChoice({
                show: true, event, action: 'resize',
                payload: { newEndISO: newEnd.toISOString() }
            });
        } else {
            await bk.collection('Calendar').update(event.id, {
                End: newEnd.toISOString()
            });
            await fetchEvents();
        }

        setIsResizing(false);
        setResizingEvent(null);
        setResizeEndTime(null);
    }

    function getResizedHeight(event: any): number | null {
        if (!isResizing() || !resizingEvent() || !resizeEndTime()) return null;
        if (resizingEvent().id !== event.id) return null;
        
        const eventStart = new Date(event.Start);
        const startTotalMin = eventStart.getHours() * 60 + eventStart.getMinutes();
        const endTotalMin = resizeEndTime()!.hour * 60 + resizeEndTime()!.minutes;
        const durationMin = Math.max(endTotalMin - startTotalMin, 15);
        return (durationMin / 60) * 60; // 60px per hour
    }

    onMount(async () => {
        console.log('Calendar mounted, fetching data...');
        setIsLoading(true);
        await fetchEvents();
        await fetchTodos();
        await fetchTags();
        setIsLoading(false);

        // Global mouseup for drag-to-move and resize
        const onMouseUp = () => {
            handleEventDragEnd();
            handleResizeEnd();
        };
        window.addEventListener('mouseup', onMouseUp);

        // Listen for items created via QuickAdd
        const handleItemCreated = async () => {
            await fetchEvents();
            await fetchTodos();
        };
        window.addEventListener('itemCreated', handleItemCreated);

        // Listen for keyboard shortcut events
        const handleNewEvent = () => {
            const today = new Date();
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
            setShowEventModal(true);
        };
        const handlePrev = () => viewMode() === 'week' ? previousWeek() : previousMonth();
        const handleNext = () => viewMode() === 'week' ? nextWeek() : nextMonth();
        const handleToday = () => goToToday();
        const handleMonthView = () => setViewMode('month');
        const handleWeekView = () => setViewMode('week');

        document.addEventListener('kb:new-event', handleNewEvent);
        document.addEventListener('kb:calendar-prev', handlePrev);
        document.addEventListener('kb:calendar-next', handleNext);
        document.addEventListener('kb:calendar-today', handleToday);
        document.addEventListener('kb:calendar-month', handleMonthView);
        document.addEventListener('kb:calendar-week', handleWeekView);

        const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);

        onCleanup(() => {
            clearInterval(timeInterval);
            window.removeEventListener('itemCreated', handleItemCreated);
            window.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('kb:new-event', handleNewEvent);
            document.removeEventListener('kb:calendar-prev', handlePrev);
            document.removeEventListener('kb:calendar-next', handleNext);
            document.removeEventListener('kb:calendar-today', handleToday);
            document.removeEventListener('kb:calendar-month', handleMonthView);
            document.removeEventListener('kb:calendar-week', handleWeekView);
        });
    });

    return (
        <div class="flex-1 w-full">
            <div class="mb-4 lg:mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h1 class="text-xl lg:text-2xl font-bold flex items-center gap-2" style={{ "color": "var(--color-text)" }}><CalendarIcon class="w-5 h-5 lg:w-6 lg:h-6" /> Calendar</h1>
                    <button
                        onClick={() => {
                            setShowEventModal(true);
                            const today = new Date();
                            setStartDate(today.toISOString().split('T')[0]);
                            setEndDate(today.toISOString().split('T')[0]);
                        }}
                        class="px-3 lg:px-4 py-1.5 font-semibold rounded-xl active:scale-95 transition-all duration-200 text-sm"
                        style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                    >
                        + New Event
                    </button>
                </div>
                <div class="flex gap-2">
                    <button
                        onClick={async () => { await fetchTodos(); await fetchEvents(); }}
                        class="px-2.5 py-1.5 rounded-lg transition-all duration-200 text-sm flex items-center gap-1.5"
                        style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)", "border": "1px solid var(--color-border)" }}
                        title="Refresh tasks and events"
                    >
                        <RepeatIcon class="w-4 h-4" />
                    </button>
                    <div class="flex rounded-lg overflow-hidden" style={{ "border": "1px solid var(--color-border)" }}>
                        <button
                            onClick={() => { setViewMode('month'); history.replaceState(null, '', '/calendar'); }}
                            class="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-all duration-200"
                            style={{
                                "background-color": viewMode() === 'month' ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                "color": viewMode() === 'month' ? "var(--color-accent-text)" : "var(--color-text-secondary)"
                            }}
                        >
                            <CalendarMonthIcon class="w-4 h-4" /> Calendar
                        </button>
                        <button
                            onClick={() => { setViewMode('week'); history.replaceState(null, '', '/schedule'); }}
                            class="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-all duration-200"
                            style={{
                                "background-color": viewMode() === 'week' ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                "color": viewMode() === 'week' ? "var(--color-accent-text)" : "var(--color-text-secondary)"
                            }}
                        >
                            <CalendarWeekIcon class="w-4 h-4" /> Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Header */}
            <div class="glass rounded-xl p-4 mb-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                    <div class="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (viewMode() === 'month') {
                                    previousMonth();
                                } else {
                                    previousWeek();
                                }
                            }}
                            class="px-2 py-1.5 rounded-lg transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)", "border": "1px solid var(--color-border)" }}
                        >
                            ←
                        </button>
                        <h2 class="text-sm lg:text-lg font-bold min-w-0 sm:min-w-[280px] text-center" style={{ "color": "var(--color-text)" }}>
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
                            class="px-2 py-1 rounded transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)", "border": "1px solid var(--color-border)" }}
                        >
                            →
                        </button>
                        <button
                            onClick={goToToday}
                            class="px-3 py-1.5 rounded-lg text-sm ml-2 transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)", "border": "1px solid var(--color-border)" }}
                        >
                            Today
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            onClick={() => setFocusMode(!focusMode())}
                            class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center gap-1.5`}
                            style={{
                                "background-color": focusMode() ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                "color": focusMode() ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                                "border": focusMode() ? "1px solid transparent" : "1px solid var(--color-border)"
                            }}
                        >
                            {focusMode() ? <><BoltIcon class="w-4 h-4" /> Focus</> : 'All'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Views */}
            <Show when={isLoading()}>
                <div class="glass flex items-center justify-center h-64 rounded-xl">
                    <div class="text-center">
                        <CalendarIcon class="w-10 h-10 mx-auto mb-3 animate-pulse" style={{ "color": "var(--color-text-muted)" }} />
                        <div style={{ "color": "var(--color-text-muted)" }}>Loading events...</div>
                    </div>
                </div>
            </Show>
            <Show when={!isLoading()}>
            <Show when={viewMode() === 'month'}>
                <div class="flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-x-auto">
                    {/* Month Grid */}
                    <div class="flex-1 min-w-0">
                        <div class="glass rounded-xl overflow-hidden">
                            {/* Day headers */}
                            <div class="grid grid-cols-7" style={{ "border-bottom": "1px solid var(--color-border)", "background-color": "var(--color-bg-tertiary)" }}>
                                <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}>
                                    {(day) => (
                                        <div class="p-3 text-center text-sm font-semibold" style={{ "color": "var(--color-text-muted)" }}>
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
                                        // Use createMemo to make this reactive to events() changes
                                        const dayEvents = createMemo(() => getEventsForDate(day));
                                        const tasksForDay = createMemo(() => getTasksForDate(day));
                                        const taskCount = createMemo(() => tasksForDay().length);

                                        return (
                                            <div
                                                class={`min-h-[80px] lg:min-h-[120px] p-1.5 lg:p-2 transition-all duration-200 cursor-pointer`}
                                                style={{ 
                                                    "border-right": "1px solid var(--color-border)", 
                                                    "border-bottom": "1px solid var(--color-border)",
                                                    "background-color": isDraggingEvent() && dragEventTarget()?.day.getTime() === day.getTime() && eventDragMoved
                                                        ? "var(--color-accent-muted)" 
                                                        : isCurrentMonth ? "var(--color-surface)" : "var(--color-bg)",
                                                    "opacity": isCurrentMonth ? 1 : 0.5
                                                }}
                                                onClick={() => {
                                                    if (!isDraggingEvent()) setSelectedDate(day);
                                                }}
                                                onMouseMove={() => handleEventDragMoveMonth(day)}
                                            >
                                                <div class="flex items-center justify-between mb-1">
                                                    <div class={`text-sm font-medium ${
                                                        isToday 
                                                            ? 'w-6 h-6 rounded-full flex items-center justify-center font-bold' 
                                                            : ''
                                                    }`} style={{ 
                                                        "background-color": isToday ? "var(--color-accent)" : "transparent",
                                                        "color": isToday ? "var(--color-accent-text)" : isCurrentMonth ? "var(--color-text)" : "var(--color-text-muted)"
                                                    }}>
                                                        {day.getDate()}
                                                    </div>
                                                    <Show when={taskCount() > 0}>
                                                        <div 
                                                            class="px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors"
                                                            style={{ "background-color": "var(--color-accent-muted)", "color": "var(--color-accent)", "border": "1px solid var(--color-accent)" }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDateTasks(day);
                                                                setShowTasksModal(true);
                                                            }}
                                                        >
                                                            {taskCount()}✓
                                                        </div>
                                                    </Show>
                                                </div>
                                                <div class="space-y-1">
                                                    <For each={dayEvents().slice(0, 3)}>
                                                        {(event) => {
                                                            const totalTasks = event.expand?.Tasks?.length || 0;
                                                            const completedTasks = event.expand?.Tasks?.filter((t: any) => t.Completed).length || 0;
                                                            const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
                                                            
                                                            return (
                                                                <div
                                                                    class="text-xs px-2 py-1 rounded transition-all duration-200 hover:opacity-80 cursor-grab"
                                                                    style={{ 
                                                                        'background-color': event.Color || '#3b82f6',
                                                                        opacity: isDraggingEvent() && draggingEvent()?.id === event.id ? 0.3 : (allTasksCompleted ? 0.6 : 0.9)
                                                                    }}
                                                                    onMouseDown={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEventDragStart(e, event);
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
                                                    <Show when={dayEvents().length > 3}>
                                                        <div class="text-xs px-2" style={{ "color": "var(--color-text-muted)" }}>
                                                            +{dayEvents().length - 3} more
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
                        <div class="glass w-full lg:w-80 rounded-xl p-4 lg:p-5 h-fit lg:sticky lg:top-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold" style={{ "color": "var(--color-text)" }}>
                                    {selectedDate()!.toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </h3>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    class="transition-colors duration-200"
                                    style={{ "color": "var(--color-text-muted)" }}
                                >
                                    <XIcon class="w-5 h-5" />
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
                                            class={`p-3 rounded-lg transition-all duration-200 ${isBreak ? 'border-dashed' : 'cursor-pointer'}`}
                                            style={{ 
                                                'background-color': isBreak ? 'transparent' : `${event.Color}15`, 
                                                'border': isBreak ? '1px dashed var(--color-border)' : '1px solid var(--color-border)',
                                                opacity: isBreak ? 0.6 : (allTasksCompleted ? 0.7 : 1) 
                                            }}
                                            onClick={() => {
                                                if (isBreak) return;
                                                if (event.isRecurringInstance) {
                                                    setRecurrenceChoice({ show: true, event, action: 'edit', payload: null });
                                                } else {
                                                    openEventModal(event.id);
                                                }
                                            }}
                                        >
                                            <div class="flex items-start gap-2">
                                                <div 
                                                    class={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isBreak ? 'bg-gray-700' : ''}`}
                                                    style={{ 'background-color': isBreak ? '#404040' : event.Color }}
                                                ></div>
                                                <div class="flex-1">
                                                    <h4 class={`font-semibold ${isBreak ? 'italic' : ''} ${allTasksCompleted && !isBreak ? 'line-through' : ''}`} style={{ "color": isBreak ? "var(--color-text-muted)" : "var(--color-text)" }}>
                                                        {allTasksCompleted && !isBreak ? '✓ ' : ''}{event.EventName}
                                                    </h4>
                                                    <Show when={!event.AllDay}>
                                                        <p class="text-xs mt-1" style={{ "color": "var(--color-text-muted)" }}>
                                                            {formatTime(new Date(event.Start))} - {formatTime(new Date(event.End))}
                                                        </p>
                                                    </Show>
                                                    <Show when={!isBreak && event.expand?.Tasks?.length > 0}>
                                                        <div class="mt-2 space-y-1">
                                                            <For each={event.expand.Tasks}>
                                                                {(task: any) => (
                                                                    <div class="text-xs flex items-center gap-1" style={{ "color": "var(--color-text-secondary)" }}>
                                                                        <span class={task.Completed ? 'text-green-400' : ''} style={{ "color": task.Completed ? undefined : "var(--color-text-muted)" }}>
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
                                                                            class="w-3 h-3 rounded"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                        <span class={task.Completed ? 'line-through' : ''} style={{ "color": task.Completed ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>
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
                                    <p class="text-center py-8" style={{ "color": "var(--color-text-muted)" }}>No events for this day</p>
                                </Show>
                            </div>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Week View */}
            <Show when={viewMode() === 'week'}>
                <div class="glass rounded-xl overflow-hidden">
                    {/* Week header */}
                    <div class="overflow-x-auto">
                        <div class="grid grid-cols-8 min-w-[800px]" style={{ "border-bottom": "1px solid var(--color-border)", "background-color": "var(--color-bg-tertiary)" }}>
                            <div class="p-3" style={{ "border-right": "1px solid var(--color-border)" }}></div>
                            <For each={getWeekDays()}>
                                {(day) => {
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    const tasksForDay = getTasksForDate(day);
                                    const taskCount = tasksForDay.length;
                                    const incompleteTasks = tasksForDay.filter(t => !t.Completed).length;
                                    return (
                                        <div 
                                            class={`p-3 text-center relative ${taskCount > 0 ? 'cursor-pointer' : ''} transition-colors duration-200`}
                                            style={{ 
                                                "border-right": "1px solid var(--color-border)",
                                                "background-color": isToday ? "var(--color-accent-muted)" : "transparent"
                                            }}
                                            onClick={() => {
                                                if (taskCount > 0) {
                                                    setSelectedDateTasks(day);
                                                    setShowTasksModal(true);
                                                }
                                            }}
                                        >
                                            <div class="text-sm font-semibold" style={{ "color": "var(--color-text-muted)" }}>
                                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div class={`text-lg font-bold mt-1 ${
                                                isToday 
                                                    ? 'w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                                                    : ''
                                            }`} style={{ 
                                                "background-color": isToday ? "var(--color-accent)" : "transparent",
                                                "color": isToday ? "var(--color-accent-text)" : "var(--color-text)"
                                            }}>
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
                    <div ref={weekScrollRef} class="max-h-[600px] overflow-y-auto overflow-x-auto relative">
                        <div class="min-w-[800px] relative">
                            {/* Current time indicator */}
                            {(() => {
                                const now = currentTime();
                                const isCurrentWeek = getWeekDays().some(d => d.toDateString() === now.toDateString());
                                if (!isCurrentWeek) return null;
                                const topPx = now.getHours() * 60 + now.getMinutes();
                                return (
                                    <div
                                        class="absolute z-30 pointer-events-none"
                                        style={{
                                            top: `${topPx}px`,
                                            left: 'calc(100% / 8)',
                                            right: '0'
                                        }}
                                    >
                                        <div class="relative flex items-center">
                                            <div class="w-2.5 h-2.5 rounded-full -ml-1.5 shrink-0" style={{ "background-color": "var(--color-accent)" }}></div>
                                            <div class="flex-1 h-0.5" style={{ "background-color": "var(--color-accent)" }}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                            <For each={Array.from({ length: 24 }, (_, i) => i)}>
                                {(hour) => (
                                    <div class="grid grid-cols-8" style={{ "border-bottom": "1px solid var(--color-border)" }}>
                                        <div class="p-3 text-sm" style={{ "border-right": "1px solid var(--color-border)", "color": "var(--color-text-muted)" }}>
                                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                        </div>
                                        <For each={getWeekDays()}>
                                            {(day) => {
                                                // Use createMemo to make this reactive to events() changes
                                                const dayEvents = createMemo(() => getEventsWithBreaks(day));
                                                const dayTasks = createMemo(() => getTasksForDate(day));
                                                
                                                return (
                                                    <div 
                                                        class="relative min-h-[60px] transition-colors duration-200 select-none"
                                                        style={{ "border-right": "1px solid var(--color-border)", "cursor": isResizing() ? "ns-resize" : isDraggingEvent() ? "grabbing" : "default" }}
                                                        onMouseMove={(e) => {
                                                            handleEventDragMoveWeek(e, day, hour);
                                                            handleResizeMove(e, day, hour);
                                                        }}
                                                    >
                                                        {/* Drag-to-move target preview */}
                                                        {(() => {
                                                            const preview = getDragMovePreview(day, hour);
                                                            if (!preview) return null;
                                                            return (
                                                                <div
                                                                    class="absolute left-0 right-0 mx-1 rounded z-20 pointer-events-none"
                                                                    style={{
                                                                        "top": `${preview.top}px`,
                                                                        "height": `${preview.height}px`,
                                                                        "background-color": preview.color,
                                                                        "opacity": "0.35",
                                                                        "border": `2px dashed ${preview.color}`
                                                                    }}
                                                                ></div>
                                                            );
                                                        })()}
                                                        {/* Render Events */}
                                                        <For each={dayEvents()}>
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
                                                                            ? 'border-dashed'
                                                                            : 'cursor-grab hover:opacity-80 transition-all duration-200'
                                                                    }`}
                                                                    style={{ 
                                                                        'background-color': isBreak ? 'transparent' : (event.Color || '#3b82f6'),
                                                                        'border': isBreak ? '1px dashed var(--color-border)' : 'none',
                                                                        'top': `${topOffset}px`,
                                                                        'height': `${getResizedHeight(event) ?? height}px`,
                                                                        'opacity': isDraggingEvent() && draggingEvent()?.id === event.id ? 0.3 : (isBreak ? 0.5 : (allTasksCompleted ? 0.6 : 0.9)),
                                                                        'pointer-events': isBreak || isDraggingEvent() || isResizing() ? 'none' : 'auto'
                                                                    }}
                                                                    onMouseDown={(e) => {
                                                                        if (isBreak) return;
                                                                        handleEventDragStart(e, event);
                                                                    }}
                                                                >
                    <div class={`font-medium truncate ${allTasksCompleted && !isBreak ? 'line-through' : ''} ${isBreak ? 'italic' : ''}`} style={{ "color": isBreak ? "var(--color-text-muted)" : "white" }}>
                                                                        {allTasksCompleted && !isBreak ? '✓ ' : ''}{event.EventName}
                                                                    </div>
                                                                    <Show when={!event.AllDay && !isBreak}>
                                                                        <div class="text-[10px] opacity-75">
                                                                            {formatTime(new Date(event.Start))}
                                                                            {height > 40 && (
                                                                                <span> - {formatTime(new Date(event.End))}</span>
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
                                                                        <div class="text-[10px] opacity-60 mt-1 line-clamp-2" style="white-space: pre-wrap;">
                                                                            {event.Description}
                                                                        </div>
                                                                    </Show>
                                                                    <Show when={!isBreak}>
                                                                        <div
                                                                            class="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-white/20 transition-colors rounded-b z-20"
                                                                            onMouseDown={(e) => handleResizeStart(e, event)}
                                                                        >
                                                                            <div class="w-6 h-0.5 rounded-full bg-white/40 mx-auto mt-1"></div>
                                                                        </div>
                                                                    </Show>
                                                                </div>
                                                            );
                                                        }}
                                                    </For>
                                                    
                                                    {/* Render Tasks */}
                                                    <For each={dayTasks()}>
                                                        {(task) => {
                                                            const deadline = new Date(task.Deadline);
                                                            const taskHour = deadline.getHours();
                                                            const taskMinute = deadline.getMinutes();
                                                            
                                                            // Only show task in its hour slot
                                                            if (taskHour !== hour) {
                                                                return null;
                                                            }
                                                            
                                                            // Calculate position and height based on duration
                                                            const topOffset = (taskMinute / 60) * 60;
                                                            const hasDuration = task.Duration && task.Duration > 0;
                                                            const height = hasDuration ? Math.max(30, (task.Duration / 60) * 60) : 30;
                                                            const priorityColor = task.Priority === 'P1' ? '#ef4444' : task.Priority === 'P2' ? '#f97316' : '#22c55e';
                                                            const isDraggable = hasDuration && !task.Completed;
                                                            
                                                            // Calculate end time for display
                                                            const endTime = hasDuration ? new Date(deadline.getTime() + task.Duration * 60000) : null;
                                                            
                                                            return (
                                                                <div
                                                                    class={`absolute left-0 right-0 mx-1 text-xs px-2 py-1 rounded overflow-hidden z-10 ${isDraggable ? 'cursor-grab' : 'cursor-pointer'} hover:opacity-80 transition-all duration-200 ${hasDuration ? '' : 'border-l-2'}`}
                                                                    style={{ 
                                                                        'background-color': hasDuration ? priorityColor : (task.Priority === 'P1' ? '#ef444420' : task.Priority === 'P2' ? '#f9731620' : '#22c55e20'),
                                                                        'border-left-color': hasDuration ? undefined : priorityColor,
                                                                        'top': `${topOffset}px`,
                                                                        'height': `${height}px`,
                                                                        'opacity': isDraggingEvent() && draggingEvent()?.id === task.id ? 0.3 : (task.Completed ? 0.5 : 0.9),
                                                                        'pointer-events': isDraggingEvent() || isResizing() ? 'none' : 'auto'
                                                                    }}
                                                                    onMouseDown={(e) => {
                                                                        if (isDraggable) {
                                                                            handleEventDragStart(e, task, true);
                                                                        }
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedDateTasks(day);
                                                                        setShowTasksModal(true);
                                                                    }}
                                                                >
                                                                    <div class={`font-medium truncate ${task.Completed ? 'line-through' : ''}`} style={{ "color": hasDuration ? "white" : undefined }}>
                                                                        {task.Completed ? '✓ ' : '📋 '}{task.Title}
                                                                    </div>
                                                                    <Show when={hasDuration && !task.Completed}>
                                                                        <div class="text-[10px] opacity-75" style={{ "color": "white" }}>
                                                                            {formatTime(deadline)}
                                                                            {endTime && (<span> - {formatTime(endTime)}</span>)}
                                                                        </div>
                                                                    </Show>
                                                                    <Show when={hasDuration && height > 50 && task.Description}>
                                                                        <div class="text-[10px] opacity-60 mt-1 line-clamp-2" style={{ "color": "white", "white-space": "pre-wrap" }}>
                                                                            {task.Description}
                                                                        </div>
                                                                    </Show>
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
                    class="fixed z-50 rounded-lg p-3 shadow-xl pointer-events-none glass"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <h4 class="font-semibold mb-1" style={{ "color": "var(--color-text)" }}>{hoveredEvent()!.EventName}</h4>
                    <Show when={hoveredEvent()!.Description}>
                        <p class="text-sm mb-2" style={{ "color": "var(--color-text-secondary)", "white-space": "pre-wrap" }}>{hoveredEvent()!.Description}</p>
                    </Show>
                    <p class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                        {new Date(hoveredEvent()!.Start).toLocaleString()} - {new Date(hoveredEvent()!.End).toLocaleString()}
                    </p>
                    <Show when={hoveredEvent()!.expand?.Tasks?.length > 0}>
                        <div class="mt-2 pt-2" style={{ "border-top": "1px solid var(--color-border)" }}>
                            <p class="text-xs mb-1" style={{ "color": "var(--color-text-secondary)" }}>Tasks:</p>
                            <For each={hoveredEvent()!.expand.Tasks}>
                                {(task: any) => (
                                    <div class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                        {task.Completed ? '✓' : '○'} {task.Title}
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Event Detail/Edit Modal */}
            <Show when={quickViewEvent()}>
                <div class="fixed inset-0 glass-overlay flex items-end lg:items-center justify-center z-50" onClick={() => { setQuickViewEvent(null); resetForm(); }}>
                    <div class="glass-modal rounded-t-2xl lg:rounded-xl w-full lg:max-w-2xl max-h-[85vh] lg:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div class="sticky top-0 p-4 lg:p-5 flex items-center justify-between" style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)", "backdrop-filter": "blur(20px)" }}>
                            <div class="flex items-center gap-3">
                                <div 
                                    class="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ 'background-color': eventColor() }}
                                ></div>
                                <h2 class="text-lg lg:text-xl font-bold" style={{ "color": "var(--color-text)" }}>
                                    {quickViewEvent()?._editingInstance ? 'Edit Occurrence' : 'Event Details'}
                                </h2>
                            </div>
                            <button
                                onClick={() => { setQuickViewEvent(null); resetForm(); }}
                                class="transition-colors duration-200 text-xl w-8 h-8 flex items-center justify-center rounded-lg" style={{ "color": "var(--color-text-muted)" }}
                            >
                                ×
                            </button>
                        </div>
                        <div class="p-5">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            updateEvent();
                        }}>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Event Name</label>
                                <input
                                    type="text"
                                    value={eventName()}
                                    onInput={(e) => setEventName(e.currentTarget.value)}
                                    required
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Description</label>
                                <textarea
                                    value={description()}
                                    onInput={(e) => setDescription(e.currentTarget.value)}
                                    rows="3"
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200 resize-none" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                ></textarea>
                            </div>

                            <div class="mb-4">
                                <label class="flex items-center text-xs font-medium" style={{ "color": "var(--color-text-secondary)" }}>
                                    <input
                                        type="checkbox"
                                        checked={allDay()}
                                        onChange={(e) => setAllDay(e.currentTarget.checked)}
                                        class="mr-2 w-4 h-4 rounded"
                                    />
                                    All Day Event
                                </label>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Start Date / Time</label>
                                <DateTimePicker
                                    date={startDate()}
                                    time={startTime()}
                                    onDateChange={(d) => { setStartDate(d); if (!endDate() || endDate() < d) setEndDate(d); }}
                                    onTimeChange={setStartTime}
                                    showTime={!allDay()}
                                    required
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>End Date / Time</label>
                                <DateTimePicker
                                    date={endDate()}
                                    time={endTime()}
                                    onDateChange={setEndDate}
                                    onTimeChange={setEndTime}
                                    showTime={!allDay()}
                                    required
                                    minDate={startDate()}
                                    minTime={startDate() === endDate() ? startTime() : undefined}
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Event Color</label>
                                <div class="flex gap-2 flex-wrap">
                                    <For each={colorPresets}>
                                        {(color) => (
                                            <button
                                                type="button"
                                                onClick={() => setEventColor(color.value)}
                                                class={`w-10 h-10 rounded-lg transition-all duration-200 border-2 ${
                                                    eventColor() === color.value 
                                                        ? 'border-white scale-110' 
                                                        : 'border-transparent'
                                                }`}
                                                style={{ 'background-color': color.value }}
                                            />
                                        )}
                                    </For>
                                    <input
                                        type="color"
                                        value={eventColor()}
                                        onInput={(e) => setEventColor(e.currentTarget.value)}
                                        class="w-10 h-10 rounded-lg cursor-pointer" style={{ "border": "2px solid var(--color-border)" }}
                                    />
                                </div>
                            </div>

                            <Show when={quickViewEvent()!.expand?.Tasks?.length > 0}>
                                <div class="mb-4 pt-4" style={{ "border-top": "1px solid var(--color-border)" }}>
                                    <h4 class="text-sm font-semibold mb-3" style={{ "color": "var(--color-text-secondary)" }}>Tasks</h4>
                                    <div class="space-y-2">
                                        <For each={quickViewEvent()!.expand.Tasks}>
                                            {(task: any) => (
                                                <label class="flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 cursor-pointer" style={{ "background-color": "transparent" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={task.Completed}
                                                        onChange={() => toggleTaskCompletion(task.id, task.Completed)}
                                                        class="w-4 h-4 rounded"
                                                    />
                                                    <span class={`flex-1 ${task.Completed ? 'line-through' : ''}`} style={{ "color": task.Completed ? "var(--color-text-muted)" : "var(--color-text)" }}>
                                                        {task.Title}
                                                    </span>
                                                </label>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </Show>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Quick Add Tasks</label>
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
                                                    class="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
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
                                        class="w-full border border-dashed rounded-lg px-3 py-2 text-sm transition-all duration-200" style={{ "color": "var(--color-text-secondary)", "border-color": "var(--color-border)" }}
                                    >
                                        + Add Task
                                    </button>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Link Existing Tasks</label>
                                <div class="max-h-32 overflow-y-auto space-y-2 rounded-lg p-2" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                    <For each={todoItems()}>
                                        {(todo) => !todo.Completed && (
                                            <label class="flex items-center p-2 rounded-lg transition-colors duration-200 cursor-pointer">
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
                                                    class="mr-2 w-4 h-4 rounded"
                                                />
                                                <span class="text-sm" style={{ "color": "var(--color-text)" }}>{todo.Title}</span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </div>

                            <Show when={!quickViewEvent()?._editingInstance}>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Recurrence</label>
                                <CustomSelect
                                    value={recurrence()}
                                    onChange={(v) => {
                                        setRecurrence(v);
                                        if (v !== 'custom') setRecurrenceDays([]);
                                    }}
                                    options={[
                                        { value: "none", label: "No Recurrence" },
                                        { value: "daily", label: "Daily" },
                                        { value: "weekly", label: "Weekly" },
                                        { value: "monthly", label: "Monthly" },
                                        { value: "custom", label: "Custom Days" },
                                    ]}
                                />
                            </div>

                            <Show when={recurrence() === 'custom'}>
                                <div class="mb-4">
                                    <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Repeat On</label>
                                    <div class="flex gap-1.5">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const days = recurrenceDays();
                                                    setRecurrenceDays(days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx].sort());
                                                }}
                                                class="w-9 h-9 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center"
                                                style={{
                                                    "background-color": recurrenceDays().includes(idx) ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                                    "color": recurrenceDays().includes(idx) ? "var(--color-accent-text)" : "var(--color-text-muted)",
                                                    "border": `1px solid ${recurrenceDays().includes(idx) ? "var(--color-accent)" : "var(--color-border)"}`,
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div class="flex gap-2 mt-2">
                                        <button type="button" onClick={() => setRecurrenceDays([1,2,3,4,5])} class="text-xs px-2 py-1 rounded-md transition-colors duration-200" style={{ "color": "var(--color-accent)", "background-color": "var(--color-bg-tertiary)" }}>Weekdays</button>
                                        <button type="button" onClick={() => setRecurrenceDays([0,6])} class="text-xs px-2 py-1 rounded-md transition-colors duration-200" style={{ "color": "var(--color-accent)", "background-color": "var(--color-bg-tertiary)" }}>Weekends</button>
                                        <button type="button" onClick={() => setRecurrenceDays([0,1,2,3,4,5,6])} class="text-xs px-2 py-1 rounded-md transition-colors duration-200" style={{ "color": "var(--color-accent)", "background-color": "var(--color-bg-tertiary)" }}>Every Day</button>
                                    </div>
                                </div>
                            </Show>

                            <Show when={recurrence() !== 'none'}>
                                <div class="mb-4">
                                    <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Repeat Until</label>
                                    <DatePicker
                                        date={recurrenceEndDate()}
                                        onDateChange={setRecurrenceEndDate}
                                    />
                                </div>
                            </Show>
                            </Show>

                            <div class="mb-4">
                                <TagSelector
                                    allTags={allTags}
                                    selectedTags={selectedTags}
                                    setSelectedTags={setSelectedTags}
                                    onTagCreated={fetchTags}
                                />
                            </div>

                            <div class="flex gap-2">
                                <button
                                    type="submit"
                                    class="flex-1 font-semibold py-2.5 rounded-lg transition-all duration-300 text-sm" style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                                >
                                    Save {quickViewEvent()?._editingInstance ? 'Occurrence' : 'Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteEvent(quickViewEvent()!.id)}
                                    class="px-3 py-2.5 font-semibold rounded-lg transition-all duration-300 text-sm"
                                    style={{ "background-color": "var(--color-danger)", "color": "white" }}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Event Creation Modal */}
            <Show when={showEventModal()}>
                <div class="fixed inset-0 glass-overlay flex items-end lg:items-center justify-center z-50" onClick={() => setShowEventModal(false)}>
                    <div class="glass-modal rounded-t-2xl lg:rounded-xl w-full lg:max-w-2xl max-h-[85vh] lg:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div class="sticky top-0 p-4 lg:p-5 flex items-center justify-between" style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)", "backdrop-filter": "blur(20px)" }}>
                            <h2 class="text-lg lg:text-xl font-bold" style={{ "color": "var(--color-text)" }}>Create Event</h2>
                            <button
                                onClick={() => {
                                    setShowEventModal(false);
                                    resetForm();
                                }}
                                class="transition-colors duration-200 text-xl w-8 h-8 flex items-center justify-center rounded-lg" style={{ "color": "var(--color-text-muted)" }}
                            >
                                ×
                            </button>
                        </div>
                        <div class="p-5">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            createEvent();
                        }}>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Event Name</label>
                                <input
                                    type="text"
                                    value={eventName()}
                                    onInput={(e) => setEventName(e.currentTarget.value)}
                                    required
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Description</label>
                                <textarea
                                    value={description()}
                                    onInput={(e) => setDescription(e.currentTarget.value)}
                                    rows="3"
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200 resize-none" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                ></textarea>
                            </div>

                            <div class="mb-4">
                                <label class="flex items-center text-xs font-medium" style={{ "color": "var(--color-text-secondary)" }}>
                                    <input
                                        type="checkbox"
                                        checked={allDay()}
                                        onChange={(e) => setAllDay(e.currentTarget.checked)}
                                        class="mr-2 w-4 h-4 rounded"
                                    />
                                    All Day Event
                                </label>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Start Date / Time</label>
                                <DateTimePicker
                                    date={startDate()}
                                    time={startTime()}
                                    onDateChange={(d) => { setStartDate(d); if (!endDate() || endDate() < d) setEndDate(d); }}
                                    onTimeChange={setStartTime}
                                    showTime={!allDay()}
                                    required
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>End Date / Time</label>
                                <DateTimePicker
                                    date={endDate()}
                                    time={endTime()}
                                    onDateChange={setEndDate}
                                    onTimeChange={setEndTime}
                                    showTime={!allDay()}
                                    required
                                    minDate={startDate()}
                                    minTime={startDate() === endDate() ? startTime() : undefined}
                                />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Event Color</label>
                                <div class="flex gap-2 flex-wrap">
                                    <For each={colorPresets}>
                                        {(color) => (
                                            <button
                                                type="button"
                                                onClick={() => setEventColor(color.value)}
                                                class={`w-10 h-10 rounded-lg transition-all duration-200 border-2 ${
                                                    eventColor() === color.value 
                                                        ? 'border-white scale-110' 
                                                        : 'border-transparent'
                                                }`}
                                                style={{ 'background-color': color.value }}
                                            />
                                        )}
                                    </For>
                                    <input
                                        type="color"
                                        value={eventColor()}
                                        onInput={(e) => setEventColor(e.currentTarget.value)}
                                        class="w-10 h-10 rounded-lg cursor-pointer" style={{ "border": "2px solid var(--color-border)" }}
                                    />
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Quick Add Tasks</label>
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
                                                    class="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200" style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
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
                                        class="w-full border border-dashed rounded-lg px-3 py-2 text-sm transition-all duration-200" style={{ "color": "var(--color-text-secondary)", "border-color": "var(--color-border)" }}
                                    >
                                        + Add Task
                                    </button>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Link Existing Tasks</label>
                                <div class="max-h-32 overflow-y-auto space-y-2 rounded-lg p-2" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                    <For each={todoItems()}>
                                        {(todo) => !todo.Completed && (
                                            <label class="flex items-center p-2 rounded-lg transition-colors duration-200 cursor-pointer">
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
                                                    class="mr-2 w-4 h-4 rounded"
                                                />
                                                <span class="text-sm" style={{ "color": "var(--color-text)" }}>{todo.Title}</span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Recurrence</label>
                                <CustomSelect
                                    value={recurrence()}
                                    onChange={(v) => {
                                        setRecurrence(v);
                                        if (v !== 'custom') setRecurrenceDays([]);
                                    }}
                                    options={[
                                        { value: "none", label: "No Recurrence" },
                                        { value: "daily", label: "Daily" },
                                        { value: "weekly", label: "Weekly" },
                                        { value: "monthly", label: "Monthly" },
                                        { value: "custom", label: "Custom Days" },
                                    ]}
                                />
                            </div>

                            <Show when={recurrence() === 'custom'}>
                                <div class="mb-4">
                                    <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Repeat On</label>
                                    <div class="flex gap-1.5">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const days = recurrenceDays();
                                                    setRecurrenceDays(days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx].sort());
                                                }}
                                                class="w-9 h-9 rounded-full text-xs font-semibold transition-all duration-200 flex items-center justify-center"
                                                style={{
                                                    "background-color": recurrenceDays().includes(idx) ? "var(--color-accent)" : "var(--color-bg-tertiary)",
                                                    "color": recurrenceDays().includes(idx) ? "var(--color-accent-text)" : "var(--color-text-muted)",
                                                    "border": `1px solid ${recurrenceDays().includes(idx) ? "var(--color-accent)" : "var(--color-border)"}`,
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div class="flex gap-2 mt-2">
                                        <button type="button" onClick={() => setRecurrenceDays([1,2,3,4,5])} class="text-xs px-2 py-1 rounded-md transition-colors duration-200" style={{ "color": "var(--color-accent)", "background-color": "var(--color-bg-tertiary)" }}>Weekdays</button>
                                        <button type="button" onClick={() => setRecurrenceDays([0,6])} class="text-xs px-2 py-1 rounded-md transition-colors duration-200" style={{ "color": "var(--color-accent)", "background-color": "var(--color-bg-tertiary)" }}>Weekends</button>
                                        <button type="button" onClick={() => setRecurrenceDays([0,1,2,3,4,5,6])} class="text-xs px-2 py-1 rounded-md transition-colors duration-200" style={{ "color": "var(--color-accent)", "background-color": "var(--color-bg-tertiary)" }}>Every Day</button>
                                    </div>
                                </div>
                            </Show>

                            <Show when={recurrence() !== 'none'}>
                                <div class="mb-4">
                                    <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Repeat Until</label>
                                    <DatePicker
                                        date={recurrenceEndDate()}
                                        onDateChange={setRecurrenceEndDate}
                                    />
                                </div>
                            </Show>

                            <div class="mb-4">
                                <TagSelector
                                    allTags={allTags}
                                    selectedTags={selectedTags}
                                    setSelectedTags={setSelectedTags}
                                    onTagCreated={fetchTags}
                                />
                            </div>

                            <button
                                type="submit"
                                class="w-full font-semibold py-2.5 rounded-lg transition-all duration-300 text-sm" style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                            >
                                Create Event
                            </button>
                        </form>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Tasks Modal */}
            <Show when={showTasksModal() && selectedDateTasks()}>
                <div
                    class="fixed inset-0 glass-overlay z-50 flex items-end lg:items-center justify-center"
                    onClick={() => {
                        setShowTasksModal(false);
                        setSelectedDateTasks(null);
                    }}
                >
                    <div
                        class="rounded-t-2xl lg:rounded-xl w-full lg:max-w-2xl max-h-[85vh] overflow-hidden"
                        class="glass-modal rounded-t-2xl lg:rounded-xl w-full lg:max-w-2xl max-h-[85vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="sticky top-0 p-4 lg:p-5 flex items-center justify-between" style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)", "backdrop-filter": "blur(20px)" }}>
                            <h2 class="text-base lg:text-xl font-bold" style={{ "color": "var(--color-text)" }}>
                                Tasks Due: {selectedDateTasks()!.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowTasksModal(false);
                                    setSelectedDateTasks(null);
                                }}
                                class="transition-colors duration-200 text-2xl w-8 h-8 flex items-center justify-center"
                                style={{ "color": "var(--color-text-muted)" }}
                            >
                                ×
                            </button>
                        </div>
                        <div class="p-5 overflow-y-auto max-h-[calc(80vh-100px)]">
                            <Show when={getTasksForDate(selectedDateTasks()!).length === 0}>
                                <div class="text-center py-8" style={{ "color": "var(--color-text-muted)" }}>
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
                                            <div class="rounded-xl p-4 transition-all duration-200" style={{ "background-color": "var(--color-bg-secondary)", "border": "1px solid var(--color-border)" }}>
                                                <div class="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={task.Completed}
                                                        onChange={() => toggleTaskCompletion(task.id, task.Completed)}
                                                        class="w-5 h-5 mt-1 rounded cursor-pointer transition-all duration-200"
                                                    />
                                                    <div class="flex-1">
                                                        <div class="flex items-start justify-between">
                                                            <h3 class={`text-base font-semibold transition-all duration-200 ${task.Completed ? 'line-through' : ''}`} style={{ "color": task.Completed ? "var(--color-text-muted)" : "var(--color-text)" }}>
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
                                                            <p class={`text-sm mt-1 ${task.Completed ? 'line-through' : ''}`} style={{ "color": task.Completed ? "var(--color-text-muted)" : "var(--color-text-secondary)", "white-space": "pre-wrap" }}>
                                                                {task.Description}
                                                            </p>
                                                        </Show>
                                                        <div class="flex items-center gap-2 mt-2 text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                                            <Show when={hasTime}>
                                                                <span>⏰ {formatTime(deadline)}</span>
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

            {/* Recurrence Edit Choice Dialog */}
            <Show when={recurrenceChoice().show}>
                <div class="fixed inset-0 glass-overlay flex items-center justify-center z-[60]" onClick={() => setRecurrenceChoice({ show: false, event: null, action: 'edit' })}>
                    <div class="glass-modal rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <h3 class="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                            {recurrenceChoice().action === 'delete' ? 'Delete Recurring Event' : 'Edit Recurring Event'}
                        </h3>
                        <p class="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                            {recurrenceChoice().action === 'delete'
                                ? 'Do you want to delete this occurrence or all events in the series?'
                                : 'Do you want to change this occurrence or all events in the series?'}
                        </p>
                        <div class="flex flex-col gap-2">
                            <button
                                onClick={() => handleRecurrenceChoice('this')}
                                class="w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
                                style={{
                                    'background-color': 'var(--color-accent)',
                                    color: 'var(--color-accent-text)'
                                }}
                            >
                                This event only
                            </button>
                            <button
                                onClick={() => handleRecurrenceChoice('all')}
                                class="w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
                                style={{
                                    'background-color': 'var(--color-surface)',
                                    color: 'var(--color-text)',
                                    border: '1px solid var(--color-border)'
                                }}
                            >
                                All events
                            </button>
                            <button
                                onClick={() => setRecurrenceChoice({ show: false, event: null, action: 'edit' })}
                                class="w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                Cancel
                            </button>
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
