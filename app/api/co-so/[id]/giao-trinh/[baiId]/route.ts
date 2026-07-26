import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  hardDeleteBaiTapQuanLy,
  updateBaiTapQuanLy,
} from "@/lib/to-chuc/giao-trinh-quan-ly";

type Ctx = { params: Promise<{ id: string; baiId: string }> };

/** PATCH /api/co-so/:id/giao-trinh/:baiId */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId, baiId } = await ctx.params;
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

  const patch: Parameters<typeof updateBaiTapQuanLy>[2] = {};
  if (body.khoaId !== undefined) patch.khoaId = String(body.khoaId).trim();
  if (body.tenBaiTap !== undefined || body.tieuDe !== undefined) {
    patch.tenBaiTap = String(body.tenBaiTap ?? body.tieuDe ?? "");
  }
  if (body.moTa !== undefined || body.moTaNgan !== undefined) {
    patch.moTa =
      (body.moTa ?? body.moTaNgan) == null
        ? null
        : String(body.moTa ?? body.moTaNgan);
  }
  if (
    body.videoYoutubeUrl !== undefined ||
    body.videoGioiThieuUrl !== undefined
  ) {
    patch.videoYoutubeUrl =
      (body.videoYoutubeUrl ?? body.videoGioiThieuUrl) == null
        ? null
        : String(body.videoYoutubeUrl ?? body.videoGioiThieuUrl);
  }
  if (body.thumbnailUrl !== undefined) {
    patch.thumbnailUrl =
      body.thumbnailUrl == null ? null : String(body.thumbnailUrl);
  }
  if (body.visible !== undefined) patch.visible = Boolean(body.visible);
  if (body.thuTu !== undefined && body.thuTu !== "") {
    const n = Number.parseInt(String(body.thuTu), 10);
    if (Number.isFinite(n)) patch.thuTu = n;
  }
  if (body.giaoTrinhBaiId !== undefined) {
    patch.giaoTrinhBaiId =
      body.giaoTrinhBaiId == null ? null : String(body.giaoTrinhBaiId);
  }

  try {
    const row = await updateBaiTapQuanLy(orgId, baiId, patch);
    return NextResponse.json({ row });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không cập nhật được bài.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/co-so/:id/giao-trinh/:baiId — xóa hẳn bài tập. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: orgId, baiId } = await ctx.params;
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

  try {
    await hardDeleteBaiTapQuanLy(orgId, baiId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không xóa được bài.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
