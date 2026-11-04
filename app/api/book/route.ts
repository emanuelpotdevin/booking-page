import { NextRequest, NextResponse } from "next/server";
import { computeSlots } from "@/lib/availability";
import { calendarConnected, createEvent } from "@/lib/google";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const settings = await getSettings();
  const event = settings.eventTypes.find((e) => e.slug === body.event && e.active);
  if (!event) return NextResponse.json({ error: "Meeting type not found" }, { status: 404 });

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  if (!name || !EMAIL.test(email)) return NextResponse.json({ error: "Please enter your name and a valid email." }, { status: 400 });

  const phone = String(body.phone || "").trim().slice(0, 40);
  if (event.location === "phone" && phone.replace(/\D/g, "").length < 6) {
    return NextResponse.json({ error: "Please enter a phone number we can call." }, { status: 400 });
  }

  const answers: Record<string, string> = body.answers || {};
  for (const q of event.questions) {
    if (q.required && !String(answers[q.id] || "").trim()) {
      return NextResponse.json({ error: `Please answer: ${q.label}` }, { status: 400 });
    }
  }

  const start = Date.parse(body.start);
  if (isNaN(start)) return NextResponse.json({ error: "Invalid time" }, { status: 400 });

  // Re-check the slot is still free (someone may have booked it a moment ago)
  const { slots } = await computeSlots(settings, event, new Date(start - 60_000), new Date(start + 60_000));
  if (!slots.includes(start)) {
    return NextResponse.json({ error: "Sorry, that time is no longer available. Please pick another one." }, { status: 409 });
  }

  const end = start + event.durationMinutes * 60_000;
  const guestTz = String(body.timezone || settings.timezone);

  if (!(await calendarConnected())) {
    // Preview mode — nothing is written anywhere.
    return NextResponse.json({ ok: true, preview: true, start: new Date(start).toISOString(), end: new Date(end).toISOString(), meetLink: "" });
  }

  const qa = event.questions
    .map((q) => `${q.label}\n${String(answers[q.id] || "—").slice(0, 2000)}`)
    .join("\n\n");
  const description = [
    `Booked by ${name} (${email}) via your booking page.`,
    `Guest time zone: ${guestTz}`,
    phone ? `Phone: ${phone}` : "",
    qa ? `\n${qa}` : "",
  ].join("\n");

  try {
    const created = await createEvent({
      summary: `${event.title} — ${name}`,
      description,
      startISO: new Date(start).toISOString(),
      endISO: new Date(end).toISOString(),
      timeZone: settings.timezone,
      guestName: name,
      guestEmail: email,
      withMeet: event.location === "meet",
      location: event.location === "in_person" ? event.locationDetail : event.location === "phone" ? `Phone call — ${phone}` : undefined,
      eventTypeId: event.id,
    });
    return NextResponse.json({ ok: true, preview: false, start: new Date(start).toISOString(), end: new Date(end).toISOString(), meetLink: created.meetLink });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Booking failed. Please try again in a moment." }, { status: 502 });
  }
}
