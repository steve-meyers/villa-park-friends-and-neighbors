const CALENDAR_ID = '0ce3a25e6fd955c22169b082528dc03ccdf62b9e88f3e9ba1c4fff8c61a8ac9a@group.calendar.google.com';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars';

export const CALENDAR_SUBSCRIBE_URL = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(CALENDAR_ID)}`;

/**
 * Short, deterministic id derived from a Google Calendar event id — a handful of
 * base36 characters instead of the full ~26-char id. Not reversible on its own;
 * resolving a short id back to a real event requires searching a fetched event
 * list (see fetchEventByShortId), since there's no lookup-by-hash API.
 */
export function shortEventId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Friendly, shareable slug for an event: a readable title prefix plus a short
 * hash of the event id as the trailing segment (see shortEventId). The hash
 * isn't reversible by itself — see resolveShortEventId for how a slug's id
 * portion is turned back into a real event.
 */
export function eventSlug(event: Pick<CalendarEvent, 'id' | 'title'>): string {
  const titleSlug = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  const shortId = shortEventId(event.id);
  return titleSlug ? `${titleSlug}-${shortId}` : shortId;
}

/** Extracts the short id portion from a slug — always the last '-'-delimited segment. */
export function shortIdFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  htmlLink: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface GoogleEventTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  status: string;
}

function toCalendarEvent(event: GoogleEvent): CalendarEvent {
  return {
    id: event.id,
    title: event.summary ?? 'Untitled event',
    description: event.description ?? '',
    location: event.location ?? '',
    htmlLink: event.htmlLink,
    start: event.start.dateTime ?? event.start.date ?? '',
    end: event.end.dateTime ?? event.end.date ?? '',
    allDay: !event.start.dateTime,
  };
}

export class CalendarApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'CalendarApiError';
    this.status = status;
  }
}

async function callCalendarApi(path: string, params: Record<string, string>) {
  const apiKey = import.meta.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CALENDAR_API_KEY is not set');
  }

  const url = new URL(`${CALENDAR_API_BASE}/${encodeURIComponent(CALENDAR_ID)}${path}`);
  url.searchParams.set('key', apiKey);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new CalendarApiError(
      response.status,
      `Google Calendar API request failed: ${response.status} ${await response.text()}`
    );
  }
  return response.json();
}

export async function fetchUpcomingEvents(maxResults = 20): Promise<CalendarEvent[]> {
  const data = await callCalendarApi('/events', {
    timeMin: new Date().toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });

  return (data.items ?? [])
    .filter((event: GoogleEvent) => event.status !== 'cancelled')
    .map(toCalendarEvent);
}

/**
 * Formats an event's start as a wall-clock date/time. All-day events store a bare
 * YYYY-MM-DD string with no instant to convert, so they're formatted in UTC against
 * a UTC-constructed Date (never America/Denver — that would shift them a day early).
 * Timed events carry a real instant and are formatted in America/Denver as usual.
 */
export function formatEventDate(event: CalendarEvent, options: Intl.DateTimeFormatOptions): string {
  if (event.allDay) {
    const [y, m, d] = event.start.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'America/Denver' }).format(new Date(event.start));
}

/** The America/Denver UTC offset (in whole hours, e.g. -6 or -7) on the given date, DST-aware. */
function denverUtcOffsetHours(approxUtc: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    timeZoneName: 'shortOffset',
  }).formatToParts(approxUtc);
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-6';
  const match = tzPart.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) : -6;
}

/** ISO string for local midnight in America/Denver on the given date, correct across DST. */
export function denverMidnightIso(y: number, m: number, d: number): string {
  const offset = denverUtcOffsetHours(new Date(Date.UTC(y, m - 1, d, 12)));
  const sign = offset <= 0 ? '-' : '+';
  const offsetStr = `${sign}${String(Math.abs(offset)).padStart(2, '0')}:00`;
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}T00:00:00${offsetStr}`;
}

const denverDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' });
const denverTimeOfDayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Local (America/Denver) day keys (YYYY-MM-DD) an event occupies, for calendar-grid bucketing. */
export function getEventDayKeys(event: CalendarEvent): string[] {
  if (event.allDay) {
    // event.start/end are YYYY-MM-DD date strings; end is exclusive per Google's all-day convention.
    const keys: string[] = [];
    let cursor = event.start;
    while (cursor < event.end) {
      keys.push(cursor);
      cursor = addDaysToKey(cursor, 1);
    }
    return keys.length ? keys : [event.start];
  }

  const startKey = denverDayFormatter.format(new Date(event.start));
  const endDate = new Date(event.end);
  let endKey = denverDayFormatter.format(endDate);

  if (endKey === startKey) return [startKey];

  // An event ending exactly at midnight doesn't occupy that final day.
  if (denverTimeOfDayFormatter.format(endDate) === '00:00:00') {
    endKey = addDaysToKey(endKey, -1);
  }

  const keys: string[] = [];
  let cursor = startKey;
  while (cursor <= endKey) {
    keys.push(cursor);
    if (cursor === endKey) break;
    cursor = addDaysToKey(cursor, 1);
  }
  return keys;
}

export async function fetchEventsInRange(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const data = await callCalendarApi('/events', {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  return (data.items ?? [])
    .filter((event: GoogleEvent) => event.status !== 'cancelled')
    .map(toCalendarEvent);
}

export async function fetchEventById(eventId: string): Promise<CalendarEvent | null> {
  let data;
  try {
    data = await callCalendarApi(`/events/${encodeURIComponent(eventId)}`, {});
  } catch (err) {
    if (err instanceof CalendarApiError && err.status === 404) return null;
    throw err;
  }
  if (data.status === 'cancelled') return null;
  return toCalendarEvent(data);
}

/**
 * Resolves a short id (from a friendly slug) back to a real event by searching
 * events in a window around now — there's no lookup-by-hash API, so this trades
 * an extra list call for a much shorter, shareable URL.
 */
export async function fetchEventByShortId(shortId: string): Promise<CalendarEvent | null> {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 90);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 365);

  const events = await fetchEventsInRange(timeMin, timeMax);
  return events.find((event) => shortEventId(event.id) === shortId) ?? null;
}

function toGoogleDateParam(iso: string, allDay: boolean): string {
  if (allDay) {
    return iso.replace(/-/g, '');
  }
  return `${new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

export function buildGoogleAddUrl(event: CalendarEvent): string {
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', event.title);
  url.searchParams.set(
    'dates',
    `${toGoogleDateParam(event.start, event.allDay)}/${toGoogleDateParam(event.end, event.allDay)}`
  );
  if (event.description) url.searchParams.set('details', event.description);
  if (event.location) url.searchParams.set('location', event.location);
  return url.toString();
}

function toIcsDate(iso: string, allDay: boolean): string {
  if (allDay) {
    return `${iso.replace(/-/g, '')}`;
  }
  return `${new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildIcsContent(event: CalendarEvent): string {
  const dtStart = event.allDay ? `DTSTART;VALUE=DATE:${toIcsDate(event.start, true)}` : `DTSTART:${toIcsDate(event.start, false)}`;
  const dtEnd = event.allDay ? `DTEND;VALUE=DATE:${toIcsDate(event.end, true)}` : `DTEND:${toIcsDate(event.end, false)}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Villa Park Friends and Neighbors//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@villaparkfans.com`,
    `DTSTAMP:${toIcsDate(new Date().toISOString(), false)}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : '',
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}
