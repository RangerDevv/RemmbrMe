import { Router, Route } from "@solidjs/router";
import { Show, onMount, onCleanup } from "solid-js";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";
import Calendar from "./pages/Calendar";
import TimeMachine from "./pages/TimeMachine";
import AIAssistant from "./pages/AIAssistant";
import Settings from './pages/Settings';
import QuickAdd from "./components/QuickAdd";
import Sidebar from "./components/Sidebar";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import TitleBar from "./components/TitleBar";
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
    <>
      <TitleBar />
      <main class="flex" style={{ "background-color": "var(--color-bg)", "padding-top": "32px", "min-height": "100vh" }}>
        <Sidebar />
      
      <div class="flex-1 min-w-0 overflow-y-auto" style={{ height: "calc(100vh - 32px)" }}>
        <div class="max-w-[1400px] mx-auto w-full px-4 pb-4 pt-16 lg:px-8 lg:pt-6 lg:pb-6">
          <Router>
            <Route path="/" component={Dashboard} />
            <Route path="/todo" component={Todo} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/schedule" component={Calendar} />
            <Route path="/timemachine" component={TimeMachine} />
            <Route path="/ai" component={AIAssistant} />
            <Route path="/settings" component={Settings} />
          </Router>
        </div>
        
        <QuickAdd />
        <KeyboardShortcuts />
      </div>
    </main>
    </>
  );
}
