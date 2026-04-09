import { createSignal } from 'solid-js';

export interface TimerTheme {
    id: string;
    name: string;
    // Fullscreen background (CSS value for `background`)
    background: string;
    // Radial glow behind the ring
    ambientActive: string;
    ambientDone: string;
    // SVG ring
    arcColor: string;
    arcColorDone: string;
    arcTrackColor: string;
    arcGlow: string;
    arcGlowDone: string;
    // Mini widget ring glow
    miniGlow: string;
    miniGlowDone: string;
    // Text
    centerTimeColor: string;
    labelColor: string;
    titleColor: string;
    // Panel background (right "Up Next" panel)
    panelBg: string;
    // Accent for "Focus" label and now-badge
    accentLabel: string;
    // Fullscreen overlay backdrop color
    overlayBg: string;
    // Optional extra CSS class on the root fullscreen div (for special effects)
    rootClass?: string;
    // Progress bar gradient in mini widget
    progressGradient: string;
    // Palette dots shown in the theme picker
    preview: string;
}

export const timerThemes: TimerTheme[] = [
    // ─────────────────────────────────────────
    // 1. AMOLED — pure black, razor-sharp, zero glow
    // ─────────────────────────────────────────
    {
        id: 'amoled',
        name: 'AMOLED',
        background: '#000000',
        ambientActive: 'rgba(0,0,0,0)',
        ambientDone: 'rgba(0,0,0,0)',
        arcColor: '#00d4ff',
        arcColorDone: '#00ff88',
        arcTrackColor: 'rgba(255,255,255,0.06)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'none',
        miniGlowDone: 'none',
        centerTimeColor: '#ffffff',
        labelColor: 'rgba(255,255,255,0.28)',
        titleColor: '#ffffff',
        panelBg: 'rgba(0,0,0,0.85)',
        accentLabel: '#00d4ff',
        overlayBg: 'rgba(0,0,0,0.98)',
        progressGradient: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
        preview: '#00d4ff',
    },

    // ─────────────────────────────────────────
    // 2. Bold — vivid solid dark, neon pink punch
    // ─────────────────────────────────────────
    {
        id: 'bold',
        name: 'Bold',
        background: '#0a0012',
        ambientActive: 'rgba(255,0,120,0.22)',
        ambientDone: 'rgba(0,255,120,0.18)',
        arcColor: '#ff2d78',
        arcColorDone: '#00ff88',
        arcTrackColor: 'rgba(255,45,120,0.12)',
        arcGlow: 'drop-shadow(0 0 24px rgba(255,45,120,0.85))',
        arcGlowDone: 'drop-shadow(0 0 24px rgba(0,255,136,0.75))',
        miniGlow: 'drop-shadow(0 0 8px rgba(255,45,120,0.6))',
        miniGlowDone: 'drop-shadow(0 0 8px rgba(0,255,136,0.5))',
        centerTimeColor: '#ffffff',
        labelColor: 'rgba(255,180,210,0.55)',
        titleColor: '#ffffff',
        panelBg: 'rgba(10,0,20,0.7)',
        accentLabel: '#ff2d78',
        overlayBg: 'rgba(10,0,18,0.96)',
        progressGradient: 'linear-gradient(90deg, transparent, #ff2d78, transparent)',
        preview: '#ff2d78',
    },

    // ─────────────────────────────────────────
    // 3. Neon — electric green on near-black
    // ─────────────────────────────────────────
    {
        id: 'neon',
        name: 'Neon',
        background: '#050505',
        ambientActive: 'rgba(57,255,20,0.15)',
        ambientDone: 'rgba(0,200,255,0.15)',
        arcColor: '#39ff14',
        arcColorDone: '#00eeff',
        arcTrackColor: 'rgba(57,255,20,0.08)',
        arcGlow: 'drop-shadow(0 0 20px rgba(57,255,20,0.90)) drop-shadow(0 0 40px rgba(57,255,20,0.45))',
        arcGlowDone: 'drop-shadow(0 0 20px rgba(0,238,255,0.85))',
        miniGlow: 'drop-shadow(0 0 8px rgba(57,255,20,0.7))',
        miniGlowDone: 'drop-shadow(0 0 8px rgba(0,238,255,0.6))',
        centerTimeColor: '#39ff14',
        labelColor: 'rgba(57,255,20,0.45)',
        titleColor: '#c8ffc0',
        panelBg: 'rgba(0,8,0,0.80)',
        accentLabel: '#39ff14',
        overlayBg: 'rgba(2,5,2,0.97)',
        progressGradient: 'linear-gradient(90deg, transparent, #39ff14, transparent)',
        preview: '#39ff14',
    },

    // ─────────────────────────────────────────
    // 4. Sunset — warm gradient dusk, orange arc
    // ─────────────────────────────────────────
    {
        id: 'sunset',
        name: 'Sunset',
        background: 'linear-gradient(160deg, #0f0410 0%, #1a0515 30%, #200a04 65%, #0c0306 100%)',
        ambientActive: 'rgba(255,100,20,0.22)',
        ambientDone: 'rgba(255,200,80,0.18)',
        arcColor: '#ff6b35',
        arcColorDone: '#ffd700',
        arcTrackColor: 'rgba(255,107,53,0.10)',
        arcGlow: 'drop-shadow(0 0 18px rgba(255,107,53,0.80))',
        arcGlowDone: 'drop-shadow(0 0 18px rgba(255,215,0,0.70))',
        miniGlow: 'drop-shadow(0 0 7px rgba(255,107,53,0.60))',
        miniGlowDone: 'drop-shadow(0 0 7px rgba(255,215,0,0.55))',
        centerTimeColor: '#fff0e6',
        labelColor: 'rgba(255,190,140,0.50)',
        titleColor: '#ffe4cc',
        panelBg: 'rgba(15,3,6,0.75)',
        accentLabel: '#ff8c42',
        overlayBg: 'rgba(12,3,6,0.96)',
        progressGradient: 'linear-gradient(90deg, transparent, #ff6b35, transparent)',
        preview: '#ff6b35',
    },

    // ─────────────────────────────────────────
    // 5. Aurora — dark teal cosmos, shifting purples
    // ─────────────────────────────────────────
    {
        id: 'aurora',
        name: 'Aurora',
        background: 'linear-gradient(135deg, #020d10 0%, #040818 50%, #080314 100%)',
        ambientActive: 'rgba(163,92,255,0.20)',
        ambientDone: 'rgba(52,211,153,0.18)',
        arcColor: '#a855f7',
        arcColorDone: '#34d399',
        arcTrackColor: 'rgba(168,85,247,0.10)',
        arcGlow: 'drop-shadow(0 0 16px rgba(168,85,247,0.75)) drop-shadow(0 0 32px rgba(56,189,248,0.30))',
        arcGlowDone: 'drop-shadow(0 0 16px rgba(52,211,153,0.70))',
        miniGlow: 'drop-shadow(0 0 6px rgba(168,85,247,0.60))',
        miniGlowDone: 'drop-shadow(0 0 6px rgba(52,211,153,0.55))',
        centerTimeColor: '#f0e8ff',
        labelColor: 'rgba(200,160,255,0.45)',
        titleColor: '#e8d8ff',
        panelBg: 'rgba(4,6,16,0.78)',
        accentLabel: '#a855f7',
        overlayBg: 'rgba(2,5,12,0.96)',
        progressGradient: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
        preview: '#a855f7',
    },

    // ─────────────────────────────────────────
    // 6. Retro — amber CRT terminal on ink black
    // ─────────────────────────────────────────
    {
        id: 'retro',
        name: 'Retro',
        background: '#0a0800',
        ambientActive: 'rgba(255,176,0,0.15)',
        ambientDone: 'rgba(255,176,0,0.10)',
        arcColor: '#ffb300',
        arcColorDone: '#ffb300',
        arcTrackColor: 'rgba(255,179,0,0.10)',
        arcGlow: 'drop-shadow(0 0 10px rgba(255,176,0,0.70)) drop-shadow(0 0 2px rgba(255,220,100,0.50))',
        arcGlowDone: 'drop-shadow(0 0 10px rgba(255,176,0,0.60))',
        miniGlow: 'drop-shadow(0 0 5px rgba(255,176,0,0.55))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(255,176,0,0.45))',
        centerTimeColor: '#ffcc44',
        labelColor: 'rgba(255,180,0,0.40)',
        titleColor: '#ffe680',
        panelBg: 'rgba(10,8,0,0.82)',
        accentLabel: '#ffb300',
        overlayBg: 'rgba(8,6,0,0.97)',
        rootClass: 'timer-retro-scanlines',
        progressGradient: 'linear-gradient(90deg, transparent, #ffb300, transparent)',
        preview: '#ffb300',
    },

    // ─────────────────────────────────────────
    // 7. Galaxy — deep space purple nebula
    // ─────────────────────────────────────────
    {
        id: 'galaxy',
        name: 'Galaxy',
        background: 'radial-gradient(ellipse at 30% 40%, #0d0420 0%, #04030f 50%, #00021a 100%)',
        ambientActive: 'rgba(192,132,252,0.20)',
        ambientDone: 'rgba(96,165,250,0.18)',
        arcColor: '#c084fc',
        arcColorDone: '#60a5fa',
        arcTrackColor: 'rgba(192,132,252,0.08)',
        arcGlow: 'drop-shadow(0 0 16px rgba(192,132,252,0.75)) drop-shadow(0 0 36px rgba(99,102,241,0.30))',
        arcGlowDone: 'drop-shadow(0 0 16px rgba(96,165,250,0.65))',
        miniGlow: 'drop-shadow(0 0 7px rgba(192,132,252,0.60))',
        miniGlowDone: 'drop-shadow(0 0 7px rgba(96,165,250,0.50))',
        centerTimeColor: '#f0e8ff',
        labelColor: 'rgba(200,160,255,0.40)',
        titleColor: '#e0d0ff',
        panelBg: 'rgba(4,2,15,0.80)',
        accentLabel: '#c084fc',
        overlayBg: 'rgba(2,2,12,0.96)',
        progressGradient: 'linear-gradient(90deg, transparent, #c084fc, transparent)',
        preview: '#c084fc',
    },

    // ─────────────────────────────────────────
    // 8. Fire — ember dark, molten orange-red arc
    // ─────────────────────────────────────────
    {
        id: 'fire',
        name: 'Fire',
        background: 'radial-gradient(ellipse at 50% 80%, #1a0500 0%, #080200 60%, #000000 100%)',
        ambientActive: 'rgba(255,80,0,0.25)',
        ambientDone: 'rgba(255,200,0,0.18)',
        arcColor: '#ff4500',
        arcColorDone: '#ffd700',
        arcTrackColor: 'rgba(255,69,0,0.10)',
        arcGlow: 'drop-shadow(0 0 18px rgba(255,69,0,0.85)) drop-shadow(0 0 40px rgba(255,100,0,0.35))',
        arcGlowDone: 'drop-shadow(0 0 18px rgba(255,215,0,0.75))',
        miniGlow: 'drop-shadow(0 0 7px rgba(255,69,0,0.65))',
        miniGlowDone: 'drop-shadow(0 0 7px rgba(255,215,0,0.55))',
        centerTimeColor: '#ffe8d6',
        labelColor: 'rgba(255,170,100,0.45)',
        titleColor: '#ffd0a0',
        panelBg: 'rgba(10,2,0,0.82)',
        accentLabel: '#ff6020',
        overlayBg: 'rgba(6,1,0,0.97)',
        progressGradient: 'linear-gradient(90deg, transparent, #ff4500, transparent)',
        preview: '#ff4500',
    },

    // ─────────────────────────────────────────
    // 9. Ice — arctic cold dark, frost blue-white
    // ─────────────────────────────────────────
    {
        id: 'ice',
        name: 'Ice',
        background: 'linear-gradient(160deg, #000d1a 0%, #010914 50%, #000811 100%)',
        ambientActive: 'rgba(168,230,255,0.16)',
        ambientDone: 'rgba(200,240,255,0.14)',
        arcColor: '#a8e6ff',
        arcColorDone: '#ffffff',
        arcTrackColor: 'rgba(168,230,255,0.08)',
        arcGlow: 'drop-shadow(0 0 14px rgba(168,230,255,0.70)) drop-shadow(0 0 28px rgba(100,200,255,0.30))',
        arcGlowDone: 'drop-shadow(0 0 14px rgba(255,255,255,0.60))',
        miniGlow: 'drop-shadow(0 0 6px rgba(168,230,255,0.55))',
        miniGlowDone: 'drop-shadow(0 0 6px rgba(255,255,255,0.45))',
        centerTimeColor: '#e8f8ff',
        labelColor: 'rgba(168,230,255,0.42)',
        titleColor: '#c8ecff',
        panelBg: 'rgba(0,8,18,0.80)',
        accentLabel: '#70ccf0',
        overlayBg: 'rgba(0,5,12,0.97)',
        progressGradient: 'linear-gradient(90deg, transparent, #a8e6ff, transparent)',
        preview: '#a8e6ff',
    },

    // ─────────────────────────────────────────
    // 10. Rose Gold — deep dark warm, rose metallic
    // ─────────────────────────────────────────
    {
        id: 'rosegold',
        name: 'Rose Gold',
        background: 'linear-gradient(140deg, #0e0508 0%, #120408 50%, #0a0305 100%)',
        ambientActive: 'rgba(255,121,198,0.18)',
        ambientDone: 'rgba(255,200,150,0.15)',
        arcColor: '#ff79c6',
        arcColorDone: '#ffd4a0',
        arcTrackColor: 'rgba(255,121,198,0.08)',
        arcGlow: 'drop-shadow(0 0 14px rgba(255,121,198,0.72)) drop-shadow(0 0 28px rgba(255,160,180,0.30))',
        arcGlowDone: 'drop-shadow(0 0 14px rgba(255,212,160,0.65))',
        miniGlow: 'drop-shadow(0 0 6px rgba(255,121,198,0.55))',
        miniGlowDone: 'drop-shadow(0 0 6px rgba(255,200,150,0.48))',
        centerTimeColor: '#ffe8f4',
        labelColor: 'rgba(255,180,210,0.45)',
        titleColor: '#ffd4e8',
        panelBg: 'rgba(14,4,10,0.78)',
        accentLabel: '#ff79c6',
        overlayBg: 'rgba(10,2,6,0.97)',
        progressGradient: 'linear-gradient(90deg, transparent, #ff79c6, transparent)',
        preview: '#ff79c6',
    },

    // ─────────────────────────────────────────
    // 11. Forest — deep emerald nature
    // ─────────────────────────────────────────
    {
        id: 'forest',
        name: 'Forest',
        background: 'linear-gradient(160deg, #020a03 0%, #030d04 50%, #010801 100%)',
        ambientActive: 'rgba(74,222,128,0.18)',
        ambientDone: 'rgba(134,239,172,0.15)',
        arcColor: '#4ade80',
        arcColorDone: '#86efac',
        arcTrackColor: 'rgba(74,222,128,0.08)',
        arcGlow: 'drop-shadow(0 0 14px rgba(74,222,128,0.70))',
        arcGlowDone: 'drop-shadow(0 0 14px rgba(134,239,172,0.60))',
        miniGlow: 'drop-shadow(0 0 6px rgba(74,222,128,0.55))',
        miniGlowDone: 'drop-shadow(0 0 6px rgba(134,239,172,0.45))',
        centerTimeColor: '#d0fce0',
        labelColor: 'rgba(134,220,152,0.44)',
        titleColor: '#c0f0d0',
        panelBg: 'rgba(2,8,2,0.80)',
        accentLabel: '#4ade80',
        overlayBg: 'rgba(1,5,1,0.97)',
        progressGradient: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
        preview: '#4ade80',
    },

    // ─────────────────────────────────────────
    // 12. Minimal — soft light, clean no-glow
    // ─────────────────────────────────────────
    {
        id: 'minimal',
        name: 'Minimal',
        background: '#f2f2f0',
        ambientActive: 'rgba(0,0,0,0)',
        ambientDone: 'rgba(0,0,0,0)',
        arcColor: '#1a1a1a',
        arcColorDone: '#2d8a5e',
        arcTrackColor: 'rgba(0,0,0,0.08)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'none',
        miniGlowDone: 'none',
        centerTimeColor: '#1a1a1a',
        labelColor: 'rgba(60,60,60,0.45)',
        titleColor: '#2a2a2a',
        panelBg: 'rgba(235,235,232,0.85)',
        accentLabel: '#555555',
        overlayBg: 'rgba(242,242,240,0.97)',
        progressGradient: 'linear-gradient(90deg, transparent, #1a1a1a, transparent)',
        preview: '#1a1a1a',
    },
];

const STORAGE_KEY = 'timerThemeId';
const DEFAULT_THEME_ID = 'amoled';

function loadThemeId(): string {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
}

export const [currentTimerThemeId, setCurrentTimerThemeId] = createSignal<string>(loadThemeId());

export function getTimerTheme(): TimerTheme {
    return timerThemes.find(t => t.id === currentTimerThemeId()) ?? timerThemes[0];
}

export function setTimerTheme(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentTimerThemeId(id);
}
