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
        name: 'Midnight',
        id: 'midnight',
        colors: {
            bg: '#0a0a0f',
            bgSecondary: '#12121a',
            bgTertiary: '#1a1a25',
            surface: '#16161f',
            surfaceHover: '#1e1e2a',
            border: '#2a2a3a',
            borderHover: '#3a3a4f',
            text: '#e4e4ed',
            textSecondary: '#9a9ab0',
            textMuted: '#5a5a72',
            accent: '#14b8a6',
            accentHover: '#0d9488',
            accentMuted: '#14b8a620',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444420',
            warning: '#f59e0b',
            warningMuted: '#f59e0b20',
            success: '#22c55e',
            successMuted: '#22c55e20',
            info: '#3b82f6',
            infoMuted: '#3b82f620',
        }
    },
    {
        name: 'Deep Ocean',
        id: 'ocean',
        colors: {
            bg: '#0b1120',
            bgSecondary: '#0f172a',
            bgTertiary: '#1e293b',
            surface: '#131c2e',
            surfaceHover: '#1c2940',
            border: '#1e3a5f',
            borderHover: '#2a4a72',
            text: '#e2e8f0',
            textSecondary: '#94a3b8',
            textMuted: '#475569',
            accent: '#06b6d4',
            accentHover: '#0891b2',
            accentMuted: '#06b6d420',
            accentText: '#ffffff',
            danger: '#f43f5e',
            dangerMuted: '#f43f5e20',
            warning: '#fb923c',
            warningMuted: '#fb923c20',
            success: '#34d399',
            successMuted: '#34d39920',
            info: '#60a5fa',
            infoMuted: '#60a5fa20',
        }
    },
    {
        name: 'Slate',
        id: 'slate',
        colors: {
            bg: '#0f0f0f',
            bgSecondary: '#171717',
            bgTertiary: '#212121',
            surface: '#1a1a1a',
            surfaceHover: '#242424',
            border: '#2e2e2e',
            borderHover: '#404040',
            text: '#fafafa',
            textSecondary: '#a3a3a3',
            textMuted: '#636363',
            accent: '#8b5cf6',
            accentHover: '#7c3aed',
            accentMuted: '#8b5cf620',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444420',
            warning: '#eab308',
            warningMuted: '#eab30820',
            success: '#22c55e',
            successMuted: '#22c55e20',
            info: '#3b82f6',
            infoMuted: '#3b82f620',
        }
    },
    {
        name: 'Emerald Dark',
        id: 'emerald',
        colors: {
            bg: '#0a0f0d',
            bgSecondary: '#111916',
            bgTertiary: '#1a241f',
            surface: '#141e19',
            surfaceHover: '#1c2b24',
            border: '#253830',
            borderHover: '#34503f',
            text: '#e8f0ec',
            textSecondary: '#8aaa98',
            textMuted: '#567568',
            accent: '#10b981',
            accentHover: '#059669',
            accentMuted: '#10b98120',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444420',
            warning: '#f59e0b',
            warningMuted: '#f59e0b20',
            success: '#22c55e',
            successMuted: '#22c55e20',
            info: '#3b82f6',
            infoMuted: '#3b82f620',
        }
    },
    {
        name: 'Rose',
        id: 'rose',
        colors: {
            bg: '#0f0a0c',
            bgSecondary: '#1a1215',
            bgTertiary: '#251a1f',
            surface: '#1e1418',
            surfaceHover: '#2b1c22',
            border: '#3a252e',
            borderHover: '#503440',
            text: '#f0e8ec',
            textSecondary: '#aa8a98',
            textMuted: '#755668',
            accent: '#f43f5e',
            accentHover: '#e11d48',
            accentMuted: '#f43f5e20',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444420',
            warning: '#f59e0b',
            warningMuted: '#f59e0b20',
            success: '#22c55e',
            successMuted: '#22c55e20',
            info: '#3b82f6',
            infoMuted: '#3b82f620',
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
}

// Apply theme on module load
applyThemeToDOM(loadSavedTheme());
