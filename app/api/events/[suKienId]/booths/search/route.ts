import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { searchQuayCatalog } from "@/lib/shop/quay";

type Ctx = { params: Promise<{ suKienId: string }> };

const MODES = new Set(["shop", "mat-hang", "hang"]);

/**
 * GET /api/events/:suKienId/booths/search?q=&mode=
 * Search trong seller có quầy đã duyệt — bổ sung catalog SSR/lazy.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { suKienId } = await ctx.params;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const modeRaw = url.searchParams.get("mode")?.trim() ?? "hang";
  if (q.length < 1) {
    return NextResponse.json({ shops: [], hangBySeller: {} });
  }
  if (q.length > 64) {
    return NextResponse.json({ error: "Từ khóa quá dài." }, { status: 400 });
  }
  if (!MODES.has(modeRaw)) {
    return NextResponse.json({ error: "mode không hợp lệ." }, { status: 400 });
  }
  const mode = modeRaw as "shop" | "mat-hang" | "hang";

  try {
    const session = await getCurrentSessionAndProfile();
    const result = await searchQuayCatalog(suKienId, q, mode, {
      actorId: session?.profile?.id,
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
      },
    });
  } catch (e) {
    console.error("[api/events/booths/search]", e);
    return NextResponse.json(
      { error: "Không tìm được hàng quầy." },
      { status: 500 },
    );
  }
}
