import PocketBase from 'pocketbase';
import { For } from 'solid-js';

const pb = new PocketBase('http://127.0.0.1:8090');

function Todo() {

    let todoItems = [] as any[];
    async function fetchTodos() {
    // await pb.collection('Todo').getFullList();
    todoItems = await pb.collection('Todo').getFullList();
    console.log(todoItems);
    }

    fetchTodos();

    return (
        <div>
        <h2>Todo List</h2>
        <For each={todoItems}>
            {(item) => <div>{item.name}</div>}
        </For>
        </div>
    );
    }
export default Todo;