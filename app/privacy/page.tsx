import Link from "next/link";
import { Chevron } from "@/components/icons";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Privacy policy" };

export default async function Privacy() {
  const s = await getSettings();
  const owner = s.brand.businessName || s.brand.ownerName;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Link href="/" className="muted mb-6 inline-flex items-center gap-1 text-[14px] hover:opacity-80">
        <Chevron dir="left" /> Back
      </Link>
      <article className="glass space-y-4 p-6 text-[15px] leading-relaxed sm:p-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Privacy policy</h1>
        <p className="muted">This booking page is run by {owner}.</p>

        <h2 className="pt-2 text-[17px] font-semibold">What we collect when you book</h2>
        <p>Your name, email address, the time you picked, and any answers you give to the questions on the booking form (and your phone number for phone calls). We also note your time zone so the invite shows the right time.</p>

        <h2 className="pt-2 text-[17px] font-semibold">How it is used</h2>
        <p>Only to schedule and hold the meeting you booked. Your details are added to {owner}&apos;s Google Calendar as a calendar event, and Google Calendar sends you the invitation. We don&apos;t sell or share your details, and we don&apos;t use them for advertising.</p>

        <h2 className="pt-2 text-[17px] font-semibold">Google Calendar access</h2>
        <p>The page owner connects their own Google Calendar. The page only checks <em>when</em> the owner is busy (not what their other meetings are about) and creates the event for your booking. Use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>

        <h2 className="pt-2 text-[17px] font-semibold">How long we keep it</h2>
        <p>Your booking lives in the owner&apos;s Google Calendar for as long as they keep that event. This page itself doesn&apos;t store your booking.</p>

        <h2 className="pt-2 text-[17px] font-semibold">Your rights</h2>
        <p>To see, change or delete your details, reply to your calendar invitation or contact {owner}.</p>
      </article>
    </main>
  );
}
