import { Router, Route } from "@solidjs/router";
import Dashboard from "./pages/Dashboard";
import Todo from "./pages/Todo";
import Calendar from "./pages/Calendar";
import TimeMachine from "./pages/TimeMachine";
import AIAssistant from "./pages/AIAssistant";import Tags from './pages/Tags';import Settings from './pages/Settings';import QuickAdd from "./components/QuickAdd";

export default function App() {
  const isActive = (path: string) => window.location.pathname === path;
  
  return (
    <>
    <main class="flex flex-row gap-8 p-6 min-h-screen bg-black">
      {/* Modern Sidebar */}
      <div class="flex flex-col gap-2 w-64 h-fit sticky top-6">
        {/* App Logo/Title */}
        <div class="mb-6 px-4">
          <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">RemmbrMe</h1>
          <p class="text-xs text-gray-500 mt-1">Your AI-powered organizer</p>
        </div>
        
        {/* Navigation Links */}
        <a 
          href="/" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/') 
              ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/30 text-white shadow-lg shadow-blue-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">📊</span>
          <span>Dashboard</span>
          {isActive('/') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>}
        </a>
        
        <a 
          href="/todo" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/todo') 
              ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-600/30 text-white shadow-lg shadow-emerald-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">✅</span>
          <span>Todo List</span>
          {isActive('/todo') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>}
        </a>
        
        <a 
          href="/calendar" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/calendar') 
              ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-600/30 text-white shadow-lg shadow-purple-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">📅</span>
          <span>Calendar</span>
          {isActive('/calendar') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>}
        </a>
        
        <a 
          href="/timemachine" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/timemachine') 
              ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-600/30 text-white shadow-lg shadow-amber-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">⏰</span>
          <span>Time Machine</span>
          {isActive('/timemachine') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>}
        </a>
        
        <a 
          href="/ai" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/ai') 
              ? 'bg-gradient-to-r from-pink-600/20 to-rose-600/20 border border-pink-600/30 text-white shadow-lg shadow-pink-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">🤖</span>
          <span>AI Assistant</span>
          {isActive('/ai') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse"></div>}
        </a>
        
        <a 
          href="/tags" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/tags') 
              ? 'bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-indigo-600/30 text-white shadow-lg shadow-indigo-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">🏷️</span>
          <span>Tags</span>
          {isActive('/tags') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>}
        </a>
        
        <a 
          href="/settings" 
          class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isActive('/settings') 
              ? 'bg-gradient-to-r from-slate-600/20 to-zinc-600/20 border border-slate-600/30 text-white shadow-lg shadow-slate-600/10' 
              : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
          }`}
        >
          <span class="text-xl">⚙️</span>
          <span>Settings</span>
          {isActive('/settings') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div>}
        </a>
        
        {/* Footer */}
        <div class="mt-6 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <p class="text-xs text-gray-500">Version 1.0.0</p>
          <p class="text-xs text-gray-600 mt-1">Made with ❤️ by RangerDevv</p>
        </div>
      </div>
      <Router>
        <Route path="/" component={Dashboard} />
        <Route path="/todo" component={Todo} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/timemachine" component={TimeMachine} />
        <Route path="/ai" component={AIAssistant} />
        <Route path="/tags" component={Tags} />
        <Route path="/settings" component={Settings} />
        <QuickAdd />
      </Router>
    </main>
    </>
  );
}
