import { createSignal, Show } from 'solid-js';
import { currentUser, logout } from '../lib/pocketbase';

export default function Sidebar() {
    const [showProfileMenu, setShowProfileMenu] = createSignal(false);

    const isActive = (path: string) => window.location.pathname === path;

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div class="flex flex-col gap-2 w-64 h-fit sticky top-6">
            {/* App Logo/Title */}
            <div class="mb-4 px-4">
                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    RemmbrMe
                </h1>
                <p class="text-xs text-gray-500 mt-1">Your AI-powered organizer</p>
            </div>

            {/* User Profile Section */}
            <div class="mb-4 px-4">
                <div class="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu())}
                        class="w-full p-3 bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-600 transition-all duration-200 group"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {currentUser()?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div class="flex-1 text-left">
                                <p class="text-sm font-medium text-white truncate">
                                    {currentUser()?.name || 'User'}
                                </p>
                                <p class="text-xs text-gray-500 truncate">
                                    {currentUser()?.email}
                                </p>
                            </div>
                            <Show when={currentUser()?.proUser}>
                                <span class="px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded text-xs text-yellow-400 font-semibold">
                                    PRO
                                </span>
                            </Show>
                        </div>
                    </button>

                    {/* Profile Dropdown */}
                    <Show when={showProfileMenu()}>
                        <div class="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                            <a
                                href="/profile"
                                onClick={() => setShowProfileMenu(false)}
                                class="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-zinc-800 transition-colors flex items-center gap-3 block"
                            >
                                <span>⚙️</span>
                                <span>Settings</span>
                            </a>
                            <Show when={!currentUser()?.proUser}>
                                <a
                                    href="/upgrade"
                                    onClick={() => setShowProfileMenu(false)}
                                    class="w-full px-4 py-3 text-left text-sm text-yellow-400 hover:bg-zinc-800 transition-colors flex items-center gap-3 block"
                                >
                                    <span>⭐</span>
                                    <span>Upgrade to Pro</span>
                                </a>
                            </Show>
                            <div class="border-t border-zinc-800"></div>
                            <button
                                onClick={() => {
                                    setShowProfileMenu(false);
                                    handleLogout();
                                }}
                                class="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-zinc-800 transition-colors flex items-center gap-3"
                            >
                                <span>🚪</span>
                                <span>Logout</span>
                            </button>
                        </div>
                    </Show>
                </div>
            </div>

            {/* Navigation Links */}
            <nav class="space-y-1">
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
            </nav>

            {/* Quick Actions */}
            <div class="mt-4 px-4">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</p>
                <div class="space-y-2">
                    <a
                        href="/todo"
                        class="w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        <span>➕</span>
                        <span>New Todo</span>
                    </a>
                    <a
                        href="/calendar"
                        class="w-full px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        <span>📆</span>
                        <span>New Event</span>
                    </a>
                </div>
            </div>
            
            {/* Footer */}
            <div class="mt-6 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <p class="text-xs text-gray-500">Version 1.0.0</p>
                <p class="text-xs text-gray-600 mt-1">Made with ❤️ by RangerDevv</p>
            </div>
        </div>
    );
}
