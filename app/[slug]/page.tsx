import { notFound } from "next/navigation";
import BookingFlow from "@/components/BookingFlow";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  const event = s.eventTypes.find((e) => e.slug === slug && e.active);
  if (!event) notFound();
  return <BookingFlow brand={s.brand} event={event} ownerTimezone={s.timezone} />;
}
