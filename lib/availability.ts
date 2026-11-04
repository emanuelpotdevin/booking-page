import "server-only";
import { DateTime } from "luxon";
import { getBookedStarts, getBusy, type Interval } from "./google";
import type { EventType, Settings } from "./types";

/** Wall-clock time on a given day (DST-safe). "24:00" means end of day. */
function at(day: DateTime, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (h >= 24) return day.plus({ days: 1 }).startOf("day").toMillis();
  return day.set({ hour: h, minute: m || 0, second: 0, millisecond: 0 }).toMillis();
}

/**
 * All bookable start times (ms epoch, UTC) for an event type between `from` and `to`.
 * Applies: weekly hours, minimum notice, booking window, buffers, Google busy times and the daily limit.
 */
export async function computeSlots(
  settings: Settings,
  event: EventType,
  from: Date,
  to: Date,
): Promise<{ slots: number[]; preview: boolean }> {
  const zone = settings.timezone;
  const { minNoticeHours, bookingWindowDays, dailyLimit, slotIntervalMinutes } = settings.rules;
  const now = Date.now();
  const earliest = now + minNoticeHours * 3600_000;
  const latest = DateTime.fromMillis(now, { zone }).plus({ days: bookingWindowDays }).endOf("day").toMillis();

  const start = Math.max(from.getTime(), earliest);
  const end = Math.min(to.getTime(), latest);
  if (start >= end) return { slots: [], preview: false };

  // Pad the range for buffers and full owner-days (daily limit is counted per owner-day).
  const dayFrom = DateTime.fromMillis(start, { zone }).startOf("day");
  const dayTo = DateTime.fromMillis(end, { zone }).endOf("day");
  const fetchFrom = dayFrom.minus({ hours: 3 }).toUTC().toISO()!;
  const fetchTo = dayTo.plus({ hours: 3 }).toUTC().toISO()!;

  const [busy, booked] = await Promise.all([
    getBusy(fetchFrom, fetchTo),
    dailyLimit > 0 ? getBookedStarts(dayFrom.toUTC().toISO()!, dayTo.toUTC().toISO()!) : Promise.resolve([]),
  ]);
  const busyList: Interval[] = busy ?? [];

  const bookedPerDay = new Map<string, number>();
  for (const b of booked) {
    const key = DateTime.fromMillis(b, { zone }).toISODate()!;
    bookedPerDay.set(key, (bookedPerDay.get(key) ?? 0) + 1);
  }

  const dur = event.durationMinutes * 60_000;
  const before = event.bufferBeforeMinutes * 60_000;
  const after = event.bufferAfterMinutes * 60_000;
  const step = Math.max(5, slotIntervalMinutes || event.durationMinutes) * 60_000;
  const slots: number[] = [];

  for (let day = dayFrom; day <= dayTo; day = day.plus({ days: 1 })) {
    const hours = settings.weeklyHours[String(day.weekday)];
    if (!hours?.enabled) continue;
    if (dailyLimit > 0 && (bookedPerDay.get(day.toISODate()!) ?? 0) >= dailyLimit) continue;

    for (const range of hours.ranges) {
      const rStart = at(day, range.start);
      const rEnd = at(day, range.end);
      for (let s = rStart; s + dur <= rEnd; s += step) {
        if (s < start || s > end) continue;
        const blockStart = s - before;
        const blockEnd = s + dur + after;
        const clash = busyList.some((b) => b.start < blockEnd && b.end > blockStart);
        if (!clash) slots.push(s);
      }
    }
  }

  return { slots: [...new Set(slots)].sort((a, b) => a - b), preview: busy === null };
}
