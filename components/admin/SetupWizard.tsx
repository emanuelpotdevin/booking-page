"use client";

import { useEffect, useState } from "react";
import { blankEventType, newId, slugify, WEEKDAYS } from "@/lib/defaults";
import type { EventType, LocationType, Question, Settings } from "@/lib/types";
import { Avatar } from "../Avatar";
import { Calendar, Check, Chevron, Copy, LocationIcon, Plus, Trash } from "../icons";

type Status = {
  calendarEmail: string;
  googleConfigured: boolean;
  storageConfigured: boolean;
  devBypass: boolean;
  ownerEmail: string;
  error: string;
};

const STEPS = [
  { key: "brand", title: "Branding", hint: "Name, logo and colour" },
  { key: "calendar", title: "Google Calendar", hint: "Connect & time zone" },
  { key: "hours", title: "Availability", hint: "When you can meet" },
  { key: "events", title: "Meeting types", hint: "Durations & questions" },
  { key: "rules", title: "Booking rules", hint: "Notice, window, limits" },
  { key: "share", title: "Your link", hint: "Share & go live" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const ACCENTS = ["#0A84FF", "#5E5CE6", "#BF5AF2", "#FF375F", "#FF9F0A", "#30D158", "#64D2FF", "#1C1C1E"];

function zones(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Intl as any).supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Amsterdam"];
  }
}

