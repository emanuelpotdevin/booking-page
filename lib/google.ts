import "server-only";
import { getTokens, saveTokens } from "./store";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events", // create the booked meeting in your calendar
  "https://www.googleapis.com/auth/calendar.freebusy", // see when you are busy (not event details)
];

const API = "https://www.googleapis.com/calendar/v3";
const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

export function authUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Google sign-in failed");

  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then((r) => r.json());

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) || "",
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    email: String(info.email || "").toLowerCase(),
    scope: String(data.scope || ""),
  };
}

async function accessToken(): Promise<string | null> {
  const t = await getTokens();
  if (!t) return null;
  if (t.accessToken && t.expiresAt > Date.now()) return t.accessToken;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: t.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Google Calendar connection expired. Open /admin and reconnect Google.");
  const updated = { ...t, accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  await saveTokens(updated);
  return updated.accessToken;
}

export async function calendarConnected() {
  return Boolean(await getTokens());
}

export type Interval = { start: number; end: number };

/** Busy blocks in your primary calendar. Returns null when Google isn't connected (preview mode). */
export async function getBusy(fromISO: string, toISO: string): Promise<Interval[] | null> {
  const token = await accessToken();
  if (!token) return null;
  const res = await fetch(`${API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: fromISO, timeMax: toISO, items: [{ id: "primary" }] }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Could not read your calendar");
  const busy: { start: string; end: string }[] = data.calendars?.primary?.busy ?? [];
  return busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

/** Start times (ms) of meetings booked through this app in a range — used for the daily limit. */
export async function getBookedStarts(fromISO: string, toISO: string): Promise<number[]> {
  const token = await accessToken();
  if (!token) return [];
  const p = new URLSearchParams({
    timeMin: fromISO,
    timeMax: toISO,
    singleEvents: "true",
    maxResults: "2500",
    privateExtendedProperty: "bookedVia=glassbook",
  });
  const res = await fetch(`${API}/calendars/primary/events?${p}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Could not read your calendar");
  return (data.items ?? [])
    .filter((e: { status?: string }) => e.status !== "cancelled")
    .map((e: { start?: { dateTime?: string; date?: string } }) => Date.parse(e.start?.dateTime || e.start?.date || ""))
    .filter((n: number) => !Number.isNaN(n));
}

export async function createEvent(input: {
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
  timeZone: string;
  guestName: string;
  guestEmail: string;
  withMeet: boolean;
  location?: string;
  eventTypeId: string;
}) {
  const token = await accessToken();
  if (!token) throw new Error("Google Calendar is not connected");
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startISO, timeZone: input.timeZone },
    end: { dateTime: input.endISO, timeZone: input.timeZone },
    attendees: [{ email: input.guestEmail, displayName: input.guestName }],
    extendedProperties: { private: { bookedVia: "glassbook", eventType: input.eventTypeId } },
    reminders: { useDefault: true },
  };
  if (input.location) body.location = input.location;
  if (input.withMeet) {
    body.conferenceData = {
      createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }
  // sendUpdates=all → Google emails the guest a calendar invite (this is their confirmation)
  const res = await fetch(`${API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Could not create the calendar event");
  return { id: data.id as string, meetLink: (data.hangoutLink as string) || "" };
}
