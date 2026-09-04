import { NextRequest, NextResponse } from "next/server";
import { fetchMlHighlights } from "@/lib/mercado-livre";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required." }, { status: 400 });
  }

  try {
    const highlights = await fetchMlHighlights(categoryId);
    return NextResponse.json(highlights);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Mercado Livre error." },
      { status: 500 }
    );
  }
}
