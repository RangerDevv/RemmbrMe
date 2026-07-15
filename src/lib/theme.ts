import { createSignal, createEffect, createContext, useContext } from 'solid-js';

export interface ThemeColors {
    // Base
    bg: string;
    bgSecondary: string;
    bgTertiary: string;
    surface: string;
    surfaceHover: string;
    border: string;
    borderHover: string;
    
    // Text
    text: string;
    textSecondary: string;
    textMuted: string;
    
    // Accent
    accent: string;
    accentHover: string;
    accentMuted: string;
    accentText: string;
    
    // Status
    danger: string;
    dangerMuted: string;
    warning: string;
    warningMuted: string;
    success: string;
    successMuted: string;
    info: string;
    infoMuted: string;
}

export interface Theme {
    name: string;
    id: string;
    colors: ThemeColors;
}

export const themes: Theme[] = [
    {
        name: 'Obsidian',
        id: 'midnight',
        colors: {
            bg: '#0c0c0e',
            bgSecondary: '#111114',
            bgTertiary: '#18181c',
            surface: '#131316',
            surfaceHover: '#1c1c21',
            border: '#2a2a30',
            borderHover: '#3a3a42',
            text: '#e8e8e6',
            textSecondary: '#9b9a97',
            textMuted: '#5c5c5c',
            accent: '#2eaadc',
            accentHover: '#2496c7',
            accentMuted: 'rgba(46,170,220,0.12)',
            accentText: '#ffffff',
            danger: '#e03e3e',
            dangerMuted: 'rgba(224,62,62,0.12)',
            warning: '#dfab01',
            warningMuted: 'rgba(223,171,1,0.12)',
            success: '#0f7b6c',
            successMuted: 'rgba(15,123,108,0.12)',
            info: '#529cca',
            infoMuted: 'rgba(82,156,202,0.12)',
        }
    },
    {
        name: 'Light',
        id: 'light',
        colors: {
            bg: '#f5f5f0',
            bgSecondary: '#ffffff',
            bgTertiary: '#eeeee9',
            surface: '#fafafa',
            surfaceHover: '#f0f0eb',
            border: '#e0e0db',
            borderHover: '#c8c8c2',
            text: '#37352f',
            textSecondary: '#6b6b6b',
            textMuted: '#9b9a97',
            accent: '#2eaadc',
            accentHover: '#2496c7',
            accentMuted: 'rgba(46,170,220,0.10)',
            accentText: '#ffffff',
            danger: '#e03e3e',
            dangerMuted: 'rgba(224,62,62,0.10)',
            warning: '#dfab01',
            warningMuted: 'rgba(223,171,1,0.10)',
            success: '#0f7b6c',
            successMuted: 'rgba(15,123,108,0.10)',
            info: '#529cca',
            infoMuted: 'rgba(82,156,202,0.10)',
        }
    },
    {
        name: 'Deep Ocean',
        id: 'ocean',
        colors: {
            bg: '#070d1a',
            bgSecondary: '#0c1428',
            bgTertiary: '#111e38',
            surface: '#0e1830',
            surfaceHover: '#14203e',
            border: '#1e2f4e',
            borderHover: '#273d60',
            text: '#e2e8f0',
            textSecondary: '#94a3b8',
            textMuted: '#475569',
            accent: '#06b6d4',
            accentHover: '#0891b2',
            accentMuted: 'rgba(6,182,212,0.12)',
            accentText: '#ffffff',
            danger: '#f43f5e',
            dangerMuted: 'rgba(244,63,94,0.12)',
            warning: '#fb923c',
            warningMuted: 'rgba(251,146,60,0.12)',
            success: '#34d399',
            successMuted: 'rgba(52,211,153,0.12)',
            info: '#60a5fa',
            infoMuted: 'rgba(96,165,250,0.12)',
        }
    },
    {
        name: 'Slate',
        id: 'slate',
        colors: {
            bg: '#09090b',
            bgSecondary: '#101013',
            bgTertiary: '#18181c',
            surface: '#111115',
            surfaceHover: '#1c1c21',
            border: '#27272a',
            borderHover: '#3f3f46',
            text: '#fafafa',
            textSecondary: '#a3a3a3',
            textMuted: '#636363',
            accent: '#8b5cf6',
            accentHover: '#7c3aed',
            accentMuted: 'rgba(139,92,246,0.12)',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: 'rgba(239,68,68,0.12)',
            warning: '#eab308',
            warningMuted: 'rgba(234,179,8,0.12)',
            success: '#22c55e',
            successMuted: 'rgba(34,197,94,0.12)',
            info: '#3b82f6',
            infoMuted: 'rgba(59,130,246,0.12)',
        }
    },
    {
        name: 'Warm Dark',
        id: 'emerald',
        colors: {
            bg: '#0e0c0a',
            bgSecondary: '#161210',
            bgTertiary: '#1e1916',
            surface: '#1a1612',
            surfaceHover: '#231e19',
            border: '#2e2820',
            borderHover: '#3e3730',
            text: '#e7e5e4',
            textSecondary: '#a8a29e',
            textMuted: '#6b6560',
            accent: '#d97706',
            accentHover: '#b45309',
            accentMuted: 'rgba(217,119,6,0.12)',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: 'rgba(239,68,68,0.12)',
            warning: '#f59e0b',
            warningMuted: 'rgba(245,158,11,0.12)',
            success: '#22c55e',
            successMuted: 'rgba(34,197,94,0.12)',
            info: '#3b82f6',
            infoMuted: 'rgba(59,130,246,0.12)',
        }
    },
    {
        name: 'Rose',
        id: 'rose',
        colors: {
            bg: '#0d080c',
            bgSecondary: '#140910',
            bgTertiary: '#1c1018',
            surface: '#180e15',
            surfaceHover: '#22121c',
            border: '#2e1a26',
            borderHover: '#3e2234',
            text: '#f0e8ec',
            textSecondary: '#aa8a98',
            textMuted: '#755668',
            accent: '#e879a0',
            accentHover: '#d4608a',
            accentMuted: 'rgba(232,121,160,0.12)',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: 'rgba(239,68,68,0.12)',
            warning: '#f59e0b',
            warningMuted: 'rgba(245,158,11,0.12)',
            success: '#22c55e',
            successMuted: 'rgba(34,197,94,0.12)',
            info: '#3b82f6',
            infoMuted: 'rgba(59,130,246,0.12)',
        }
    }
];

