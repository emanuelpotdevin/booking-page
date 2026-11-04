import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/store";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `Book a meeting · ${s.brand.businessName}`,
    description: s.brand.tagline,
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="en">
      <body style={{ ["--accent" as string]: s.brand.accentColor }} className="min-h-dvh">
        <div className="backdrop">
          <span />
        </div>
        {children}
      </body>
    </html>
  );
}
