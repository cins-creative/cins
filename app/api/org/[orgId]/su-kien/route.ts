import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listSuKienCuaOrg, taoSuKien } from "@/lib/to-chuc/su-kien";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/su-kien — danh sách sự kiện của org (public). */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { orgId } = await ctx.params;
    const result = await listSuKienCuaOrg(orgId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ suKien: result.suKien });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được danh sách sự kiện.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/org/:orgId/su-kien — tạo sự kiện (admin / quản lý nội dung). */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const result = await taoSuKien(orgId, session.profile.id, {
    ten: typeof body.ten === "string" ? body.ten : "",
    loaiSuKien: typeof body.loaiSuKien === "string" ? body.loaiSuKien : "",
    moTa: typeof body.moTa === "string" ? body.moTa : null,
    noiDung: typeof body.noiDung === "string" ? body.noiDung : null,
    batDau: typeof body.batDau === "string" ? body.batDau : "",
    ketThuc: typeof body.ketThuc === "string" ? body.ketThuc : null,
    tinhThanh: typeof body.tinhThanh === "string" ? body.tinhThanh : null,
    diaDiem: typeof body.diaDiem === "string" ? body.diaDiem : null,
    mienPhi: body.mienPhi === false ? false : true,
    giaVe:
      typeof body.giaVe === "number"
        ? body.giaVe
        : body.giaVe == null
          ? null
          : Number(body.giaVe),
    slotToiDa:
      typeof body.slotToiDa === "number"
        ? body.slotToiDa
        : body.slotToiDa == null
          ? null
          : Number(body.slotToiDa),
    coverId: typeof body.coverId === "string" ? body.coverId : null,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, suKien: result.suKien });
}
