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
            bgSecondary: 'rgba(16,16,20,0.82)',
            bgTertiary: 'rgba(30,30,36,0.6)',
            surface: 'rgba(20,20,26,0.72)',
            surfaceHover: 'rgba(28,28,34,0.78)',
            border: 'rgba(255,255,255,0.10)',
            borderHover: 'rgba(255,255,255,0.18)',
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
            bgSecondary: 'rgba(255,255,255,0.80)',
            bgTertiary: 'rgba(240,240,235,0.6)',
            surface: 'rgba(255,255,255,0.72)',
            surfaceHover: 'rgba(255,255,255,0.85)',
            border: 'rgba(0,0,0,0.10)',
            borderHover: 'rgba(0,0,0,0.16)',
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
            bgSecondary: 'rgba(12,20,38,0.82)',
            bgTertiary: 'rgba(22,34,56,0.6)',
            surface: 'rgba(14,24,44,0.72)',
            surfaceHover: 'rgba(20,32,54,0.78)',
            border: 'rgba(100,180,255,0.12)',
            borderHover: 'rgba(100,180,255,0.20)',
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
            bgSecondary: 'rgba(16,16,20,0.82)',
            bgTertiary: 'rgba(28,28,34,0.6)',
            surface: 'rgba(18,18,24,0.72)',
            surfaceHover: 'rgba(24,24,30,0.78)',
            border: 'rgba(255,255,255,0.09)',
            borderHover: 'rgba(255,255,255,0.16)',
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
            bgSecondary: 'rgba(22,18,14,0.82)',
            bgTertiary: 'rgba(36,30,24,0.6)',
            surface: 'rgba(26,22,16,0.72)',
            surfaceHover: 'rgba(32,26,20,0.78)',
            border: 'rgba(255,200,150,0.10)',
            borderHover: 'rgba(255,200,150,0.18)',
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
            bgSecondary: 'rgba(22,14,20,0.82)',
            bgTertiary: 'rgba(36,24,32,0.6)',
            surface: 'rgba(26,16,24,0.72)',
            surfaceHover: 'rgba(32,22,30,0.78)',
            border: 'rgba(232,121,160,0.12)',
            borderHover: 'rgba(232,121,160,0.20)',
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
    root.style.setProperty('--color-bg', c.bg);
    root.style.setProperty('--color-bg-secondary', c.bgSecondary);
    root.style.setProperty('--color-bg-tertiary', c.bgTertiary);
    root.style.setProperty('--color-surface', c.surface);
    root.style.setProperty('--color-surface-hover', c.surfaceHover);
    root.style.setProperty('--color-border', c.border);
    root.style.setProperty('--color-border-hover', c.borderHover);
    root.style.setProperty('--color-text', c.text);
    root.style.setProperty('--color-text-secondary', c.textSecondary);
    root.style.setProperty('--color-text-muted', c.textMuted);
    root.style.setProperty('--color-accent', c.accent);
    root.style.setProperty('--color-accent-hover', c.accentHover);
    root.style.setProperty('--color-accent-muted', c.accentMuted);
    root.style.setProperty('--color-accent-text', c.accentText);
    root.style.setProperty('--color-danger', c.danger);
    root.style.setProperty('--color-danger-muted', c.dangerMuted);
    root.style.setProperty('--color-warning', c.warning);
    root.style.setProperty('--color-warning-muted', c.warningMuted);
    root.style.setProperty('--color-success', c.success);
    root.style.setProperty('--color-success-muted', c.successMuted);
    root.style.setProperty('--color-info', c.info);
    root.style.setProperty('--color-info-muted', c.infoMuted);
    
    // Set background on body
    document.body.style.backgroundColor = c.bg;
    document.body.style.color = c.text;
    
    // Set color-scheme for native inputs
    const isLight = theme.id === 'light';
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
}

// Apply theme on module load
applyThemeToDOM(loadSavedTheme());
