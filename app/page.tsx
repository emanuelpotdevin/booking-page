import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Chevron, Clock, LocationIcon, locationLabel } from "@/components/icons";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await getSettings();
  const events = s.eventTypes.filter((e) => e.active);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-12 sm:py-20">
      <header className="fade-in flex flex-col items-center text-center">
        <Avatar brand={s.brand} size={76} />
        <h1 className="mt-5 text-[28px] font-semibold tracking-tight">{s.brand.businessName}</h1>
        {s.brand.ownerName && <p className="muted mt-0.5 text-[15px]">with {s.brand.ownerName}</p>}
        <p className="mt-3 max-w-sm text-[17px] leading-snug">{s.brand.tagline}</p>
      </header>

      <section className="glass fade-in mt-10 overflow-hidden" style={{ animationDelay: "80ms" }}>
        {events.length === 0 && <p className="muted p-8 text-center">No meetings available right now.</p>}
        {events.map((e, i) => (
          <Link
            key={e.id}
            href={`/${e.slug}`}
            className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-white/30 dark:hover:bg-white/5 ${i ? "border-t hair" : ""}`}
          >
            <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold">{e.title}</p>
              <p className="muted mt-0.5 flex items-center gap-3 text-[14px]">
                <span className="flex items-center gap-1"><Clock /> {e.durationMinutes} min</span>
                <span className="flex items-center gap-1"><LocationIcon type={e.location} /> {locationLabel(e.location)}</span>
              </p>
            </div>
            <Chevron className="muted h-5 w-5 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      <footer className="muted mt-auto pt-12 text-center text-[12px]">Times shown in your own time zone · <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy</Link></footer>
    </main>
  );
}