const THEME_STORAGE_KEY = 'remmbrme_theme';
const USER_NAME_KEY = 'remmbrme_user_name';

function loadSavedTheme(): Theme {
    try {
        const savedId = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedId) {
            const found = themes.find(t => t.id === savedId);
            if (found) return found;
        }
    } catch {}
    return themes[0]; // Default to Midnight
}

const [currentTheme, setCurrentThemeInternal] = createSignal<Theme>(loadSavedTheme());
const [userName, setUserNameInternal] = createSignal(localStorage.getItem(USER_NAME_KEY) || 'User');

export function setTheme(themeId: string) {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
        setCurrentThemeInternal(theme);
        localStorage.setItem(THEME_STORAGE_KEY, themeId);
        applyThemeToDOM(theme);
    }
}

export function currentThemeId(): string {
    return currentTheme().id;
}

export function setUserName(name: string) {
    setUserNameInternal(name);
    localStorage.setItem(USER_NAME_KEY, name);
}

export function getUserName() {
    return userName;
}

// ─── Time format (12h / 24h) ───────────────────────────────────────
const TIME_FORMAT_KEY = 'timeFormat24h';
const [use24hTime, setUse24hTimeInternal] = createSignal(localStorage.getItem(TIME_FORMAT_KEY) === 'true');

/** Reactive accessor — returns true when 24-hour mode is active */
export function isUse24hTime() { return use24hTime(); }

export function setUse24hTime(val: boolean) {
    setUse24hTimeInternal(val);
    localStorage.setItem(TIME_FORMAT_KEY, String(val));
}

/**
 * Format a Date for display, respecting the user's 12h/24h preference.
 * Reactive: when called inside SolidJS JSX / createMemo it will
 * automatically re-run whenever the setting changes.
 */
