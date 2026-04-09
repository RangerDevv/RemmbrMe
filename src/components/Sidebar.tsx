import { createSignal, Show, onMount, onCleanup, For } from 'solid-js';
import { currentTheme, getUserName } from '../lib/theme';
import { bk, currentUser } from '../lib/backend.ts';
import { 
    DashboardIcon, 
    CheckCircleIcon, 
    CalendarIcon, 
    CalendarWeekIcon,
    ClockIcon, 
    RobotIcon, 
    PlusIcon, 
    SettingsIcon, 
    MenuIcon,
    XIcon,
    SearchIcon,
    SyncIcon
} from './Icons';

export default function Sidebar() {
    const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
    const [currentPath, setCurrentPath] = createSignal(window.location.pathname);
    const [searchQuery, setSearchQuery] = createSignal('');
    const [todoCount, setTodoCount] = createSignal(0);
    const [calendarCount, setCalendarCount] = createSignal(0);
    const [taskCount, setTaskCount] = createSignal(0);
    const [noteCount, setNoteCount] = createSignal(0);
    const [tags, setTags] = createSignal<any[]>([]);

    const isActive = (path: string) => currentPath() === path;

    onMount(async () => {
        const updatePath = () => setCurrentPath(window.location.pathname);
        window.addEventListener('popstate', updatePath);
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                setTimeout(updatePath, 0);
            }
        };
        document.addEventListener('click', handleClick);
        
        // Fetch counts
        try {
            const userId = currentUser()?.id;
            if (userId) {
                const [todos, events, tagList] = await Promise.all([
                    bk.collection('Todo').getFullList({ filter: `user = "${userId}"` }),
                    bk.collection('Calendar').getFullList({ filter: `user = "${userId}"` }),
                    bk.collection('Tags').getFullList({ filter: `user = "${userId}"` }),
                ]);
                const activeTodos = todos.filter((t: any) => !t.Completed);
                setTodoCount(todos.length);
                setTaskCount(activeTodos.length);
                setCalendarCount(events.length);
                setTags(tagList);
            }
        } catch (e) {}

        // Listen for data changes
        const handleItemCreated = () => {
            try {
                const userId = currentUser()?.id;
                if (userId) {
                    bk.collection('Todo').getFullList({ filter: `user = "${userId}"` }).then(todos => {
                        setTodoCount(todos.length);
                        setTaskCount(todos.filter((t: any) => !t.Completed).length);
                    });
                }
            } catch {}
        };
        window.addEventListener('itemCreated', handleItemCreated);
        
        onCleanup(() => {
            window.removeEventListener('popstate', updatePath);
            document.removeEventListener('click', handleClick);
            window.removeEventListener('itemCreated', handleItemCreated);
        });
    });

    const navItems = [
        { path: '/', label: 'My Day', icon: DashboardIcon, count: () => taskCount() },
        { path: '/calendar', label: 'Calendar', icon: CalendarIcon, count: () => calendarCount() },
        { path: '/schedule', label: 'Schedule', icon: CalendarWeekIcon, count: () => calendarCount() },
    ];

    const workspaceItems = [
        { path: '/todo', label: 'All', icon: () => <span class="text-base">⊞</span>, count: () => todoCount() },
        { path: '/todo?filter=active', label: 'Tasks', icon: CheckCircleIcon, count: () => taskCount() },
    ];

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen())}
                class={`lg:hidden fixed left-3 z-[60] p-2.5 rounded-xl transition-all duration-200 active:scale-95 ${mobileMenuOpen() ? '' : 'glass'}`}
                style={{
                    top: "calc(32px + 0.75rem)",
                    "background-color": mobileMenuOpen() ? "transparent" : undefined,
                    "border": mobileMenuOpen() ? "none" : undefined,
                    "color": "var(--color-text)",
                }}

            >
                {mobileMenuOpen() ? <XIcon class="w-5 h-5" /> : <MenuIcon class="w-5 h-5" />}
            </button>

            {/* Mobile Overlay */}
            <Show when={mobileMenuOpen()}>
                <div 
                    class="lg:hidden fixed inset-x-0 bottom-0 z-[50] transition-opacity duration-300 glass-overlay"
                    style={{ top: "32px" }}
                    onClick={() => setMobileMenuOpen(false)}
                />
            </Show>

            {/* Sidebar */}
            <aside class={`
                flex flex-col
                fixed lg:sticky left-0
                top-[32px] h-[calc(100vh-32px)]
                w-[280px] lg:w-[260px]
                z-[55] lg:z-auto
                transition-transform duration-300 ease-out
                ${mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                overflow-y-auto overscroll-contain
            `}
            style={{
                "background": "var(--color-bg-secondary)",
                "border-right": "1px solid var(--color-border)",
                "backdrop-filter": "blur(32px) saturate(1.3)",
                "-webkit-backdrop-filter": "blur(32px) saturate(1.3)",
                "box-shadow": "inset -0.5px 0 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.1)"
            }}
            >
                {/* User Profile */}
                <div class="p-4 pb-2">
                    <div class="flex items-center gap-3 mb-4">
                        <div 
                            class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                            style={{
                                "background-color": "var(--color-accent-muted)",
                                "color": "var(--color-accent)"
                            }}
                        >
                            {getUserName()().charAt(0).toUpperCase()}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold truncate" style={{ "color": "var(--color-text)" }}>
                                {getUserName()()}
                            </p>
                        </div>
                        <button 
                            class="p-1 rounded transition-colors duration-200"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7" rx="1"/>
                                <rect x="14" y="3" width="7" height="7" rx="1"/>
                                <rect x="3" y="14" width="7" height="7" rx="1"/>
                                <rect x="14" y="14" width="7" height="7" rx="1"/>
                            </svg>
                        </button>
                    </div>

                    {/* Add Task Button */}
                    <a
                        href="/todo"
                        onClick={() => setMobileMenuOpen(false)}
                        class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mb-3"
                        style={{
                            "color": "var(--color-accent)",
                        }}
                    >
                        <PlusIcon class="w-4 h-4" />
                        <span>Add Task</span>
                    </a>

                    {/* Search */}
                    <div class="relative mb-4">
                        <SearchIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ "color": "var(--color-text-muted)" }} />
                        <input
                            type="text"
                            value={searchQuery()}
                            onInput={(e) => setSearchQuery(e.currentTarget.value)}
                            placeholder="Search"
                            class="w-full rounded-lg pl-9 pr-3 py-2 text-sm border-0 focus:outline-none focus:ring-1 transition-all duration-200"
                            style={{
                                "background-color": "var(--color-bg-tertiary)",
                                "color": "var(--color-text)",
                            }}
                        />
                    </div>
                </div>

                {/* Main Navigation */}
                <nav class="px-2 space-y-0.5">
                    <For each={navItems}>
                        {(item) => (
                            <a
                                href={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    "background-color": isActive(item.path) ? "var(--color-bg-tertiary)" : "transparent",
                                    "color": isActive(item.path) ? "var(--color-text)" : "var(--color-text-secondary)",
                                }}
                            >
                                <item.icon class="w-[18px] h-[18px]" />
                                <span class="flex-1">{item.label}</span>
                                <Show when={item.count() > 0}>
                                    <span class="text-xs font-medium px-1.5 py-0.5 rounded" style={{ "color": "var(--color-text-muted)" }}>
                                        {item.count()}
                                    </span>
                                </Show>
                            </a>
                        )}
                    </For>
                </nav>

                {/* Workspace Section */}
                <div class="mt-5 px-4">
                    <p class="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ "color": "var(--color-text-muted)" }}>
                        Workspace
                    </p>
                </div>
                <nav class="px-2 space-y-0.5">
                    <For each={workspaceItems}>
                        {(item) => (
                            <a
                                href={item.path.split('?')[0]}
                                onClick={() => setMobileMenuOpen(false)}
                                class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    "background-color": isActive(item.path.split('?')[0]) ? "var(--color-bg-tertiary)" : "transparent",
                                    "color": isActive(item.path.split('?')[0]) ? "var(--color-text)" : "var(--color-text-secondary)",
                                }}
                            >
                                <item.icon class="w-[18px] h-[18px]" />
                                <span class="flex-1">{item.label}</span>
                                <Show when={item.count() > 0}>
                                    <span class="text-xs font-medium px-1.5 py-0.5 rounded" style={{ "color": "var(--color-text-muted)" }}>
                                        {item.count()}
                                    </span>
                                </Show>
                            </a>
                        )}
                    </For>
                </nav>

                {/* Tags / Projects Section */}
                <Show when={tags().length > 0}>
                    <div class="mt-5 px-4">
                        <p class="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ "color": "var(--color-text-muted)" }}>
                            Projects
                        </p>
                    </div>
                    <nav class="px-2 space-y-0.5">
                        <For each={tags().slice(0, 5)}>
                            {(tag) => (
                                <div
                                    class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium"
                                    style={{ "color": "var(--color-text-secondary)" }}
                                >
                                    <div class="w-[18px] h-[18px] flex items-center justify-center">
                                        <span class="text-base" style={{ "color": tag.color }}>#</span>
                                    </div>
                                    <span class="flex-1 truncate">{tag.name}</span>
                                </div>
                            )}
                        </For>
                    </nav>
                </Show>

                {/* Bottom section */}
                <div class="mt-auto px-2 pb-4 space-y-0.5">
                    <a
                        href="/timemachine"
                        onClick={() => setMobileMenuOpen(false)}
                        class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{
                            "background-color": isActive('/timemachine') ? "var(--color-bg-tertiary)" : "transparent",
                            "color": isActive('/timemachine') ? "var(--color-text)" : "var(--color-text-secondary)",
                        }}
                    >
                        <ClockIcon class="w-[18px] h-[18px]" />
                        <span>Time Machine</span>
                    </a>
                    <a
                        href="/ai"
                        onClick={() => setMobileMenuOpen(false)}
                        class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{
                            "background-color": isActive('/ai') ? "var(--color-bg-tertiary)" : "transparent",
                            "color": isActive('/ai') ? "var(--color-text)" : "var(--color-text-secondary)",
                        }}
                    >
                        <RobotIcon class="w-[18px] h-[18px]" />
                        <span>AI Assistant</span>
                    </a>

                    {/* New List button */}
                    <div class="pt-2 border-t mt-2" style={{ "border-color": "var(--color-border)" }}>
                    <a
                        href="/sync"
                        onClick={() => setMobileMenuOpen(false)}
                        class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{
                            "background-color": isActive('/sync') ? "var(--color-bg-tertiary)" : "transparent",
                            "color": isActive('/sync') ? "var(--color-text)" : "var(--color-text-secondary)",
                        }}
                    >
                        <SyncIcon class="w-[18px] h-[18px]" />
                        <span>Sync & Backup</span>
                    </a>
                    <a
                        href="/settings"
                            onClick={() => setMobileMenuOpen(false)}
                            class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                            style={{
                                "background-color": isActive('/settings') ? "var(--color-bg-tertiary)" : "transparent",
                                "color": isActive('/settings') ? "var(--color-text)" : "var(--color-text-secondary)",
                            }}
                        >
                            <SettingsIcon class="w-[18px] h-[18px]" />
                            <span>Settings</span>
                        </a>
                    </div>

                    {/* Keyboard shortcuts hint */}
                    <div class="pt-2 mt-auto">
                        <button
                            onClick={() => document.dispatchEvent(new CustomEvent('kb:show-help'))}
                            class="flex items-center gap-2 px-3 py-1.5 text-xs transition-colors duration-200 w-full"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            <kbd class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono" style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text-muted)" }}>?</kbd>
                            <span>Shortcuts</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
