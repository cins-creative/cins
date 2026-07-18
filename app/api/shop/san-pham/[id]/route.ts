import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  softDeleteBienThe,
  softDeleteSanPham,
  updateSanPham,
  upsertBienThe,
} from "@/lib/shop/catalog";

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
    if (body.action === "upsertBienThe") {
      const bt = await upsertBienThe(session.profile.id, id, {
        id: typeof body.bienTheId === "string" ? body.bienTheId : undefined,
        nhan: typeof body.nhan === "string" ? body.nhan : "Mặc định",
        sku: typeof body.sku === "string" ? body.sku : null,
        soLuongTon:
          typeof body.soLuongTon === "number" ? body.soLuongTon : 0,
        anhId: typeof body.anhId === "string" ? body.anhId : null,
      });
      return NextResponse.json({ bienThe: bt });
    }
    if (body.action === "deleteBienThe" && typeof body.bienTheId === "string") {
      await softDeleteBienThe(session.profile.id, body.bienTheId);
      return NextResponse.json({ ok: true });
    }

    await updateSanPham(session.profile.id, id, {
      ten: typeof body.ten === "string" ? body.ten : undefined,
      moTa: body.moTa === null || typeof body.moTa === "string" ? (body.moTa as string | null) : undefined,
      anhId:
        body.anhId === null || typeof body.anhId === "string"
          ? (body.anhId as string | null)
          : undefined,
      phanLoai:
        body.phanLoai === null || typeof body.phanLoai === "string"
          ? (body.phanLoai as string | null)
          : undefined,
      dangBan: typeof body.dangBan === "boolean" ? body.dangBan : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
    }
    if (msg === "NOT_FOUND" || msg === "FORBIDDEN") {
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
    await softDeleteSanPham(session.profile.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được." }, { status: 500 });
  }
}
