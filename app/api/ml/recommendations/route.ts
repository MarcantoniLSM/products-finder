import { NextRequest, NextResponse } from "next/server";
import { fetchMlRecommendations } from "@/lib/mercado-livre";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  if (!query && !categoryId) {
    return NextResponse.json(
      { error: "Use q or categoryId to generate Mercado Livre recommendations." },
      { status: 400 }
    );
  }

  try {
    const data = await fetchMlRecommendations({ query, categoryId, offset, limit });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Mercado Livre error." },
      { status: 500 }
    );
  }
}
