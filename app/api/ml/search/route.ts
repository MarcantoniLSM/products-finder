import { NextRequest, NextResponse } from "next/server";
import { fetchMlHighlightedItems, searchMlItems } from "@/lib/mercado-livre";

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

  if (!query && !categoryId) {
    return NextResponse.json(
      { error: "Use q or categoryId to search Mercado Livre items." },
      { status: 400 }
    );
  }

  try {
    const data = await searchMlItems({ query, categoryId, offset, limit });
    return NextResponse.json(data);
  } catch (error) {
    if (categoryId && isForbiddenSearchError(error)) {
      try {
        const data = await fetchMlHighlightedItems({ categoryId, offset, limit });
        return NextResponse.json(data);
      } catch (fallbackError) {
        return NextResponse.json(
          {
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unexpected Mercado Livre highlights error."
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Mercado Livre error." },
      { status: 500 }
    );
  }
}

function isForbiddenSearchError(error: unknown) {
  return error instanceof Error && error.message.includes("403");
}
