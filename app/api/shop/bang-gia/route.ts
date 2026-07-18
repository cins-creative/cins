import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createBangGia, listBangGia } from "@/lib/shop/bang-gia";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const items = await listBangGia(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Không tải được bảng giá." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: {
    ten?: unknown;
    tienTe?: unknown;
    ghiChu?: unknown;
    dong?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.ten !== "string") {
    return NextResponse.json({ error: "Thiếu tên bảng giá." }, { status: 422 });
  }
  try {
    const item = await createBangGia(session.profile.id, {
      ten: body.ten,
      tienTe: typeof body.tienTe === "string" ? body.tienTe : "VND",
      ghiChu: typeof body.ghiChu === "string" ? body.ghiChu : null,
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
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json({ error: "Chưa bật bán hàng." }, { status: 403 });
    }
    return NextResponse.json({ error: "Không tạo được." }, { status: 500 });
  }
}
