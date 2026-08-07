import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canGrantAdmin,
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { conNoHoaDon } from "@/lib/billing/hoa-don-ma";
import { trySyncHoaDonFromSepayLog } from "@/lib/billing/sepay-giao-dich";
import {
  bacTuKhaiVaKhoa,
  listTuKhaiChoDoiSoat,
} from "@/lib/billing/tu-khai-admin";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** GET /api/admin/tai-chinh/tu-khai — hoá đơn đang tự khai chờ đối soát */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await listTuKhaiChoDoiSoat(50);
  return NextResponse.json({ items, canEdit: canGrantAdmin(role) });
}

/**
 * POST /api/admin/tai-chinh/tu-khai
 * Body: { action: "gan" | "bac", hoaDonId }
 */
export async function POST(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canGrantAdmin(role)) {
    return NextResponse.json(
      { error: "Chỉ Admin tối cao được xử lý tự khai." },
      { status: 403 },
    );
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const hoaDonId =
    typeof body.hoaDonId === "string" ? body.hoaDonId.trim() : "";
  const action = body.action;
  if (!hoaDonId) {
    return NextResponse.json({ error: "Thiếu hoaDonId." }, { status: 400 });
  }
  if (action !== "gan" && action !== "bac") {
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 400 });
  }

  if (action === "bac") {
    const result = await bacTuKhaiVaKhoa({ hoaDonId, actorId });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({
      ok: true,
      action: "bac",
      trangThaiMoi: result.trangThaiMoi,
    });
  }

  /* action === "gan" — khớp SePay theo mã CK của hoá đơn */
  const admin = createServiceRoleClient();
  const { data: hd } = await admin
    .from("cins_hoa_don")
    .select(
      "id, ma_tham_chieu, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai",
    )
    .eq("id", hoaDonId)
    .maybeSingle<{
      id: string;
      ma_tham_chieu: string;
      so_tien_vnd: number | string;
      dieu_chinh_vnd: number | string | null;
      da_tra_vnd: number | string | null;
      trang_thai: string;
    }>();

  if (!hd) {
    return NextResponse.json(
      { error: "Không tìm thấy hoá đơn." },
      { status: 404 },
    );
  }

  const ma = (hd.ma_tham_chieu ?? "").trim();
  if (!ma) {
    return NextResponse.json(
      { error: "Hoá đơn chưa có mã CK." },
      { status: 400 },
    );
  }

  const sync = await trySyncHoaDonFromSepayLog({
    hoaDonId: hd.id,
    maThamChieu: ma,
  });

  const { data: after } = await admin
    .from("cins_hoa_don")
    .select("so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai")
    .eq("id", hd.id)
    .maybeSingle<{
      so_tien_vnd: number | string;
      dieu_chinh_vnd: number | string | null;
      da_tra_vnd: number | string | null;
      trang_thai: string;
    }>();

  const conNoVnd = after
    ? conNoHoaDon({
        soTienVnd: Math.round(Number(after.so_tien_vnd) || 0),
        dieuChinhVnd: Math.round(Number(after.dieu_chinh_vnd) || 0),
        daTraVnd: Math.round(Number(after.da_tra_vnd) || 0),
        trangThai: after.trang_thai,
      })
    : null;

  if (!sync.synced) {
    return NextResponse.json({
      ok: true,
      action: "gan",
      synced: false,
      conNoVnd,
      message:
        "Chưa tìm thấy giao dịch khớp mã CK trong log SePay. Kiểm tra nội dung chuyển khoản hoặc đợi webhook.",
    });
  }

  return NextResponse.json({
    ok: true,
    action: "gan",
    synced: true,
    conNoVnd,
    idThanhToan: sync.idThanhToan,
  });
}
