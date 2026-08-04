import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  deleteBoGiaoTrinh,
  fetchBoGiaoTrinhChiTiet,
  updateBoGiaoTrinh,
} from "@/lib/to-chuc/bo-giao-trinh";

type Ctx = { params: Promise<{ id: string; boId: string }> };

async function requireQuyen(orgId: string, needSua: boolean) {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen === "an" || (needSua && quyen !== "sua")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { quyen };
}

/** GET /api/co-so/:id/bo-giao-trinh/:boId */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId, boId } = await ctx.params;
  const auth = await requireQuyen(orgId, false);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const row = await fetchBoGiaoTrinhChiTiet(orgId, boId);
    return NextResponse.json({
      row,
      canEdit: auth.quyen === "sua",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được bộ giáo trình.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

/** PATCH /api/co-so/:id/bo-giao-trinh/:boId */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId, boId } = await ctx.params;
  const auth = await requireQuyen(orgId, true);
  if ("error" in auth && auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const row = await updateBoGiaoTrinh(orgId, boId, {
      tenBo: body.tenBo === undefined ? undefined : String(body.tenBo),
      moTa: body.moTa === undefined ? undefined : String(body.moTa ?? ""),
      thuTu:
        body.thuTu === undefined
          ? undefined
          : Number.parseInt(String(body.thuTu), 10),
    });
    return NextResponse.json({ row });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không cập nhật được bộ.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/co-so/:id/bo-giao-trinh/:boId */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: orgId, boId } = await ctx.params;
  const auth = await requireQuyen(orgId, true);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const { khoaTenList } = await deleteBoGiaoTrinh(orgId, boId);
    return NextResponse.json({ ok: true, khoaTenList });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không xóa được bộ giáo trình.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
