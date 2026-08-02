import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  cancelDonHang,
  capNhatVanChuyenDonHang,
  completeDonHang,
  confirmDonHang,
  donHangToChatContext,
  getDonHang,
  hoanTraDonHang,
} from "@/lib/shop/don-hang";
import { SHOP_LY_DO_HUY_MAX } from "@/lib/shop/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const don = await getDonHang(id);
  if (!don) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  if (
    don.idNguoiMua !== session.profile.id &&
    don.idNguoiBan !== session.profile.id
  ) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  return NextResponse.json({
    don,
    chatContext: donHangToChatContext(don),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: {
    action?: unknown;
    lyDo?: unknown;
    link?: unknown;
    ma?: unknown;
    dvvc?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  try {
    if (body.action === "cap_nhat_van_chuyen") {
      const don = await capNhatVanChuyenDonHang(session.profile.id, id, {
        ...(body.ma !== undefined ? { ma: body.ma } : {}),
        ...(body.dvvc !== undefined ? { dvvc: body.dvvc } : {}),
        ...(body.link !== undefined ? { link: body.link } : {}),
      });
      return NextResponse.json({ don, chatContext: donHangToChatContext(don) });
    }
    if (body.action === "da_nhan_tien" || body.action === "da_giao_tai_su_kien") {
      const don = await confirmDonHang(
        session.profile.id,
        id,
        body.action,
      );
      return NextResponse.json({ don, chatContext: donHangToChatContext(don) });
    }
    if (body.action === "hoan_tra") {
      const lyDo =
        typeof body.lyDo === "string"
          ? body.lyDo.trim().slice(0, SHOP_LY_DO_HUY_MAX)
          : null;
      const don = await hoanTraDonHang(session.profile.id, id, lyDo);
      return NextResponse.json({ don, chatContext: donHangToChatContext(don) });
    }
    if (body.action === "hoan_thanh") {
      const don = await completeDonHang(session.profile.id, id);
      return NextResponse.json({ don, chatContext: donHangToChatContext(don) });
    }
    if (body.action === "huy") {
      const lyDo =
        typeof body.lyDo === "string" ? body.lyDo.trim().slice(0, SHOP_LY_DO_HUY_MAX) : "";
      if (!lyDo) {
        return NextResponse.json(
          { error: "Cần nhập lý do hủy đơn." },
          { status: 422 },
        );
      }
      const don = await cancelDonHang(session.profile.id, id, lyDo);
      return NextResponse.json({ don, chatContext: donHangToChatContext(don) });
    }
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 422 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "ONLINE_DISABLED") {
      return NextResponse.json(
        {
          error:
            "CINs không liên kết ĐVVC — shop tự tạo vận đơn trên web đơn vị vận chuyển.",
        },
        { status: 410 },
      );
    }
    if (msg === "NEED_CONFIRM") {
      return NextResponse.json(
        {
          error:
            "Xác nhận đơn trước khi cập nhật vận chuyển (trừ kho trước).",
        },
        { status: 422 },
      );
    }
    if (msg === "NOT_SHIPPING") {
      return NextResponse.json(
        {
          error:
            "Đơn gặp trực tiếp — không cần mã vận đơn / ĐVVC.",
        },
        { status: 422 },
      );
    }
    if (msg === "NEED_DVVC") {
      return NextResponse.json(
        { error: "Chọn ĐVVC trước khi lưu mã vận đơn." },
        { status: 422 },
      );
    }
    if (msg === "NEED_MA") {
      return NextResponse.json(
        { error: "Nhập mã vận đơn khi đã chọn ĐVVC." },
        { status: 422 },
      );
    }
    if (
      msg === "INVALID_LINK" ||
      msg === "LINK_TOO_LONG" ||
      msg === "INVALID_MA" ||
      msg === "MA_TOO_LONG" ||
      msg === "INVALID_DVVC"
    ) {
      return NextResponse.json(
        {
          error:
            msg === "MA_TOO_LONG"
              ? "Mã vận đơn quá dài (tối đa 80 ký tự)."
              : msg === "INVALID_DVVC"
                ? "ĐVVC không hợp lệ."
                : msg === "INVALID_MA"
                  ? "Mã vận đơn không hợp lệ — chỉ nhập mã, không dán link."
                  : "Link không hợp lệ — dùng ĐVVC + mã vận đơn.",
        },
        { status: 422 },
      );
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    }
    if (msg === "INVALID_STATE" || msg === "INVALID_ACTION") {
      return NextResponse.json(
        { error: "Trạng thái đơn không cho phép thao tác này." },
        { status: 422 },
      );
    }
    if (msg === "STOCK_INSUFFICIENT" || msg === "STOCK_EMPTY") {
      return NextResponse.json(
        {
          error:
            "Không đủ tồn kho để xác nhận — giảm SL đơn hoặc restock trước.",
        },
        { status: 422 },
      );
    }
    console.error("[api] don patch", e);
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }
}
