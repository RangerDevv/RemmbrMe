import type { BackendDriver } from './backend_types';

export interface IslamicPrayerSettings {
    enabled: boolean;
    city: string;
    country: string;
    method: number;
    school: 0 | 1;
    reminderMinutes: number;
}

export interface PrayerSyncResult {
    created: number;
    updated: number;
    deleted: number;
    skipped: boolean;
}

const SETTINGS_KEY = 'remmbrme_islamic_prayer_settings';
const PRAYER_SOURCE = 'islamic_prayer_times';
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export const DEFAULT_ISLAMIC_PRAYER_SETTINGS: IslamicPrayerSettings = {
    enabled: false,
    city: 'Mecca',
    country: 'Saudi Arabia',
    method: 4,
    school: 0,
    reminderMinutes: 30,
};

function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function getIslamicPrayerSettings(): IslamicPrayerSettings {
    const stored = safeParse<Partial<IslamicPrayerSettings>>(localStorage.getItem(SETTINGS_KEY), {});

    return {
        ...DEFAULT_ISLAMIC_PRAYER_SETTINGS,
        ...stored,
        city: (stored.city || DEFAULT_ISLAMIC_PRAYER_SETTINGS.city).trim(),
        country: (stored.country || DEFAULT_ISLAMIC_PRAYER_SETTINGS.country).trim(),
        method: Number.isFinite(Number(stored.method)) ? Number(stored.method) : DEFAULT_ISLAMIC_PRAYER_SETTINGS.method,
        school: Number(stored.school) === 1 ? 1 : 0,
        reminderMinutes: Math.max(5, Number(stored.reminderMinutes || DEFAULT_ISLAMIC_PRAYER_SETTINGS.reminderMinutes)),
    };
}

export function saveIslamicPrayerSettings(partial: Partial<IslamicPrayerSettings>) {
    const next = {
        ...getIslamicPrayerSettings(),
        ...partial,
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function dateKey(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toApiDate(date: Date): string {
    return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function toIsoAtLocalTime(date: Date, hhmm: string): string {
    const [hourStr, minuteStr] = hhmm.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Number.isFinite(hour) ? hour : 0,
        Number.isFinite(minute) ? minute : 0,
        0,
        0,
    ).toISOString();
}

function extractClockTime(input: string): string | null {
    const match = input.match(/(\d{1,2}:\d{2})/);
    if (!match) return null;
    const [hours, minutes] = match[1].split(':').map((v) => Number(v));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return `${pad2(hours)}:${pad2(minutes)}`;
}

interface AladhanResponse {
    data?: {
        timings?: Record<string, string>;
    };
}

async function fetchPrayerTimesForDate(date: Date, settings: IslamicPrayerSettings): Promise<Record<(typeof PRAYER_NAMES)[number], string>> {
    const endpoint = new URL(`https://api.aladhan.com/v1/timingsByCity/${toApiDate(date)}`);
    endpoint.searchParams.set('city', settings.city);
    endpoint.searchParams.set('country', settings.country);
    endpoint.searchParams.set('method', String(settings.method));
    endpoint.searchParams.set('school', String(settings.school));

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
        throw new Error(`Prayer times request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as AladhanResponse;
    const timings = payload.data?.timings || {};

    const result = {} as Record<(typeof PRAYER_NAMES)[number], string>;
    for (const prayer of PRAYER_NAMES) {
        const parsed = extractClockTime(timings[prayer] || '');
        if (!parsed) {
            throw new Error(`Missing ${prayer} prayer time from provider response.`);
        }
        result[prayer] = parsed;
    }

    return result;
}

export async function syncIslamicPrayerTimesForDate(
    backend: BackendDriver,
    userId: string,
    date: Date = new Date(),
): Promise<PrayerSyncResult> {
    const settings = getIslamicPrayerSettings();
    const result: PrayerSyncResult = { created: 0, updated: 0, deleted: 0, skipped: false };

    if (!settings.enabled || !settings.city || !settings.country) {
        result.skipped = true;
        return result;
    }

    const timings = await fetchPrayerTimesForDate(date, settings);
    const key = dateKey(date);

    const existing = await backend.collection('Calendar').getFullList({
        filter: `user = "${userId}" && ExternalSource = "${PRAYER_SOURCE}"`,
        sort: 'Start',
    });

    const existingForDay = existing.filter((event: any) =>
        String(event.ExternalEventId || '').startsWith(`${key}:`),
    );

    for (const prayer of PRAYER_NAMES) {
        const eventId = `${key}:${prayer}`;
        const startIso = toIsoAtLocalTime(date, timings[prayer]);
        const endIso = new Date(new Date(startIso).getTime() + settings.reminderMinutes * 60 * 1000).toISOString();
        const payload = {
            EventName: `${prayer} Prayer`,
            Description: `Auto-synced prayer time for ${settings.city}, ${settings.country}.`,
            AllDay: false,
            Start: startIso,
            End: endIso,
            Color: '#16a34a',
            Tasks: [],
            Tags: [],
            Recurrence: 'none' as const,
            user: userId,
            ExternalSource: PRAYER_SOURCE,
            ExternalEventId: eventId,
            ExternalCalendarId: 'aladhan',
            ExternalUpdatedAt: new Date().toISOString(),
        };

        const matched = existingForDay.find((event: any) => event.ExternalEventId === eventId);
        if (matched) {
            await backend.collection('Calendar').update(matched.id, payload);
            result.updated += 1;
        } else {
            await backend.collection('Calendar').create(payload);
            result.created += 1;
        }
    }

    const validEventIds = new Set(PRAYER_NAMES.map((prayer) => `${key}:${prayer}`));
    for (const stale of existingForDay) {
        const staleExternalId = String(stale.ExternalEventId || '');
        if (!validEventIds.has(staleExternalId)) {
            await backend.collection('Calendar').delete(stale.id);
            result.deleted += 1;
        }
    }

    return result;
}
