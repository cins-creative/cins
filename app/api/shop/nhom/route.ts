import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createNhom, listNhom } from "@/lib/shop/nhom";
import type { ShopNhomTruc } from "@/lib/shop/types";

/**
 * GET /api/shop/nhom?truc=1|2 — danh sách nhóm phân loại của seller đang đăng nhập.
 */
export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const url = new URL(request.url);
  const trucRaw = url.searchParams.get("truc");
  let truc: ShopNhomTruc | undefined;
  if (trucRaw === "1" || trucRaw === "2") {
    truc = Number(trucRaw) as ShopNhomTruc;
  } else if (trucRaw != null && trucRaw !== "") {
    return NextResponse.json({ error: "truc phải là 1 hoặc 2." }, { status: 422 });
  }
  try {
    const items = await listNhom(session.profile.id, truc);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Không tải được nhóm phân loại." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/shop/nhom — tạo loại hàng (+ mô tả ngắn tùy chọn).
 * Body: { truc?: 1|2, nhan, moTa? }
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { truc?: unknown; nhan?: unknown; moTa?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.nhan !== "string") {
    return NextResponse.json({ error: "Thiếu tên loại hàng." }, { status: 422 });
  }
  const truc: ShopNhomTruc =
    body.truc === 2 || body.truc === "2" ? 2 : 1;
  try {
    const item = await createNhom(session.profile.id, {
      truc,
      nhan: body.nhan,
      moTa:
        body.moTa === undefined
          ? undefined
          : typeof body.moTa === "string"
            ? body.moTa
            : body.moTa === null
              ? null
              : undefined,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json(
        { error: "Hãy bật bán hàng trong cài đặt trước." },
        { status: 403 },
      );
    }
    if (msg === "NHAN_REQUIRED") {
      return NextResponse.json({ error: "Thiếu tên loại hàng." }, { status: 422 });
    }
    if (msg === "NHAN_DUP") {
      return NextResponse.json(
        { error: "Tên loại hàng đã tồn tại." },
        { status: 409 },
      );
    }
    console.error("[api/shop/nhom POST]", e);
    return NextResponse.json(
      { error: "Không tạo được loại hàng." },
      { status: 500 },
    );
  }
}
