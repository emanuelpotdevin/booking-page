import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google";
import { appOrigin } from "@/lib/origin";
import { createSessionValue, ownerEmail, sessionCookie } from "@/lib/session";
import { getTokens, saveTokens } from "@/lib/store";

export async function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const fail = (code: string) => NextResponse.redirect(new URL(`/admin?error=${code}`, origin));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (req.nextUrl.searchParams.get("error")) return fail("google_denied");
  if (!code || !state || state !== req.cookies.get("gb_oauth_state")?.value) return fail("state_mismatch");
  if (!ownerEmail) return fail("owner_email_missing");

  try {
    const t = await exchangeCode(code, `${origin}/api/auth/callback`);
    if (t.email !== ownerEmail) return fail("not_owner");
    if (!t.scope.includes("calendar.events") || !t.scope.includes("calendar.freebusy")) return fail("missing_scope");

    const existing = await getTokens();
    const refreshToken = t.refreshToken || existing?.refreshToken;
    if (!refreshToken) return fail("no_refresh_token");
    await saveTokens({ refreshToken, accessToken: t.accessToken, expiresAt: t.expiresAt, email: t.email });

    const res = NextResponse.redirect(new URL("/admin?connected=1", origin));
    res.cookies.set(sessionCookie.name, createSessionValue(t.email), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionCookie.maxAge,
      path: "/",
    });
    res.cookies.delete("gb_oauth_state");
    return res;
  } catch (e) {
    console.error(e);
    return fail("google_error");
  }
}
