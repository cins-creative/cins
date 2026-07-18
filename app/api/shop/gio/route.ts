import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getGio, setGioDong } from "@/lib/shop/gio";

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const cotMocId = new URL(request.url).searchParams.get("cotMocId");
  if (!cotMocId) {
    return NextResponse.json({ error: "Thiếu cotMocId." }, { status: 422 });
  }
  try {
    const gio = await getGio(session.profile.id, cotMocId);
    return NextResponse.json({ gio });
  } catch {
    return NextResponse.json({ error: "Không tải giỏ." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: {
    cotMocId?: unknown;
    idBienThe?: unknown;
    soLuong?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (
    typeof body.cotMocId !== "string" ||
    typeof body.idBienThe !== "string" ||
    typeof body.soLuong !== "number"
  ) {
    return NextResponse.json({ error: "Thiếu trường." }, { status: 422 });
  }
  try {
    const gio = await setGioDong(
      session.profile.id,
      body.cotMocId,
      body.idBienThe,
      body.soLuong,
    );
    return NextResponse.json({ gio });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "ITEM_NOT_ON_POST") {
      return NextResponse.json(
        { error: "Mặt hàng không có trên bài này." },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: "Không cập nhật giỏ." }, { status: 500 });
  }
}
