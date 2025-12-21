import { Router, Route } from "@solidjs/router";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";

export default function App() {
  return (
    <>
    <main class="flex flex-row gap-5 p-4">
      <div class="flex flex-col gap-2 border-r border-gray-300">
        <a href="/">Dashboard</a> 
        <a href="/todo">Todo List</a>
      </div>
      <Router>
        <Route path="/" component={Dashboard} />
        <Route path="/todo" component={Todo} />
      </Router>
    </main>
    </>
  );
}
