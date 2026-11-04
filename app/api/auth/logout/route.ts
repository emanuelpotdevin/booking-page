import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/origin";
import { sessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin", appOrigin(req)), 303);
  res.cookies.delete(sessionCookie.name);
  return res;
}
