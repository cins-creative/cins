import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { capNhatSuKien, xoaSuKien } from "@/lib/to-chuc/su-kien";
import { parseLoaiVeBody } from "@/lib/to-chuc/su-kien-parse-loai-ve";

type RouteContext = { params: Promise<{ orgId: string; suKienId: string }> };

/** PATCH /api/org/:orgId/su-kien/:suKienId — cập nhật sự kiện. */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { suKienId } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Body JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const result = await capNhatSuKien(suKienId, session.profile.id, {
    ten: typeof body.ten === "string" ? body.ten : undefined,
    loaiSuKien: typeof body.loaiSuKien === "string" ? body.loaiSuKien : undefined,
    moTa: typeof body.moTa === "string" ? body.moTa : undefined,
    noiDung:
      body.noiDung === null
        ? null
        : typeof body.noiDung === "string"
          ? body.noiDung
          : undefined,
    batDau: typeof body.batDau === "string" ? body.batDau : undefined,
    ketThuc:
      body.ketThuc === null
        ? null
        : typeof body.ketThuc === "string"
          ? body.ketThuc
          : undefined,
    diaDiem:
      body.diaDiem === null
        ? null
        : typeof body.diaDiem === "string"
          ? body.diaDiem
          : undefined,
    tinhThanh:
      body.tinhThanh === null
        ? null
        : typeof body.tinhThanh === "string"
          ? body.tinhThanh
          : undefined,
    mienPhi:
      body.mienPhi === undefined
        ? undefined
        : body.mienPhi === false
          ? false
          : true,
    giaVe:
      body.giaVe === null
        ? null
        : body.giaVe === undefined
          ? undefined
          : Number(body.giaVe),
    loaiVe: parseLoaiVeBody(body.loaiVe),
    cachMuaVe:
      body.cachMuaVe === null
        ? null
        : body.cachMuaVe === undefined
          ? undefined
          : typeof body.cachMuaVe === "string"
            ? body.cachMuaVe
            : undefined,
    slotToiDa:
      body.slotToiDa === null
        ? null
        : body.slotToiDa === undefined
          ? undefined
          : Number(body.slotToiDa),
    coverId:
      body.coverId === null
        ? null
        : typeof body.coverId === "string"
          ? body.coverId
          : undefined,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền")
      ? 403
      : result.error.includes("Không tìm thấy")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, suKien: result.suKien });
}

/** DELETE /api/org/:orgId/su-kien/:suKienId — xóa sự kiện. */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { suKienId } = await ctx.params;
  const result = await xoaSuKien(suKienId, session.profile.id);
  if (!result.ok) {
    const status = result.error.includes("quyền")
      ? 403
      : result.error.includes("Không tìm thấy")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
