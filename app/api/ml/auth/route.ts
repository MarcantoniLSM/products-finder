import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildMlAuthorizationUrl } from "@/lib/mercado-livre";

export async function GET() {
  const state = crypto.randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set("ml_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });

  return NextResponse.redirect(buildMlAuthorizationUrl(state));
}
