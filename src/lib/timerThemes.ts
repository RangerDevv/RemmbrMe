import { createSignal } from 'solid-js';

/**
 * visualStyle controls the entire rendering of the fullscreen timer:
 *   ring    – circular arc progress ring (classic)
 *   pie     – filled sector "pie-clock" (Time Timer style)
 *   gauge   – semicircular speedometer arc + needle
 *   bignum  – oversized countdown digits, no ring
 *   waves   – animated wave layers as background
 *   zen     – slow-breathing pulsing orb
 */
export type TimerVisualStyle = 'ring' | 'pie' | 'gauge' | 'bignum' | 'waves' | 'zen';

export interface TimerTheme {
    id: string;
    name: string;
    visualStyle: TimerVisualStyle;

    // ── Fullscreen backgrounds ──────────────────────────────
    background: string;           // CSS `background` for root fullscreen div
    ambientActive: string;        // radial-gradient glow color when running
    ambientDone: string;          // radial-gradient glow color when done

    // ── Arc / fill colors (ring, pie, gauge, mini widget) ──
    arcColor: string;
    arcColorDone: string;
    arcTrackColor: string;
    arcGlow: string;              // SVG filter string
    arcGlowDone: string;

    // ── Mini widget ─────────────────────────────────────────
    miniGlow: string;
    miniGlowDone: string;
    progressGradient: string;     // top progress bar gradient

    // ── Text colors ─────────────────────────────────────────
    centerTimeColor: string;
    labelColor: string;
    titleColor: string;

    // ── Panels ──────────────────────────────────────────────
    panelBg: string;              // "Up Next" side panel background
    accentLabel: string;          // "FOCUS" label + badge color

    // ── Theme picker ────────────────────────────────────────
    preview: string;              // swatch dot color

    // ── Visual-style-specific extras ────────────────────────

    /** ring: additional ghost rings drawn behind main arc */
    extraRings?: Array<{ radiusOffset: number; opacity: number; strokeWidth: number; animated?: boolean }>;

    /** ring: use a linearGradient stroke instead of solid arcColor */
    strokeGradient?: [string, string];

    /** gauge: needle color */
    needleColor?: string;

    /** waves: three wave layer fill colors */
    waveColors?: [string, string, string];

    /** bignum: which decorative overlay to render */
    decorativeElement?: 'stars' | 'scanlines' | 'none';

    /** bignum: typography overrides for the giant time digits */
    timeFont?: {
        fontFamily?: string;
        fontWeight?: string;
        letterSpacing?: string;
        textShadow?: string;
    };

    /** zen: orb gradient colors [inner, outer] */
    zenOrbColors?: [string, string];
}
// ─── Pre-computed star positions for Space theme ─────────────────
export const SPACE_STARS: Array<{ x: number; y: number; r: number; twinkle?: boolean }> = [
    { x: 3,  y: 5,  r: 1.0 }, { x: 11, y: 18, r: 0.7, twinkle: true },
    { x: 20, y: 8,  r: 1.3 }, { x: 33, y: 4,  r: 0.8 },
    { x: 42, y: 15, r: 1.1 }, { x: 55, y: 7,  r: 0.9, twinkle: true },
    { x: 67, y: 12, r: 1.4 }, { x: 76, y: 3,  r: 0.7 },
    { x: 88, y: 9,  r: 1.0, twinkle: true }, { x: 94, y: 20, r: 0.8 },
    { x: 6,  y: 30, r: 1.2 }, { x: 18, y: 38, r: 0.9 },
    { x: 29, y: 45, r: 0.7, twinkle: true }, { x: 44, y: 35, r: 1.1 },
    { x: 58, y: 42, r: 0.8 }, { x: 71, y: 28, r: 1.3, twinkle: true },
    { x: 82, y: 47, r: 0.9 }, { x: 93, y: 36, r: 1.0 },
    { x: 5,  y: 55, r: 0.8, twinkle: true }, { x: 15, y: 62, r: 1.2 },
    { x: 27, y: 70, r: 0.9 }, { x: 38, y: 58, r: 1.0 },
    { x: 51, y: 74, r: 0.7, twinkle: true }, { x: 63, y: 65, r: 1.1 },
    { x: 75, y: 73, r: 0.8 }, { x: 86, y: 60, r: 1.3 },
    { x: 97, y: 68, r: 0.9, twinkle: true }, { x: 10, y: 82, r: 1.0 },
    { x: 22, y: 88, r: 0.7 }, { x: 35, y: 92, r: 1.2, twinkle: true },
    { x: 49, y: 85, r: 0.9 }, { x: 60, y: 94, r: 0.8 },
    { x: 72, y: 87, r: 1.1 }, { x: 84, y: 91, r: 0.7, twinkle: true },
    { x: 96, y: 82, r: 1.0 },
];

