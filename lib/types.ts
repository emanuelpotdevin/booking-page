export type TimeRange = { start: string; end: string }; // "09:00" – "17:00"

export type DayHours = { enabled: boolean; ranges: TimeRange[] };

export type QuestionType = "text" | "textarea" | "phone";

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
};

export type LocationType = "meet" | "phone" | "in_person";

export type EventType = {
  id: string;
  slug: string;
  title: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  location: LocationType;
  locationDetail: string; // address for in-person; ignored for Meet
  color: string;
  active: boolean;
  questions: Question[];
};

export type Brand = {
  businessName: string;
  ownerName: string;
  tagline: string;
  accentColor: string;
  logoDataUrl: string; // small resized image, or ""
};

export type Rules = {
  minNoticeHours: number; // no bookings sooner than this
  bookingWindowDays: number; // no bookings further ahead than this
  dailyLimit: number; // max bookings per day, 0 = unlimited
  slotIntervalMinutes: number; // a start time every X minutes
};

export type Settings = {
  setupComplete: boolean;
  brand: Brand;
  timezone: string;
  weeklyHours: Record<string, DayHours>; // "1" = Monday … "7" = Sunday (ISO weekday)
  rules: Rules;
  eventTypes: EventType[];
};

export type GoogleTokens = {
  refreshToken: string;
  accessToken: string;
  expiresAt: number; // ms epoch
  email: string;
};

export type PublicEventType = Omit<EventType, "locationDetail"> & { locationDetail?: string };
