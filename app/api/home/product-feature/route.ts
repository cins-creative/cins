import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadHangFeature,
  parseHangFeatureSeenCookie,
} from "@/lib/cins/home-adaptive/hang-feature";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET /api/home/hang-feature?limit=3&exclude=id1,id2               ║
   ║ Đổi batch gợi ý «Hàng feature» (exclude = đang hiện / đã xem).   ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "3");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(10, Math.max(1, Math.round(rawLimit)))
    : 3;
  const excludeIds = parseHangFeatureSeenCookie(
    url.searchParams.get("exclude"),
  );

  try {
    const items = await loadHangFeature(session.profile.id, {
      limit,
      excludeIds,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[hang-feature]", err);
    return NextResponse.json(
      { error: "Không tải được gợi ý hàng." },
      { status: 500 },
    );
  }
}
