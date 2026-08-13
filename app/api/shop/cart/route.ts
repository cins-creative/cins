import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  clearGio,
  clearGioCuaHang,
  getGio,
  getGioCuaHang,
  setGioDong,
  setGioDongCuaHang,
} from "@/lib/shop/gio";

function scopeFromParams(url: URL): {
  cotMocId: string | null;
  cuaHangId: string | null;
} {
  const cotMocId = url.searchParams.get("cotMocId")?.trim() || null;
  const cuaHangId = url.searchParams.get("cuaHangId")?.trim() || null;
  return { cotMocId, cuaHangId };
}

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { cotMocId, cuaHangId } = scopeFromParams(new URL(request.url));
  if ((cotMocId == null) === (cuaHangId == null)) {
    return NextResponse.json(
      { error: "Cần cotMocId hoặc cuaHangId." },
      { status: 422 },
    );
  }
  try {
    const gio = cotMocId
      ? await getGio(session.profile.id, cotMocId)
      : await getGioCuaHang(session.profile.id, cuaHangId!);
    return NextResponse.json({ gio });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SHOP_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy cửa hàng." }, { status: 404 });
    }
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
    cuaHangId?: unknown;
    idBienThe?: unknown;
    soLuong?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  const cotMocId =
    typeof body.cotMocId === "string" && body.cotMocId.trim()
      ? body.cotMocId.trim()
      : null;
  const cuaHangId =
    typeof body.cuaHangId === "string" && body.cuaHangId.trim()
      ? body.cuaHangId.trim()
      : null;
  if ((cotMocId == null) === (cuaHangId == null)) {
    return NextResponse.json(
      { error: "Cần cotMocId hoặc cuaHangId." },
      { status: 422 },
    );
  }
  if (typeof body.idBienThe !== "string" || typeof body.soLuong !== "number") {
    return NextResponse.json({ error: "Thiếu trường." }, { status: 422 });
  }
  try {
    const gio = cotMocId
      ? await setGioDong(
          session.profile.id,
          cotMocId,
          body.idBienThe,
          body.soLuong,
        )
      : await setGioDongCuaHang(
          session.profile.id,
          cuaHangId!,
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
    if (msg === "ITEM_NOT_IN_SHOP") {
      return NextResponse.json(
        { error: "Mặt hàng không có trong cửa hàng." },
        { status: 404 },
      );
    }
    if (msg === "SHOP_NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy cửa hàng." }, { status: 404 });
    }
    if (msg === "CANNOT_BUY_OWN") {
      return NextResponse.json(
        { error: "Không thể mua hàng của chính mình." },
        { status: 422 },
      );
    }
    if (msg === "STOCK_EMPTY" || msg === "STOCK_INSUFFICIENT") {
      return NextResponse.json(
        { error: "Số lượng vượt tồn kho." },
        { status: 422 },
      );
    }
    if (msg === "SHOP_TAM_DONG") {
      return NextResponse.json(
        { error: "Shop đang tạm đóng cửa — chưa nhận đơn." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không cập nhật giỏ." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { cotMocId, cuaHangId } = scopeFromParams(new URL(request.url));
  if ((cotMocId == null) === (cuaHangId == null)) {
    return NextResponse.json(
      { error: "Cần cotMocId hoặc cuaHangId." },
      { status: 422 },
    );
  }
  try {
    const gio = cotMocId
      ? await clearGio(session.profile.id, cotMocId)
      : await clearGioCuaHang(session.profile.id, cuaHangId!);
    return NextResponse.json({ gio });
  } catch {
    return NextResponse.json({ error: "Không xóa giỏ." }, { status: 500 });
  }
}
