import { bk, currentUser } from './backend.ts';

type SyncStatusLevel = 'info' | 'success' | 'error';

export interface GoogleSyncSettings {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    calendarId: string;
    syncIntervalMinutes: number;
}

interface GoogleTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    scope?: string;
    tokenType?: string;
}

interface GoogleEventDateTime {
    date?: string;
    dateTime?: string;
    timeZone?: string;
}

interface GoogleEvent {
    id: string;
    status?: 'confirmed' | 'tentative' | 'cancelled';
    summary?: string;
    description?: string;
    start?: GoogleEventDateTime;
    end?: GoogleEventDateTime;
    updated?: string;
    etag?: string;
    colorId?: string;
    recurrence?: string[];
    extendedProperties?: {
        private?: Record<string, string>;
    };
}

interface GoogleListEventsResponse {
    items?: GoogleEvent[];
    nextPageToken?: string;
}

interface LocalCalendarEvent {
    id: string;
    user: string;
    EventName: string;
    Description: string;
    AllDay: boolean;
    Start: string;
    End: string;
    Color: string;
    Recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    RecurrencePattern?: { days: number[] };
    RecurrenceEndDate?: string;
    RecurrenceExceptions?: unknown[];
    Tasks?: string[];
    Tags?: string[];
    ParentEventId?: string;
    ExternalSource?: string;
    ExternalEventId?: string;
    ExternalCalendarId?: string;
    ExternalEtag?: string;
    ExternalUpdatedAt?: string;
    LastGoogleSyncedAt?: string;
    created: string;
    updated: string;
}

interface SyncIdMap {
    localToGoogle: Record<string, string>;
    googleToLocal: Record<string, string>;
}

const SETTINGS_KEY = 'remmbrme_google_sync_settings';
const TOKENS_KEY = 'remmbrme_google_sync_tokens';
const MAP_KEY = 'remmbrme_google_sync_id_map';
const LAST_SYNC_AT_KEY = 'remmbrme_google_sync_last_sync_at';
const OAUTH_PENDING_KEY = 'remmbrme_google_oauth_pending';
const OAUTH_RESULT_KEY = 'remmbrme_google_oauth_result';

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
].join(' ');

const GOOGLE_COLORS: Record<string, string> = {
    '1': '#7986cb',
    '2': '#33b679',
    '3': '#8e24aa',
    '4': '#e67c73',
    '5': '#f6c026',
    '6': '#f5511d',
    '7': '#039be5',
    '8': '#616161',
    '9': '#3f51b5',
    '10': '#0b8043',
    '11': '#d60000',
};

let autoSyncTimer: number | null = null;
let autoSyncChangeListener: ((event: Event) => void) | null = null;
let pendingChangeSyncTimer: number | null = null;
let syncInFlight: Promise<void> | null = null;
const statusListeners = new Set<(message: string, level: SyncStatusLevel) => void>();

function emitStatus(message: string, level: SyncStatusLevel = 'info') {
    statusListeners.forEach((listener) => listener(message, level));
}

