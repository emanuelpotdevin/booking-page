"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";
import type { Brand, EventType } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Calendar, Check, Chevron, Clock, Globe, LocationIcon, locationLabel } from "./icons";

type Step = "pick" | "details" | "done";
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function allZones(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Intl as any).supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Amsterdam", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Singapore"];
  }
}

export default function BookingFlow({ brand, event, ownerTimezone }: { brand: Brand; event: EventType; ownerTimezone: string }) {
  const [tz, setTz] = useState(ownerTimezone);
  const [hour12, setHour12] = useState(false);
  const [month, setMonth] = useState<DateTime>(() => DateTime.now().startOf("month"));
  const [slots, setSlots] = useState<string[] | null>(null);
  const [preview, setPreview] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [form, setForm] = useState({ name: "", email: "", phone: "", answers: {} as Record<string, string> });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ start: string; end: string; meetLink: string; preview: boolean } | null>(null);

  // Detect the visitor's time zone and clock style
  useEffect(() => {
    const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (guess) setTz(guess);
    setHour12(new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 ?? false);
  }, []);

  const monthStart = useMemo(() => month.setZone(tz, { keepLocalTime: true }).startOf("month"), [month, tz]);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setLoadError("");
    const from = DateTime.max(monthStart, DateTime.now().setZone(tz)).toUTC().toISO();
    const to = monthStart.endOf("month").toUTC().toISO();
    fetch(`/api/availability?event=${encodeURIComponent(event.slug)}&from=${from}&to=${to}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setSlots(d.slots);
        setPreview(d.preview);
      })
      .catch((e) => !cancelled && (setLoadError(e.message || "Could not load times"), setSlots([])));
    return () => {
      cancelled = true;
    };
  }, [monthStart, tz, event.slug]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots ?? []) {
      const k = DateTime.fromISO(s).setZone(tz).toISODate()!;
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots, tz]);

  // Auto-select the first available day of the month
  useEffect(() => {
    if (!slots) return;
    if (!day || !byDay.has(day)) setDay(byDay.keys().next().value ?? null);
    setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay]);

  const fmtTime = (iso: string) =>
    DateTime.fromISO(iso).setZone(tz).toLocaleString({ hour: "numeric", minute: "2-digit", hour12 });

  const cells = useMemo(() => {
    const lead = monthStart.weekday - 1;
    const out: (DateTime | null)[] = Array(lead).fill(null);
    for (let d = 0; d < monthStart.daysInMonth!; d++) out.push(monthStart.plus({ days: d }));
    return out;
  }, [monthStart]);

  const canGoBack = monthStart > DateTime.now().setZone(tz).startOf("month");
  const location = locationLabel(event.location) + (event.location === "in_person" && event.locationDetail ? ` · ${event.locationDetail}` : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event.slug, start: slot, timezone: tz, ...form }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Booking failed");
      setResult(d);
      setStep("done");
    } catch (err) {
      setError((err as Error).message);
      if (String((err as Error).message).includes("no longer available")) {
        setMonth((m) => m.plus({ seconds: 1 })); // refresh slots
        setStep("pick");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const when = slot && DateTime.fromISO(slot).setZone(tz);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <div className="glass fade-in grid overflow-hidden md:grid-cols-[300px_1fr]">
        {/* Left: meeting info */}
        <aside className="border-b hair p-6 md:border-b-0 md:border-r md:p-7">
          <Link href="/" className="muted mb-6 inline-flex items-center gap-1 text-[14px] hover:opacity-80">
            <Chevron dir="left" /> All meetings
          </Link>
          <div className="flex items-center gap-3">
            <Avatar brand={brand} size={44} />
            <div>
              <p className="text-[15px] font-semibold leading-tight">{brand.businessName}</p>
              {brand.ownerName && <p className="muted text-[13px]">{brand.ownerName}</p>}
            </div>
          </div>
          <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-tight">{event.title}</h1>
          <ul className="muted mt-4 space-y-2.5 text-[15px]">
            <li className="flex items-center gap-2.5"><Clock className="h-[18px] w-[18px]" /> {event.durationMinutes} min</li>
            <li className="flex items-center gap-2.5"><LocationIcon type={event.location} className="h-[18px] w-[18px]" /> {location}</li>
            {when && (
              <li className="flex items-start gap-2.5 font-medium" style={{ color: "var(--accent)" }}>
                <Calendar className="mt-0.5 h-[18px] w-[18px]" />
                <span>
                  {when.toLocaleString({ weekday: "long", day: "numeric", month: "long" })}
                  <br />
                  {fmtTime(slot!)} – {fmtTime(when.plus({ minutes: event.durationMinutes }).toISO()!)}
                </span>
              </li>
            )}
          </ul>
          {event.description && <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed">{event.description}</p>}
        </aside>

        {/* Right: steps */}
        <section className="min-h-[520px] p-5 sm:p-7">
          {step === "pick" && (
            <div className="fade-in grid gap-8 lg:grid-cols-[1fr_200px]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[19px] font-semibold">Select a date</h2>
                  <div className="flex items-center gap-1">
                    <button className="btn btn-ghost !h-9 !w-9 !p-0" disabled={!canGoBack} onClick={() => setMonth(monthStart.minus({ months: 1 }))} aria-label="Previous month">
                      <Chevron dir="left" />
                    </button>
                    <span className="w-36 text-center text-[15px] font-medium">{monthStart.toFormat("LLLL yyyy")}</span>
                    <button className="btn btn-ghost !h-9 !w-9 !p-0" onClick={() => setMonth(monthStart.plus({ months: 1 }))} aria-label="Next month">
                      <Chevron />
                    </button>
                  </div>
                </div>
                <div className="muted grid grid-cols-7 pb-2 text-center text-[12px] font-medium uppercase tracking-wide">
                  {WEEK.map((w) => <span key={w}>{w}</span>)}
                </div>
                <div className={`grid grid-cols-7 gap-y-1.5 transition-opacity ${slots === null ? "opacity-40" : ""}`}>
                  {cells.map((c, i) => {
                    if (!c) return <span key={i} />;
                    const key = c.toISODate()!;
                    const has = byDay.has(key);
                    return (
                      <button
                        key={key}
                        disabled={!has}
                        onClick={() => { setDay(key); setSlot(null); }}
                        className={`day ${has ? "day-available" : "day-disabled"} ${day === key ? "day-selected" : ""}`}
                        aria-label={key}
                      >
                        {c.day}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-[14px]">
                  <label className="muted flex items-center gap-1.5"><Globe /> <span className="sr-only">Time zone</span></label>
                  <select className="field !w-auto !py-1.5 !text-[14px]" value={tz} onChange={(e) => setTz(e.target.value)}>
                    {allZones().map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
                  </select>
                  <div className="segmented">
                    <button aria-pressed={!hour12} onClick={() => setHour12(false)}>24h</button>
                    <button aria-pressed={hour12} onClick={() => setHour12(true)}>12h</button>
                  </div>
                </div>
                {preview && (
                  <p className="muted mt-4 text-[13px]">Preview mode — Google Calendar is not connected yet, so busy times aren&apos;t hidden.</p>
                )}
                {loadError && <p className="mt-4 text-[14px] text-red-500">{loadError}</p>}
                {slots && byDay.size === 0 && !loadError && (
                  <p className="muted mt-4 text-[14px]">No times left this month — try the next one.</p>
                )}
              </div>

              <div className="lg:pt-1">
                {day && (
                  <div className="fade-in" key={day}>
                    <h3 className="mb-3 text-[15px] font-semibold">
                      {DateTime.fromISO(day, { zone: tz }).toLocaleString({ weekday: "long", day: "numeric", month: "short" })}
                    </h3>
                    <div className="grid max-h-[400px] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-1">
                      {(byDay.get(day) ?? []).map((s) => (
                        <div key={s} className="flex gap-2">
                          <button className="slot" aria-pressed={slot === s} onClick={() => setSlot(s)}>{fmtTime(s)}</button>
                          {slot === s && (
                            <button className="btn btn-primary fade-in !h-12 !rounded-[14px] !px-4" onClick={() => { setError(""); setStep("details"); }}>
                              Next
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "details" && (
            <form onSubmit={submit} className="fade-in mx-auto max-w-md space-y-4">
              <button type="button" className="muted inline-flex items-center gap-1 text-[14px]" onClick={() => setStep("pick")}>
                <Chevron dir="left" /> Change time
              </button>
              <h2 className="text-[19px] font-semibold">Your details</h2>
              <div>
                <label className="label" htmlFor="name">Name *</label>
                <input id="name" className="field" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="email">Email *</label>
                <input id="email" type="email" className="field" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {event.location === "phone" && (
                <div>
                  <label className="label" htmlFor="phone">Phone number *</label>
                  <input id="phone" type="tel" className="field" required autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              )}
              {event.questions.map((q) => (
                <div key={q.id}>
                  <label className="label" htmlFor={q.id}>{q.label}{q.required ? " *" : ""}</label>
                  {q.type === "textarea" ? (
                    <textarea id={q.id} rows={4} className="field resize-none" required={q.required} value={form.answers[q.id] || ""} onChange={(e) => setForm({ ...form, answers: { ...form.answers, [q.id]: e.target.value } })} />
                  ) : (
                    <input id={q.id} type={q.type === "phone" ? "tel" : "text"} className="field" required={q.required} value={form.answers[q.id] || ""} onChange={(e) => setForm({ ...form, answers: { ...form.answers, [q.id]: e.target.value } })} />
                  )}
                </div>
              ))}
              {error && <p className="text-[14px] text-red-500">{error}</p>}
              <button className="btn btn-primary w-full" disabled={submitting}>{submitting ? "Booking…" : "Confirm booking"}</button>
            </form>
          )}

          {step === "done" && result && (
            <div className="fade-in mx-auto flex max-w-md flex-col items-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ background: "#34C759" }}>
                <Check className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-[24px] font-semibold tracking-tight">You&apos;re booked</h2>
              <p className="muted mt-2 text-[15px]">
                {result.preview
                  ? "Preview mode: this booking was not saved. Connect Google Calendar in /admin to go live."
                  : `A calendar invite is on its way to ${form.email}.`}
              </p>
              <div className="glass-strong mt-6 w-full rounded-2xl p-5 text-left text-[15px]">
                <p className="font-semibold">{event.title}</p>
                <p className="muted mt-1">
                  {DateTime.fromISO(result.start).setZone(tz).toLocaleString({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  <br />
                  {fmtTime(result.start)} – {fmtTime(result.end)} ({tz.replace(/_/g, " ")})
                </p>
                {result.meetLink && (
                  <a href={result.meetLink} className="mt-3 inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--accent)" }} target="_blank" rel="noreferrer">
                    <LocationIcon type="meet" /> Join Google Meet
                  </a>
                )}
              </div>
              <Link href="/" className="btn btn-ghost mt-6">Done</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
