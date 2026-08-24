import { NextResponse } from "next/server";

import { runGlobalSearch } from "@/lib/search/global-search";

/**
 * GET /api/search?q=&kind=
 * JSON cho app native (R15) — bọc `runGlobalSearch` (cùng logic /search web).
 * Public; Bearer tùy chọn (một số rank quan hệ user nếu sau này cần).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const kind = url.searchParams.get("kind")?.trim() ?? "all";

  if (q.length > 120) {
    return NextResponse.json({ error: "Từ khóa quá dài." }, { status: 400 });
  }

  const result = await runGlobalSearch({ q, kind });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
    },
  });
}