function nowIso(): string {
    return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function buildDefaultSettings(): GoogleSyncSettings {
    const defaultRedirect = typeof window !== 'undefined'
        ? `${window.location.origin}/google-oauth-callback.html`
        : '';

    return {
        enabled: false,
        clientId: '',
        clientSecret: '',
        redirectUri: defaultRedirect,
        calendarId: 'primary',
        syncIntervalMinutes: 5,
    };
}

export function getGoogleSyncSettings(): GoogleSyncSettings {
    const base = buildDefaultSettings();
    const stored = safeJsonParse<Partial<GoogleSyncSettings>>(localStorage.getItem(SETTINGS_KEY), {});

    return {
        ...base,
        ...stored,
        syncIntervalMinutes: Math.max(1, Number(stored.syncIntervalMinutes ?? base.syncIntervalMinutes)),
    };
}

export function saveGoogleSyncSettings(partial: Partial<GoogleSyncSettings>) {
    const next = {
        ...getGoogleSyncSettings(),
        ...partial,
    };
    next.syncIntervalMinutes = Math.max(1, Number(next.syncIntervalMinutes || 5));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

function getTokens(): GoogleTokens | null {
    return safeJsonParse<GoogleTokens | null>(localStorage.getItem(TOKENS_KEY), null);
}

function setTokens(tokens: GoogleTokens | null) {
    if (!tokens) {
        localStorage.removeItem(TOKENS_KEY);
        return;
    }
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

function getIdMap(): SyncIdMap {
    return safeJsonParse<SyncIdMap>(localStorage.getItem(MAP_KEY), {
        localToGoogle: {},
        googleToLocal: {},
    });
}

function setIdMap(map: SyncIdMap) {
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
}

function clearGoogleStorage() {
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(MAP_KEY);
    localStorage.removeItem(LAST_SYNC_AT_KEY);
    localStorage.removeItem(OAUTH_PENDING_KEY);
    localStorage.removeItem(OAUTH_RESULT_KEY);
}

export function isGoogleConnected(): boolean {
    const tokens = getTokens();
    return !!tokens?.accessToken;
}

export function getGoogleLastSyncAt(): string | null {
    return localStorage.getItem(LAST_SYNC_AT_KEY);
}

interface OAuthPendingState {
    verifier: string;
    state: string;
    createdAt: number;
}

interface OAuthResultState {
    code?: string;
    state?: string;
    error?: string;
}

export function onGoogleSyncStatus(listener: (message: string, level: SyncStatusLevel) => void): () => void {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
}

function base64UrlEncode(bytes: Uint8Array): string {
    let str = '';
    bytes.forEach((byte) => {
        str += String.fromCharCode(byte);
    });
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(length = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += chars[bytes[i] % chars.length];
    }
    return out;
}

async function sha256(input: string): Promise<Uint8Array> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(digest);
}

function eventToDateValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseGoogleDateTime(source?: GoogleEventDateTime): string {
    if (!source) return new Date().toISOString();
    if (source.dateTime) return new Date(source.dateTime).toISOString();
    if (source.date) return new Date(`${source.date}T00:00:00`).toISOString();
    return new Date().toISOString();
}

function toGoogleDateTime(event: LocalCalendarEvent): { start: GoogleEventDateTime; end: GoogleEventDateTime } {
    if (event.AllDay) {
        const startDate = new Date(event.Start);
        const endDate = new Date(event.End);
        const endPlusOne = new Date(endDate);
        endPlusOne.setDate(endPlusOne.getDate() + 1);

        return {
            start: { date: eventToDateValue(startDate) },
            end: { date: eventToDateValue(endPlusOne) },
        };
    }

    return {
        start: { dateTime: new Date(event.Start).toISOString() },
        end: { dateTime: new Date(event.End).toISOString() },
    };
}

function normalizeColor(hex: string | undefined): string {
    if (!hex) return '#3b82f6';
    const trimmed = hex.trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : '#3b82f6';
}

function colorDistance(a: string, b: string): number {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function mapHexToGoogleColorId(hex: string): string {
    const color = normalizeColor(hex);
    let best = '7';
    let bestDistance = Number.POSITIVE_INFINITY;

    Object.entries(GOOGLE_COLORS).forEach(([colorId, paletteHex]) => {
        const distance = colorDistance(color, paletteHex);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = colorId;
        }
    });

    return best;
}

function mapGoogleToHex(event: GoogleEvent): string {
    const fromExt = event.extendedProperties?.private?.remmbrColor;
    if (fromExt && /^#[0-9a-fA-F]{6}$/.test(fromExt)) {
        return fromExt.toLowerCase();
    }

    if (event.colorId && GOOGLE_COLORS[event.colorId]) {
        return GOOGLE_COLORS[event.colorId];
    }

    return '#3b82f6';
}

function localRecurrenceToGoogle(localEvent: LocalCalendarEvent): string[] | undefined {
    switch (localEvent.Recurrence) {
        case 'daily':
            return ['RRULE:FREQ=DAILY'];
        case 'weekly': {
            const byDay = (localEvent.RecurrencePattern?.days || [])
                .map((day) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][day])
                .filter(Boolean)
                .join(',');
            if (byDay) {
                return [`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`];
            }
            return ['RRULE:FREQ=WEEKLY'];
        }
        case 'monthly':
            return ['RRULE:FREQ=MONTHLY'];
        default:
            return undefined;
    }
}

function googleRecurrenceToLocal(googleEvent: GoogleEvent): {
    Recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    RecurrencePattern?: { days: number[] };
} {
    const rules = googleEvent.recurrence || [];
    const rrule = rules.find((rule) => rule.startsWith('RRULE:'));
    if (!rrule) {
        return { Recurrence: 'none' };
    }

    const payload = rrule.replace('RRULE:', '');
    const parts = payload.split(';');
    const map: Record<string, string> = {};

    parts.forEach((part) => {
        const [key, value] = part.split('=');
        if (key && value) map[key] = value;
    });

    if (map.FREQ === 'DAILY') return { Recurrence: 'daily' };

    if (map.FREQ === 'WEEKLY') {
        const byDay = (map.BYDAY || '')
            .split(',')
            .filter(Boolean)
            .map((token) => {
                const idx = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(token);
                return idx >= 0 ? idx : null;
            })
            .filter((value): value is number => value !== null);

        return {
            Recurrence: 'weekly',
            RecurrencePattern: { days: byDay },
        };
    }

    if (map.FREQ === 'MONTHLY') return { Recurrence: 'monthly' };

    return { Recurrence: 'custom' };
}

function sameEventPayload(localEvent: LocalCalendarEvent, googleEvent: GoogleEvent): boolean {
    const localName = localEvent.EventName || '';
    const localDescription = localEvent.Description || '';
    const googleName = googleEvent.summary || '';
    const googleDescription = googleEvent.description || '';

    if (localName !== googleName || localDescription !== googleDescription) return false;

    const localColor = normalizeColor(localEvent.Color);
    const googleColor = normalizeColor(mapGoogleToHex(googleEvent));
    if (localColor !== googleColor) return false;

    const localStart = new Date(localEvent.Start).toISOString();
    const localEnd = new Date(localEvent.End).toISOString();
    const googleStart = parseGoogleDateTime(googleEvent.start);
    const googleEnd = parseGoogleDateTime(googleEvent.end);

    if (localStart !== googleStart || localEnd !== googleEnd) return false;

    const localAllDay = !!localEvent.AllDay;
    const googleAllDay = !!googleEvent.start?.date;

    return localAllDay === googleAllDay;
}

async function ensureAccessToken(): Promise<string> {
    const tokens = getTokens();
    if (!tokens) {
        throw new Error('Google account is not connected.');
    }

    const nowMs = Date.now();
    if (tokens.expiresAt - nowMs > 60_000) {
        return tokens.accessToken;
    }

    if (!tokens.refreshToken) {
        throw new Error('Google token expired and no refresh token is available. Reconnect Google.');
    }

    const settings = getGoogleSyncSettings();
    const body = new URLSearchParams({
        client_id: settings.clientId,
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
    });

    if (settings.clientSecret.trim()) {
        body.set('client_secret', settings.clientSecret.trim());
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh Google token (${response.status})`);
    }

    const data = await response.json();
    const refreshed: GoogleTokens = {
        accessToken: data.access_token,
        refreshToken: tokens.refreshToken,
        expiresAt: nowMs + Number(data.expires_in || 3600) * 1000,
        scope: data.scope,
        tokenType: data.token_type,
    };

    setTokens(refreshed);
    return refreshed.accessToken;
}

async function googleApi<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await ensureAccessToken();
    const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(init.headers || {}),
        },
    });

    if (response.status === 401) {
        setTokens(null);
        throw new Error('Google authorization expired. Reconnect your account.');
    }

    if (!response.ok) {
        const text = await response.text();
        try {
            const parsed = JSON.parse(text) as {
                error?: {
                    message?: string;
                    details?: Array<{
                        '@type'?: string;
                        metadata?: {
                            reason?: string;
                            activationUrl?: string;
                            serviceTitle?: string;
                        };
                    }>;
                };
            };

            const details = parsed.error?.details || [];
            const serviceDisabled = details.find((detail) => detail.metadata?.reason === 'SERVICE_DISABLED');
            const activationUrl = serviceDisabled?.metadata?.activationUrl;
            const serviceTitle = serviceDisabled?.metadata?.serviceTitle || 'Google API';

            if (serviceDisabled && activationUrl) {
                throw new Error(
                    `${serviceTitle} is disabled for your Google Cloud project. Enable it here, wait a few minutes, then retry: ${activationUrl}`,
                );
            }

            throw new Error(`Google API error (${response.status}): ${parsed.error?.message || text}`);
        } catch {
            throw new Error(`Google API error (${response.status}): ${text}`);
        }
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json() as Promise<T>;
}

async function exchangeCodeForTokens(code: string, verifier: string): Promise<void> {
    const settings = getGoogleSyncSettings();

    const tokenBody = new URLSearchParams({
        code,
        client_id: settings.clientId,
        redirect_uri: settings.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
    });

    if (settings.clientSecret.trim()) {
        tokenBody.set('client_secret', settings.clientSecret.trim());
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        throw new Error(`Token exchange failed (${tokenResponse.status}): ${text}`);
    }

    const tokenData = await tokenResponse.json();
    const tokens: GoogleTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + Number(tokenData.expires_in || 3600) * 1000,
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
    };

    setTokens(tokens);
}

export async function completeGoogleOAuthFromCallback(): Promise<boolean> {
    const pending = safeJsonParse<OAuthPendingState | null>(localStorage.getItem(OAUTH_PENDING_KEY), null);
    const result = safeJsonParse<OAuthResultState | null>(localStorage.getItem(OAUTH_RESULT_KEY), null);

    if (!pending || !result) {
        return false;
    }

    localStorage.removeItem(OAUTH_RESULT_KEY);

    if (Date.now() - pending.createdAt > 10 * 60_000) {
        localStorage.removeItem(OAUTH_PENDING_KEY);
        throw new Error('Google auth session expired. Please connect again.');
    }

    if (result.error) {
        localStorage.removeItem(OAUTH_PENDING_KEY);
        throw new Error(`Google login failed: ${result.error}`);
    }

    if (!result.code || result.state !== pending.state) {
        localStorage.removeItem(OAUTH_PENDING_KEY);
        throw new Error('OAuth state mismatch. Please try again.');
    }

    await exchangeCodeForTokens(result.code, pending.verifier);
    localStorage.removeItem(OAUTH_PENDING_KEY);
    emitStatus('Google account connected.', 'success');
    return true;
}

function createGooglePayload(localEvent: LocalCalendarEvent) {
    const color = normalizeColor(localEvent.Color);
    const dateTimes = toGoogleDateTime(localEvent);

    return {
        summary: localEvent.EventName,
        description: localEvent.Description || '',
        start: dateTimes.start,
        end: dateTimes.end,
        colorId: mapHexToGoogleColorId(color),
        recurrence: localRecurrenceToGoogle(localEvent),
        extendedProperties: {
            private: {
                remmbrLocalId: localEvent.id,
                remmbrColor: color,
                remmbrUpdatedAt: localEvent.updated,
            },
        },
    };
}

function createLocalPayloadFromGoogle(googleEvent: GoogleEvent, userId: string): Partial<LocalCalendarEvent> {
    const recurrence = googleRecurrenceToLocal(googleEvent);

    return {
        EventName: googleEvent.summary || '(Untitled Event)',
        Description: googleEvent.description || '',
        AllDay: !!googleEvent.start?.date,
        Start: parseGoogleDateTime(googleEvent.start),
        End: parseGoogleDateTime(googleEvent.end),
        Color: mapGoogleToHex(googleEvent),
        Tasks: [],
        Tags: [],
        user: userId,
        ExternalSource: 'google-calendar',
        ExternalEventId: googleEvent.id,
        ExternalCalendarId: getGoogleSyncSettings().calendarId,
        ExternalEtag: googleEvent.etag,
        ExternalUpdatedAt: googleEvent.updated,
        LastGoogleSyncedAt: nowIso(),
        Recurrence: recurrence.Recurrence,
        RecurrencePattern: recurrence.RecurrencePattern,
    };
}

async function listGoogleEvents(calendarId: string): Promise<GoogleEvent[]> {
    const results: GoogleEvent[] = [];
    let pageToken: string | undefined;

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 12);

    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 18);

    do {
        const params = new URLSearchParams({
            singleEvents: 'true',
            showDeleted: 'true',
            maxResults: '2500',
            orderBy: 'updated',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
        });

        if (pageToken) params.set('pageToken', pageToken);

        const response = await googleApi<GoogleListEventsResponse>(
            `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        );

        results.push(...(response.items || []));
        pageToken = response.nextPageToken;
    } while (pageToken);

    return results;
}

