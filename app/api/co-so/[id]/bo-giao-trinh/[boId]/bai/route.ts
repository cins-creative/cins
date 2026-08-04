import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import { syncBoGiaoTrinhBai } from "@/lib/to-chuc/bo-giao-trinh";
import {
  isLoaiBaiGiaoTrinh,
  type LoaiBaiGiaoTrinh,
} from "@/lib/to-chuc/khoa-hoc-types";

type Ctx = { params: Promise<{ id: string; boId: string }> };

/** PUT /api/co-so/:id/bo-giao-trinh/:boId/bai — sync danh sách gán. */
export async function PUT(req: Request, ctx: Ctx) {
  const { id: orgId, boId } = await ctx.params;
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

  let body: { items?: unknown };
  try {
    body = (await req.json()) as { items?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.items) ? body.items : [];
  const items: {
    baiTapId: string;
    thuocTinh: LoaiBaiGiaoTrinh;
    ghiChu?: string | null;
  }[] = [];

  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const baiTapId = String(r.baiTapId ?? "").trim();
    const thuocTinh = r.thuocTinh;
    if (!baiTapId || !isLoaiBaiGiaoTrinh(thuocTinh)) continue;
    items.push({
      baiTapId,
      thuocTinh,
      ghiChu: r.ghiChu == null ? null : String(r.ghiChu),
    });
  }

  try {
    const row = await syncBoGiaoTrinhBai(orgId, boId, items);
    return NextResponse.json({ row });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không lưu được danh sách bài.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
