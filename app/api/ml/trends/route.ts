import { NextRequest, NextResponse } from "next/server";
import { fetchMlTrends } from "@/lib/mercado-livre";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;
    const trends = await fetchMlTrends(categoryId);
    return NextResponse.json({ trends });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Mercado Livre error." },
      { status: 500 }
    );
  }
}
