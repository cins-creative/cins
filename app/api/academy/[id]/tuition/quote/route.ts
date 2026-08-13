import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { baoGiaGioHang } from "@/lib/co-so/combo-hoc-phi";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { items?: Array<{ khoaId?: string; goiId?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body.items ?? [])
    .map((it) => ({
      khoaId: (it.khoaId ?? "").trim(),
      goiId: (it.goiId ?? "").trim(),
    }))
    .filter((it) => it.khoaId && it.goiId);

  if (items.length === 0) {
    return NextResponse.json({ error: "Thiếu items." }, { status: 400 });
  }

  const result = await baoGiaGioHang(orgId, items);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ baoGia: result.baoGia });
}
