import { NextResponse, type NextRequest } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  GIF_BROWSE_RATE_MAX,
  GIF_BROWSE_RATE_WINDOW_MS,
} from "@/lib/gif/constants";
import { gifRateLimited } from "@/lib/gif/rate-limit";
import { searchGifs } from "@/lib/gif/tenor-compat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/gif/search?q=&pos= — proxy Giphy Tenor-compat search. */
export async function GET(request: NextRequest) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  if (
    gifRateLimited(
      `gif:browse:${session.profile.id}`,
      GIF_BROWSE_RATE_MAX,
      GIF_BROWSE_RATE_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Bạn tìm GIF quá nhanh. Đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const pos = request.nextUrl.searchParams.get("pos");
  const result = await searchGifs({ q, pos });

  if (!result.ok) {
    if (result.error.kind === "missing_key") {
      return NextResponse.json(
        {
          error: "GIF chưa cấu hình (thiếu GIPHY_API_KEY).",
          code: "missing_key",
        },
        { status: 503 },
      );
    }
    if (result.error.kind === "upstream" && result.error.status === 429) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: result.error.message },
      { status: 502 },
    );
  }

  return NextResponse.json(result.page);
}
