import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createShopKhachHangTag,
  listShopKhachHangTags,
} from "@/lib/shop/khach-hang";
import { getBanHangEnabled } from "@/lib/shop/settings";

/** GET /api/shop/khach-hang/the — danh sách thẻ (không seed). */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const enabled = await getBanHangEnabled(session.profile.id);
  if (!enabled) {
    return NextResponse.json({ enabled: false, tags: [] });
  }
  const tags = await listShopKhachHangTags(session.profile.id);
  return NextResponse.json({ enabled: true, tags });
}

/** POST /api/shop/khach-hang/the — tạo thẻ mới. */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  const enabled = await getBanHangEnabled(session.profile.id);
  if (!enabled) {
    return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
  }

  let body: { ten?: unknown; mau?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const ten = typeof body.ten === "string" ? body.ten : "";
  const mau = typeof body.mau === "string" ? body.mau : null;
  const result = await createShopKhachHangTag(session.profile.id, ten, mau);
  if (!result.ok) {
    const status =
      result.error.startsWith("Tối đa") || result.error.includes("tối đa")
        ? 400
        : result.error.includes("Nhập")
          ? 400
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ tag: result.tag }, { status: 201 });
}
