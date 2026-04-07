import { Router, Route } from "@solidjs/router";
import { Show, onMount, onCleanup } from "solid-js";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";
import Calendar from "./pages/Calendar";
import TimeMachine from "./pages/TimeMachine";
import AIAssistant from "./pages/AIAssistant";
import Tags from './pages/Tags';
import Settings from './pages/Settings';
import QuickAdd from "./components/QuickAdd";
import Sidebar from "./components/Sidebar";
import { applyThemeToDOM, currentTheme } from "./lib/theme";
import { initNotifications, updateNotificationSchedule, stopNotificationChecker } from "./lib/notifications";

export default function App() {
  // Apply theme on mount
  onMount(async () => {
    applyThemeToDOM(currentTheme());
    
    try {
      await initNotifications();
      await updateNotificationSchedule();
    } catch (e) {
      // Notifications may not be available outside Tauri
    }
  });

  onCleanup(() => {
    stopNotificationChecker();
  });

  return (
    <main class="flex flex-col lg:flex-row min-h-screen" style={{ "background-color": "var(--color-bg)" }}>
      <Sidebar />
      
      <div class="flex-1 lg:ml-0 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto w-full p-4 lg:p-6">
          <Router>
            <Route path="/" component={Dashboard} />
            <Route path="/todo" component={Todo} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/timemachine" component={TimeMachine} />
            <Route path="/ai" component={AIAssistant} />
            <Route path="/tags" component={Tags} />
            <Route path="/settings" component={Settings} />
          </Router>
        </div>
        
        <QuickAdd />
      </div>
    </main>
  );
}
