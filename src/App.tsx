import { Router, Route } from "@solidjs/router";
import { Show, createEffect, onMount, onCleanup } from "solid-js";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";
import Calendar from "./pages/Calendar";
import TimeMachine from "./pages/TimeMachine";
import AIAssistant from "./pages/AIAssistant";
import Tags from './pages/Tags';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import QuickAdd from "./components/QuickAdd";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import { isAuthenticated } from "./lib/pocketbase";
import { initNotifications, updateNotificationSchedule, stopNotificationChecker } from "./lib/notifications";

export default function App() {
  const isAuthPage = () => {
    const path = window.location.pathname;
    return path === '/login' || path === '/signup';
  };

  // Initialize notifications when user is authenticated
  onMount(async () => {
    if (isAuthenticated()) {
      await initNotifications();
      await updateNotificationSchedule();
    }
  });

  // Update notification schedule when auth state changes
  createEffect(async () => {
    if (isAuthenticated()) {
      await initNotifications();
      await updateNotificationSchedule();
    } else {
      stopNotificationChecker();
    }
  });

  // Cleanup on unmount
  onCleanup(() => {
    stopNotificationChecker();
  });

  // Debug: Log auth state changes
  createEffect(() => {
    console.log('Auth state:', isAuthenticated(), 'Path:', window.location.pathname);
  });

  return (
    <main class="flex flex-col lg:flex-row gap-4 lg:gap-8 p-3 md:p-6 min-h-screen bg-black">
      {/* Show Sidebar only when authenticated and not on auth pages */}
      <Show when={isAuthenticated() && !isAuthPage()}>
        <Sidebar />
      </Show>
      
      <div class={isAuthPage() ? "w-full" : "flex-1 max-w-[1600px] mx-auto w-full"}>
        <Router>
          {/* Protected Routes */}
          <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
          <Route path="/todo" component={() => <ProtectedRoute component={Todo} />} />
          <Route path="/calendar" component={() => <ProtectedRoute component={Calendar} />} />
          <Route path="/timemachine" component={() => <ProtectedRoute component={TimeMachine} />} />
          <Route path="/ai" component={() => <ProtectedRoute component={AIAssistant} />} />
          <Route path="/tags" component={() => <ProtectedRoute component={Tags} />} />
          <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
          <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
          
          {/* Auth Routes */}
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
        </Router>
        
        {/* Show QuickAdd only when authenticated and not on auth pages */}
        <Show when={isAuthenticated() && !isAuthPage()}>
          <QuickAdd />
        </Show>
      </div>
    </main>
  );
}
