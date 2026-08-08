import { NextResponse } from "next/server";

import {
  getCinsTaiChinh,
  listCinsTaiChinhLichSu,
  setCinsTaiChinh,
  type CinsTaiChinhKhoi,
  type CinsTaiChinhPatch,
} from "@/lib/cins/tai-chinh-config";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canGrantAdmin,
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

const KHOI_OK: ReadonlySet<CinsTaiChinhKhoi> = new Set([
  "ty_le",
  "shop",
  "dong_don",
  "buyer_limit",
  "egress",
  "stk",
  "doanh_nghiep",
]);

/** UI gửi % (0–100); cũng nhận decimal 0–1. `0` và `"0"` đều hợp lệ. */
function parseTyLeFromBody(
  body: Record<string, unknown>,
  percentKey: string,
  decimalKey: string,
): number | undefined {
  const pct = body[percentKey];
  if (typeof pct === "number" && Number.isFinite(pct)) {
    return pct / 100;
  }
  if (typeof pct === "string") {
    const t = pct.trim();
    if (t !== "") {
      const n = Number(t.replace(",", "."));
      if (Number.isFinite(n)) return n / 100;
    }
  }
  const dec = body[decimalKey];
  if (typeof dec === "number" && Number.isFinite(dec)) {
    return dec;
  }
  return undefined;
}

/** GET /api/admin/tai-chinh — canManageUsers */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [cauHinh, lichSu] = await Promise.all([
    getCinsTaiChinh(),
    listCinsTaiChinhLichSu(15),
  ]);
  return NextResponse.json({
    cauHinh,
    lichSu,
    canEdit: canGrantAdmin(role),
  });
}

