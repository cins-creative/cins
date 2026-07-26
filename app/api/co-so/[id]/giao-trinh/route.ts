import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  createBaiTapQuanLy,
  listBaiTapQuanLy,
} from "@/lib/to-chuc/giao-trinh-quan-ly";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/giao-trinh — bài tập (`org_bai_tap`) toàn org. */
export async function GET(_req: Request, ctx: Ctx) {
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

  try {
    const { rows, khoaOptions } = await listBaiTapQuanLy(orgId);
    return NextResponse.json({
      rows,
      khoaOptions,
      canEdit: quyen === "sua",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được giáo trình.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/co-so/:id/giao-trinh — thêm bài tập. */
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

  const khoaId = String(body.khoaId ?? "").trim();
  const tenBaiTap = String(body.tenBaiTap ?? body.tieuDe ?? "").trim();
  if (!khoaId || !tenBaiTap) {
    return NextResponse.json(
      { error: "Thiếu khóa học hoặc tên bài tập." },
      { status: 400 },
    );
  }

  try {
    const row = await createBaiTapQuanLy(orgId, {
      khoaId,
      tenBaiTap,
      moTa:
        body.moTa == null && body.moTaNgan == null
          ? null
          : String(body.moTa ?? body.moTaNgan ?? ""),
      videoYoutubeUrl:
        body.videoYoutubeUrl == null && body.videoGioiThieuUrl == null
          ? null
          : String(body.videoYoutubeUrl ?? body.videoGioiThieuUrl ?? ""),
      thumbnailUrl:
        body.thumbnailUrl == null ? null : String(body.thumbnailUrl),
      visible:
        body.visible === undefined
          ? true
          : Boolean(body.visible),
      thuTu:
        body.thuTu == null || body.thuTu === ""
          ? null
          : Number.parseInt(String(body.thuTu), 10),
      giaoTrinhBaiId:
        body.giaoTrinhBaiId == null
          ? null
          : String(body.giaoTrinhBaiId),
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tạo được bài tập.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
