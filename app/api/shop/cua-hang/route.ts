import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { sessionMayActAsOwner } from "@/lib/admin/seeding-nick";
import {
  deleteShopCuaHang,
  deleteShopPhuongThucTt,
  getOrCreateShopCuaHang,
  getShopCuaHangByUserId,
  updateShopCuaHang,
  upsertShopPhuongThucTt,
} from "@/lib/shop/cua-hang";
import { getBanHangEnabled, getShopHienThi } from "@/lib/shop/settings";
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

async function resolveMutationOwnerId(params: {
  sessionProfileId: string;
  ownerId?: string | null;
  slug?: string | null;
}): Promise<string | null> {
  const target =
    (await resolveOwnerId({
      userId: params.ownerId,
      slug: params.slug,
    })) ?? params.sessionProfileId;
  const ok = await sessionMayActAsOwner({
    sessionProfileId: params.sessionProfileId,
    targetOwnerId: target,
  });
  return ok ? target : null;
}

/**
 * GET /api/shop/cua-hang?slug=… | ?userId=…
 * - Chủ: luôn trả shop (tạo trống nếu chưa có) khi đã đăng nhập đúng owner.
 * - Khách: chỉ khi seller bật bán hàng + «Hiển thị shop».
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
    const [banHangBat, shopVisible] = await Promise.all([
      getBanHangEnabled(session.profile.id),
      getShopHienThi(session.profile.id),
    ]);
    return NextResponse.json({
      shop,
      banHangBat,
      shopVisible,
      isOwner: true,
    });
  }

  const isOwner = await sessionMayActAsOwner({
    sessionProfileId: session?.profile?.id,
    targetOwnerId: ownerId,
  });
  const [banHangBat, shopVisible] = await Promise.all([
    getBanHangEnabled(ownerId),
    getShopHienThi(ownerId),
  ]);

  if (!isOwner && !shopVisible) {
    return NextResponse.json(
      {
        error: "Cửa hàng chưa mở.",
        shop: null,
        banHangBat: false,
        shopVisible: false,
      },
      { status: 404 },
    );
  }

  const shop = isOwner
    ? await getOrCreateShopCuaHang(ownerId)
    : await getShopCuaHangByUserId(ownerId);

  return NextResponse.json({
    shop,
    banHangBat,
    shopVisible,
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

  const mutationOwnerId = await resolveMutationOwnerId({
    sessionProfileId: session.profile.id,
    ownerId: typeof body.ownerId === "string" ? body.ownerId : null,
    slug: typeof body.slug === "string" ? body.slug : null,
  });
  if (!mutationOwnerId) {
    return NextResponse.json({ error: "Không có quyền sửa cửa hàng." }, { status: 403 });
  }

  try {
    if (typeof body.xoaPhuongThucId === "string") {
      const shop = await deleteShopPhuongThucTt(
        mutationOwnerId,
        body.xoaPhuongThucId,
      );
      return NextResponse.json({ shop });
    }

    const pttt = body.phuongThuc;
    if (pttt && typeof pttt === "object") {
      const p = pttt as Record<string, unknown>;
      const shop = await upsertShopPhuongThucTt(mutationOwnerId, {
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

    const shop = await updateShopCuaHang(mutationOwnerId, {
      ten: body.ten === undefined ? undefined : (body.ten as string | null),
      moTa: body.moTa === undefined ? undefined : (body.moTa as string | null),
      avatarId:
        body.avatarId === undefined
          ? undefined
          : (body.avatarId as string | null),
      coverId:
        body.coverId === undefined ? undefined : (body.coverId as string | null),
      bannerSuKienId:
        body.bannerSuKienId === undefined
          ? undefined
          : (body.bannerSuKienId as string | null),
      bannerSuKienHien:
        body.bannerSuKienHien === undefined
          ? undefined
          : body.bannerSuKienHien === true
            ? true
            : body.bannerSuKienHien === false
              ? false
              : undefined,
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
      tamDong:
        body.tamDong === undefined
          ? undefined
          : body.tamDong === true
            ? true
            : body.tamDong === false
              ? false
              : undefined,
      tamDongTu:
        body.tamDongTu === undefined
          ? undefined
          : body.tamDongTu === null || typeof body.tamDongTu === "string"
            ? (body.tamDongTu as string | null)
            : undefined,
      tamDongDen:
        body.tamDongDen === undefined
          ? undefined
          : body.tamDongDen === null || typeof body.tamDongDen === "string"
            ? (body.tamDongDen as string | null)
            : undefined,
      tamDongLyDo:
        body.tamDongLyDo === undefined
          ? undefined
          : body.tamDongLyDo === null || typeof body.tamDongLyDo === "string"
            ? (body.tamDongLyDo as string | null)
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
    if (msg === "PTTT_LIMIT") {
      return NextResponse.json(
        { error: "Chỉ được lưu một tài khoản nhận tiền. Hãy sửa tài khoản hiện có." },
        { status: 400 },
      );
    }
    if (msg === "TAM_DONG_RANGE_REQUIRED") {
      return NextResponse.json(
        { error: "Cần chọn thời gian nghỉ từ." },
        { status: 400 },
      );
    }
    if (msg === "TAM_DONG_RANGE_INVALID") {
      return NextResponse.json(
        { error: "Thời gian mở lại phải sau thời gian bắt đầu nghỉ." },
        { status: 400 },
      );
    }
    console.error("[api/shop/cua-hang] PATCH", e);
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}

/**
 * DELETE /api/shop/cua-hang — chủ (hoặc admin nick seeding) xóa cửa hàng.
 * body optional: `{ ownerId?, slug? }`
 */
export async function DELETE(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Thiếu đăng nhập." }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const mutationOwnerId = await resolveMutationOwnerId({
    sessionProfileId: session.profile.id,
    ownerId: typeof body.ownerId === "string" ? body.ownerId : null,
    slug: typeof body.slug === "string" ? body.slug : null,
  });
  if (!mutationOwnerId) {
    return NextResponse.json({ error: "Không có quyền xóa cửa hàng." }, { status: 403 });
  }

  try {
    await deleteShopCuaHang(mutationOwnerId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/shop/cua-hang] DELETE", e);
    return NextResponse.json(
      { error: "Không xóa được cửa hàng." },
      { status: 500 },
    );
  }
}
