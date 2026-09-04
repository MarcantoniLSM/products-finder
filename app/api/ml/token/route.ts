import { NextResponse } from "next/server";
import { readMlSessionTokens } from "@/lib/mercado-livre";

export async function GET() {
  const tokens = await readMlSessionTokens();

  if (!tokens.accessToken && !tokens.refreshToken) {
    return NextResponse.json({ error: "Mercado Livre session token was not found." }, { status: 404 });
  }

  return NextResponse.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  });
}
