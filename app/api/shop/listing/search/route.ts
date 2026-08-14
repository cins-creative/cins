import { NextResponse } from "next/server";

import { searchPublicShopListing } from "@/lib/shop/cua-hang-listing";

const MODES = new Set(["shop", "mat-hang", "hang"]);

/**
 * GET /api/shop/listing/search?q=&mode=
 * Công khai — bổ sung kết quả hub `/shopping` ngoài catalog SSR.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const modeRaw = url.searchParams.get("mode")?.trim() ?? "hang";
  if (q.length < 1) {
    return NextResponse.json({ shops: [] });
  }
  if (q.length > 64) {
    return NextResponse.json({ error: "Từ khóa quá dài." }, { status: 400 });
  }
  if (!MODES.has(modeRaw)) {
    return NextResponse.json({ error: "mode không hợp lệ." }, { status: 400 });
  }
  const mode = modeRaw as "shop" | "mat-hang" | "hang";

  try {
    const shops = await searchPublicShopListing(q, mode);
    return NextResponse.json(
      { shops },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (e) {
    console.error("[api/shop/listing/search]", e);
    return NextResponse.json(
      { error: "Không tìm được hàng." },
      { status: 500 },
    );
  }
}
