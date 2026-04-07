import { UploadFile, fileUploader } from '@solid-primitives/upload';
import { Index, Show, createSignal, onMount } from 'solid-js';
import { generateRecurringTasks } from '../utils/recurrence';
import { bk, currentUser } from '../lib/backend.ts';
import { refreshNotifications } from '../lib/notifications';
import ConfirmModal from '../components/ConfirmModal';
import { Subtask } from '../lib/models/Todo.ts';
import { 
    SearchIcon, 
    EditIcon, 
    TrashIcon, 
    CalendarIcon, 
    CheckCircleIcon, 
    RepeatIcon,
    ChevronDownIcon
} from '../components/Icons';


function Todo() {

    async function createTask(name:string, description:string, completed:boolean, url:string, file:any, priority: string, deadlineDate:string, deadlineTime:string, tags:string[], recur:string, recurEnd:string, subs:Subtask[]) {
        // Combine date and time into ISO string
        let deadlineISO = undefined;
        if (deadlineDate && deadlineDate.trim()) {
            // If time is provided, use it; otherwise default to 00:00
            const timeStr = deadlineTime && deadlineTime.trim() ? deadlineTime : '00:00';
            const date = new Date(`${deadlineDate}T${timeStr}`);
            deadlineISO = date.toISOString();
        }
        
        const data = {
            Title: name,
            Description: description,
            Completed: completed,
            URL: url,
            File: file,
            Priority: priority as `P${number}`,
            Deadline: deadlineISO,
            Tags: tags,
            Recurrence: recur as "none" | "daily" | "weekly" | "monthly",
            RecurrenceEndDate: recurEnd || undefined,
            Subtasks: subs,
            user: currentUser()!.id
        };
        console.log('Creating task with data:', data);
        const record = await bk.collection('Todo').create(data);
        console.log('Task created:', record);
        
        fetchTodos();
        setTimeout(() => refreshNotifications(), 100);
    }

    async function updateTask(id: string, name:string, description:string, completed:boolean, url:string, file:any, priority:string, deadlineDate:string, deadlineTime:string, tags:string[], recur:string, recurEnd:string, subs:Subtask[]) {
        // Combine date and time into ISO string
        let deadlineISO = undefined;
        if (deadlineDate && deadlineDate.trim()) {
            // If time is provided, use it; otherwise default to 00:00
            const timeStr = deadlineTime && deadlineTime.trim() ? deadlineTime : '00:00';
            const date = new Date(`${deadlineDate}T${timeStr}`);
            deadlineISO = date.toISOString();
        }
        
        const data = {
            Title: name,
            Description: description,
            Completed: completed,
            URL: url,
            File: file,
            Priority: priority as `P${number}`,
            Deadline: deadlineISO,
            Tags: tags,
            Recurrence: recur as "none"|"daily"|"weekly"|"monthly",
            RecurrenceEndDate: recurEnd || undefined,
            Subtasks: subs,
            user: currentUser()?.id
        };
        await bk.collection('Todo').update(id, data);
        console.log('Task updated');
        fetchTodos();
        setTimeout(() => refreshNotifications(), 100);
        resetForm();
        setEditingTask(null);
    }

    async function deleteTask(id: string) {
        setConfirmDelete({ show: true, taskId: id });
    }

    async function confirmDeleteTask() {
        const taskId = confirmDelete().taskId;
        if (taskId) {
            await bk.collection('Todo').delete(taskId);
            fetchTodos();
            setTimeout(() => refreshNotifications(), 100);
        }
        setConfirmDelete({ show: false, taskId: '' });
    }

    async function toggleComplete(id: string, currentStatus: boolean) {
        // If marking as complete and task has recurrence, reschedule to next occurrence
        if (!currentStatus) {
            const task = todoItems().find(t => t.id === id);
            console.log('Toggling complete for task:', task);
            if (task && task.Recurrence && task.Recurrence !== 'none' && task.Deadline) {
                console.log('Task has recurrence:', task.Recurrence, 'Deadline:', task.Deadline);
                const currentDeadline = new Date(task.Deadline);
                let nextDeadline = new Date(currentDeadline);
                
                // Calculate next occurrence
                switch (task.Recurrence) {
                    case 'daily':
                        nextDeadline.setDate(nextDeadline.getDate() + 1);
                        break;
                    case 'weekly':
                        nextDeadline.setDate(nextDeadline.getDate() + 7);
                        break;
                    case 'monthly':
                        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
                        break;
                }
                
                console.log('Next deadline calculated:', nextDeadline.toISOString());
                
                // Check if next deadline exceeds recurrence end date
                if (task.RecurrenceEndDate) {
                    const endDate = new Date(task.RecurrenceEndDate);
                    if (nextDeadline > endDate) {
                        // If past end date, just mark as complete
                        await bk.collection('Todo').update(id, {
                            Completed: true
                        });
                        fetchTodos();
                        setTimeout(() => refreshNotifications(), 100);
                        return;
                    }
                }
                
                // Update to next deadline and keep uncompleted
                console.log('Updating task with new deadline:', nextDeadline.toISOString());
                await bk.collection('Todo').update(id, {
                    Deadline: nextDeadline.toISOString(),
                    Completed: false
                });
                console.log('Task updated successfully');
                fetchTodos();
                setTimeout(() => refreshNotifications(), 100);
                return;
            }
        }
        
        // Normal toggle for non-recurring or marking as incomplete
        await bk.collection('Todo').update(id, {
            Completed: !currentStatus
        });
        fetchTodos();
        setTimeout(() => refreshNotifications(), 100);
    }

    const [TaskName, setTaskName] = createSignal('');
    const [TaskDescription, setTaskDescription] = createSignal('');
    const [TaskCompleted, setTaskCompleted] = createSignal(false);
    const [TaskURL, setTaskURL] = createSignal('');
    const [TaskFile, setTaskFile] = createSignal<UploadFile[]>([]);
    const [TaskPriority, setTaskPriority] = createSignal('P2');
    const [TaskDeadlineDate, setTaskDeadlineDate] = createSignal('');
    const [TaskDeadlineTime, setTaskDeadlineTime] = createSignal('');
    const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [recurrence, setRecurrence] = createSignal('none');
    const [recurrenceEndDate, setRecurrenceEndDate] = createSignal('');
    const [subtasks, setSubtasks] = createSignal<Subtask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = createSignal('');

    const [todoItems, setTodoItems] = createSignal([] as any[]);
    const [allTags, setAllTags] = createSignal([] as any[]);
    const [editingTask, setEditingTask] = createSignal<any>(null);
    const [searchQuery, setSearchQuery] = createSignal('');
    const [filterPriority, setFilterPriority] = createSignal('all');
    const [filterStatus, setFilterStatus] = createSignal('active');
    const [sortBy, setSortBy] = createSignal('priority'); // priority, deadline, created
    const [showCompletedSection, setShowCompletedSection] = createSignal(true);
    const [touchStart, setTouchStart] = createSignal(0);
    const [touchEnd, setTouchEnd] = createSignal(0);
    const [swipingTask, setSwipingTask] = createSignal<string | null>(null);
    const [showModal, setShowModal] = createSignal(false);
    const [confirmDelete, setConfirmDelete] = createSignal({ show: false, taskId: '' });
    let isFetchingTodos = false;
    let needsRefetch = false;
    
    async function fetchTodos() {
            const items = await bk.collection('Todo').getFullList({
                expand: 'Tags'
            });
            setTodoItems(items);
    }
    
    async function fetchTags() {
        const tags = await bk.collection('Tags').getFullList({
            filter: `user = "${currentUser()?.id}"`
        });
        setAllTags(tags);
    }

    function resetForm() {
        setTaskName('');
        setTaskDescription('');
        setTaskCompleted(false);
        setTaskURL('');
        setTaskFile([]);
        setTaskPriority('P2');
        setTaskDeadlineDate('');
        setTaskDeadlineTime('');
        setSelectedTags([]);
        setRecurrence('none');
        setRecurrenceEndDate('');
        setSubtasks([]);
        setNewSubtaskTitle('');
    }

    function startEditing(task: any) {
        setEditingTask(task);
        setTaskName(task.Title);
        setTaskDescription(task.Description);
        setTaskCompleted(task.Completed);
        setTaskURL(task.URL || '');
        setTaskPriority(task.Priority || 'P1');
        
        // Convert ISO date to separate date and time fields
        if (task.Deadline) {
            const date = new Date(task.Deadline);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setTaskDeadlineDate(`${year}-${month}-${day}`);
            setTaskDeadlineTime(`${hours}:${minutes}`);
        } else {
            setTaskDeadlineDate('');
            setTaskDeadlineTime('');
        }
        
        setSelectedTags(task.expand?.Tags?.map((t: any) => t.id) || []);
        setRecurrence(task.Recurrence || 'none');
        setRecurrenceEndDate(task.RecurrenceEndDate || '');
        setSubtasks(task.Subtasks || []);
        setNewSubtaskTitle('');
        setShowModal(true);
    }

    onMount(() => {
        fetchTodos();
        fetchTags();
    });

    function getFilteredTodos() {
        let filtered = todoItems();

        // Search filter
        if (searchQuery()) {
            filtered = filtered.filter(t => 
                t.Title.toLowerCase().includes(searchQuery().toLowerCase()) ||
                t.Description.toLowerCase().includes(searchQuery().toLowerCase())
            );
        }

        // Priority filter
        if (filterPriority() !== 'all') {
            filtered = filtered.filter(t => t.Priority === filterPriority());
        }

        // Status filter
        if (filterStatus() === 'active') {
            filtered = filtered.filter(t => !t.Completed);
        } else if (filterStatus() === 'completed') {
            filtered = filtered.filter(t => t.Completed);
        }

        // Sort
        if (sortBy() === 'priority') {
            filtered.sort((a, b) => {
                const priorityOrder = { P1: 0, P2: 1, P3: 2 };
                return priorityOrder[a.Priority as keyof typeof priorityOrder] - priorityOrder[b.Priority as keyof typeof priorityOrder];
            });
        } else if (sortBy() === 'deadline') {
            filtered.sort((a, b) => {
                if (!a.Deadline) return 1;
                if (!b.Deadline) return -1;
                return new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime();
            });
        } else if (sortBy() === 'created') {
            filtered.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        }

        return filtered;
    }

    function getOverdueTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return getFilteredTodos().filter(t => {
            if (!t.Deadline || t.Completed) return false;
            const deadline = new Date(t.Deadline);
            return deadline < today;
        });
    }

    function getTodayTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return getFilteredTodos().filter(t => {
            if (t.Completed) return false;
            if (!t.Deadline) return false;
            const deadline = new Date(t.Deadline);
            return deadline >= today && deadline < tomorrow;
        });
    }

    function getTomorrowTasks() {
        const tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        return getFilteredTodos().filter(t => {
            if (t.Completed) return false;
            if (!t.Deadline) return false;
            const deadline = new Date(t.Deadline);
            return deadline >= tomorrow && deadline < dayAfter;
        });
    }

    function getThisWeekTasks() {
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setHours(0, 0, 0, 0);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        const weekEnd = new Date();
        weekEnd.setHours(0, 0, 0, 0);
        weekEnd.setDate(weekEnd.getDate() + 7);

        return getFilteredTodos().filter(t => {
            if (t.Completed) return false;
            if (!t.Deadline) return false;
            const deadline = new Date(t.Deadline);
            return deadline >= dayAfterTomorrow && deadline < weekEnd;
        });
    }

    function getLaterTasks() {
        const weekEnd = new Date();
        weekEnd.setHours(0, 0, 0, 0);
        weekEnd.setDate(weekEnd.getDate() + 7);

        return getFilteredTodos().filter(t => {
            if (t.Completed) return false;
            if (!t.Deadline) return false;
            const deadline = new Date(t.Deadline);
            return deadline >= weekEnd;
        });
    }

    function getNoDeadlineTasks() {
        return getFilteredTodos().filter(t => !t.Completed && !t.Deadline);
    }

    function getTaskStats() {
        const total = todoItems().length;
        const completed = todoItems().filter(t => t.Completed).length;
        const p1 = todoItems().filter(t => t.Priority === 'P1' && !t.Completed).length;
        return { total, completed, p1, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }
    
    function getCompletedTodos() {
        return todoItems()
            .filter(t => t.Completed)
            .sort((a, b) => {
                const aDate = a.CompletedAt || a.updated;
                const bDate = b.CompletedAt || b.updated;
                return new Date(bDate).getTime() - new Date(aDate).getTime();
            });
    }
    
    function handleTouchStart(e: TouchEvent) {
        setTouchStart(e.touches[0].clientX);
    }
    
    function handleTouchMove(e: TouchEvent, taskId: string) {
        setTouchEnd(e.touches[0].clientX);
        setSwipingTask(taskId);
    }
    
    function handleTouchEnd(task: any) {
        const swipeDistance = touchStart() - touchEnd();
        const minSwipeDistance = 100;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // Swipe left - mark complete/incomplete
                toggleComplete(task.id, task.Completed);
            } else {
                // Swipe right - edit
                startEditing(task);
            }
        }
        
        setSwipingTask(null);
        setTouchStart(0);
        setTouchEnd(0);
    }

    const TaskItem = (props: { task: any }) => {
        const item = () => props.task;
        return (
            <div 
                class={`group relative glass rounded-xl p-4 transition-all duration-300 ${
                    swipingTask() === item().id ? 'scale-95' : ''
                }`}
                style={{
                    "border": "1px solid var(--color-border)"
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={(e) => handleTouchMove(e, item().id)}
                onTouchEnd={() => handleTouchEnd(item())}
            >
                <div class="flex items-start gap-3 mb-2">
                    <input 
                        type="checkbox" 
                        checked={item().Completed} 
                        onChange={() => toggleComplete(item().id, item().Completed)}
                        class="w-[18px] h-[18px] mt-1 cursor-pointer"
                    />
                    <div class="flex-1">
                        <div class="flex items-start justify-between">
                            <h3 class={`text-base font-semibold transition-all duration-200 ${
                                item().Completed ? 'line-through' : ''
                            }`} style={{ "color": item().Completed ? "var(--color-text-muted)" : "var(--color-text)" }}>{item().Title}</h3>
                            <div class="flex items-center gap-2">
                                <span class={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                    item().Priority === 'P1' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                                    item().Priority === 'P2' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                    {item().Priority}
                                </span>
                                <button
                                    onClick={() => startEditing(item())}
                                    class="px-2 py-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                                    title="Edit"
                                >
                                    <EditIcon class="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteTask(item().id)}
                                    class="px-2 py-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                                    title="Delete"
                                >
                                    <TrashIcon class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <Show when={item().Description}>
                            <p class={`text-sm leading-relaxed mt-1 transition-all duration-200 ${
                                item().Completed ? 'line-through' : ''
                            }`} style={{ "white-space": "pre-wrap", "color": item().Completed ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>{item().Description}</p>
                        </Show>
                        <div class="flex items-center gap-2 mt-3 flex-wrap">
                            <Show when={item().expand?.Tags && item().expand.Tags.length > 0}>
                                <Index each={item().expand.Tags}>
                                    {(tag) => (
                                        <span
                                            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white"
                                            style={{ 'background-color': `${tag().color}40`, 'border': `1px solid ${tag().color}60` }}
                                        >
                                            <div
                                                class="w-1.5 h-1.5 rounded-full"
                                                style={{ 'background-color': tag().color }}
                                            />
                                            {tag().name}
                                        </span>
                                    )}
                                </Index>
                            </Show>
                            <Show when={item().Recurrence && item().Recurrence !== 'none'}>
                                <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    <RepeatIcon class="w-3 h-3" /> {item().Recurrence}
                                </span>
                            </Show>
                        </div>
                        <Show when={item().Subtasks && item().Subtasks.length > 0}>
                            <div class="mt-2">
                                <div class="flex items-center gap-2 mb-1.5">
                                    <div class="flex-1 h-1.5 rounded-full overflow-hidden" style={{ "background-color": "var(--color-bg-tertiary)" }}>
                                        <div 
                                            class="h-full rounded-full transition-all duration-300"
                                            style={{ 
                                                "width": `${(item().Subtasks.filter((s: Subtask) => s.completed).length / item().Subtasks.length) * 100}%`,
                                                "background-color": item().Subtasks.filter((s: Subtask) => s.completed).length === item().Subtasks.length ? "var(--color-success)" : "var(--color-accent)"
                                            }}
                                        ></div>
                                    </div>
                                    <span class="text-xs shrink-0" style={{ "color": "var(--color-text-muted)" }}>
                                        {item().Subtasks.filter((s: Subtask) => s.completed).length}/{item().Subtasks.length}
                                    </span>
                                </div>
                                <div class="space-y-0.5">
                                    <Index each={item().Subtasks}>
                                        {(sub) => (
                                            <div class="flex items-center gap-2 text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={sub().completed}
                                                    onChange={async () => {
                                                        const updated = item().Subtasks.map((s: Subtask) => 
                                                            s.id === sub().id ? { ...s, completed: !s.completed } : s
                                                        );
                                                        await bk.collection('Todo').update(item().id, { Subtasks: updated });
                                                        fetchTodos();
                                                    }}
                                                    class="w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                                                />
                                                <span class={sub().completed ? 'line-through' : ''} style={{ "color": sub().completed ? "var(--color-text-muted)" : "var(--color-text-secondary)" }}>
                                                    {sub().title}
                                                </span>
                                            </div>
                                        )}
                                    </Index>
                                </div>
                            </div>
                        </Show>
                        <div class="mt-2">
                            <input
                                type="text"
                                placeholder="+ Add subtask..."
                                class="w-full bg-transparent text-xs focus:outline-none py-1 px-1 rounded transition-colors placeholder:opacity-50"
                                style={{ "color": "var(--color-text-secondary)", "border-bottom": "1px solid transparent" }}
                                onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--color-border)'; }}
                                onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        const newSub = { id: crypto.randomUUID().slice(0, 8), title: e.currentTarget.value.trim(), completed: false };
                                        const updated = [...(item().Subtasks || []), newSub];
                                        await bk.collection('Todo').update(item().id, { Subtasks: updated });
                                        e.currentTarget.value = '';
                                        fetchTodos();
                                    }
                                }}
                            />
                        </div>
                        {item().Deadline && (
                            <p class="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                                <CalendarIcon class="w-4 h-4" /> 
                                {(() => {
                                    const deadline = new Date(item().Deadline);
                                    const hasTime = deadline.getHours() !== 0 || deadline.getMinutes() !== 0;
                                    return hasTime 
                                        ? deadline.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                                        : deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                })()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div class="flex flex-col gap-3 lg:gap-4 w-full">
            {/* Header */}
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-xl lg:text-2xl font-bold" style={{ "color": "var(--color-text)" }}>My Day</h2>
                    <p class="text-xs lg:text-sm mt-0.5" style={{ "color": "var(--color-text-muted)" }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="glass flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm">
                        <span style={{ "color": "var(--color-text-secondary)" }}>{getTaskStats().completed}/{getTaskStats().total}</span>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div class="glass rounded-lg p-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-2 relative">
                        <SearchIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ "color": "var(--color-text-muted)" }} />
                        <input
                            type="text"
                            value={searchQuery()}
                            onInput={(e) => setSearchQuery(e.currentTarget.value)}
                            placeholder="Search tasks..."
                            class="w-full rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                        />
                    </div>
                    <div class="relative">
                        <select
                            value={filterPriority()}
                            onChange={(e) => setFilterPriority(e.currentTarget.value)}
                            class="w-full rounded-lg px-3 py-2 text-sm cursor-pointer appearance-none focus:outline-none transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                        >
                            <option value="all">All Priorities</option>
                            <option value="P1">P1 - High</option>
                            <option value="P2">P2 - Medium</option>
                            <option value="P3">P3 - Low</option>
                        </select>
                    </div>
                    <div class="relative">
                        <select
                            value={filterStatus()}
                            onChange={(e) => setFilterStatus(e.currentTarget.value)}
                            class="w-full rounded-lg px-3 py-2 text-sm cursor-pointer appearance-none focus:outline-none transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 mt-3 text-xs">
                    <span style={{ "color": "var(--color-text-muted)" }}>Sort:</span>
                    <button
                        onClick={() => setSortBy('priority')}
                        class="px-2.5 py-1 rounded-md transition-all duration-200"
                        style={{ "background-color": sortBy() === 'priority' ? "var(--color-accent)" : "transparent", "color": sortBy() === 'priority' ? "var(--color-accent-text)" : "var(--color-text-secondary)" }}
                    >
                        Priority
                    </button>
                    <button
                        onClick={() => setSortBy('deadline')}
                        class="px-2.5 py-1 rounded-md transition-all duration-200"
                        style={{ "background-color": sortBy() === 'deadline' ? "var(--color-accent)" : "transparent", "color": sortBy() === 'deadline' ? "var(--color-accent-text)" : "var(--color-text-secondary)" }}
                    >
                        Deadline
                    </button>
                    <button
                        onClick={() => setSortBy('created')}
                        class="px-2.5 py-1 rounded-md transition-all duration-200"
                        style={{ "background-color": sortBy() === 'created' ? "var(--color-accent)" : "transparent", "color": sortBy() === 'created' ? "var(--color-accent-text)" : "var(--color-text-secondary)" }}
                    >
                        Created
                    </button>
                </div>
            </div>

            {/* list todo items */}
            <div class="w-full">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold" style={{ "color": "var(--color-text-secondary)" }}>
                    {filterStatus() === 'active' ? 'Active' : filterStatus() === 'completed' ? 'Completed' : 'All'} 
                    <span style={{ "color": "var(--color-text-muted)" }}>({getFilteredTodos().length})</span>
                </h3>
                <button
                    onClick={() => setShowModal(true)}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300"
                    style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                >
                    <span>+</span>
                    <span>New Task</span>
                </button>
            </div>

            {/* Show organized sections only for active tasks */}
            <Show when={filterStatus() === 'active'}>
                <div class="space-y-6">
                    {/* Overdue Tasks */}
                    <Show when={getOverdueTasks().length > 0}>
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-2 h-2 rounded-full bg-red-500"></div>
                                <h4 class="text-sm font-semibold text-red-400">Overdue</h4>
                                <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getOverdueTasks().length})</span>
                            </div>
                            <div class="space-y-3">
                                <Index each={getOverdueTasks()}>
                                    {(item) => <TaskItem task={item()} />}
                                </Index>
                            </div>
                        </div>
                    </Show>

                    {/* Today's Tasks */}
                    <Show when={getTodayTasks().length > 0}>
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-2 h-2 rounded-full" style={{ "background-color": "var(--color-accent)" }}></div>
                                <h4 class="text-sm font-semibold" style={{ "color": "var(--color-accent)" }}>Today</h4>
                                <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getTodayTasks().length})</span>
                            </div>
                            <div class="space-y-3">
                                <Index each={getTodayTasks()}>
                                    {(item) => <TaskItem task={item()} />}
                                </Index>
                            </div>
                        </div>
                    </Show>

                    {/* Tomorrow's Tasks */}
                    <Show when={getTomorrowTasks().length > 0}>
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                                <h4 class="text-sm font-semibold text-amber-400">Tomorrow</h4>
                                <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getTomorrowTasks().length})</span>
                            </div>
                            <div class="space-y-3">
                                <Index each={getTomorrowTasks()}>
                                    {(item) => <TaskItem task={item()} />}
                                </Index>
                            </div>
                        </div>
                    </Show>

                    {/* This Week */}
                    <Show when={getThisWeekTasks().length > 0}>
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-2 h-2 rounded-full bg-purple-500"></div>
                                <h4 class="text-sm font-semibold text-purple-400">This Week</h4>
                                <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getThisWeekTasks().length})</span>
                            </div>
                            <div class="space-y-3">
                                <Index each={getThisWeekTasks()}>
                                    {(item) => <TaskItem task={item()} />}
                                </Index>
                            </div>
                        </div>
                    </Show>

                    {/* Later */}
                    <Show when={getLaterTasks().length > 0}>
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-2 h-2 rounded-full bg-cyan-500"></div>
                                <h4 class="text-sm font-semibold text-cyan-400">Later</h4>
                                <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getLaterTasks().length})</span>
                            </div>
                            <div class="space-y-3">
                                <Index each={getLaterTasks()}>
                                    {(item) => <TaskItem task={item()} />}
                                </Index>
                            </div>
                        </div>
                    </Show>

                    {/* No Deadline */}
                    <Show when={getNoDeadlineTasks().length > 0}>
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-2 h-2 rounded-full" style={{ "background-color": "var(--color-text-muted)" }}></div>
                                <h4 class="text-sm font-semibold" style={{ "color": "var(--color-text-muted)" }}>No Deadline</h4>
                                <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getNoDeadlineTasks().length})</span>
                            </div>
                            <div class="space-y-3">
                                <Index each={getNoDeadlineTasks()}>
                                    {(item) => <TaskItem task={item()} />}
                                </Index>
                            </div>
                        </div>
                    </Show>

                    {/* Empty state */}
                    <Show when={getFilteredTodos().filter(t => !t.Completed).length === 0}>
                        <div class="text-center py-12" style={{ "color": "var(--color-text-muted)" }}>
                            <CheckCircleIcon class="w-12 h-12 mx-auto mb-3" style={{ "color": "var(--color-accent)" }} />
                            <p class="text-base font-medium" style={{ "color": "var(--color-text-secondary)" }}>All caught up!</p>
                            <p class="text-sm mt-1">No active tasks</p>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Show flat list for completed or all tasks filter */}
            <Show when={filterStatus() !== 'active'}>
                <div class="space-y-3">
                    <Index each={getFilteredTodos()}>
                        {(item) => <TaskItem task={item()} />}
                    </Index>
                </div>
            </Show>
            </div>
            
            {/* Completed Tasks Section */}
            <Show when={filterStatus() === 'active' && getCompletedTodos().length > 0}>
                <div class="mt-8">
                    <button
                        onClick={() => setShowCompletedSection(!showCompletedSection())}
                        class="glass flex items-center justify-between w-full p-3 rounded-xl transition-all duration-200 mb-3"
                    >
                        <div class="flex items-center gap-2">
                            <CheckCircleIcon class="w-4 h-4" style={{ "color": "var(--color-accent)" }} />
                            <h3 class="text-sm font-semibold" style={{ "color": "var(--color-text)" }}>Completed</h3>
                            <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>({getCompletedTodos().length})</span>
                        </div>
                        <ChevronDownIcon class={`w-4 h-4 transition-transform duration-200 ${showCompletedSection() ? 'rotate-180' : ''}`} style={{ "color": "var(--color-text-muted)" }} />
                    </button>
                    
                    <Show when={showCompletedSection()}>
                        <div class="space-y-3">
                            <Index each={getCompletedTodos()}>
                                {(item) => (
                                    <div class="group relative glass rounded-xl p-4 transition-all duration-200" style={{ "opacity": 0.7 }}>
                                        <div class="flex items-start gap-3 mb-2">
                                            <input 
                                                type="checkbox" 
                                                checked={item().Completed}
                                                onChange={() => toggleComplete(item().id, item().Completed)}
                                                class="w-[18px] h-[18px] mt-1 cursor-pointer"
                                            />
                                            <div class="flex-1">
                                                <div class="flex items-start justify-between">
                                                    <h3 class="text-base font-semibold line-through" style={{ "color": "var(--color-text-muted)" }}>{item().Title}</h3>
                                                    <div class="flex items-center gap-2">
                                                        <Show when={item().CompletedAt}>
                                                            <span class="text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                                                {new Date(item().CompletedAt).toLocaleDateString()}
                                                            </span>
                                                        </Show>
                                                        <button
                                                            onClick={() => deleteTask(item().id)}
                                                            class="px-2 py-1 text-red-400 hover:text-red-300 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon class="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p class="line-through leading-relaxed text-sm transition-all duration-200" style={{ "white-space": "pre-wrap", "color": "var(--color-text-muted)" }}>{item().Description}</p>
                                                <Show when={item().expand?.Tags && item().expand.Tags.length > 0}>
                                                    <div class="flex items-center gap-2 mt-3 flex-wrap">
                                                        <Index each={item().expand.Tags}>
                                                            {(tag) => (
                                                                <span
                                                                    class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white opacity-50"
                                                                    style={{ 'background-color': `${tag().color}40`, 'border': `1px solid ${tag().color}60` }}
                                                                >
                                                                    <div
                                                                        class="w-1.5 h-1.5 rounded-full"
                                                                        style={{ 'background-color': tag().color }}
                                                                    />
                                                                    {tag().name}
                                                                </span>
                                                            )}
                                                        </Index>
                                                    </div>
                                                </Show>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Index>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Create/Edit Modal */}
            <Show when={showModal()}>
            <div
                class="fixed inset-0 glass-overlay z-50 flex items-end lg:items-center justify-center"
                onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    resetForm();
                }}
            >
                <div
                    class="glass-modal rounded-t-2xl lg:rounded-xl w-full lg:max-w-2xl max-h-[85vh] lg:max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="sticky top-0 p-4 lg:p-5 flex items-center justify-between" style={{ "background": "var(--color-bg-secondary)", "border-bottom": "1px solid var(--color-border)", "backdrop-filter": "blur(20px)" }}>
                        <h2 class="text-lg lg:text-xl font-bold" style={{ "color": "var(--color-text)" }}>{editingTask() ? 'Edit Task' : 'New Task'}</h2>
                        <button
                            onClick={() => {
                                setShowModal(false);
                                setEditingTask(null);
                                resetForm();
                            }}
                            class="transition-colors duration-200 text-xl w-8 h-8 flex items-center justify-center rounded-lg"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            ×
                        </button>
                    </div>
                    <div class="p-5">
                        <form
                            class="transition-all duration-200"
                            onSubmit={async (e) => {
                            console.log(TaskFile());
                            e.preventDefault();
                            if (editingTask()) {
                                await updateTask(
                                    editingTask().id,
                                    TaskName(),
                                    TaskDescription(),
                                    TaskCompleted(),
                                    TaskURL(),
                                    TaskFile().map(f => f.file),
                                    TaskPriority(),
                                    TaskDeadlineDate(),
                                    TaskDeadlineTime(),
                                    selectedTags(),
                                    recurrence(),
                                    recurrenceEndDate(),
                                    subtasks()
                                );
                            } else {
                                await createTask(
                                    TaskName(),
                                    TaskDescription(),
                                    TaskCompleted(),
                                    TaskURL(),
                                    TaskFile().map(f => f.file),
                                    TaskPriority(),
                                    TaskDeadlineDate(),
                                    TaskDeadlineTime(),
                                    selectedTags(),
                                    recurrence(),
                                    recurrenceEndDate(),
                                    subtasks()
                                );
                            }
                            resetForm();
                            setShowModal(false);
                            setEditingTask(null);
                        }}>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Title</label>
                                <input
                                    type="text"
                                    value={TaskName()}
                                    onInput={(e) => setTaskName(e.currentTarget.value)}
                                    required
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                    placeholder="What needs to be done?"
                                />
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Description</label>
                                <textarea
                                    value={TaskDescription()}
                                    onInput={(e) => setTaskDescription(e.currentTarget.value)}
                                    rows="3"
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200 resize-none"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                    placeholder="Add more details..."
                                ></textarea>
                            </div>
                            <div class="mb-4 flex items-center gap-2 p-2.5 rounded-lg" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                <input
                                    type="checkbox"
                                    checked={TaskCompleted()}
                                    onChange={(e) => setTaskCompleted(e.currentTarget.checked)}
                                    class="w-4 h-4 cursor-pointer"
                                />
                                <label class="text-sm cursor-pointer" style={{ "color": "var(--color-text-secondary)" }}>Mark as Completed</label>
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>URL</label>
                                <input
                                    type="url"
                                    value={TaskURL()}
                                    onInput={(e) => setTaskURL(e.currentTarget.value)}
                                    class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                    placeholder="https://..."
                                />
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>File</label>
                                <input
                                    type="file"
                                    multiple
                                    use:fileUploader={{
                                    userCallback: fs => fs.forEach(f => console.log(f)), setFiles: setTaskFile
                                }}
                                    class="w-full rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none transition-colors duration-200"
                                    style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text-secondary)", "border": "1px solid var(--color-border)" }}
                                />
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Priority</label>
                                <div class="relative">
                                    <select
                                        value={TaskPriority()}
                                        onChange={(e) => setTaskPriority(e.currentTarget.value)}
                                        class="w-full rounded-lg px-3 py-2 text-sm cursor-pointer appearance-none focus:outline-none transition-all duration-200"
                                        style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                    >
                                        <option value="P1">P1 - High Priority</option>
                                        <option value="P2">P2 - Medium Priority</option>
                                        <option value="P3">P3 - Low Priority</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Due Date</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-xs mb-1" style={{ "color": "var(--color-text-muted)" }}>Date</label>
                                        <input
                                            type="date"
                                            value={TaskDeadlineDate()}
                                            onInput={(e) => setTaskDeadlineDate(e.currentTarget.value)}
                                            class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200 cursor-pointer"
                                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-xs mb-1" style={{ "color": "var(--color-text-muted)" }}>Time</label>
                                        <input
                                            type="time"
                                            value={TaskDeadlineTime()}
                                            onInput={(e) => setTaskDeadlineTime(e.currentTarget.value)}
                                            class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200 cursor-pointer"
                                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Tags</label>
                                <div class="flex flex-wrap gap-1.5 p-2 rounded-lg min-h-[36px]" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                    <Index each={allTags()}>
                                        {(tag) => (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const tagId = tag().id;
                                                    if (selectedTags().includes(tagId)) {
                                                        setSelectedTags(selectedTags().filter(id => id !== tagId));
                                                    } else {
                                                        setSelectedTags([...selectedTags(), tagId]);
                                                    }
                                                }}
                                                class={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-all duration-200 ${
                                                    selectedTags().includes(tag().id)
                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105'
                                                        : 'hover:opacity-80'
                                                }`}
                                                style={{ 'background-color': `${tag().color}${selectedTags().includes(tag().id) ? '' : '40'}`, 'border': `1px solid ${tag().color}60` }}
                                            >
                                                <div
                                                    class="w-2 h-2 rounded-full"
                                                    style={{ 'background-color': tag().color }}
                                                />
                                                {tag().name}
                                            </button>
                                        )}
                                    </Index>
                                    <Show when={allTags().length === 0}>
                                        <a href="/tags" class="text-sm text-gray-500 hover:text-gray-400 transition-colors duration-200">
                                            Create tags in Tags page →
                                        </a>
                                    </Show>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Subtasks</label>
                                <div class="rounded-lg p-2 space-y-1.5" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)" }}>
                                    <Index each={subtasks()}>
                                        {(sub, idx) => (
                                            <div class="flex items-center gap-2 group">
                                                <input
                                                    type="checkbox"
                                                    checked={sub().completed}
                                                    onChange={() => {
                                                        const updated = [...subtasks()];
                                                        updated[idx] = { ...updated[idx], completed: !updated[idx].completed };
                                                        setSubtasks(updated);
                                                    }}
                                                    class="w-4 h-4 rounded cursor-pointer shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={sub().title}
                                                    onInput={(e) => {
                                                        const updated = [...subtasks()];
                                                        updated[idx] = { ...updated[idx], title: e.currentTarget.value };
                                                        setSubtasks(updated);
                                                    }}
                                                    class={`flex-1 bg-transparent text-sm focus:outline-none ${sub().completed ? 'line-through' : ''}`}
                                                    style={{ "color": sub().completed ? "var(--color-text-muted)" : "var(--color-text)" }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setSubtasks(subtasks().filter((_, i) => i !== idx))}
                                                    class="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all duration-200 text-sm px-1"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </Index>
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm shrink-0" style={{ "color": "var(--color-text-muted)" }}>+</span>
                                        <input
                                            type="text"
                                            value={newSubtaskTitle()}
                                            onInput={(e) => setNewSubtaskTitle(e.currentTarget.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newSubtaskTitle().trim()) {
                                                    e.preventDefault();
                                                    setSubtasks([...subtasks(), { id: crypto.randomUUID().slice(0, 8), title: newSubtaskTitle().trim(), completed: false }]);
                                                    setNewSubtaskTitle('');
                                                }
                                            }}
                                            placeholder="Add subtask... (Enter to add)"
                                            class="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[var(--color-text-muted)]"
                                            style={{ "color": "var(--color-text)" }}
                                        />
                                    </div>
                                    <Show when={subtasks().length > 0}>
                                        <div class="pt-1 mt-1" style={{ "border-top": "1px solid var(--color-border)" }}>
                                            <div class="flex items-center justify-between text-xs" style={{ "color": "var(--color-text-muted)" }}>
                                                <span>{subtasks().filter(s => s.completed).length}/{subtasks().length} done</span>
                                                <div class="flex-1 mx-2 h-1 rounded-full overflow-hidden" style={{ "background-color": "var(--color-bg)" }}>
                                                    <div 
                                                        class="h-full rounded-full transition-all duration-300"
                                                        style={{ 
                                                            "width": `${subtasks().length > 0 ? (subtasks().filter(s => s.completed).length / subtasks().length) * 100 : 0}%`,
                                                            "background-color": "var(--color-accent)" 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </Show>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Recurrence</label>
                                <div class="relative">
                                    <select
                                        value={recurrence()}
                                        onChange={(e) => setRecurrence(e.currentTarget.value)}
                                        class="w-full rounded-lg px-3 py-2 text-sm cursor-pointer appearance-none focus:outline-none transition-all duration-200"
                                        style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                    >
                                        <option value="none">None</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>
                            <Show when={recurrence() !== 'none'}>
                                <div class="mb-4">
                                    <label class="block text-xs font-medium mb-1.5" style={{ "color": "var(--color-text-secondary)" }}>Repeat Until</label>
                                    <input
                                        type="date"
                                        value={recurrenceEndDate()}
                                        onInput={(e) => setRecurrenceEndDate(e.currentTarget.value)}
                                        class="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors duration-200 cursor-pointer"
                                        style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)", "border": "1px solid var(--color-border)" }}
                                    />
                                </div>
                            </Show>
                            <button
                                type="submit"
                                class="w-full font-semibold py-2.5 rounded-lg transition-all duration-300 text-sm"
                                style={{ "background-color": "var(--color-accent)", "color": "var(--color-accent-text)" }}
                            >
                                {editingTask() ? 'Update Task' : 'Create Task'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Show>

        <ConfirmModal
            show={confirmDelete().show}
            title="Delete Task"
            message="Are you sure you want to delete this task? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
            onConfirm={confirmDeleteTask}
            onCancel={() => setConfirmDelete({ show: false, taskId: '' })}
        />
        </div>
    );
}
export default Todo;