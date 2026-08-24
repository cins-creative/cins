import { NextResponse } from "next/server";

import { listPublicShopCuaHang } from "@/lib/shop/cua-hang-listing";

/**
 * GET /api/shop/listing?mode=hang|shop
 * JSON public hub `/shopping` cho app native (R9) — không SSR.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modeRaw = url.searchParams.get("mode")?.trim() ?? "hang";
  const mode = modeRaw === "shop" ? "shop" : "hang";

  try {
    const shops = await listPublicShopCuaHang(mode);
    return NextResponse.json(
      { shops, mode },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (e) {
    console.error("[api/shop/listing]", e);
    return NextResponse.json(
      { error: "Không tải được danh sách cửa hàng." },
      { status: 500 },
    );
  }
}
