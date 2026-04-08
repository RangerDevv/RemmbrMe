import { createSignal, onMount, onCleanup } from "solid-js";

export default function TitleBar() {
    const [isMaximized, setIsMaximized] = createSignal(false);
    let win: any = null;

    onMount(async () => {
        try {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            win = getCurrentWindow();
            setIsMaximized(await win.isMaximized());

            // Listen for resize to track maximize state
            const unlisten = await win.onResized(async () => {
                setIsMaximized(await win.isMaximized());
            });
            onCleanup(() => unlisten());
        } catch {
            // Not running in Tauri
        }
    });

    const handleMinimize = () => win?.minimize();
    const handleMaximize = () => win?.toggleMaximize();
    const handleClose = () => win?.close();

    return (
        <div
            class="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between select-none"
            style={{
                "background-color": "var(--color-bg-secondary)",
                "border-bottom": "1px solid var(--color-border)",
                height: "32px",
                "-webkit-app-region": "drag",
            }}
            data-tauri-drag-region
        >
            {/* App title */}
            <div
                class="flex items-center gap-2 px-3 text-xs font-medium tracking-wide"
                style={{ color: "var(--color-text-secondary)" }}
                data-tauri-drag-region
            >
                <span style={{ color: "var(--color-accent)", "font-size": "14px" }}>●</span>
                <span data-tauri-drag-region>RemmbrMe</span>
            </div>

            {/* Window controls */}
            <div class="flex items-center h-full" style={{ "-webkit-app-region": "no-drag" }}>
                <button
                    class="inline-flex items-center justify-center h-full px-3 transition-colors duration-150"
                    style={{ color: "var(--color-text-muted)" }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        e.currentTarget.style.color = "var(--color-text)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--color-text-muted)";
                    }}
                    onClick={handleMinimize}
                    title="Minimize"
                >
                    <svg width="10" height="1" viewBox="0 0 10 1">
                        <rect fill="currentColor" width="10" height="1" />
                    </svg>
                </button>
                <button
                    class="inline-flex items-center justify-center h-full px-3 transition-colors duration-150"
                    style={{ color: "var(--color-text-muted)" }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                        e.currentTarget.style.color = "var(--color-text)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--color-text-muted)";
                    }}
                    onClick={handleMaximize}
                    title={isMaximized() ? "Restore" : "Maximize"}
                >
                    {isMaximized() ? (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                            <path fill="none" stroke="currentColor" stroke-width="1" d="M3 0.5h6.5v6.5M0.5 3h6.5v6.5H0.5z" />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                            <rect fill="none" stroke="currentColor" stroke-width="1" x="0.5" y="0.5" width="9" height="9" />
                        </svg>
                    )}
                </button>
                <button
                    class="inline-flex items-center justify-center h-full px-3 transition-colors duration-150"
                    style={{ color: "var(--color-text-muted)" }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-danger)";
                        e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--color-text-muted)";
                    }}
                    onClick={handleClose}
                    title="Close"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10">
                        <path fill="none" stroke="currentColor" stroke-width="1.2" d="M1 1l8 8M9 1l-8 8" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
