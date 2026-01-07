import { UploadFile, fileUploader } from '@solid-primitives/upload';
import { Index, Show, createSignal, onMount } from 'solid-js';
import { generateRecurringTasks } from '../utils/recurrence';
import { bk, currentUser } from '../lib/backend.ts';
import { refreshNotifications } from '../lib/notifications';
import ConfirmModal from '../components/ConfirmModal';


function Todo() {

    async function createTask(name:string, description:string, completed:boolean, url:string, file:any, priority: string, deadline:string, tags:string[], recur:string, recurEnd:string) {
        // Convert datetime-local format to ISO string
        const deadlineISO = deadline ? new Date(deadline).toISOString() : undefined;
        
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
            user: currentUser()!.id
        };
        console.log('Creating task with data:', data);
        const record = await bk.collection('Todo').create(data);
        console.log('Task created:', record);
        
        // Generate recurring instances if recurrence is set
        if (recur !== 'none' && recur) {
            await generateRecurringTasks(record.id, record, {
                frequency: recur as 'daily' | 'weekly' | 'monthly',
                endDate: recurEnd ? new Date(recurEnd) : undefined
            });
        }
        
        fetchTodos();
        setTimeout(() => refreshNotifications(), 100);
    }

    async function updateTask(id: string, name:string, description:string, completed:boolean, url:string, file:any, priority:string, deadline:string, tags:string[], recur:string, recurEnd:string) {
        // Convert datetime-local format to ISO string
        const deadlineISO = deadline ? new Date(deadline).toISOString() : undefined;
        
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
    const [TaskDeadline, setTaskDeadline] = createSignal('');
    const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
    const [recurrence, setRecurrence] = createSignal('none');
    const [recurrenceEndDate, setRecurrenceEndDate] = createSignal('');

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
        setTaskPriority('P1');
        setTaskDeadline('');
        setSelectedTags([]);
        setRecurrence('none');
        setRecurrenceEndDate('');
    }

    function startEditing(task: any) {
        setEditingTask(task);
        setTaskName(task.Title);
        setTaskDescription(task.Description);
        setTaskCompleted(task.Completed);
        setTaskURL(task.URL || '');
        setTaskPriority(task.Priority || 'P1');
        
        // Convert ISO date to datetime-local format (YYYY-MM-DDTHH:MM)
        if (task.Deadline) {
            const date = new Date(task.Deadline);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setTaskDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
        } else {
            setTaskDeadline('');
        }
        
        setSelectedTags(task.expand?.Tags?.map((t: any) => t.id) || []);
        setRecurrence(task.Recurrence || 'none');
        setRecurrenceEndDate(task.RecurrenceEndDate || '');
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

    return (
        <div class="flex flex-col gap-6 w-full">
            {/* Header with Stats */}
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-4xl font-bold text-white mb-2">📋 Todo List</h2>
                    <p class="text-gray-400">{getTaskStats().completed} of {getTaskStats().total} tasks completed ({getTaskStats().percentage}%)</p>
                </div>
                <div class="flex gap-4">
                    <div class="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                        <div class="text-2xl font-bold text-red-400">{getTaskStats().p1}</div>
                        <div class="text-xs text-gray-400">High Priority</div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 lg:p-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
                    <div class="md:col-span-2">
                        <input
                            type="text"
                            value={searchQuery()}
                            onInput={(e) => setSearchQuery(e.currentTarget.value)}
                            placeholder="🔍 Search tasks..."
                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div class="relative">
                        <select
                            value={filterPriority()}
                            onChange={(e) => setFilterPriority(e.currentTarget.value)}
                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 cursor-pointer appearance-none"
                            style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(156,163,175)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25em;"
                        >
                            <option value="all" class="bg-zinc-900">All Priorities</option>
                            <option value="P1" class="bg-zinc-900">🔴 P1 - High</option>
                            <option value="P2" class="bg-zinc-900">🟡 P2 - Medium</option>
                            <option value="P3" class="bg-zinc-900">🟢 P3 - Low</option>
                        </select>
                    </div>
                    <div class="relative">
                        <select
                            value={filterStatus()}
                            onChange={(e) => setFilterStatus(e.currentTarget.value)}
                            class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 cursor-pointer appearance-none"
                            style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(156,163,175)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25em;"
                        >
                            <option value="all" class="bg-zinc-900">All Status</option>
                            <option value="active" class="bg-zinc-900">⚡ Active</option>
                            <option value="completed" class="bg-zinc-900">✅ Completed</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-3 text-sm text-gray-400">
                    <span>Sort by:</span>
                    <button
                        onClick={() => setSortBy('priority')}
                        class={`px-3 py-1 rounded-lg transition-all duration-200 ${
                            sortBy() === 'priority' ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'
                        }`}
                    >
                        Priority
                    </button>
                    <button
                        onClick={() => setSortBy('deadline')}
                        class={`px-3 py-1 rounded-lg transition-all duration-200 ${
                            sortBy() === 'deadline' ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'
                        }`}
                    >
                        Deadline
                    </button>
                    <button
                        onClick={() => setSortBy('created')}
                        class={`px-3 py-1 rounded-lg transition-all duration-200 ${
                            sortBy() === 'created' ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800'
                        }`}
                    >
                        Created Date
                    </button>
                </div>
            </div>

            {/* list todo items */}
            <div class="w-full">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold text-white">
                    {filterStatus() === 'active' ? 'Active Tasks' : filterStatus() === 'completed' ? 'Completed Tasks' : 'All Tasks'} 
                    <span class="text-gray-400 ml-2">({getFilteredTodos().length})</span>
                </h3>
                <button
                    onClick={() => setShowModal(true)}
                    class="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
                >
                    <span class="text-lg">+</span>
                    <span>New Task</span>
                </button>
            </div>
            <div class="space-y-3">
            <Index each={getFilteredTodos()}>
                {(item) => (
                    <div 
                        class={`group relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 ${
                            swipingTask() === item().id ? 'scale-95' : ''
                        }`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={(e) => handleTouchMove(e, item().id)}
                        onTouchEnd={() => handleTouchEnd(item())}
                    >
                        <div class="flex items-start gap-3 mb-2">
                            <input 
                                type="checkbox" 
                                checked={item().Completed} 
                                onChange={() => toggleComplete(item().id, item().Completed)}
                                class="w-5 h-5 mt-1 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 bg-black cursor-pointer transition-all duration-200"
                            />
                            <div class="flex-1">
                                <div class="flex items-start justify-between">
                                    <h3 class={`text-xl font-semibold transition-all duration-200 ${
                                        item().Completed ? 'text-gray-500 line-through' : 'text-white'
                                    }`}>{item().Title}</h3>
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
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => deleteTask(item().id)}
                                            class="px-2 py-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <p class={`leading-relaxed transition-all duration-200 ${
                                    item().Completed ? 'text-gray-500 line-through' : 'text-gray-400'
                                }`} style="white-space: pre-wrap;">{item().Description}</p>
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
                                            🔁 {item().Recurrence}
                                        </span>
                                    </Show>
                                </div>
                                {item().Deadline && (
                                    <p class="text-sm text-gray-500 mt-2">
                                        📅 {new Date(item().Deadline).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Index>
            </div>
            
            {/* Completed Tasks Section */}
            <Show when={filterStatus() === 'active' && getCompletedTodos().length > 0}>
                <div class="mt-8">
                    <button
                        onClick={() => setShowCompletedSection(!showCompletedSection())}
                        class="flex items-center justify-between w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-900/80 transition-all duration-200 mb-4"
                    >
                        <div class="flex items-center gap-3">
                            <span class="text-xl">✅</span>
                            <h3 class="text-lg font-semibold text-white">Completed Tasks</h3>
                            <span class="text-gray-400 text-sm">({getCompletedTodos().length})</span>
                        </div>
                        <span class="text-gray-400 text-xl transform transition-transform duration-200" style={{ transform: showCompletedSection() ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </button>
                    
                    <Show when={showCompletedSection()}>
                        <div class="space-y-3">
                            <Index each={getCompletedTodos()}>
                                {(item) => (
                                    <div class="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 transition-all duration-200 hover:border-zinc-700">
                                        <div class="flex items-start gap-3 mb-2 opacity-60">
                                            <input 
                                                type="checkbox" 
                                                checked={item().Completed}
                                                onChange={() => toggleComplete(item().id, item().Completed)}
                                                class="w-5 h-5 mt-1 rounded border-zinc-600 text-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0 bg-black cursor-pointer transition-all duration-200"
                                            />
                                            <div class="flex-1">
                                                <div class="flex items-start justify-between">
                                                    <h3 class="text-xl font-semibold text-gray-500 line-through">{item().Title}</h3>
                                                    <div class="flex items-center gap-2">
                                                        <Show when={item().CompletedAt}>
                                                            <span class="text-xs text-gray-600">
                                                                ✓ {new Date(item().CompletedAt).toLocaleDateString()}
                                                            </span>
                                                        </Show>
                                                        <button
                                                            onClick={() => deleteTask(item().id)}
                                                            class="px-2 py-1 text-red-400 hover:text-red-300 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                <p class="text-gray-500 line-through leading-relaxed transition-all duration-200" style="white-space: pre-wrap;">{item().Description}</p>
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
        </div>

        {/* Create/Edit Modal */}

        <Show when={showModal()}>
            <div
                class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    resetForm();
                }}
            >
                <div
                    class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
                        <h2 class="text-3xl font-bold text-white">{editingTask() ? 'Edit Todo Item' : 'Create Todo Item'}</h2>
                        <button
                            onClick={() => {
                                setShowModal(false);
                                setEditingTask(null);
                                resetForm();
                            }}
                            class="text-gray-400 hover:text-white transition-colors duration-200 text-2xl w-8 h-8 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                    <div class="p-6">
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
                                    TaskDeadline(),
                                    selectedTags(),
                                    recurrence(),
                                    recurrenceEndDate()
                                );
                            } else {
                                await createTask(
                                    TaskName(),
                                    TaskDescription(),
                                    TaskCompleted(),
                                    TaskURL(),
                                    TaskFile().map(f => f.file),
                                    TaskPriority(),
                                    TaskDeadline(),
                                    selectedTags(),
                                    recurrence(),
                                    recurrenceEndDate()
                                );
                            }
                            resetForm();
                            setShowModal(false);
                            setEditingTask(null);
                        }}>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Title:</label>
                                <input
                                    type="text"
                                    value={TaskName()}
                                    onInput={(e) => setTaskName(e.currentTarget.value)}
                                    required
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    placeholder="Enter task title..."
                                />
                            </div>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Description:</label>
                                <textarea
                                    value={TaskDescription()}
                                    onInput={(e) => setTaskDescription(e.currentTarget.value)}
                                    rows="4"
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200 resize-none"
                                    placeholder="Describe your task..."
                                ></textarea>
                            </div>
                            <div class="mb-5 flex items-center gap-3 p-3 bg-black/50 rounded-lg border border-zinc-800 transition-colors duration-200">
                                <input
                                    type="checkbox"
                                    checked={TaskCompleted()}
                                    onChange={(e) => setTaskCompleted(e.currentTarget.checked)}
                                    class="w-5 h-5 rounded border-zinc-600 text-white focus:ring-1 focus:ring-zinc-500 focus:ring-offset-0 bg-black cursor-pointer"
                                />
                                <label class="text-sm font-medium text-gray-400 cursor-pointer">Mark as Completed</label>
                            </div>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">URL:</label>
                                <input
                                    type="url"
                                    value={TaskURL()}
                                    onInput={(e) => setTaskURL(e.currentTarget.value)}
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-zinc-500 transition-colors duration-200"
                                    placeholder="https://..."
                                />
                            </div>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">File:</label>
                                <input
                                    type="file"
                                    multiple
                                    use:fileUploader={{
                                    userCallback: fs => fs.forEach(f => console.log(f)), setFiles: setTaskFile
                                }}
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/5 file:text-gray-300 file:font-medium hover:file:bg-white/10 file:cursor-pointer focus:outline-none focus:border-zinc-500 transition-colors duration-200 cursor-pointer"
                                />
                            </div>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Priority:</label>
                                <div class="relative">
                                    <select
                                        value={TaskPriority()}
                                        onChange={(e) => setTaskPriority(e.currentTarget.value)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 cursor-pointer appearance-none"
                                        style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(156,163,175)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25em;"
                                    >
                                        <option value="P1" class="bg-zinc-900 text-white py-2">🔴 P1 - High Priority</option>
                                        <option value="P2" class="bg-zinc-900 text-white py-2">🟡 P2 - Medium Priority</option>
                                        <option value="P3" class="bg-zinc-900 text-white py-2">🟢 P3 - Low Priority</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Due By (Optional):</label>
                                <input
                                    type="datetime-local"
                                    value={TaskDeadline()}
                                    onInput={(e) => setTaskDeadline(e.currentTarget.value)}
                                    class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200 cursor-pointer"
                                />
                                <p class="text-xs text-gray-500 mt-1">Select a date and optionally a time. If no time is specified, it's due anytime that day.</p>
                            </div>
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Tags:</label>
                                <div class="flex flex-wrap gap-2 p-3 bg-black border border-zinc-700 rounded-lg min-h-[44px]">
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
                            <div class="mb-5">
                                <label class="block text-sm font-medium text-gray-400 mb-2">Recurrence:</label>
                                <div class="relative">
                                    <select
                                        value={recurrence()}
                                        onChange={(e) => setRecurrence(e.currentTarget.value)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 cursor-pointer appearance-none"
                                        style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27rgb(156,163,175)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25em;"
                                    >
                                        <option value="none" class="bg-zinc-900">None</option>
                                        <option value="daily" class="bg-zinc-900">📅 Daily</option>
                                        <option value="weekly" class="bg-zinc-900">📆 Weekly</option>
                                        <option value="monthly" class="bg-zinc-900">🗓️ Monthly</option>
                                    </select>
                                </div>
                            </div>
                            <Show when={recurrence() !== 'none'}>
                                <div class="mb-6">
                                    <label class="block text-sm font-medium text-gray-400 mb-2">Repeat Until (Optional):</label>
                                    <input
                                        type="date"
                                        value={recurrenceEndDate()}
                                        onInput={(e) => setRecurrenceEndDate(e.currentTarget.value)}
                                        class="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-zinc-500 transition-colors duration-200 cursor-pointer"
                                    />
                                </div>
                            </Show>
                            <button
                                type="submit"
                                class="w-full bg-white text-black font-semibold py-3.5 rounded-lg hover:bg-gray-200 active:scale-95 transition-all duration-200"
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