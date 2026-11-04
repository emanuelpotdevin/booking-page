import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "gb_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
export const ownerEmail = (process.env.OWNER_EMAIL || "").trim().toLowerCase();

/** Local preview without Google keys: the setup screen opens without login (never in production). */
export const devBypass = !googleConfigured && process.env.NODE_ENV !== "production";

function secret() {
  return process.env.SESSION_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim() || "local-dev-only-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionValue(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionValue(value: string | undefined): { email: string } | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (ownerEmail && data.email !== ownerEmail) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export const sessionCookie = { name: COOKIE, maxAge: MAX_AGE };

export async function isOwner() {
  if (devBypass) return true;
  const jar = await cookies();
  return readSessionValue(jar.get(COOKIE)?.value) !== null;
}
