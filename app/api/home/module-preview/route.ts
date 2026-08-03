import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadModulePreview,
  parseModulePreviewId,
} from "@/lib/cins/home-adaptive/module-preview";
import {
  resolveSeeking,
  type GiaiDoan,
} from "@/lib/cins/home-adaptive/persona";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET /api/home/module-preview?id=theo_doi_org                     ║
   ║ Preview data cho khối sidebar khi thêm trong edit mode.          ║
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
  const id = parseModulePreviewId(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Module không hợp lệ." }, { status: 422 });
  }

  const rawLimit = Number(url.searchParams.get("limit") ?? "3");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(10, Math.max(1, Math.round(rawLimit)))
    : 3;

  const giaiDoan = (session.profile.giai_doan ?? null) as GiaiDoan | null;
  try {
    const payload = await loadModulePreview(id, {
      viewerId: session.profile.id,
      viewerSlug: session.profile.slug,
      giaiDoan,
      seeking: resolveSeeking(giaiDoan),
      limit,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[module-preview]", id, err);
    return NextResponse.json(
      { error: "Không tải được nội dung khối." },
      { status: 500 },
    );
  }
}
