import { Router, Route } from "@solidjs/router";
import { Show, onMount, onCleanup } from "solid-js";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";
import Calendar from "./pages/Calendar";
import AIAssistant from "./pages/AIAssistant";
import Settings from './pages/Settings';
import QuickAdd from "./components/QuickAdd";
import Sidebar from "./components/Sidebar";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import TitleBar from "./components/TitleBar";
import { applyThemeToDOM, currentTheme } from "./lib/theme";
import { initNotifications, updateNotificationSchedule, stopNotificationChecker } from "./lib/notifications";
import FocusTimer from "./components/FocusTimer";
import { startGoogleCalendarAutoSync, stopGoogleCalendarAutoSync } from "./lib/google_calendar_sync";

export default function App() {
  let mainScrollContainer: HTMLDivElement | undefined;

  // Apply theme on mount
  onMount(async () => {
    applyThemeToDOM(currentTheme());

    const resetAppScroll = () => {
      requestAnimationFrame(() => {
        if (mainScrollContainer) {
          mainScrollContainer.scrollTop = 0;
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    };

    const onPopState = () => resetAppScroll();
    const onInternalLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link || !link.href) return;
      if (!link.href.startsWith(window.location.origin)) return;
      setTimeout(resetAppScroll, 0);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onInternalLinkClick);
    
    try {
      await initNotifications();
      await updateNotificationSchedule();
    } catch (e) {
      // Notifications may not be available outside Tauri
    }

    startGoogleCalendarAutoSync();

    onCleanup(() => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onInternalLinkClick);
    });
  });

  onCleanup(() => {
    stopNotificationChecker();
    stopGoogleCalendarAutoSync();
  });

  return (
    <>
      <TitleBar />
      <main class="flex playful-ui" style={{ "background-color": "var(--color-bg)", "padding-top": "32px", "min-height": "100vh" }}>
        {/* Fixed background layer — painted once by GPU, never invalidated by scroll */}
        <div class="playful-ui-bg" aria-hidden="true" />
        <Sidebar />
      
      {/* contain:layout paint isolates this subtree from parent repaint */}
      <div class="flex-1 min-w-0 overflow-hidden" style={{ height: "calc(100vh - 32px)", contain: "layout paint" }}>
        <div
          ref={mainScrollContainer}
          class="max-w-[1400px] mx-auto w-full h-full overflow-y-auto px-4 pb-4 pt-16 lg:px-8 lg:pt-6 lg:pb-6"
        >
          <Router>
            <Route path="/" component={Dashboard} />
            <Route path="/todo" component={Todo} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/schedule" component={Calendar} />
            <Route path="/ai" component={AIAssistant} />
            <Route path="/settings" component={Settings} />
            <Route path="/sync" component={Settings} />
          </Router>
        </div>
        
        <QuickAdd />
        <KeyboardShortcuts />
        <FocusTimer />
      </div>
    </main>
    </>
  );
}
