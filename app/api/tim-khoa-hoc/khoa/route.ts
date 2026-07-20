import { NextResponse } from "next/server";

import { TKH_KHOA_PAGE_SIZE } from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-page-size";
import { loadKhoaHocListing } from "@/lib/to-chuc/khoa-hoc-listing";

const MAX_LIMIT = 48;

/**
 * GET /api/tim-khoa-hoc/khoa — trang tiếp theo cho hub khóa học (catalog công khai).
 * Query: offset, limit, q
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limitRaw = Number(searchParams.get("limit") ?? TKH_KHOA_PAGE_SIZE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.isFinite(limitRaw) ? Math.floor(limitRaw) : TKH_KHOA_PAGE_SIZE,
    ),
  );
  const q = (searchParams.get("q") ?? "").trim();

  const page = await loadKhoaHocListing(limit, offset, q || undefined);
  return NextResponse.json(page);
}
