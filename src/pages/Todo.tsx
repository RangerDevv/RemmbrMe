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
        <div>
        <h2>Todo List</h2>

        {/* create task */}
        <button class="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            onClick={() => createTask('Sample Task', 'This is a sample task description.', false, 'http://example.com', null, 'P1', '2024-12-31')}>
            Create Sample Task
        </button>

        {/* list todo items */}

        <Index each={todoItems()}>
            {(item) => (
                <div class="border-b border-gray-300 py-2">
                    <h3 class="font-bold">{item().Title}</h3>
                    <p>{item().Description}</p>
                </div>
            )}
        </Index>
        </div>
    );
    }
export default Todo;