import { NextRequest, NextResponse } from "next/server";
import { RESERVED_SLUGS, slugify } from "@/lib/defaults";
import { isOwner } from "@/lib/session";
import { getSettings, saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwner())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json(await getSettings());
}

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
};

export async function PUT(req: NextRequest) {
  if (!(await isOwner())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json()) as Settings;

  if (body.brand?.logoDataUrl && body.brand.logoDataUrl.length > 400_000) {
    return NextResponse.json({ error: "Logo is too large" }, { status: 400 });
  }

  const seen = new Set<string>();
  for (const e of body.eventTypes ?? []) {
    let slug = slugify(e.slug || e.title);
    if (RESERVED_SLUGS.includes(slug)) slug = `${slug}-meeting`;
    while (seen.has(slug)) slug = `${slug}-2`;
    seen.add(slug);
    e.slug = slug;
    e.durationMinutes = clamp(e.durationMinutes, 5, 480, 30);
    e.bufferBeforeMinutes = clamp(e.bufferBeforeMinutes, 0, 240, 0);
    e.bufferAfterMinutes = clamp(e.bufferAfterMinutes, 0, 240, 0);
    e.questions = (e.questions ?? []).filter((q) => q.label?.trim());
  }
  body.rules = {
    minNoticeHours: clamp(body.rules?.minNoticeHours, 0, 24 * 60, 4),
    bookingWindowDays: clamp(body.rules?.bookingWindowDays, 1, 365, 30),
    dailyLimit: clamp(body.rules?.dailyLimit, 0, 50, 0),
    slotIntervalMinutes: clamp(body.rules?.slotIntervalMinutes, 5, 240, 30),
  };

  try {
    await saveSettings(body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  return NextResponse.json(body);
}
