import type { Brand } from "@/lib/types";

export function Avatar({ brand, size = 64 }: { brand: Brand; size?: number }) {
  if (brand.logoDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logoDataUrl} alt={brand.businessName} width={size} height={size} className="rounded-[22%] object-cover shadow-sm" style={{ width: size, height: size }} />;
  }
  const initials = (brand.businessName || brand.ownerName || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-[22%] font-semibold text-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.38, background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 80%, white), var(--accent))" }}
    >
      {initials}
    </div>
  );
}