export function formatTime(date: Date): string {
    if (use24hTime()) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export { currentTheme };

export function applyThemeToDOM(theme: Theme) {
    const root = document.documentElement;
    const c = theme.colors;
    const isLight = theme.id === 'light';

    if (isLight) {
        // Material You inspired light tokens.
        root.style.setProperty('--color-bg', '#eef8f5');
        root.style.setProperty('--color-bg-secondary', '#f4fcf9');
        root.style.setProperty('--color-bg-tertiary', '#e1f4ee');
        root.style.setProperty('--color-surface', '#f5fcfa');
        root.style.setProperty('--color-surface-hover', '#e9f7f2');
        root.style.setProperty('--color-border', '#c4e4da');
        root.style.setProperty('--color-border-hover', '#a7d3c6');
        root.style.setProperty('--color-text', '#1f3940');
        root.style.setProperty('--color-text-secondary', '#456870');
        root.style.setProperty('--color-text-muted', '#698e97');

        root.style.setProperty('--app-shell-grad-start', '#f6fcfa');
        root.style.setProperty('--app-shell-grad-end', '#ecf8f4');
        root.style.setProperty('--app-shell-blob-1', 'rgba(255, 183, 146, 0.2)');
        root.style.setProperty('--app-shell-blob-2', 'rgba(96, 165, 250, 0.18)');
        root.style.setProperty('--app-shell-blob-3', 'rgba(52, 211, 153, 0.14)');
        root.style.setProperty('--app-shell-highlight-1', 'rgba(236, 252, 245, 0.65)');
        root.style.setProperty('--app-shell-highlight-2', 'rgba(224, 248, 241, 0.5)');
        root.style.setProperty('--app-glass-border', '#cce7de');
        root.style.setProperty('--app-glass-bg', 'linear-gradient(160deg, rgba(245, 253, 249, 0.96), rgba(233, 247, 241, 0.92))');
        root.style.setProperty('--app-glass-shadow', '0 10px 24px rgba(20, 85, 76, 0.1)');
        root.style.setProperty('--app-sidebar-bg', 'linear-gradient(180deg, rgba(246, 253, 250, 0.98), rgba(231, 246, 240, 0.94))');
    } else {
        // True black dark tokens.
        root.style.setProperty('--color-bg', '#000000');
        root.style.setProperty('--color-bg-secondary', '#0a0a0a');
        root.style.setProperty('--color-bg-tertiary', '#121212');
        root.style.setProperty('--color-surface', '#101010');
        root.style.setProperty('--color-surface-hover', '#1b1b1b');
        root.style.setProperty('--color-border', '#2a2a2a');
        root.style.setProperty('--color-border-hover', '#3a3a3a');
        root.style.setProperty('--color-text', '#f5f5f5');
        root.style.setProperty('--color-text-secondary', '#c5c5c5');
        root.style.setProperty('--color-text-muted', '#8f8f8f');

        root.style.setProperty('--app-shell-grad-start', '#0a0a0a');
        root.style.setProperty('--app-shell-grad-end', '#000000');
        root.style.setProperty('--app-shell-blob-1', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--app-shell-blob-2', 'rgba(255, 255, 255, 0.06)');
        root.style.setProperty('--app-shell-blob-3', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--app-shell-highlight-1', 'rgba(255, 255, 255, 0.16)');
        root.style.setProperty('--app-shell-highlight-2', 'rgba(255, 255, 255, 0.10)');
        root.style.setProperty('--app-glass-border', '#2a2a2a');
        root.style.setProperty('--app-glass-bg', 'linear-gradient(160deg, rgba(18, 18, 18, 0.94), rgba(10, 10, 10, 0.92))');
        root.style.setProperty('--app-glass-shadow', '0 12px 28px rgba(0, 0, 0, 0.5)');
        root.style.setProperty('--app-sidebar-bg', 'linear-gradient(180deg, rgba(14, 14, 14, 0.98), rgba(6, 6, 6, 0.96))');
    }
    root.style.setProperty('--color-accent', c.accent);
    root.style.setProperty('--color-accent-hover', c.accentHover);
    root.style.setProperty('--color-accent-muted', c.accentMuted);
    root.style.setProperty('--color-accent-text', c.accentText);
    root.style.setProperty('--color-danger', c.danger);
    root.style.setProperty('--color-danger-muted', c.dangerMuted);
    root.style.setProperty('--color-warning', '#ff9f1c');
    root.style.setProperty('--color-warning-muted', 'rgba(255,159,28,0.16)');
    root.style.setProperty('--color-success', '#11b98f');
    root.style.setProperty('--color-success-muted', 'rgba(17,185,143,0.16)');
    root.style.setProperty('--color-info', '#5b8bff');
    root.style.setProperty('--color-info-muted', 'rgba(91,139,255,0.14)');

    document.body.style.backgroundColor = isLight ? '#eef8f5' : '#000000';
    document.body.style.color = isLight ? '#1f3940' : '#f5f5f5';
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
}

// Apply theme on module load
applyThemeToDOM(loadSavedTheme());
