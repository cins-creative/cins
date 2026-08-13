import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getNhomById } from "@/lib/shop/nhom";
import {
  canBuyerReviewNhom,
  createNhomDanhGia,
  listNhomDanhGia,
  softDeleteNhomDanhGia,
} from "@/lib/shop/nhom-danh-gia";
import { SHOP_STOREFRONT_KHAC_SLUG } from "@/lib/shop/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/shop/nhom/[id]/danh-gia
 * POST — tạo review (buyer đã mua)
 * DELETE — soft-delete review của chính mình (?danhGiaId=)
 */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const nhomId = id?.trim();
  if (!nhomId || nhomId === SHOP_STOREFRONT_KHAC_SLUG) {
    return NextResponse.json({
      items: [],
      diemTrungBinh: null,
      tong: 0,
      boDem: {
        tong: 0,
        theoDiem: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        coBinhLuan: 0,
        coAnh: 0,
      },
      canReview: false,
    });
  }

  const nhom = await getNhomById(nhomId);
  if (!nhom) {
    return NextResponse.json({ error: "Không tìm thấy loại hàng." }, { status: 404 });
  }

  const url = new URL(request.url);
  const withMediaOnly = url.searchParams.get("withMedia") === "1";
  const withCommentOnly = url.searchParams.get("withComment") === "1";
  const diemRaw = url.searchParams.get("diem");
  const diemParsed = diemRaw != null ? Number(diemRaw) : null;
  const diem =
    diemParsed != null &&
    Number.isFinite(diemParsed) &&
    diemParsed >= 1 &&
    diemParsed <= 5
      ? Math.round(diemParsed)
      : null;
  const session = await getCurrentSessionAndProfile();

  try {
    const list = await listNhomDanhGia({
      nhomId,
      viewerId: session?.profile?.id ?? null,
      withMediaOnly,
      withCommentOnly,
      diem,
      limit: 40,
    });
    let canReview = false;
    if (session?.profile) {
      const gate = await canBuyerReviewNhom({
        buyerId: session.profile.id,
        nhomId,
        sellerId: nhom.idNguoiDung,
      });
      canReview = gate.canReview;
    }
    return NextResponse.json({ ...list, canReview });
  } catch (e) {
    console.error("[api/shop/nhom/danh-gia GET]", e);
    return NextResponse.json(
      { error: "Không tải được đánh giá." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Thiếu đăng nhập." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const nhomId = id?.trim();
  if (!nhomId || nhomId === SHOP_STOREFRONT_KHAC_SLUG) {
    return NextResponse.json(
      { error: "Loại hàng không hỗ trợ đánh giá." },
      { status: 422 },
    );
  }

  const nhom = await getNhomById(nhomId);
  if (!nhom) {
    return NextResponse.json({ error: "Không tìm thấy loại hàng." }, { status: 404 });
  }

  let body: {
    diem?: unknown;
    noiDung?: unknown;
    anhIds?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const diem = typeof body.diem === "number" ? body.diem : Number(body.diem);
  const anhIds = Array.isArray(body.anhIds)
    ? body.anhIds.filter((x): x is string => typeof x === "string")
    : [];

  try {
    const item = await createNhomDanhGia({
      buyerId: session.profile.id,
      nhomId,
      sellerId: nhom.idNguoiDung,
      diem,
      noiDung:
        typeof body.noiDung === "string"
          ? body.noiDung
          : body.noiDung === null
            ? null
            : undefined,
      anhIds,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "OWNER_FORBIDDEN") {
      return NextResponse.json(
        { error: "Chủ shop không tự đánh giá cửa hàng của mình." },
        { status: 403 },
      );
    }
    if (msg === "NOT_ELIGIBLE" || msg === "ALREADY_REVIEWED") {
      return NextResponse.json(
        {
          error:
            msg === "ALREADY_REVIEWED"
              ? "Bạn đã đánh giá loại hàng này rồi."
              : "Chỉ người đã mua hàng thuộc loại này mới được đánh giá.",
        },
        { status: 403 },
      );
    }
    if (msg === "DIEM_INVALID") {
      return NextResponse.json(
        { error: "Điểm đánh giá phải từ 1 đến 5." },
        { status: 422 },
      );
    }
    console.error("[api/shop/nhom/danh-gia POST]", e);
    return NextResponse.json(
      { error: "Không gửi được đánh giá." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Thiếu đăng nhập." }, { status: 401 });
  }
  const url = new URL(request.url);
  const danhGiaId = url.searchParams.get("danhGiaId")?.trim();
  if (!danhGiaId) {
    return NextResponse.json({ error: "Thiếu id đánh giá." }, { status: 422 });
  }
  void ctx;
  try {
    await softDeleteNhomDanhGia({
      buyerId: session.profile.id,
      danhGiaId,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không xóa được đánh giá." },
      { status: 500 },
    );
  }
}
