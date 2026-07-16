import { createSignal, Show, onMount, onCleanup, For } from 'solid-js';
import { getUserName } from '../lib/theme';
import { bk, currentUser } from '../lib/backend.ts';
import { 
    DashboardIcon, 
    CheckCircleIcon, 
    CalendarIcon, 
    CalendarWeekIcon,
    RobotIcon, 
    PlusIcon, 
    SettingsIcon, 
    MenuIcon,
    XIcon,
    SearchIcon,
} from './Icons';

// Classes shared by every desktop tooltip
const TIP = [
    'hidden lg:block',
    'pointer-events-none',
    'absolute left-full top-1/2 -translate-y-1/2 ml-3',
    'whitespace-nowrap z-[200]',
    'px-2.5 py-1 rounded-lg text-xs font-medium',
    'opacity-0 group-hover:opacity-100',
    'transition-opacity duration-150',
].join(' ');

const TIP_STYLE = {
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
};

export default function Sidebar() {
    const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
    const [currentPath, setCurrentPath] = createSignal(window.location.pathname);
    const [searchQuery, setSearchQuery] = createSignal('');
    const [todoCount, setTodoCount] = createSignal(0);
    const [calendarCount, setCalendarCount] = createSignal(0);
    const [taskCount, setTaskCount] = createSignal(0);
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
        
        async function refreshCounts() {
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
        }

        await refreshCounts();
        window.addEventListener('itemCreated', refreshCounts);
        window.addEventListener('dataChanged', refreshCounts);
        
        onCleanup(() => {
            window.removeEventListener('popstate', updatePath);
            document.removeEventListener('click', handleClick);
            window.removeEventListener('itemCreated', refreshCounts);
            window.removeEventListener('dataChanged', refreshCounts);
        });
    });

    const navItems = [
        { path: '/', label: 'My Day', icon: DashboardIcon, count: () => taskCount() },
        { path: '/calendar', label: 'Calendar', icon: CalendarIcon, count: () => calendarCount() },
        { path: '/schedule', label: 'Schedule', icon: CalendarWeekIcon, count: () => calendarCount() },
    ];

    const workspaceItems = [
        { path: '/todo', label: 'All Tasks', icon: () => <span class="text-base leading-none">⊞</span>, count: () => todoCount() },
        { path: '/todo?filter=active', label: 'Active Tasks', icon: CheckCircleIcon, count: () => taskCount() },
    ];

    // Shared nav-link style
    const linkStyle = (path: string) => ({
        "background-color": isActive(path) ? "var(--color-bg-tertiary)" : "transparent",
        "color": isActive(path) ? "var(--color-text)" : "var(--color-text-secondary)",
    });

    // Shared nav-link classes (mobile: full row, desktop: centred square)
    const linkClass = "flex items-center gap-3 lg:justify-center px-3 lg:px-0 py-2 lg:w-10 lg:h-10 lg:mx-auto rounded-xl text-sm font-medium transition-all duration-200 hover:bg-[var(--color-bg-tertiary)]";

    return (
        <>
            {/* ── Mobile toggle ─────────────────────────────────────────── */}
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

            {/* ── Mobile overlay ────────────────────────────────────────── */}
            <Show when={mobileMenuOpen()}>
                <div
                    class="lg:hidden fixed inset-x-0 bottom-0 z-[50] transition-opacity duration-300 glass-overlay"
                    style={{ top: "32px" }}
                    onClick={() => setMobileMenuOpen(false)}
                />
            </Show>

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside
                class={[
                    'flex flex-col',
                    'fixed lg:sticky left-0',
                    'top-[32px] h-[calc(100vh-32px)]',
                    // mobile: full drawer width; desktop: collapsed icon rail
                    'w-[280px] lg:w-14',
                    'z-[55] lg:z-auto',
                    'transition-transform duration-300 ease-out',
                    mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    // allow overflow on desktop so tooltips are not clipped
                    'overflow-y-auto lg:overflow-visible overscroll-contain',
                ].join(' ')}
                style={{
                    background: 'var(--color-bg-secondary)',
                    'border-right': '1px solid var(--color-border)',
                }}
            >
                {/* ── Profile ───────────────────────────────────────────── */}
                <div class="p-4 pb-2 lg:p-2 lg:py-3">
                    {/* Avatar row */}
                    <div class="relative group flex items-center gap-3 lg:justify-center mb-4 lg:mb-2">
                        <div
                            class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold"
                            style={{ "background-color": "var(--color-accent-muted)", "color": "var(--color-accent)" }}
                        >
                            {getUserName()().charAt(0).toUpperCase()}
                        </div>
                        {/* Mobile: show name */}
                        <div class="flex-1 min-w-0 lg:hidden">
                            <p class="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                                {getUserName()()}
                            </p>
                        </div>
                        {/* Desktop: tooltip */}
                        <span class={TIP} style={TIP_STYLE}>{getUserName()()}</span>
                    </div>

                    {/* Quick Add */}
                    <div class="relative group lg:flex lg:justify-center mb-3 lg:mb-2">
                        <button
                            onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('quickadd:open')); }}
                            class="flex items-center gap-2 lg:justify-center w-full lg:w-10 lg:h-10 px-3 lg:px-0 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                            style={{ background: "var(--color-accent)", color: "#fff" }}
                        >
                            <PlusIcon class="w-4 h-4 flex-shrink-0" />
                            <span class="lg:hidden">Quick Add</span>
                            <kbd class="ml-auto text-[10px] font-mono opacity-60 lg:hidden">⌘K</kbd>
                        </button>
                        <span class={TIP} style={TIP_STYLE}>Quick Add <span class="opacity-50 ml-1">⌘K</span></span>
                    </div>

                    {/* Search — mobile only */}
                    <div class="relative mb-1 lg:hidden">
                        <SearchIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ "color": "var(--color-text-muted)" }} />
                        <input
                            type="text"
                            value={searchQuery()}
                            onInput={(e) => setSearchQuery(e.currentTarget.value)}
                            placeholder="Search"
                            class="w-full rounded-lg pl-9 pr-3 py-2 text-sm border-0 focus:outline-none focus:ring-1 transition-all duration-200"
                            style={{ "background-color": "var(--color-bg-tertiary)", "color": "var(--color-text)" }}
                        />
                    </div>
                </div>

                {/* ── Main nav ──────────────────────────────────────────── */}
                <nav class="px-2 space-y-0.5">
                    <For each={navItems}>
                        {(item) => (
                            <div class="relative group">
                                <a
                                    href={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    class={linkClass}
                                    style={linkStyle(item.path)}
                                >
                                    <item.icon class="w-[18px] h-[18px] flex-shrink-0" />
                                    <span class="flex-1 lg:hidden">{item.label}</span>
                                    <Show when={item.count() > 0}>
                                        <span class="text-xs font-medium px-1.5 py-0.5 rounded lg:hidden" style={{ "color": "var(--color-text-muted)" }}>
                                            {item.count()}
                                        </span>
                                    </Show>
                                </a>
                                <span class={TIP} style={TIP_STYLE}>
                                    {item.label}
                                    <Show when={item.count() > 0}>
                                        <span class="ml-2 opacity-60">{item.count()}</span>
                                    </Show>
                                </span>
                            </div>
                        )}
                    </For>
                </nav>

                {/* ── Workspace section ─────────────────────────────────── */}
                <div class="mt-4 px-4 lg:hidden">
                    <p class="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ "color": "var(--color-text-muted)" }}>
                        Workspace
                    </p>
                </div>
                {/* Desktop: thin divider instead of header */}
                <div class="hidden lg:block mx-3 my-2 border-t" style={{ "border-color": "var(--color-border)" }} />

                <nav class="px-2 space-y-0.5">
                    <For each={workspaceItems}>
                        {(item) => (
                            <div class="relative group">
                                <a
                                    href={item.path.split('?')[0]}
                                    onClick={() => setMobileMenuOpen(false)}
                                    class={linkClass}
                                    style={linkStyle(item.path.split('?')[0])}
                                >
                                    <item.icon class="w-[18px] h-[18px] flex-shrink-0" />
                                    <span class="flex-1 lg:hidden">{item.label}</span>
                                    <Show when={item.count() > 0}>
                                        <span class="text-xs font-medium px-1.5 py-0.5 rounded lg:hidden" style={{ "color": "var(--color-text-muted)" }}>
                                            {item.count()}
                                        </span>
                                    </Show>
                                </a>
                                <span class={TIP} style={TIP_STYLE}>
                                    {item.label}
                                    <Show when={item.count() > 0}>
                                        <span class="ml-2 opacity-60">{item.count()}</span>
                                    </Show>
                                </span>
                            </div>
                        )}
                    </For>
                </nav>

                {/* ── Tags / Projects ───────────────────────────────────── */}
                <Show when={tags().length > 0}>
                    <div class="mt-4 px-4 lg:hidden">
                        <p class="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ "color": "var(--color-text-muted)" }}>
                            Projects
                        </p>
                    </div>
                    <div class="hidden lg:block mx-3 my-2 border-t" style={{ "border-color": "var(--color-border)" }} />
                    <nav class="px-2 space-y-0.5">
                        <For each={tags().slice(0, 5)}>
                            {(tag) => (
                                <div class="relative group">
                                    <div
                                        class="flex items-center gap-3 lg:justify-center px-3 lg:px-0 py-2 lg:w-10 lg:h-10 lg:mx-auto rounded-xl text-sm font-medium cursor-default"
                                        style={{ "color": "var(--color-text-secondary)" }}
                                    >
                                        <span
                                            class="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center text-base leading-none"
                                            style={{ "color": tag.color }}
                                        >#</span>
                                        <span class="flex-1 truncate lg:hidden">{tag.name}</span>
                                    </div>
                                    <span class={TIP} style={{ ...TIP_STYLE, "border-left": `3px solid ${tag.color}` }}>
                                        {tag.name}
                                    </span>
                                </div>
                            )}
                        </For>
                    </nav>
                </Show>

                {/* ── Bottom actions ────────────────────────────────────── */}
                <div class="mt-auto px-2 pb-4 space-y-0.5">
                    <div class="relative group">
                        <a
                            href="/ai"
                            onClick={() => setMobileMenuOpen(false)}
                            class={linkClass}
                            style={linkStyle('/ai')}
                        >
                            <RobotIcon class="w-[18px] h-[18px] flex-shrink-0" />
                            <span class="flex-1 lg:hidden">AI Assistant</span>
                        </a>
                        <span class={TIP} style={TIP_STYLE}>AI Assistant</span>
                    </div>

                    <div class="pt-2 border-t" style={{ "border-color": "var(--color-border)" }}>
                        <div class="relative group">
                            <a
                                href="/settings"
                                onClick={() => setMobileMenuOpen(false)}
                                class={linkClass}
                                style={linkStyle('/settings')}
                            >
                                <SettingsIcon class="w-[18px] h-[18px] flex-shrink-0" />
                                <span class="flex-1 lg:hidden">Settings</span>
                            </a>
                            <span class={TIP} style={TIP_STYLE}>Settings</span>
                        </div>
                    </div>

                    {/* Shortcuts hint — mobile only */}
                    <div class="pt-2 lg:hidden">
                        <button
                            onClick={() => document.dispatchEvent(new CustomEvent('kb:show-help'))}
                            class="flex items-center gap-2 px-3 py-1.5 text-xs transition-colors duration-200 w-full"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            <kbd
                                class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono"
                                style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text-muted)" }}
                            >?</kbd>
                            <span>Shortcuts</span>
                        </button>
                    </div>

                    {/* Desktop: shortcuts icon with tooltip */}
                    <div class="hidden lg:block relative group">
                        <button
                            onClick={() => document.dispatchEvent(new CustomEvent('kb:show-help'))}
                            class="flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 hover:bg-[var(--color-bg-tertiary)]"
                            style={{ "color": "var(--color-text-muted)" }}
                        >
                            <kbd
                                class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono"
                                style={{ "background-color": "var(--color-bg-tertiary)", "border": "1px solid var(--color-border)", "color": "var(--color-text-muted)" }}
                            >?</kbd>
                        </button>
                        <span class={TIP} style={TIP_STYLE}>Keyboard Shortcuts</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
