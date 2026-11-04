import type { DayHours, EventType, Settings } from "./types";

const workday = (): DayHours => ({ enabled: true, ranges: [{ start: "09:00", end: "17:00" }] });
const off = (): DayHours => ({ enabled: false, ranges: [{ start: "09:00", end: "17:00" }] });

export const RESERVED_SLUGS = ["admin", "api", "privacy", "_next", "favicon.ico"];

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "meeting"
  );
}

export function blankEventType(partial: Partial<EventType> = {}): EventType {
  return {
    id: newId(),
    slug: "new-meeting",
    title: "New meeting",
    description: "",
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 10,
    location: "meet",
    locationDetail: "",
    color: "#0A84FF",
    active: true,
    questions: [],
    ...partial,
  };
}

// Placeholder branding — every owner replaces this in the setup screen.
export const DEFAULT_SETTINGS: Settings = {
  setupComplete: false,
  brand: {
    businessName: "Lumen Studio",
    ownerName: "Alex Morgan",
    tagline: "Pick a time that works for you.",
    accentColor: "#0A84FF",
    logoDataUrl: "",
  },
  timezone: "Europe/Amsterdam",
  weeklyHours: {
    "1": workday(),
    "2": workday(),
    "3": workday(),
    "4": workday(),
    "5": workday(),
    "6": off(),
    "7": off(),
  },
  rules: {
    minNoticeHours: 4,
    bookingWindowDays: 30,
    dailyLimit: 4,
    slotIntervalMinutes: 30,
  },
  eventTypes: [
    blankEventType({
      id: "intro",
      slug: "intro-call",
      title: "Intro call",
      description: "A short call to get to know each other and see how I can help.",
      durationMinutes: 15,
      bufferAfterMinutes: 5,
      color: "#0A84FF",
      questions: [{ id: "q1", label: "What would you like to talk about?", type: "textarea", required: false }],
    }),
    blankEventType({
      id: "strategy",
      slug: "strategy-session",
      title: "Strategy session",
      description: "A focused working session on your goals, with concrete next steps.",
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      color: "#BF5AF2",
      questions: [
        { id: "q1", label: "Company name", type: "text", required: true },
        { id: "q2", label: "What is your biggest challenge right now?", type: "textarea", required: true },
      ],
    }),
  ],
};

export const WEEKDAYS = [
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
  { key: "7", label: "Sunday" },
];
