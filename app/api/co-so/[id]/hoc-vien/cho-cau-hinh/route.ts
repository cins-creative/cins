import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getHocVienChoTtlNgay,
  setHocVienChoTtlNgay,
} from "@/lib/co-so/ghi-danh-xoa";
import {
  HOC_VIEN_CHO_TTL_MAX,
} from "@/lib/co-so/hoc-vien-cho-cau-hinh";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/hoc-vien/cho-cau-hinh */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ttlNgay = await getHocVienChoTtlNgay(orgId);
  return NextResponse.json({ ttlNgay, max: HOC_VIEN_CHO_TTL_MAX });
}

/** PATCH /api/co-so/:id/hoc-vien/cho-cau-hinh — `{ ttlNgay: number }` (0 = tắt). */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ttlNgay?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const n = Number(body.ttlNgay);
  if (!Number.isFinite(n) || n < 0 || n > HOC_VIEN_CHO_TTL_MAX) {
    return NextResponse.json(
      { error: `ttlNgay phải từ 0 đến ${HOC_VIEN_CHO_TTL_MAX} (0 = tắt tự gỡ).` },
      { status: 400 },
    );
  }

  const result = await setHocVienChoTtlNgay(orgId, actorId, n);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.includes("quyền") ? 403 : 400 },
    );
  }
  return NextResponse.json({ ttlNgay: result.ttlNgay });
}
