import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  deleteShopPhuongThucTt,
  getOrCreateShopCuaHang,
  getShopCuaHangByUserId,
  updateShopCuaHang,
  upsertShopPhuongThucTt,
} from "@/lib/shop/cua-hang";
import { getBanHangEnabled } from "@/lib/shop/settings";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

async function resolveOwnerId(opts: {
  userId?: string | null;
  slug?: string | null;
}): Promise<string | null> {
  if (opts.userId?.trim()) return opts.userId.trim();
  const slug = opts.slug?.trim();
  if (!slug) return null;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

/**
 * GET /api/shop/cua-hang?slug=… | ?userId=…
 * - Chủ: luôn trả shop (tạo trống nếu chưa có) khi đã đăng nhập đúng owner.
 * - Khách: chỉ khi seller bật bán hàng.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getCurrentSessionAndProfile();
  const ownerId = await resolveOwnerId({
    userId: url.searchParams.get("userId"),
    slug: url.searchParams.get("slug"),
  });

  if (!ownerId) {
    if (!session?.profile) {
      return NextResponse.json({ error: "Thiếu đăng nhập." }, { status: 401 });
    }
    const shop = await getOrCreateShopCuaHang(session.profile.id);
    const banHangBat = await getBanHangEnabled(session.profile.id);
    return NextResponse.json({ shop, banHangBat, isOwner: true });
  }

  const isOwner = session?.profile?.id === ownerId;
  const banHangBat = await getBanHangEnabled(ownerId);

  if (!isOwner && !banHangBat) {
    return NextResponse.json(
      { error: "Cửa hàng chưa mở.", shop: null, banHangBat: false },
      { status: 404 },
    );
  }

  const shop = isOwner
    ? await getOrCreateShopCuaHang(ownerId)
    : await getShopCuaHangByUserId(ownerId);

  return NextResponse.json({
    shop,
    banHangBat,
    isOwner,
  });
}

/**
 * PATCH /api/shop/cua-hang — cập nhật mặt tiền hoặc phương thức TT.
 * body: { ten?, moTa?, avatarId?, coverId?, chinhSach?, lienHe?, nhanPhanLoai?, nhanPhanLoai2? }
 *   hoặc { phuongThuc: { id?, nganHang, soTaiKhoan, tenChuTaiKhoan, qrAnhId?, macDinh?, kichHoat? } }
 *   hoặc { xoaPhuongThucId: string }
 */
export async function PATCH(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Thiếu đăng nhập." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  try {
    if (typeof body.xoaPhuongThucId === "string") {
      const shop = await deleteShopPhuongThucTt(
        session.profile.id,
        body.xoaPhuongThucId,
      );
      return NextResponse.json({ shop });
    }

    const pttt = body.phuongThuc;
    if (pttt && typeof pttt === "object") {
      const p = pttt as Record<string, unknown>;
      const shop = await upsertShopPhuongThucTt(session.profile.id, {
        id: typeof p.id === "string" ? p.id : undefined,
        nganHang: String(p.nganHang ?? ""),
        soTaiKhoan: String(p.soTaiKhoan ?? ""),
        tenChuTaiKhoan: String(p.tenChuTaiKhoan ?? ""),
        qrAnhId:
          p.qrAnhId === null
            ? null
            : typeof p.qrAnhId === "string"
              ? p.qrAnhId
              : undefined,
        macDinh: p.macDinh === undefined ? undefined : p.macDinh === true,
        kichHoat: p.kichHoat === undefined ? undefined : p.kichHoat === true,
      });
      return NextResponse.json({ shop });
    }

    const shop = await updateShopCuaHang(session.profile.id, {
      ten: body.ten === undefined ? undefined : (body.ten as string | null),
      moTa: body.moTa === undefined ? undefined : (body.moTa as string | null),
      avatarId:
        body.avatarId === undefined
          ? undefined
          : (body.avatarId as string | null),
      coverId:
        body.coverId === undefined ? undefined : (body.coverId as string | null),
      chinhSach:
        body.chinhSach === undefined
          ? undefined
          : (body.chinhSach as string | null),
      lienHe:
        body.lienHe === undefined ? undefined : (body.lienHe as string | null),
      nhanPhanLoai:
        body.nhanPhanLoai === undefined
          ? undefined
          : body.nhanPhanLoai === null || typeof body.nhanPhanLoai === "string"
            ? (body.nhanPhanLoai as string | null)
            : undefined,
      nhanPhanLoai2:
        body.nhanPhanLoai2 === undefined
          ? undefined
          : body.nhanPhanLoai2 === null || typeof body.nhanPhanLoai2 === "string"
            ? (body.nhanPhanLoai2 as string | null)
            : undefined,
    });
    return NextResponse.json({ shop });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPDATE_FAILED";
    if (msg === "PTTT_INVALID") {
      return NextResponse.json(
        { error: "Thiếu hoặc sai thông tin tài khoản nhận tiền." },
        { status: 400 },
      );
    }
    console.error("[api/shop/cua-hang] PATCH", e);
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}
