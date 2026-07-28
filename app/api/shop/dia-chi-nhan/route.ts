import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createDiaChiNhan,
  listDiaChiNhan,
  type ShopDiaChiNhanInput,
} from "@/lib/shop/dia-chi-nhan";

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

const ERR: Record<string, [number, string]> = {
  NGUOI_NHAN_REQUIRED: [
    422,
    "Cần nhập đủ họ tên, số điện thoại, tỉnh/thành và địa chỉ.",
  ],
  TOO_MANY: [422, "Đã đạt tối đa số hồ sơ nhận hàng."],
  CREATE_FAILED: [500, "Không lưu được hồ sơ nhận hàng."],
};

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listDiaChiNhan(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Không tải được sổ địa chỉ." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  try {
    const item = await createDiaChiNhan(session.profile.id, parseInput(body));
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const hit = ERR[e instanceof Error ? e.message : ""];
    if (hit) return NextResponse.json({ error: hit[1] }, { status: hit[0] });
    return NextResponse.json(
      { error: "Không lưu được hồ sơ." },
      { status: 500 },
    );
  }
}