async function upsertLocalAfterPush(localEventId: string, googleEvent: GoogleEvent, calendarId: string) {
    const syncTime = nowIso();
    await bk.collection('Calendar').update(localEventId, {
        ExternalSource: 'google-calendar',
        ExternalEventId: googleEvent.id,
        ExternalCalendarId: calendarId,
        ExternalEtag: googleEvent.etag,
        ExternalUpdatedAt: googleEvent.updated,
        LastGoogleSyncedAt: syncTime,
    } as any);
}

async function pushLocalChanges(localEvents: LocalCalendarEvent[], calendarId: string, lastSyncAt: string | null): Promise<{ pushed: number; deleted: number; map: SyncIdMap; }> {
    let pushed = 0;
    let deleted = 0;
    const idMap = getIdMap();

    const localIds = new Set(localEvents.map((event) => event.id));

    for (const [localId, googleId] of Object.entries(idMap.localToGoogle)) {
        if (localIds.has(localId)) continue;
        try {
            await googleApi(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleId)}`, {
                method: 'DELETE',
            });
            deleted += 1;
        } catch {
            // Ignore not-found and continue cleanup locally.
        }
        delete idMap.localToGoogle[localId];
        delete idMap.googleToLocal[googleId];
    }

    const sorted = [...localEvents].sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime());

    for (const event of sorted) {
        if (event.ParentEventId) continue;

        const lastLocalSync = event.LastGoogleSyncedAt ? new Date(event.LastGoogleSyncedAt).getTime() : 0;
        const lastUpdated = new Date(event.updated).getTime();

        if (lastUpdated <= lastLocalSync) {
            continue;
        }

        if (lastSyncAt && lastUpdated <= new Date(lastSyncAt).getTime() && event.ExternalEventId) {
            continue;
        }

        const payload = createGooglePayload(event);
        const mappedGoogleId = event.ExternalEventId || idMap.localToGoogle[event.id];

        if (mappedGoogleId) {
            const updated = await googleApi<GoogleEvent>(
                `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(mappedGoogleId)}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                },
            );

            await upsertLocalAfterPush(event.id, updated, calendarId);
            idMap.localToGoogle[event.id] = updated.id;
            idMap.googleToLocal[updated.id] = event.id;
            pushed += 1;
            continue;
        }

        const created = await googleApi<GoogleEvent>(
            `/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                method: 'POST',
                body: JSON.stringify(payload),
            },
        );

        await upsertLocalAfterPush(event.id, created, calendarId);
        idMap.localToGoogle[event.id] = created.id;
        idMap.googleToLocal[created.id] = event.id;
        pushed += 1;
    }

    return { pushed, deleted, map: idMap };
}

async function pullGoogleChanges(localEvents: LocalCalendarEvent[], googleEvents: GoogleEvent[], userId: string, lastSyncAt: string | null, idMap: SyncIdMap): Promise<{ pulled: number; deleted: number; map: SyncIdMap; }> {
    let pulled = 0;
    let deleted = 0;

    const localById = new Map(localEvents.map((event) => [event.id, event]));
    const localByGoogleId = new Map<string, LocalCalendarEvent>();

    localEvents.forEach((event) => {
        const googleId = event.ExternalEventId || idMap.localToGoogle[event.id];
        if (googleId) {
            localByGoogleId.set(googleId, event);
            idMap.localToGoogle[event.id] = googleId;
            idMap.googleToLocal[googleId] = event.id;
        }
    });

    for (const googleEvent of googleEvents) {
        const googleId = googleEvent.id;
        const localEvent = localByGoogleId.get(googleId)
            || (idMap.googleToLocal[googleId] ? localById.get(idMap.googleToLocal[googleId]) : undefined);

        if (googleEvent.status === 'cancelled') {
            if (localEvent) {
                await bk.collection('Calendar').delete(localEvent.id);
                localById.delete(localEvent.id);
                deleted += 1;
            }
            if (idMap.googleToLocal[googleId]) {
                const localId = idMap.googleToLocal[googleId];
                delete idMap.googleToLocal[googleId];
                delete idMap.localToGoogle[localId];
            }
            continue;
        }

        if (localEvent) {
            const localUpdatedAt = new Date(localEvent.updated).getTime();
            const googleUpdatedAt = new Date(googleEvent.updated || 0).getTime();
            const lastSyncedAt = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;

            if (localUpdatedAt > lastSyncedAt && localUpdatedAt > googleUpdatedAt) {
                // Local changes win if edited after the last completed sync.
                continue;
            }

            if (sameEventPayload(localEvent, googleEvent)) {
                idMap.localToGoogle[localEvent.id] = googleId;
                idMap.googleToLocal[googleId] = localEvent.id;
                continue;
            }

            const payload = createLocalPayloadFromGoogle(googleEvent, userId);
            await bk.collection('Calendar').update(localEvent.id, payload as any);
            idMap.localToGoogle[localEvent.id] = googleId;
            idMap.googleToLocal[googleId] = localEvent.id;
            pulled += 1;
            continue;
        }

        const payload = createLocalPayloadFromGoogle(googleEvent, userId);
        const created = await bk.collection('Calendar').create(payload as any);
        idMap.localToGoogle[(created as any).id] = googleId;
        idMap.googleToLocal[googleId] = (created as any).id;
        pulled += 1;
    }

    return { pulled, deleted, map: idMap };
}

export async function syncGoogleCalendarNow(options: { silent?: boolean } = {}) {
    if (syncInFlight) {
        return syncInFlight;
    }

    const settings = getGoogleSyncSettings();
    if (!settings.enabled) {
        if (!options.silent) emitStatus('Google sync is disabled.', 'info');
        return;
    }

    if (!settings.clientId.trim()) {
        throw new Error('Google Client ID is required.');
    }

    if (!isGoogleConnected()) {
        throw new Error('Google is not connected.');
    }

    const userId = currentUser()?.id;
    if (!userId) {
        throw new Error('No authenticated user found for sync.');
    }

    const run = (async () => {
        emitStatus('Syncing with Google Calendar...', 'info');

        const lastSyncAt = localStorage.getItem(LAST_SYNC_AT_KEY);
        const localEvents = (await bk.collection('Calendar').getFullList({
            filter: `user = "${userId}"`,
            sort: 'updated',
        })) as unknown as LocalCalendarEvent[];

        const push = await pushLocalChanges(localEvents, settings.calendarId, lastSyncAt);
        setIdMap(push.map);

        const refreshedLocalEvents = (await bk.collection('Calendar').getFullList({
            filter: `user = "${userId}"`,
            sort: 'updated',
        })) as unknown as LocalCalendarEvent[];

        const googleEvents = await listGoogleEvents(settings.calendarId);
        const pull = await pullGoogleChanges(refreshedLocalEvents, googleEvents, userId, lastSyncAt, push.map);

        setIdMap(pull.map);
        localStorage.setItem(LAST_SYNC_AT_KEY, nowIso());

        const changed = push.pushed + push.deleted + pull.pulled + pull.deleted;
        if (changed > 0) {
            window.dispatchEvent(new Event('dataChanged'));
        }

        emitStatus(
            `Google sync complete. Pushed ${push.pushed}, pulled ${pull.pulled}, deleted ${push.deleted + pull.deleted}.`,
            'success',
        );
    })();

    syncInFlight = run;
    try {
        await run;
    } catch (error: any) {
        emitStatus(error?.message || 'Google sync failed.', 'error');
        throw error;
    } finally {
        syncInFlight = null;
    }
}

export async function connectGoogleCalendar(): Promise<void> {
    const settings = getGoogleSyncSettings();

    if (!settings.clientId.trim()) {
        throw new Error('Set your Google OAuth Client ID before connecting.');
    }

    const verifier = randomString(96);
    const challenge = base64UrlEncode(await sha256(verifier));
    const state = randomString(32);

    localStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({
        verifier,
        state,
        createdAt: Date.now(),
    } satisfies OAuthPendingState));
    localStorage.removeItem(OAUTH_RESULT_KEY);

    const params = new URLSearchParams({
        client_id: settings.clientId,
        redirect_uri: settings.redirectUri,
        response_type: 'code',
        scope: GOOGLE_SCOPES,
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'consent',
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    // Avoid noopener/noreferrer here because some runtimes return a null handle,
    // which can be mistaken for a blocked popup.
    const popup = window.open(authUrl, 'remmbrme-google-oauth', 'width=520,height=760');

    if (!popup) {
        // Fallback: continue OAuth in the current tab/window.
        window.location.assign(authUrl);
        return;
    }

    const code = await waitForOAuthCode(state, popup);
    await exchangeCodeForTokens(code, verifier);
    localStorage.removeItem(OAUTH_PENDING_KEY);
    localStorage.removeItem(OAUTH_RESULT_KEY);
    emitStatus('Google account connected.', 'success');
}

function waitForOAuthCode(expectedState: string, popup: Window): Promise<string> {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const timeoutMs = 2 * 60 * 1000;

        const interval = window.setInterval(() => {
            const raw = localStorage.getItem(OAUTH_RESULT_KEY);
            if (!raw) {
                if (Date.now() - startedAt > timeoutMs) {
                    window.clearInterval(interval);
                    try { popup.close(); } catch { }
                    reject(new Error('Google authentication timed out.'));
                }
                return;
            }

            localStorage.removeItem(OAUTH_RESULT_KEY);

            let parsed: { code?: string; state?: string; error?: string };
            try {
                parsed = JSON.parse(raw);
            } catch {
                window.clearInterval(interval);
                reject(new Error('Invalid OAuth callback payload.'));
                return;
            }

            if (parsed.error) {
                window.clearInterval(interval);
                reject(new Error(`Google login failed: ${parsed.error}`));
                return;
            }

            if (!parsed.code || parsed.state !== expectedState) {
                window.clearInterval(interval);
                reject(new Error('OAuth state mismatch. Please try again.'));
                return;
            }

            window.clearInterval(interval);
            try { popup.close(); } catch { }
            resolve(parsed.code);
        }, 500);
    });
}

export function disconnectGoogleCalendar() {
    stopGoogleCalendarAutoSync();
    clearGoogleStorage();
    emitStatus('Google Calendar disconnected.', 'info');
}

export function startGoogleCalendarAutoSync() {
    stopGoogleCalendarAutoSync();

    const settings = getGoogleSyncSettings();
    if (!settings.enabled || !isGoogleConnected()) {
        return;
    }

    void syncGoogleCalendarNow({ silent: true });

    autoSyncTimer = window.setInterval(() => {
        void syncGoogleCalendarNow({ silent: true });
    }, settings.syncIntervalMinutes * 60_000);

    autoSyncChangeListener = () => {
        if (pendingChangeSyncTimer) {
            window.clearTimeout(pendingChangeSyncTimer);
        }

        pendingChangeSyncTimer = window.setTimeout(() => {
            void syncGoogleCalendarNow({ silent: true });
            pendingChangeSyncTimer = null;
        }, 5000);
    };

    window.addEventListener('dataChanged', autoSyncChangeListener);
}

export function stopGoogleCalendarAutoSync() {
    if (autoSyncTimer) {
        window.clearInterval(autoSyncTimer);
        autoSyncTimer = null;
    }

    if (pendingChangeSyncTimer) {
        window.clearTimeout(pendingChangeSyncTimer);
        pendingChangeSyncTimer = null;
    }

    if (autoSyncChangeListener) {
        window.removeEventListener('dataChanged', autoSyncChangeListener);
        autoSyncChangeListener = null;
    }
}
