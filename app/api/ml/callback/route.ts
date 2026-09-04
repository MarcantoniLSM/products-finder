import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeMlCode, setMlTokenCookies } from "@/lib/mercado-livre";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ml_oauth_state")?.value;

  if (!code) {
    return redirectWithStatus(request, "missing_code");
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return redirectWithStatus(request, "invalid_state");
  }

  try {
    const token = await exchangeMlCode(code);
    setMlTokenCookies(cookieStore, token);
    cookieStore.delete("ml_oauth_state");
    return redirectWithStatus(request, "connected");
  } catch (error) {
    console.error(error);
    return redirectWithStatus(request, "token_error");
  }
}

function redirectWithStatus(request: NextRequest, status: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("ml", status);
  return NextResponse.redirect(url);
}
