import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  createBoGiaoTrinh,
  listBoGiaoTrinh,
} from "@/lib/to-chuc/bo-giao-trinh";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/bo-giao-trinh */
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
    const rows = await listBoGiaoTrinh(orgId);
    return NextResponse.json({ rows, canEdit: quyen === "sua" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được bộ giáo trình.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/co-so/:id/bo-giao-trinh */
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

  const tenBo = String(body.tenBo ?? "").trim();
  if (!tenBo) {
    return NextResponse.json(
      { error: "Thiếu tên bộ giáo trình." },
      { status: 400 },
    );
  }

  try {
    const row = await createBoGiaoTrinh(orgId, {
      tenBo,
      moTa: body.moTa == null ? null : String(body.moTa),
      thuTu:
        body.thuTu == null || body.thuTu === ""
          ? null
          : Number.parseInt(String(body.thuTu), 10),
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tạo được bộ giáo trình.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