/**
 * PATCH /api/admin/tai-chinh — super_admin only.
 * Body: { khoi, …fields theo khối, ghiChu? }
 */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canGrantAdmin(role)) {
    return NextResponse.json(
      { error: "Chỉ Admin tối cao được sửa cấu hình tài chính." },
      { status: 403 },
    );
  }
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const khoi = body.khoi;
  if (typeof khoi !== "string" || !KHOI_OK.has(khoi as CinsTaiChinhKhoi)) {
    return NextResponse.json(
      { error: "khoi phải là ty_le | shop | dong_don | buyer_limit | egress | stk | doanh_nghiep." },
      { status: 400 },
    );
  }

  const patch: CinsTaiChinhPatch = {
    khoi: khoi as CinsTaiChinhKhoi,
    ghiChu: typeof body.ghiChu === "string" ? body.ghiChu : null,
  };

  if (khoi === "ty_le") {
    const csdtTyLe = parseTyLeFromBody(body, "tyLePercent", "csdtTyLe");
    if (csdtTyLe !== undefined) patch.csdtTyLe = csdtTyLe;
    if (typeof body.csdtNguongVnd === "number") {
      patch.csdtNguongVnd = body.csdtNguongVnd;
    }
    if (typeof body.csdtSoNgayHanTra === "number") {
      patch.csdtSoNgayHanTra = body.csdtSoNgayHanTra;
    }
  } else if (khoi === "shop") {
    const shopTyLe = parseTyLeFromBody(body, "shopTyLePercent", "shopTyLe");
    if (shopTyLe !== undefined) patch.shopTyLe = shopTyLe;
    if (typeof body.shopNguongVnd === "number") {
      patch.shopNguongVnd = body.shopNguongVnd;
    }
    if (typeof body.shopToiThieuXuatKyVnd === "number") {
      patch.shopToiThieuXuatKyVnd = body.shopToiThieuXuatKyVnd;
    }
    if (typeof body.shopSoNgayHanTra === "number") {
      patch.shopSoNgayHanTra = body.shopSoNgayHanTra;
    }
    if (typeof body.shopSoNgayAnHanTuKhai === "number") {
      patch.shopSoNgayAnHanTuKhai = body.shopSoNgayAnHanTuKhai;
    }
  } else if (khoi === "dong_don") {
    if (typeof body.shopNgayKhaoSatSuKien === "number") {
      patch.shopNgayKhaoSatSuKien = body.shopNgayKhaoSatSuKien;
    }
    if (typeof body.shopNgayKhaoSatTrucTiep === "number") {
      patch.shopNgayKhaoSatTrucTiep = body.shopNgayKhaoSatTrucTiep;
    }
    if (typeof body.shopNgayKhaoSatOnline === "number") {
      patch.shopNgayKhaoSatOnline = body.shopNgayKhaoSatOnline;
    }
    if (typeof body.shopNgayTuDongSuKien === "number") {
      patch.shopNgayTuDongSuKien = body.shopNgayTuDongSuKien;
    }
    if (typeof body.shopNgayTuDongTrucTiep === "number") {
      patch.shopNgayTuDongTrucTiep = body.shopNgayTuDongTrucTiep;
    }
    if (typeof body.shopNgayTuDongOnline === "number") {
      patch.shopNgayTuDongOnline = body.shopNgayTuDongOnline;
    }
    if (typeof body.shopNgayTuDongOnlineKhongMa === "number") {
      patch.shopNgayTuDongOnlineKhongMa = body.shopNgayTuDongOnlineKhongMa;
    }
    if (typeof body.shopSoLanChoHoan === "number") {
      patch.shopSoLanChoHoan = body.shopSoLanChoHoan;
    }
    if (typeof body.shopNgayHoanChuaNhan === "number") {
      patch.shopNgayHoanChuaNhan = body.shopNgayHoanChuaNhan;
    }
  } else if (khoi === "buyer_limit") {
    if (typeof body.buyerToiDaDonChoXacNhan === "number") {
      patch.buyerToiDaDonChoXacNhan = body.buyerToiDaDonChoXacNhan;
    }
    if (typeof body.buyerToiDaDonChoXacNhanMoiShop === "number") {
      patch.buyerToiDaDonChoXacNhanMoiShop =
        body.buyerToiDaDonChoXacNhanMoiShop;
    }
    if (typeof body.buyerToiDaDonMoiNgay === "number") {
      patch.buyerToiDaDonMoiNgay = body.buyerToiDaDonMoiNgay;
    }
  } else if (khoi === "egress") {
    if (body.csdtNguongEgressGb === null || body.csdtNguongEgressGb === "") {
      patch.csdtNguongEgressGb = null;
    } else if (typeof body.csdtNguongEgressGb === "number") {
      patch.csdtNguongEgressGb = body.csdtNguongEgressGb;
    } else if (typeof body.csdtNguongEgressGb === "string") {
      const t = body.csdtNguongEgressGb.trim();
      patch.csdtNguongEgressGb = t === "" ? null : Number(t);
    }
  } else if (khoi === "stk") {
    patch.bankBin = typeof body.bankBin === "string" ? body.bankBin : null;
    patch.bankSoTk = typeof body.bankSoTk === "string" ? body.bankSoTk : null;
    patch.bankChuTk = typeof body.bankChuTk === "string" ? body.bankChuTk : null;
    patch.bankTen = typeof body.bankTen === "string" ? body.bankTen : null;
  } else if (khoi === "doanh_nghiep") {
    patch.dnTenPhapNhan =
      typeof body.dnTenPhapNhan === "string" ? body.dnTenPhapNhan : null;
    patch.dnMst = typeof body.dnMst === "string" ? body.dnMst : null;
    patch.dnDiaChi = typeof body.dnDiaChi === "string" ? body.dnDiaChi : null;
    patch.dnNguoiDaiDien =
      typeof body.dnNguoiDaiDien === "string" ? body.dnNguoiDaiDien : null;
    patch.dnEmailHoaDon =
      typeof body.dnEmailHoaDon === "string" ? body.dnEmailHoaDon : null;
    if (typeof body.xuatHoaDonBat === "boolean") {
      patch.xuatHoaDonBat = body.xuatHoaDonBat;
    }
  }

  const result = await setCinsTaiChinh(patch, session.profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const lichSu = await listCinsTaiChinhLichSu(15);
  return NextResponse.json({ cauHinh: result.cauHinh, lichSu });
}
