import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  deleteDiaChiNhan,
  setDiaChiNhanMacDinh,
  updateDiaChiNhan,
  type ShopDiaChiNhanInput,
} from "@/lib/shop/dia-chi-nhan";

type Ctx = { params: Promise<{ id: string }> };

const ERR: Record<string, [number, string]> = {
  NGUOI_NHAN_REQUIRED: [
    422,
    "Cần nhập đủ họ tên, số điện thoại, tỉnh/thành và địa chỉ.",
  ],
  NOT_FOUND: [404, "Không tìm thấy hồ sơ nhận hàng."],
  UPDATE_FAILED: [500, "Không cập nhật được hồ sơ."],
};

function parseInput(raw: Record<string, unknown>): ShopDiaChiNhanInput {
  return {
    nhan: typeof raw.nhan === "string" ? raw.nhan : null,
    hoTen: typeof raw.hoTen === "string" ? raw.hoTen : "",
    soDienThoai: typeof raw.soDienThoai === "string" ? raw.soDienThoai : "",
    diaChi: typeof raw.diaChi === "string" ? raw.diaChi : "",
    phuongXa: typeof raw.phuongXa === "string" ? raw.phuongXa : "",
    tinhThanh: typeof raw.tinhThanh === "string" ? raw.tinhThanh : "",
    laMacDinh: raw.laMacDinh === true,
  };
}

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
    /* Chỉ đặt mặc định (không kèm dữ liệu form) → set default nhanh. */
    if (body.action === "set_default") {
      await setDiaChiNhanMacDinh(session.profile.id, id);
      return NextResponse.json({ ok: true });
    }
    const item = await updateDiaChiNhan(
      session.profile.id,
      id,
      parseInput(body),
    );
    return NextResponse.json({ item });
  } catch (e) {
    const hit = ERR[e instanceof Error ? e.message : ""];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json(
      { error: "Không cập nhật được hồ sơ." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await deleteDiaChiNhan(session.profile.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không xóa được hồ sơ." },
      { status: 500 },
    );
  }
}
