import { NextRequest, NextResponse } from "next/server";
import { computeSlots } from "@/lib/availability";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const settings = await getSettings();
  const event = settings.eventTypes.find((e) => e.slug === sp.get("event") && e.active);
  if (!event) return NextResponse.json({ error: "Meeting type not found" }, { status: 404 });

  const from = new Date(sp.get("from") || Date.now());
  const to = new Date(sp.get("to") || Date.now() + 31 * 86400_000);
  if (isNaN(+from) || isNaN(+to) || +to - +from > 62 * 86400_000) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }
  try {
    const { slots, preview } = await computeSlots(settings, event, from, to);
    return NextResponse.json({ slots: slots.map((s) => new Date(s).toISOString()), preview });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 502 });
  }
}
