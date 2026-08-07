import { NextResponse } from "next/server";

import { listDanhMucTree, suggestDanhMucFromTen } from "@/lib/shop/danh-muc";
import {
  listFacetsForHub,
  suggestGiaTriFromText,
} from "@/lib/shop/thuoc-tinh";

/**
 * GET /api/shop/danh-muc
 * Taxonomy cho Kho / filter: danh mục + facet hub + giá trị `hien`.
 *
 * Query:
 * - `q` — gợi ý danh mục từ tên loại (alias)
 * - `facet` + `q` — gợi ý giá trị trong facet (vd. fandom)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const facet = url.searchParams.get("facet")?.trim() ?? "";

  try {
    if (q && facet) {
      const suggestions = await suggestGiaTriFromText(facet, q, 8);
      return NextResponse.json(
        { suggestions },
        {
          headers: {
            "Cache-Control": "private, max-age=30",
          },
        },
      );
    }

    if (q) {
      const suggestions = await suggestDanhMucFromTen(q, 5);
      return NextResponse.json(
        { suggestions },
        {
          headers: {
            "Cache-Control": "private, max-age=30",
          },
        },
      );
    }

    const [danhMuc, facets] = await Promise.all([
      listDanhMucTree({ nganhHang: "merch" }),
      listFacetsForHub({ nganhHang: "merch" }),
    ]);

    return NextResponse.json(
      { danhMuc, facets },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    console.error("[api/shop/danh-muc]", e);
    return NextResponse.json(
      { error: "Không tải được danh mục." },
      { status: 500 },
    );
  }
}
