import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { authUrl } from "@/lib/google";
import { appOrigin } from "@/lib/origin";
import { googleConfigured } from "@/lib/session";

export async function GET(req: NextRequest) {
  if (!googleConfigured) {
    return NextResponse.redirect(new URL("/admin?error=google_not_configured", appOrigin(req)));
  }
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(`${appOrigin(req)}/api/auth/callback`, state));
  res.cookies.set("gb_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
