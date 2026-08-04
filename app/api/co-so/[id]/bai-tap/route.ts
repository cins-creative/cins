import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  createBaiTapModule,
  listBaiTapModule,
} from "@/lib/to-chuc/bai-tap-module";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/bai-tap — thư viện module. */
export async function GET(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(
    url.searchParams.get("pageSize") ?? "50",
    10,
  );

  try {
    const { rows, total } = await listBaiTapModule(orgId, {
      q,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 50,
    });
    return NextResponse.json({ rows, total, canEdit: quyen === "sua" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được bài tập.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/co-so/:id/bai-tap — tạo module. */
export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tenBaiTap = String(body.tenBaiTap ?? "").trim();
  if (!tenBaiTap) {
    return NextResponse.json({ error: "Thiếu tên bài tập." }, { status: 400 });
  }

  try {
    const row = await createBaiTapModule(orgId, {
      tenBaiTap,
      moTa: body.moTa == null ? null : String(body.moTa),
      yeuCau: body.yeuCau == null ? null : String(body.yeuCau),
      videoYoutubeUrl:
        body.videoYoutubeUrl == null ? null : String(body.videoYoutubeUrl),
      thumbnailUrl:
        body.thumbnailUrl == null ? null : String(body.thumbnailUrl),
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tạo được bài tập.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
