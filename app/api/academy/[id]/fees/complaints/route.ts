import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listKhieuNaiOrg,
  taoKhieuNaiPhi,
} from "@/lib/co-so/phi-khieu-nai";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { isCoSoFounderTier } from "@/lib/to-chuc/co-so-quan-ly-access";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/phi/khieu-nai — founder */
export async function GET(_req: Request, ctx: Ctx) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!isCoSoFounderTier(vaiTro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await listKhieuNaiOrg(orgId);
  return NextResponse.json({ items });
}

/** POST /api/co-so/:id/phi/khieu-nai — founder mở khiếu nại */
export async function POST(request: Request, ctx: Ctx) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!isCoSoFounderTier(vaiTro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const result = await taoKhieuNaiPhi({
    orgId,
    actorId,
    noiDung: typeof body.noiDung === "string" ? body.noiDung : "",
    idKy: typeof body.idKy === "string" ? body.idKy : null,
    maGiaoDich: typeof body.maGiaoDich === "string" ? body.maGiaoDich : null,
    bienLaiAnhId:
      typeof body.bienLaiAnhId === "string" ? body.bienLaiAnhId : null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ item: result }, { status: 201 });
}
