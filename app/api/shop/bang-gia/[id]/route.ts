import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { softDeleteBangGia, updateBangGia } from "@/lib/shop/bang-gia";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  try {
    await updateBangGia(session.profile.id, id, {
      ten: typeof body.ten === "string" ? body.ten : undefined,
      tienTe: typeof body.tienTe === "string" ? body.tienTe : undefined,
      ghiChu:
        body.ghiChu === null || typeof body.ghiChu === "string"
          ? (body.ghiChu as string | null)
          : undefined,
      dong: Array.isArray(body.dong)
        ? body.dong
            .map((d) => {
              const o = d as Record<string, unknown>;
              if (typeof o.idBienThe !== "string" || typeof o.gia !== "number") {
                return null;
              }
              return { idBienThe: o.idBienThe, gia: o.gia };
            })
            .filter((x): x is { idBienThe: string; gia: number } => !!x)
        : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    }
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await softDeleteBangGia(session.profile.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được." }, { status: 500 });
  }
}
