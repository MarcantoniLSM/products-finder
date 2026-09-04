import { NextRequest, NextResponse } from "next/server";
import { fetchMlCategories, fetchMlCategory } from "@/lib/mercado-livre";

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const categories = categoryId ? await fetchMlCategory(categoryId) : await fetchMlCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Mercado Livre error." },
      { status: 500 }
    );
  }
}
