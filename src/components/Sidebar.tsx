import { createSignal, Show } from 'solid-js';
import { currentUser, logout } from '../lib/backend.ts';

export default function Sidebar() {
    const [showProfileMenu, setShowProfileMenu] = createSignal(false);
    const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);

    const isActive = (path: string) => window.location.pathname === path;

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen())}
                class="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
            >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen() ? (
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* Mobile Overlay */}
            <Show when={mobileMenuOpen()}>
                <div 
                    class="lg:hidden fixed inset-0 bg-black/80 z-[50]"
                    onClick={() => setMobileMenuOpen(false)}
                />
            </Show>

            {/* Sidebar */}
            <div class={`
                flex flex-col gap-2 bg-black
                fixed lg:sticky top-0 left-0 h-screen lg:h-fit
                w-64 lg:w-64 
                z-[55] lg:z-auto
                transition-transform duration-300
                ${mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                lg:top-6
                p-4 lg:p-0
                overflow-y-auto
                border-r lg:border-r-0 border-zinc-800
            `}>
            {/* App Logo/Title */}
            <div class="mb-4 px-4">
                <h1 class="text-2xl font-bold text-white">
                    RemmbrMe
                </h1>
                <p class="text-xs text-gray-500 mt-1">Your AI-powered organizer</p>
            </div>

            {/* User Profile Section */}
            <div class="mb-4 px-4">
                <div class="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu())}
                        class="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800 transition-all duration-200 group"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-white font-semibold">
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
                                <span class="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-gray-400 font-semibold">
                                    PRO
                                </span>
                            </Show>
                        </div>
                    </button>

                    {/* Profile Dropdown */}
                    <Show when={showProfileMenu()}>
                        <div class="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl z-50 overflow-hidden">
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
                    onClick={() => setMobileMenuOpen(false)}
                    class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive('/') 
                            ? 'bg-zinc-800 border border-zinc-700 text-white' 
                            : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                >
                    <span class="text-xl">📊</span>
                    <span>Dashboard</span>
                    {isActive('/') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                </a>
                
                <a 
                    href="/todo" 
                    onClick={() => setMobileMenuOpen(false)}
                    class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive('/todo') 
                            ? 'bg-zinc-800 border border-zinc-700 text-white' 
                            : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                >
                    <span class="text-xl">✅</span>
                    <span>Todo List</span>
                    {isActive('/todo') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                </a>
                
                <a 
                    href="/calendar" 
                    onClick={() => setMobileMenuOpen(false)}
                    class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive('/calendar') 
                            ? 'bg-zinc-800 border border-zinc-700 text-white' 
                            : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                >
                    <span class="text-xl">📅</span>
                    <span>Calendar</span>
                    {isActive('/calendar') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                </a>
                
                <a 
                    href="/timemachine" 
                    onClick={() => setMobileMenuOpen(false)}
                    class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive('/timemachine') 
                            ? 'bg-zinc-800 border border-zinc-700 text-white' 
                            : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                >
                    <span class="text-xl">⏰</span>
                    <span>Time Machine</span>
                    {isActive('/timemachine') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                </a>
                
                <a 
                    href="/ai" 
                    onClick={() => setMobileMenuOpen(false)}
                    class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive('/ai') 
                            ? 'bg-zinc-800 border border-zinc-700 text-white' 
                            : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                >
                    <span class="text-xl">🤖</span>
                    <span>AI Assistant</span>
                    {isActive('/ai') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                </a>
                
                <a 
                    href="/tags" 
                    onClick={() => setMobileMenuOpen(false)}
                    class={`group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                        isActive('/tags') 
                            ? 'bg-zinc-800 border border-zinc-700 text-white' 
                            : 'text-gray-400 hover:bg-zinc-900 hover:text-white border border-transparent'
                    }`}
                >
                    <span class="text-xl">🏷️</span>
                    <span>Tags</span>
                    {isActive('/tags') && <div class="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>}
                </a>
            </nav>

            {/* Quick Actions */}
            <div class="mt-4 px-4">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</p>
                <div class="space-y-2">
                    <a
                        href="/todo"
                        class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        <span>➕</span>
                        <span>New Todo</span>
                    </a>
                    <a
                        href="/calendar"
                        class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all text-sm font-medium flex items-center gap-2"
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
        </>
    );
}
