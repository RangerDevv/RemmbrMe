import { UploadFile, fileUploader } from '@solid-primitives/upload';
import PocketBase from 'pocketbase';
import { Index, createSignal, onMount } from 'solid-js';

const pb = new PocketBase('http://127.0.0.1:8090');

function Todo() {

    async function createTask(name:string, description:string, completed:boolean, url:string, file:any, priority:string, deadline:string) {
        const data = {
            Title: name,
            Description: description,
            Completed: completed,
            URL: url,
            File: file,
            Priority: priority,
            Deadline: deadline,
        };
        const record = await pb.collection('Todo').create(data);
        console.log('Task created:', record);
        fetchTodos();
    }

    const [TaskName, setTaskName] = createSignal('');
    const [TaskDescription, setTaskDescription] = createSignal('');
    const [TaskCompleted, setTaskCompleted] = createSignal(false);
    const [TaskURL, setTaskURL] = createSignal('');
    const [TaskFile, setTaskFile] = createSignal<UploadFile[]>([]);
    const [TaskPriority, setTaskPriority] = createSignal('P1');
    const [TaskDeadline, setTaskDeadline] = createSignal('');

    const [todoItems, setTodoItems] = createSignal([] as any[]);
    
    async function fetchTodos() {
        const items = await pb.collection('Todo').getFullList();
        console.log(items);
        setTodoItems(items);
    }

    onMount(() => {
        fetchTodos();
    });

    return (
        <div class="flex flex-row">
        {/* list todo items */}
        <div>
            <h2>Todo List</h2>
            <Index each={todoItems()}>
                {(item) => (
                    <div class="border-b border-gray-300 py-2">
                        <h3 class="font-bold">{item().Title}</h3>
                        <p>{item().Description}</p>
                    </div>
                )}
            </Index>
        </div>
        {/* create todo item form */}
        <div class="ml-8">
            <h2>Create Todo Item</h2>
            <form onSubmit={async (e) => {
                console.log(TaskFile());
                e.preventDefault();
                await createTask(
                    TaskName(),
                    TaskDescription(),
                    TaskCompleted(),
                    TaskURL(),
                    TaskFile().map(f => f.file),
                    TaskPriority(),
                    TaskDeadline()
                );
                setTaskName('');
                setTaskDescription('');
                setTaskCompleted(false);
                setTaskURL('');
                setTaskFile([]);
                setTaskPriority('P1');
                setTaskDeadline('');
            }}>
                <div>
                    <label>Title:</label>
                    <input type="text" value={TaskName()} onInput={(e) => setTaskName(e.currentTarget.value)} required />
                </div>
                <div>
                    <label>Description:</label>
                    <textarea value={TaskDescription()} onInput={(e) => setTaskDescription(e.currentTarget.value)} required></textarea>
                </div>
                <div>
                    <label>Completed:</label>
                    <input type="checkbox" checked={TaskCompleted()} onChange={(e) => setTaskCompleted(e.currentTarget.checked)} />
                </div>
                <div>
                    <label>URL:</label>
                    <input type="url" value={TaskURL()} onInput={(e) => setTaskURL(e.currentTarget.value)} />
                </div>
                <div>
                    <label>File:</label>
                    <input type="file" multiple use:fileUploader={{
                        userCallback: fs => fs.forEach(f => console.log(f)), setFiles: setTaskFile
                    }} />
                </div>
                <div>
                    <label>Priority:</label>
                    <select value={TaskPriority()} onChange={(e) => setTaskPriority(e.currentTarget.value)}>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                    </select>
                </div>
                <div>
                    <label>Deadline:</label>
                    <input type="date" value={TaskDeadline()} onInput={(e) => setTaskDeadline(e.currentTarget.value)} />
                </div>
                <button type="submit">Create Task</button>
            </form>
        </div>
        </div>
    );
}
export default Todo;