export default function SetupWizard({ initial, status }: { initial: Settings; status: Status }) {
  const [s, setS] = useState<Settings>(initial);
  const [step, setStep] = useState<StepKey>(initial.setupComplete ? "share" : "brand");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState(status.error);

  const idx = STEPS.findIndex((x) => x.key === step);
  const update = (fn: (draft: Settings) => void) => {
    setS((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  };

  // Live-preview the accent colour
  useEffect(() => {
    document.body.style.setProperty("--accent", s.brand.accentColor);
  }, [s.brand.accentColor]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function save(extra?: Partial<Settings>) {
    setSaving(true);
    setError("");
    try {
      const body = { ...s, ...extra };
      const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      setS(d);
      setDirty(false);
      setToast("Saved");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    const isLastBeforeShare = STEPS[idx + 1]?.key === "share";
    const ok = dirty || isLastBeforeShare ? await save(isLastBeforeShare ? { setupComplete: true } : undefined) : true;
    if (ok && idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* Top bar */}
      <div className="glass-strong sticky top-3 z-20 mb-6 flex items-center gap-3 rounded-[20px] px-4 py-2.5">
        <Avatar brand={s.brand} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{s.brand.businessName || "Your business"}</p>
          <p className="muted text-[12px]">{s.setupComplete ? "Settings" : `Setup · step ${idx + 1} of ${STEPS.length}`}</p>
        </div>
        <a href="/" target="_blank" className="btn btn-ghost hidden !h-9 !px-3.5 !text-[14px] sm:inline-flex">View page</a>
        <button className="btn btn-primary !h-9 !px-4 !text-[14px]" disabled={!dirty || saving} onClick={() => save()}>
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
        {!status.devBypass && (
          <form action="/api/auth/logout" method="post">
            <button className="muted px-1 text-[13px] hover:opacity-70">Sign out</button>
          </form>
        )}
      </div>

      {status.devBypass && (
        <Notice tone="amber">Local preview: Google keys aren&apos;t set, so this screen opens without login and busy times aren&apos;t checked. Settings are saved to <code>.data/store.json</code>.</Notice>
      )}
      {!status.devBypass && !status.storageConfigured && (
        <Notice tone="red">No storage connected. In Vercel open <b>Storage → Upstash for Redis → Connect</b>, then redeploy. Your settings can&apos;t be saved until then.</Notice>
      )}
      {error && <Notice tone="red">{error}</Notice>}

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Steps nav */}
        <nav className="glass h-fit p-2 md:sticky md:top-24">
          {STEPS.map((x, i) => {
            const done = s.setupComplete || i < idx;
            return (
              <button
                key={x.key}
                onClick={() => setStep(x.key)}
                className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition ${step === x.key ? "bg-[var(--field)]" : "hover:bg-[var(--field)]/60"}`}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                  style={step === x.key ? { background: "var(--accent)", color: "#fff" } : done ? { background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" } : { background: "var(--field)" }}
                >
                  {done && step !== x.key ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium leading-tight">{x.title}</span>
                  <span className="muted block truncate text-[12px]">{x.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="glass fade-in p-5 sm:p-8" key={step}>
          {step === "brand" && <BrandStep s={s} update={update} />}
          {step === "calendar" && <CalendarStep s={s} update={update} status={status} />}
          {step === "hours" && <HoursStep s={s} update={update} />}
          {step === "events" && <EventsStep s={s} update={update} />}
          {step === "rules" && <RulesStep s={s} update={update} />}
          {step === "share" && <ShareStep s={s} setToast={setToast} />}

          <div className="mt-10 flex items-center justify-between border-t hair pt-5">
            <button className="btn btn-ghost" disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].key)}>
              <Chevron dir="left" /> Back
            </button>
            {idx < STEPS.length - 1 && (
              <button className="btn btn-primary" disabled={saving} onClick={next}>
                {STEPS[idx + 1].key === "share" ? (s.setupComplete ? "Save" : "Finish setup") : "Continue"} <Chevron />
              </button>
            )}
          </div>
        </section>
      </div>

      {toast && (
        <div className="glass-strong fade-in fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium">
          <Check className="h-4 w-4 text-[#34C759]" /> {toast}
        </div>
      )}
    </main>
  );
}

/* ---------- shared bits ---------- */

type StepProps = { s: Settings; update: (fn: (d: Settings) => void) => void };

function Notice({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const cls = tone === "red" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-amber-500/10";
  return <div className={`mb-5 rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${cls}`}>{children}</div>;
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-7">
      <h2 className="text-[24px] font-semibold tracking-tight">{title}</h2>
      <p className="muted mt-1 text-[15px]">{sub}</p>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b hair py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[16px] font-medium">{title}</p>
        {sub && <p className="muted text-[13px]">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function NumberSelect({ value, options, onChange, unit }: { value: number; options: number[]; onChange: (n: number) => void; unit: (n: number) => string }) {
  const opts = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <select className="field !w-auto min-w-[140px]" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {opts.map((n) => <option key={n} value={n}>{unit(n)}</option>)}
    </select>
  );
}

/* ---------- 1. Branding ---------- */

function BrandStep({ s, update }: StepProps) {
  async function onLogo(file: File) {
    const img = await createImageBitmap(file);
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    const url = canvas.toDataURL("image/png");
    update((d) => { d.brand.logoDataUrl = url; });
  }

  return (
    <>
      <Heading title="Make it yours" sub="This is what people see when they open your booking link." />
      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <div>
            <label className="label">Business name</label>
            <input className="field" value={s.brand.businessName} onChange={(e) => update((d) => { d.brand.businessName = e.target.value; })} placeholder="e.g. Northwind Studio" />
          </div>
          <div>
            <label className="label">Your name</label>
            <input className="field" value={s.brand.ownerName} onChange={(e) => update((d) => { d.brand.ownerName = e.target.value; })} placeholder="e.g. Sam" />
          </div>
          <div>
            <label className="label">Welcome line</label>
            <input className="field" value={s.brand.tagline} onChange={(e) => update((d) => { d.brand.tagline = e.target.value; })} placeholder="Pick a time that works for you." />
          </div>
          <div>
            <label className="label">Logo or photo</label>
            <div className="flex items-center gap-3">
              <Avatar brand={s.brand} size={56} />
              <label className="btn btn-ghost cursor-pointer">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
              </label>
              {s.brand.logoDataUrl && (
                <button className="muted text-[14px]" onClick={() => update((d) => { d.brand.logoDataUrl = ""; })}>Remove</button>
              )}
            </div>
            <p className="muted mt-2 text-[12px]">Square images look best. Without a logo, your initials are shown.</p>
          </div>
          <div>
            <label className="label">Accent colour</label>
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  aria-label={`Colour ${c}`}
                  onClick={() => update((d) => { d.brand.accentColor = c; })}
                  className="h-9 w-9 rounded-full transition hover:scale-105"
                  style={{ background: c, boxShadow: s.brand.accentColor.toLowerCase() === c.toLowerCase() ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : undefined }}
                />
              ))}
              <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border hair" title="Custom colour" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
                <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={s.brand.accentColor} onChange={(e) => update((d) => { d.brand.accentColor = e.target.value; })} />
              </label>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p className="label">Preview</p>
          <div className="glass-strong flex flex-col items-center rounded-[24px] p-6 text-center">
            <Avatar brand={s.brand} size={56} />
            <p className="mt-3 text-[18px] font-semibold">{s.brand.businessName || "Your business"}</p>
            {s.brand.ownerName && <p className="muted text-[13px]">with {s.brand.ownerName}</p>}
            <p className="mt-2 text-[14px]">{s.brand.tagline}</p>
            <div className="mt-4 w-full space-y-2">
              <div className="slot flex items-center justify-center">10:00</div>
              <div className="slot flex items-center justify-center" aria-pressed="true">10:30</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 2. Calendar ---------- */

function CalendarStep({ s, update, status }: StepProps & { status: Status }) {
  const connected = Boolean(status.calendarEmail);
  return (
    <>
      <Heading title="Connect your calendar" sub="Busy times in your Google Calendar are hidden automatically, and every booking is added to it." />
      <div className="glass-strong flex flex-wrap items-center gap-4 rounded-[22px] p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: connected ? "#34C759" : "var(--field)", color: connected ? "#fff" : "var(--muted)" }}>
          {connected ? <Check className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">{connected ? "Google Calendar connected" : "Not connected"}</p>
          <p className="muted truncate text-[14px]">
            {connected ? status.calendarEmail : status.googleConfigured ? "Click connect and allow both calendar permissions." : "Add your Google keys first (see the setup guide, step 3)."}
          </p>
        </div>
        {status.googleConfigured && (
          <a href="/api/auth/google" className={`btn ${connected ? "btn-ghost" : "btn-primary"}`}>{connected ? "Reconnect" : "Connect Google"}</a>
        )}
      </div>
      <ul className="muted mt-4 space-y-1.5 text-[13px]">
        <li>• We only see <i>when</i> you&apos;re busy, not what your meetings are about.</li>
        <li>• Guests get a Google Calendar invite by email as their confirmation.</li>
      </ul>

      <div className="mt-8">
        <label className="label">Your time zone</label>
        <select className="field max-w-sm" value={s.timezone} onChange={(e) => update((d) => { d.timezone = e.target.value; })}>
          {zones().map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
        </select>
        <p className="muted mt-2 text-[12px]">Your working hours are in this time zone. Guests automatically see times in theirs.</p>
      </div>
    </>
  );
}

/* ---------- 3. Hours ---------- */

function HoursStep({ s, update }: StepProps) {
  return (
    <>
      <Heading title="When can people book you?" sub="Set your weekly hours. Add a second block for things like a lunch break." />
      <div>
        {WEEKDAYS.map(({ key, label }) => {
          const day = s.weeklyHours[key];
          return (
            <div key={key} className="flex flex-wrap items-start gap-4 border-b hair py-4 last:border-b-0">
              <div className="flex w-40 items-center gap-3 pt-1.5">
                <Switch on={day.enabled} label={label} onChange={(v) => update((d) => { d.weeklyHours[key].enabled = v; })} />
                <span className={`text-[16px] font-medium ${day.enabled ? "" : "muted"}`}>{label}</span>
              </div>
              <div className="flex-1 space-y-2">
                {!day.enabled && <p className="muted pt-2 text-[15px]">Unavailable</p>}
                {day.enabled &&
                  day.ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" className="field !w-[120px]" value={r.start} onChange={(e) => update((d) => { d.weeklyHours[key].ranges[i].start = e.target.value; })} />
                      <span className="muted">–</span>
                      <input type="time" className="field !w-[120px]" value={r.end} onChange={(e) => update((d) => { d.weeklyHours[key].ranges[i].end = e.target.value; })} />
                      {day.ranges.length > 1 && (
                        <button className="muted p-2 hover:text-red-500" aria-label="Remove block" onClick={() => update((d) => { d.weeklyHours[key].ranges.splice(i, 1); })}>
                          <Trash />
                        </button>
                      )}
                      {r.start >= r.end && <span className="text-[12px] text-red-500">End must be after start</span>}
                    </div>
                  ))}
              </div>
              {day.enabled && (
                <div className="flex gap-1 pt-1">
                  <button className="btn btn-ghost !h-9 !px-3 !text-[13px]" onClick={() => update((d) => { const last = d.weeklyHours[key].ranges.at(-1)!; d.weeklyHours[key].ranges.push({ start: last.end, end: last.end < "20:00" ? "20:00" : "23:59" }); })}>
                    <Plus /> Block
                  </button>
                  <button
                    className="btn btn-ghost !h-9 !px-3 !text-[13px]"
                    title="Copy these hours to all other enabled days"
                    onClick={() => update((d) => { for (const w of WEEKDAYS) if (w.key !== key && d.weeklyHours[w.key].enabled) d.weeklyHours[w.key].ranges = structuredClone(day.ranges); })}
                  >
                    <Copy /> Copy to all
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- 4. Meeting types ---------- */

const DURATIONS = [15, 20, 30, 45, 60, 90];
const BUFFERS = [0, 5, 10, 15, 20, 30, 45, 60];
const COLORS = ["#0A84FF", "#BF5AF2", "#FF375F", "#FF9F0A", "#30D158", "#64D2FF"];

function EventsStep({ s, update }: StepProps) {
  const [open, setOpen] = useState<string | null>(s.eventTypes[0]?.id ?? null);
  const set = (id: string, fn: (e: EventType) => void) => update((d) => { const e = d.eventTypes.find((x) => x.id === id); if (e) fn(e); });

  return (
    <>
      <Heading title="Meeting types" sub="Each type gets its own link, duration and intake questions." />
      <div className="space-y-3">
        {s.eventTypes.map((e) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id} className="glass-strong overflow-hidden rounded-[22px]">
              <button className="flex w-full items-center gap-3 px-5 py-4 text-left" onClick={() => setOpen(isOpen ? null : e.id)}>
                <span className="h-9 w-1.5 rounded-full" style={{ background: e.color }} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[16px] font-semibold ${e.active ? "" : "muted"}`}>{e.title || "Untitled"}</span>
                  <span className="muted flex items-center gap-1.5 text-[13px]">
                    {e.durationMinutes} min · <LocationIcon type={e.location} className="h-3.5 w-3.5" /> · /{e.slug}{e.active ? "" : " · hidden"}
                  </span>
                </span>
                <Chevron className={`muted h-5 w-5 transition ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="space-y-5 border-t hair px-5 pb-6 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Name</label>
                      <input
                        className="field"
                        value={e.title}
                        onChange={(ev) => set(e.id, (x) => {
                          const autoSlug = x.slug === slugify(x.title) || x.slug === "new-meeting";
                          x.title = ev.target.value;
                          if (autoSlug) x.slug = slugify(ev.target.value);
                        })}
                      />
                    </div>
                    <div>
                      <label className="label">Link</label>
                      <div className="field flex items-center !py-0">
                        <span className="muted">/</span>
                        <input className="w-full bg-transparent py-2.5 outline-none" value={e.slug} onChange={(ev) => set(e.id, (x) => { x.slug = slugify(ev.target.value); })} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea rows={2} className="field resize-none" value={e.description} onChange={(ev) => set(e.id, (x) => { x.description = ev.target.value; })} />
                  </div>

                  <div>
                    <label className="label">Duration</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="segmented">
                        {DURATIONS.map((m) => (
                          <button key={m} aria-pressed={e.durationMinutes === m} onClick={() => set(e.id, (x) => { x.durationMinutes = m; })}>{m}</button>
                        ))}
                      </div>
                      <input type="number" min={5} max={480} className="field !w-24 !py-1.5" value={e.durationMinutes} onChange={(ev) => set(e.id, (x) => { x.durationMinutes = Number(ev.target.value); })} />
                      <span className="muted text-[14px]">min</span>
                    </div>
                  </div>

                  <div>
                    <label className="label">Location</label>
                    <div className="segmented">
                      {(["meet", "phone", "in_person"] as LocationType[]).map((l) => (
                        <button key={l} aria-pressed={e.location === l} onClick={() => set(e.id, (x) => { x.location = l; })}>
                          {l === "meet" ? "Google Meet" : l === "phone" ? "Phone" : "In person"}
                        </button>
                      ))}
                    </div>
                    {e.location === "meet" && <p className="muted mt-2 text-[12px]">A unique Meet link is created for every booking.</p>}
                    {e.location === "phone" && <p className="muted mt-2 text-[12px]">Guests are asked for their phone number.</p>}
                    {e.location === "in_person" && (
                      <input className="field mt-2" placeholder="Address" value={e.locationDetail} onChange={(ev) => set(e.id, (x) => { x.locationDetail = ev.target.value; })} />
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Buffer before</label>
                      <NumberSelect value={e.bufferBeforeMinutes} options={BUFFERS} unit={(n) => (n ? `${n} min` : "None")} onChange={(n) => set(e.id, (x) => { x.bufferBeforeMinutes = n; })} />
                    </div>
                    <div>
                      <label className="label">Buffer after</label>
                      <NumberSelect value={e.bufferAfterMinutes} options={BUFFERS} unit={(n) => (n ? `${n} min` : "None")} onChange={(n) => set(e.id, (x) => { x.bufferAfterMinutes = n; })} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Colour</label>
                    <div className="flex gap-2">
                      {COLORS.map((c) => (
                        <button key={c} aria-label={c} onClick={() => set(e.id, (x) => { x.color = c; })} className="h-7 w-7 rounded-full" style={{ background: c, boxShadow: e.color === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : undefined }} />
                      ))}
                    </div>
                  </div>

                  <QuestionsEditor
                    questions={e.questions}
                    onChange={(qs) => set(e.id, (x) => { x.questions = qs; })}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t hair pt-4">
                    <label className="flex items-center gap-3 text-[15px]">
                      <Switch on={e.active} label="Bookable" onChange={(v) => set(e.id, (x) => { x.active = v; })} />
                      {e.active ? "Bookable" : "Hidden"}
                    </label>
                    <button
                      className="inline-flex items-center gap-1.5 text-[14px] text-red-500 hover:opacity-80"
                      onClick={() => confirm(`Delete “${e.title}”?`) && update((d) => { d.eventTypes = d.eventTypes.filter((x) => x.id !== e.id); })}
                    >
                      <Trash /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="btn btn-ghost mt-4"
        onClick={() => {
          const ev = blankEventType({ color: COLORS[s.eventTypes.length % COLORS.length] });
          update((d) => { d.eventTypes.push(ev); });
          setOpen(ev.id);
        }}
      >
        <Plus /> Add meeting type
      </button>
    </>
  );
}

function QuestionsEditor({ questions, onChange }: { questions: Question[]; onChange: (q: Question[]) => void }) {
  const edit = (i: number, patch: Partial<Question>) => onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <div>
      <label className="label">Questions for the guest</label>
      <p className="muted -mt-1 mb-3 text-[12px]">Name and email are always asked. Answers appear in your calendar event.</p>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="flex flex-wrap items-center gap-2">
            <input className="field min-w-[200px] flex-1" placeholder="Question" value={q.label} onChange={(e) => edit(i, { label: e.target.value })} />
            <select className="field !w-auto" value={q.type} onChange={(e) => edit(i, { type: e.target.value as Question["type"] })}>
              <option value="text">Short answer</option>
              <option value="textarea">Long answer</option>
              <option value="phone">Phone number</option>
            </select>
            <label className="muted flex items-center gap-2 text-[13px]">
              <Switch on={q.required} label="Required" onChange={(v) => edit(i, { required: v })} /> Required
            </label>
            <button className="muted p-2 hover:text-red-500" aria-label="Remove question" onClick={() => onChange(questions.filter((_, j) => j !== i))}>
              <Trash />
            </button>
          </div>
        ))}
      </div>
      <button className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: "var(--accent)" }} onClick={() => onChange([...questions, { id: newId(), label: "", type: "text", required: false }])}>
        <Plus /> Add question
      </button>
    </div>
  );
}

/* ---------- 5. Rules ---------- */

function RulesStep({ s, update }: StepProps) {
  const r = s.rules;
  return (
    <>
      <Heading title="Booking rules" sub="Protect your time. These apply to all meeting types." />
      <Row title="Minimum notice" sub="How soon someone can book before the meeting starts">
        <NumberSelect value={r.minNoticeHours} options={[0, 1, 2, 4, 8, 12, 24, 48, 72]} unit={(n) => (n === 0 ? "No minimum" : n < 24 ? `${n} hour${n > 1 ? "s" : ""}` : `${n / 24} day${n > 24 ? "s" : ""}`)} onChange={(n) => update((d) => { d.rules.minNoticeHours = n; })} />
      </Row>
      <Row title="Booking window" sub="How far into the future people can book">
        <NumberSelect value={r.bookingWindowDays} options={[7, 14, 30, 60, 90, 180]} unit={(n) => `${n} days`} onChange={(n) => update((d) => { d.rules.bookingWindowDays = n; })} />
      </Row>
      <Row title="Daily limit" sub="Maximum bookings through this page per day">
        <NumberSelect value={r.dailyLimit} options={[0, 1, 2, 3, 4, 5, 6, 8, 10]} unit={(n) => (n === 0 ? "Unlimited" : `${n} per day`)} onChange={(n) => update((d) => { d.rules.dailyLimit = n; })} />
      </Row>
      <Row title="Start times every" sub="e.g. 30 min → 9:00, 9:30, 10:00…">
        <NumberSelect value={r.slotIntervalMinutes} options={[10, 15, 20, 30, 60]} unit={(n) => `${n} min`} onChange={(n) => update((d) => { d.rules.slotIntervalMinutes = n; })} />
      </Row>
    </>
  );
}

/* ---------- 6. Share ---------- */

function ShareStep({ s, setToast }: { s: Settings; setToast: (t: string) => void }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setToast("Link copied");
  };
  const links = [{ label: "All meetings", url: `${origin}/` }, ...s.eventTypes.filter((e) => e.active).map((e) => ({ label: e.title, url: `${origin}/${e.slug}` }))];

  return (
    <>
      <Heading title={s.setupComplete ? "You're live 🎉" : "Your booking links"} sub="Share these in your email signature, website, or socials." />
      <div className="space-y-2">
        {links.map((l) => (
          <div key={l.url} className="glass-strong flex items-center gap-3 rounded-[18px] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{l.label}</p>
              <a href={l.url} target="_blank" rel="noreferrer" className="block truncate text-[14px]" style={{ color: "var(--accent)" }}>{l.url}</a>
            </div>
            <button className="btn btn-ghost !h-9 !px-3.5 !text-[13px]" onClick={() => copy(l.url)}><Copy /> Copy</button>
          </div>
        ))}
      </div>
      <p className="muted mt-6 text-[13px]">Tip: want a nicer address like <b>book.yourbusiness.com</b>? See “Custom domain” in the setup guide.</p>
    </>
  );
}