// ─── Theme definitions ────────────────────────────────────────────
export const timerThemes: TimerTheme[] = [

    // ══════════════════════════════════════════════════════════
    // 1. AMOLED  ·  ring  ·  pixel-perfect black, zero glow
    // ══════════════════════════════════════════════════════════
    {
        id: 'amoled',
        name: 'AMOLED',
        visualStyle: 'ring',
        background: '#000000',
        ambientActive: 'transparent',
        ambientDone: 'transparent',
        arcColor: '#00d4ff',
        arcColorDone: '#00ff88',
        arcTrackColor: 'rgba(255,255,255,0.06)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'none',
        miniGlowDone: 'none',
        progressGradient: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
        centerTimeColor: '#ffffff',
        labelColor: 'rgba(255,255,255,0.22)',
        titleColor: '#ffffff',
        panelBg: 'rgba(0,0,0,0.88)',
        accentLabel: '#00d4ff',
        preview: '#00d4ff',
    },

    // ══════════════════════════════════════════════════════════
    // 2. NEON  ·  ring  ·  electric green, outer halo pulse
    // ══════════════════════════════════════════════════════════
    {
        id: 'neon',
        name: 'Neon',
        visualStyle: 'ring',
        background: '#050508',
        ambientActive: 'rgba(57,255,20,0.14)',
        ambientDone: 'rgba(0,238,255,0.12)',
        arcColor: '#39ff14',
        arcColorDone: '#00eeff',
        arcTrackColor: 'rgba(57,255,20,0.07)',
        arcGlow: 'drop-shadow(0 0 12px rgba(57,255,20,0.95)) drop-shadow(0 0 28px rgba(57,255,20,0.50))',
        arcGlowDone: 'drop-shadow(0 0 12px rgba(0,238,255,0.90)) drop-shadow(0 0 28px rgba(0,238,255,0.45))',
        miniGlow: 'drop-shadow(0 0 7px rgba(57,255,20,0.80))',
        miniGlowDone: 'drop-shadow(0 0 7px rgba(0,238,255,0.75))',
        progressGradient: 'linear-gradient(90deg, transparent, #39ff14, transparent)',
        centerTimeColor: '#39ff14',
        labelColor: 'rgba(57,255,20,0.40)',
        titleColor: '#c8ffc4',
        panelBg: 'rgba(0,8,0,0.82)',
        accentLabel: '#39ff14',
        preview: '#39ff14',
        extraRings: [
            { radiusOffset: 16, opacity: 0.12, strokeWidth: 28, animated: true },
        ],
    },

    // ══════════════════════════════════════════════════════════
    // 3. AURORA  ·  ring  ·  violet arc, layered ghost rings
    // ══════════════════════════════════════════════════════════
    {
        id: 'aurora',
        name: 'Aurora',
        visualStyle: 'ring',
        background: 'linear-gradient(160deg, #02080f 0%, #040518 50%, #060210 100%)',
        ambientActive: 'rgba(168,85,247,0.22)',
        ambientDone: 'rgba(52,211,153,0.18)',
        arcColor: '#a855f7',
        arcColorDone: '#34d399',
        arcTrackColor: 'rgba(168,85,247,0.08)',
        arcGlow: 'drop-shadow(0 0 14px rgba(168,85,247,0.80)) drop-shadow(0 0 32px rgba(56,189,248,0.25))',
        arcGlowDone: 'drop-shadow(0 0 14px rgba(52,211,153,0.75))',
        miniGlow: 'drop-shadow(0 0 6px rgba(168,85,247,0.65))',
        miniGlowDone: 'drop-shadow(0 0 6px rgba(52,211,153,0.55))',
        progressGradient: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
        centerTimeColor: '#f0e8ff',
        labelColor: 'rgba(200,160,255,0.42)',
        titleColor: '#e0d0ff',
        panelBg: 'rgba(4,3,16,0.80)',
        accentLabel: '#a855f7',
        preview: '#a855f7',
        extraRings: [
            { radiusOffset: -22, opacity: 0.14, strokeWidth: 2 },
            { radiusOffset:  22, opacity: 0.07, strokeWidth: 1 },
        ],
    },

    // ══════════════════════════════════════════════════════════
    // 4. SYNTHWAVE  ·  ring  ·  gradient stroke pink→cyan
    // ══════════════════════════════════════════════════════════
    {
        id: 'synthwave',
        name: 'Synthwave',
        visualStyle: 'ring',
        background: 'linear-gradient(175deg, #0a0015 0%, #08001f 40%, #0d0025 100%)',
        ambientActive: 'rgba(255,0,200,0.16)',
        ambientDone: 'rgba(0,212,255,0.14)',
        arcColor: '#ff00cc',
        arcColorDone: '#00d4ff',
        arcTrackColor: 'rgba(255,0,200,0.07)',
        arcGlow: 'drop-shadow(0 0 12px rgba(255,0,200,0.85)) drop-shadow(0 0 28px rgba(0,180,255,0.30))',
        arcGlowDone: 'drop-shadow(0 0 12px rgba(0,212,255,0.85))',
        miniGlow: 'drop-shadow(0 0 7px rgba(255,0,200,0.65))',
        miniGlowDone: 'drop-shadow(0 0 7px rgba(0,212,255,0.60))',
        progressGradient: 'linear-gradient(90deg, transparent, #ff00cc, #00d4ff, transparent)',
        centerTimeColor: '#ffe8ff',
        labelColor: 'rgba(255,150,255,0.40)',
        titleColor: '#ffccff',
        panelBg: 'rgba(8,0,20,0.82)',
        accentLabel: '#ff00cc',
        preview: '#ff00cc',
        strokeGradient: ['#ff00cc', '#00d4ff'],
    },

    // ══════════════════════════════════════════════════════════
    // 5. MINIMAL  ·  ring  ·  clean light background, zero glow
    // ══════════════════════════════════════════════════════════
    {
        id: 'minimal',
        name: 'Minimal',
        visualStyle: 'ring',
        background: '#f0f0ee',
        ambientActive: 'transparent',
        ambientDone: 'transparent',
        arcColor: '#1a1a1a',
        arcColorDone: '#2d8a5e',
        arcTrackColor: 'rgba(0,0,0,0.07)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'none',
        miniGlowDone: 'none',
        progressGradient: 'linear-gradient(90deg, transparent, #1a1a1a, transparent)',
        centerTimeColor: '#1a1a1a',
        labelColor: 'rgba(40,40,40,0.40)',
        titleColor: '#2a2a2a',
        panelBg: 'rgba(225,225,222,0.92)',
        accentLabel: '#666666',
        preview: '#1a1a1a',
    },

    // ══════════════════════════════════════════════════════════
    // 6. TIME PIE  ·  pie  ·  red filled wedge, clock-face style
    // ══════════════════════════════════════════════════════════
    {
        id: 'timepie',
        name: 'Time Pie',
        visualStyle: 'pie',
        background: '#0e0e0e',
        ambientActive: 'rgba(220,40,40,0.16)',
        ambientDone: 'rgba(255,215,0,0.14)',
        arcColor: '#e03030',
        arcColorDone: '#ffd700',
        arcTrackColor: 'rgba(255,255,255,0.06)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'drop-shadow(0 0 5px rgba(224,48,48,0.55))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(255,215,0,0.50))',
        progressGradient: 'linear-gradient(90deg, transparent, #e03030, transparent)',
        centerTimeColor: '#ffffff',
        labelColor: 'rgba(255,180,180,0.45)',
        titleColor: '#f0e0e0',
        panelBg: 'rgba(12,6,6,0.82)',
        accentLabel: '#e03030',
        preview: '#e03030',
    },

    // ══════════════════════════════════════════════════════════
    // 7. SPEEDOMETER  ·  gauge  ·  lime arc, amber needle
    // ══════════════════════════════════════════════════════════
    {
        id: 'speedometer',
        name: 'Speedo',
        visualStyle: 'gauge',
        background: '#060606',
        ambientActive: 'rgba(132,204,22,0.14)',
        ambientDone: 'rgba(255,215,0,0.12)',
        arcColor: '#84cc16',
        arcColorDone: '#22c55e',
        arcTrackColor: 'rgba(255,255,255,0.07)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'drop-shadow(0 0 5px rgba(132,204,22,0.55))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(34,197,94,0.50))',
        progressGradient: 'linear-gradient(90deg, transparent, #84cc16, transparent)',
        centerTimeColor: '#e8ffe0',
        labelColor: 'rgba(180,255,140,0.40)',
        titleColor: '#d8f8c8',
        panelBg: 'rgba(4,8,2,0.82)',
        accentLabel: '#84cc16',
        preview: '#84cc16',
        needleColor: '#fbbf24',
    },

    // ══════════════════════════════════════════════════════════
    // 8. SPACE  ·  bignum  ·  starfield, massive white digits
    // ══════════════════════════════════════════════════════════
    {
        id: 'space',
        name: 'Space',
        visualStyle: 'bignum',
        background: 'radial-gradient(ellipse at 40% 45%, #0d1120 0%, #060810 50%, #020408 100%)',
        ambientActive: 'rgba(96,165,250,0.12)',
        ambientDone: 'rgba(52,211,153,0.10)',
        arcColor: '#60a5fa',
        arcColorDone: '#34d399',
        arcTrackColor: 'rgba(96,165,250,0.08)',
        arcGlow: 'drop-shadow(0 0 8px rgba(96,165,250,0.55))',
        arcGlowDone: 'drop-shadow(0 0 8px rgba(52,211,153,0.50))',
        miniGlow: 'drop-shadow(0 0 5px rgba(96,165,250,0.50))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(52,211,153,0.45))',
        progressGradient: 'linear-gradient(90deg, transparent, #60a5fa, transparent)',
        centerTimeColor: '#ffffff',
        labelColor: 'rgba(180,210,255,0.38)',
        titleColor: '#c8d8f8',
        panelBg: 'rgba(4,6,14,0.82)',
        accentLabel: '#60a5fa',
        preview: '#60a5fa',
        decorativeElement: 'stars',
        timeFont: { fontWeight: '900', letterSpacing: '-0.05em' },
    },

    // ══════════════════════════════════════════════════════════
    // 9. TERMINAL  ·  bignum  ·  CRT amber, scanlines, monospace
    // ══════════════════════════════════════════════════════════
    {
        id: 'terminal',
        name: 'Terminal',
        visualStyle: 'bignum',
        background: '#000000',
        ambientActive: 'rgba(255,176,0,0.10)',
        ambientDone: 'rgba(255,176,0,0.08)',
        arcColor: '#ffb300',
        arcColorDone: '#ffb300',
        arcTrackColor: 'rgba(255,179,0,0.08)',
        arcGlow: 'drop-shadow(0 0 6px rgba(255,176,0,0.70))',
        arcGlowDone: 'drop-shadow(0 0 6px rgba(255,176,0,0.60))',
        miniGlow: 'drop-shadow(0 0 5px rgba(255,176,0,0.55))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(255,176,0,0.45))',
        progressGradient: 'linear-gradient(90deg, transparent, #ffb300, transparent)',
        centerTimeColor: '#ffb300',
        labelColor: 'rgba(255,176,0,0.35)',
        titleColor: '#ffe680',
        panelBg: 'rgba(8,6,0,0.88)',
        accentLabel: '#ffb300',
        preview: '#ffb300',
        decorativeElement: 'scanlines',
        timeFont: {
            fontFamily: "'Courier New', Courier, monospace",
            fontWeight: '700',
            letterSpacing: '0.08em',
            textShadow: '0 0 18px rgba(255,176,0,0.85), 0 0 36px rgba(255,176,0,0.40)',
        },
    },

    // ══════════════════════════════════════════════════════════
    // 10. FIRE  ·  bignum  ·  enormous glowing fire digits
    // ══════════════════════════════════════════════════════════
    {
        id: 'fire',
        name: 'Fire',
        visualStyle: 'bignum',
        background: 'radial-gradient(ellipse at 50% 85%, #1a0500 0%, #080200 55%, #000000 100%)',
        ambientActive: 'rgba(255,90,0,0.22)',
        ambientDone: 'rgba(255,220,0,0.18)',
        arcColor: '#ff4500',
        arcColorDone: '#ffd700',
        arcTrackColor: 'rgba(255,69,0,0.08)',
        arcGlow: 'drop-shadow(0 0 8px rgba(255,69,0,0.70))',
        arcGlowDone: 'drop-shadow(0 0 8px rgba(255,215,0,0.65))',
        miniGlow: 'drop-shadow(0 0 6px rgba(255,69,0,0.60))',
        miniGlowDone: 'drop-shadow(0 0 6px rgba(255,215,0,0.55))',
        progressGradient: 'linear-gradient(90deg, transparent, #ff4500, transparent)',
        centerTimeColor: '#fff0d0',
        labelColor: 'rgba(255,160,80,0.42)',
        titleColor: '#ffd0a0',
        panelBg: 'rgba(10,2,0,0.85)',
        accentLabel: '#ff6020',
        preview: '#ff4500',
        decorativeElement: 'none',
        timeFont: {
            fontWeight: '900',
            letterSpacing: '-0.04em',
            textShadow: '0 0 20px rgba(255,80,0,0.90), 0 0 50px rgba(255,50,0,0.55), 0 0 90px rgba(220,30,0,0.28)',
        },
    },

    // ══════════════════════════════════════════════════════════
    // 11. SUNSET WAVES  ·  waves  ·  warm amber, gentle ripple layers
    // ══════════════════════════════════════════════════════════
    {
        id: 'sunset',
        name: 'Sunset',
        visualStyle: 'waves',
        background: 'linear-gradient(180deg, #ff8c00 0%, #ffa726 45%, #ffb347 100%)',
        ambientActive: 'transparent',
        ambientDone: 'transparent',
        arcColor: '#c43a00',
        arcColorDone: '#ffe066',
        arcTrackColor: 'rgba(255,255,255,0.15)',
        arcGlow: 'none',
        arcGlowDone: 'none',
        miniGlow: 'drop-shadow(0 0 5px rgba(196,58,0,0.55))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(255,224,102,0.50))',
        progressGradient: 'linear-gradient(90deg, transparent, #c43a00, transparent)',
        centerTimeColor: '#ffffff',
        labelColor: 'rgba(255,255,255,0.55)',
        titleColor: '#ffffff',
        panelBg: 'rgba(160,60,0,0.50)',
        accentLabel: '#ffffff',
        preview: '#ff8c00',
        waveColors: ['rgba(160,50,0,0.45)', 'rgba(200,70,0,0.36)', 'rgba(240,110,20,0.28)'],
    },

    // ══════════════════════════════════════════════════════════
    // 12. ZEN  ·  zen  ·  midnight deep, slow-breathing indigo orb
    // ══════════════════════════════════════════════════════════
    {
        id: 'zen',
        name: 'Zen',
        visualStyle: 'zen',
        background: '#040810',
        ambientActive: 'rgba(99,102,241,0.16)',
        ambientDone: 'rgba(52,211,153,0.14)',
        arcColor: '#818cf8',
        arcColorDone: '#6ee7b7',
        arcTrackColor: 'rgba(129,140,248,0.08)',
        arcGlow: 'drop-shadow(0 0 6px rgba(129,140,248,0.55))',
        arcGlowDone: 'drop-shadow(0 0 6px rgba(110,231,183,0.50))',
        miniGlow: 'drop-shadow(0 0 5px rgba(129,140,248,0.50))',
        miniGlowDone: 'drop-shadow(0 0 5px rgba(110,231,183,0.45))',
        progressGradient: 'linear-gradient(90deg, transparent, #818cf8, transparent)',
        centerTimeColor: '#e8e8ff',
        labelColor: 'rgba(200,200,255,0.38)',
        titleColor: '#d8d8f8',
        panelBg: 'rgba(4,6,14,0.82)',
        accentLabel: '#818cf8',
        preview: '#818cf8',
        zenOrbColors: ['#312e81', '#1e1b4b'],
    },
];

// ─── Persistence ─────────────────────────────────────────────────
const STORAGE_KEY = 'timerThemeId';
const DEFAULT_THEME_ID = 'amoled';

function loadThemeId(): string {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && timerThemes.some(t => t.id === saved)) return saved;
    return DEFAULT_THEME_ID;
}

export const [currentTimerThemeId, setCurrentTimerThemeId] = createSignal<string>(loadThemeId());

export function getTimerTheme(): TimerTheme {
    return timerThemes.find(t => t.id === currentTimerThemeId()) ?? timerThemes[0];
}

export function setTimerTheme(id: string) {
    localStorage.setItem(STORAGE_KEY, id);
    setCurrentTimerThemeId(id);
}
