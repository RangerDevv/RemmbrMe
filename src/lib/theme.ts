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
        name: 'Notion Dark',
        id: 'midnight',
        colors: {
            bg: '#191919',
            bgSecondary: '#202020',
            bgTertiary: '#2f2f2f',
            surface: '#252525',
            surfaceHover: '#2f2f2f',
            border: '#333333',
            borderHover: '#454545',
            text: '#e3e3e1',
            textSecondary: '#9b9a97',
            textMuted: '#6b6b6b',
            accent: '#2eaadc',
            accentHover: '#2496c7',
            accentMuted: '#2eaadc18',
            accentText: '#ffffff',
            danger: '#e03e3e',
            dangerMuted: '#e03e3e18',
            warning: '#dfab01',
            warningMuted: '#dfab0118',
            success: '#0f7b6c',
            successMuted: '#0f7b6c18',
            info: '#529cca',
            infoMuted: '#529cca18',
        }
    },
    {
        name: 'Light',
        id: 'light',
        colors: {
            bg: '#ffffff',
            bgSecondary: '#f7f7f5',
            bgTertiary: '#f0f0ee',
            surface: '#ffffff',
            surfaceHover: '#f7f7f5',
            border: '#e8e8e4',
            borderHover: '#d4d4d0',
            text: '#37352f',
            textSecondary: '#6b6b6b',
            textMuted: '#9b9a97',
            accent: '#2eaadc',
            accentHover: '#2496c7',
            accentMuted: '#2eaadc12',
            accentText: '#ffffff',
            danger: '#e03e3e',
            dangerMuted: '#e03e3e12',
            warning: '#dfab01',
            warningMuted: '#dfab0112',
            success: '#0f7b6c',
            successMuted: '#0f7b6c12',
            info: '#529cca',
            infoMuted: '#529cca12',
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
            accentMuted: '#06b6d418',
            accentText: '#ffffff',
            danger: '#f43f5e',
            dangerMuted: '#f43f5e18',
            warning: '#fb923c',
            warningMuted: '#fb923c18',
            success: '#34d399',
            successMuted: '#34d39918',
            info: '#60a5fa',
            infoMuted: '#60a5fa18',
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
            accentMuted: '#8b5cf618',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444418',
            warning: '#eab308',
            warningMuted: '#eab30818',
            success: '#22c55e',
            successMuted: '#22c55e18',
            info: '#3b82f6',
            infoMuted: '#3b82f618',
        }
    },
    {
        name: 'Warm Dark',
        id: 'emerald',
        colors: {
            bg: '#1c1917',
            bgSecondary: '#231f1d',
            bgTertiary: '#2c2826',
            surface: '#272321',
            surfaceHover: '#302c2a',
            border: '#3b3634',
            borderHover: '#4a4543',
            text: '#e7e5e4',
            textSecondary: '#a8a29e',
            textMuted: '#6b6560',
            accent: '#d97706',
            accentHover: '#b45309',
            accentMuted: '#d9770618',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444418',
            warning: '#f59e0b',
            warningMuted: '#f59e0b18',
            success: '#22c55e',
            successMuted: '#22c55e18',
            info: '#3b82f6',
            infoMuted: '#3b82f618',
        }
    },
    {
        name: 'Rose',
        id: 'rose',
        colors: {
            bg: '#1a1118',
            bgSecondary: '#211820',
            bgTertiary: '#2c2129',
            surface: '#261c23',
            surfaceHover: '#2f242c',
            border: '#3d3039',
            borderHover: '#50404a',
            text: '#f0e8ec',
            textSecondary: '#aa8a98',
            textMuted: '#755668',
            accent: '#e879a0',
            accentHover: '#d4608a',
            accentMuted: '#e879a018',
            accentText: '#ffffff',
            danger: '#ef4444',
            dangerMuted: '#ef444418',
            warning: '#f59e0b',
            warningMuted: '#f59e0b18',
            success: '#22c55e',
            successMuted: '#22c55e18',
            info: '#3b82f6',
            infoMuted: '#3b82f618',
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
