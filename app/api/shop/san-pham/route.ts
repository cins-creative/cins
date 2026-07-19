import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createSanPham, listSanPham } from "@/lib/shop/catalog";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listSanPham(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Không tải được kho." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: {
    ten?: unknown;
    moTa?: unknown;
    anhId?: unknown;
    phanLoai?: unknown;
    phanLoai2?: unknown;
    bienThe?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.ten !== "string") {
    return NextResponse.json({ error: "Thiếu tên sản phẩm." }, { status: 422 });
  }
  try {
    const item = await createSanPham(session.profile.id, {
      ten: body.ten,
      moTa: typeof body.moTa === "string" ? body.moTa : null,
      anhId: typeof body.anhId === "string" ? body.anhId : null,
      phanLoai: typeof body.phanLoai === "string" ? body.phanLoai : null,
      phanLoai2: typeof body.phanLoai2 === "string" ? body.phanLoai2 : null,
      bienThe: Array.isArray(body.bienThe)
        ? body.bienThe.map((v) => {
            const o = v as Record<string, unknown>;
            return {
              nhan: typeof o.nhan === "string" ? o.nhan : "Mặc định",
              sku: typeof o.sku === "string" ? o.sku : null,
              soLuongTon:
                typeof o.soLuongTon === "number" ? o.soLuongTon : 0,
              anhId: typeof o.anhId === "string" ? o.anhId : null,
            };
          })
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
    if (msg === "TEN_REQUIRED") {
      return NextResponse.json({ error: "Thiếu tên." }, { status: 422 });
    }
    return NextResponse.json({ error: "Không tạo được." }, { status: 500 });
  }
}
