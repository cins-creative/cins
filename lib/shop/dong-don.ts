import "server-only";

import { openDirectRoom, sendRoomMessage } from "@/lib/chat/direct-message";
import { getCinsTaiChinh } from "@/lib/cins/tai-chinh-config";
import { todayYmdVn } from "@/lib/co-so/ky-hoc";
import { addDaysYmd } from "@/lib/co-so/phi-config";
import {
  completeDonHang,
  getDonHang,
} from "@/lib/shop/don-hang";
import { moKhieuNaiTuHeThong } from "@/lib/shop/khieu-nai";
import type { ShopDonHang, ShopHinhThucGiao } from "@/lib/shop/types";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SHOP_DON_KHAO_SAT_LOAI = "shop_don_khao_sat" as const;

/**
 * P3b #8 — tin hệ thống trong DM buyer↔seller, chỉ buyer thấy (`chi_hien_cho`).
 * Gửi với id_nguoi_gui = seller (thành viên phòng) nhưng ẩn với seller.
 */
async function guiChatKhaoSatBuyerOnly(
  don: ShopDonHang,
  noiDung: string,
): Promise<void> {
  try {
    const opened = await openDirectRoom(don.idNguoiBan, don.idNguoiMua);
    if (!opened.ok) {
      console.error("[shop] guiChatKhaoSatBuyerOnly open", opened.error);
      return;
    }
    const roomId = opened.thread.roomId;
    if (!roomId) return;
    const result = await sendRoomMessage(roomId, don.idNguoiBan, {
      body: noiDung,
      loaiTin: "system",
      chiHienCho: [don.idNguoiMua],
    });
    if (!result.ok) {
      console.error("[shop] guiChatKhaoSatBuyerOnly send", result.error);
    }
  } catch (e) {
    console.error(
      "[shop] guiChatKhaoSatBuyerOnly",
      e instanceof Error ? e.message : e,
    );
  }
}

const OPEN_TT = [
  "da_nhan_tien",
  "cho_lay_hang",
  "dang_giao",
  "da_giao_tai_su_kien",
] as const;

function ymdFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return todayYmdVn(new Date(iso));
  } catch {
    return null;
  }
}

/** Base mốc thời gian khảo sát / tự đóng theo hình thức giao (plan Q5). */
export function baseNgayDongDon(don: ShopDonHang): string | null {
  const ht = (don.hinhThucGiao ?? null) as ShopHinhThucGiao | null;
  if (ht === "online" && don.vanChuyenMa?.trim()) {
    /* Có mã: ưu tiên xac_nhan_luc vẫn là lúc nhận tiền; plan: mốc từ khi có mã —
       không lưu riêng lúc dán mã → dùng xac_nhan_luc (conservative) + vanChuyen có mã. */
    return ymdFromIso(don.xacNhanLuc) ?? ymdFromIso(don.taoLuc);
  }
  return ymdFromIso(don.xacNhanLuc) ?? ymdFromIso(don.taoLuc);
}

export type DongDonCfg = {
  ngayKhaoSatSuKien: number;
  ngayKhaoSatTrucTiep: number;
  ngayKhaoSatOnline: number;
  ngayTuDongSuKien: number;
  ngayTuDongTrucTiep: number;
  ngayTuDongOnline: number;
  ngayTuDongOnlineKhongMa: number;
  soLanChoHoan: number;
  ngayHoanChuaNhan: number;
};

export function dongDonCfgFromTaiChinh(
  cfg: Awaited<ReturnType<typeof getCinsTaiChinh>>,
): DongDonCfg {
  const d = cfg.shop.dongDon;
  return {
    ngayKhaoSatSuKien: d.ngayKhaoSatSuKien,
    ngayKhaoSatTrucTiep: d.ngayKhaoSatTrucTiep,
    ngayKhaoSatOnline: d.ngayKhaoSatOnline,
    ngayTuDongSuKien: d.ngayTuDongSuKien,
    ngayTuDongTrucTiep: d.ngayTuDongTrucTiep,
    ngayTuDongOnline: d.ngayTuDongOnline,
    ngayTuDongOnlineKhongMa: d.ngayTuDongOnlineKhongMa,
    soLanChoHoan: d.soLanChoHoan,
    ngayHoanChuaNhan: d.ngayHoanChuaNhan,
  };
}

export function ngayDenKhaoSat(
  don: ShopDonHang,
  cfg: DongDonCfg,
): string | null {
  const base = baseNgayDongDon(don);
  if (!base) return null;
  if (don.hoanKhaoSatDen) return don.hoanKhaoSatDen;
  const ht = don.hinhThucGiao ?? "truc_tiep";
  const days =
    ht === "tai_su_kien"
      ? cfg.ngayKhaoSatSuKien
      : ht === "online"
        ? cfg.ngayKhaoSatOnline
        : cfg.ngayKhaoSatTrucTiep;
  return addDaysYmd(base, days);
}

export function ngayDenTuDong(
  don: ShopDonHang,
  cfg: DongDonCfg,
): string | null {
  const base = baseNgayDongDon(don);
  if (!base) return null;
  const ht = don.hinhThucGiao ?? "truc_tiep";
  if (ht === "tai_su_kien") {
    return addDaysYmd(base, cfg.ngayTuDongSuKien);
  }
  if (ht === "online") {
    if (!don.vanChuyenMa?.trim()) {
      return addDaysYmd(base, cfg.ngayTuDongOnlineKhongMa);
    }
    return addDaysYmd(base, cfg.ngayTuDongOnline);
  }
  return addDaysYmd(base, cfg.ngayTuDongTrucTiep);
}

/** Buyer còn được trả lời khảo sát (đã đến ngày hỏi, chưa đóng). */
export function buyerCoTheKhaoSat(
  don: ShopDonHang,
  cfg: DongDonCfg,
  now = new Date(),
): boolean {
  if (!OPEN_TT.includes(don.trangThai as (typeof OPEN_TT)[number])) {
    return false;
  }
  /* Đang trong cửa sổ hoãn «chưa nhận» — chưa đến ngày hỏi lại thì ẩn nút. */
  if (don.khaoSatTraLoi === "chua_nhan" && don.hoanKhaoSatDen) {
    const today = todayYmdVn(now);
    return today >= don.hoanKhaoSatDen;
  }
  const den = ngayDenKhaoSat(don, cfg);
  if (!den) return false;
  return todayYmdVn(now) >= den;
}

export async function buyerXacNhanDaNhan(
  buyerId: string,
  donId: string,
): Promise<ShopDonHang> {
  return completeDonHang(buyerId, donId, { dongBoi: "buyer" });
}

/**
 * Buyer «chưa nhận»: hoãn hoặc mở khiếu nại hệ thống khi hết lần.
 * Không đóng đơn, không cáo buộc buyer.
 */
export async function buyerBaoChuaNhan(
  buyerId: string,
  donId: string,
): Promise<{
  don: ShopDonHang;
  ketQua: "hoan" | "mo_khieu_nai";
}> {
  const cfg = dongDonCfgFromTaiChinh(await getCinsTaiChinh());
  const don = await getDonHang(donId);
  if (!don) throw new Error("NOT_FOUND");
  if (don.idNguoiMua !== buyerId) throw new Error("FORBIDDEN");
  if (!OPEN_TT.includes(don.trangThai as (typeof OPEN_TT)[number])) {
    throw new Error("INVALID_STATE");
  }
  if (!buyerCoTheKhaoSat(don, cfg)) {
    throw new Error("NOT_YET");
  }

  const admin = createServiceRoleClient();
  const now = new Date();
  const nextLan = (don.soLanHoanChuaNhan ?? 0) + 1;
  const today = todayYmdVn(now);

  if (nextLan > cfg.soLanChoHoan) {
    await moKhieuNaiTuHeThong({
      idDonHang: don.id,
      moTa:
        "Hệ thống: người mua báo chưa nhận hàng quá số lần hoãn cho phép. Cần admin xử — không phải cáo buộc tự động.",
    });
    const { error } = await admin
      .from("shop_don_hang")
      .update({
        khao_sat_luc: now.toISOString(),
        khao_sat_tra_loi: "chua_nhan",
        so_lan_hoan_chua_nhan: nextLan,
        hoan_khao_sat_den: null,
        cap_nhat_luc: now.toISOString(),
      })
      .eq("id", don.id);
    if (error) throw new Error("UPDATE_FAILED");

    await insertSocialThongBao(admin, {
      nguoi_nhan: don.idNguoiBan,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_DON_KHAO_SAT_LOAI,
      id_doi_tuong: don.id,
      noi_dung:
        "Đơn có báo chưa nhận quá hạn hoãn — admin sẽ xem khiếu nại. Có thể bạn quên cập nhật giao hàng.",
    });

    const updated = await getDonHang(donId);
    if (!updated) throw new Error("NOT_FOUND");
    return { don: updated, ketQua: "mo_khieu_nai" };
  }

  const den = addDaysYmd(today, cfg.ngayHoanChuaNhan);
  const { error } = await admin
    .from("shop_don_hang")
    .update({
      khao_sat_luc: now.toISOString(),
      khao_sat_tra_loi: "chua_nhan",
      so_lan_hoan_chua_nhan: nextLan,
      hoan_khao_sat_den: den,
      cap_nhat_luc: now.toISOString(),
    })
    .eq("id", don.id);
  if (error) throw new Error("UPDATE_FAILED");

  if (nextLan === 1) {
    await insertSocialThongBao(admin, {
      nguoi_nhan: don.idNguoiBan,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_DON_KHAO_SAT_LOAI,
      id_doi_tuong: don.id,
      noi_dung:
        "Người mua báo chưa nhận hàng — có thể bạn quên cập nhật đơn. Hẹn hỏi lại sau vài ngày.",
    });
  }

  const updated = await getDonHang(donId);
  if (!updated) throw new Error("NOT_FOUND");
  return { don: updated, ketQua: "hoan" };
}

export type TickDongDonResult = {
  khaoSat: number;
  tuDong: number;
  errors: number;
};

async function processOpenDonDong(
  don: ShopDonHang,
  cfg: DongDonCfg,
  now: Date,
  today: string,
): Promise<"tu_dong" | "khao_sat" | "skip"> {
  const admin = createServiceRoleClient();
  const tuDongDen = ngayDenTuDong(don, cfg);
  const dangHoan =
    don.khaoSatTraLoi === "chua_nhan" &&
    don.hoanKhaoSatDen != null &&
    today < don.hoanKhaoSatDen;

  if (tuDongDen && today >= tuDongDen && !dangHoan) {
    await completeDonHang(null, don.id, { dongBoi: "he_thong" });
    await insertSocialThongBao(admin, {
      nguoi_nhan: don.idNguoiMua,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_DON_KHAO_SAT_LOAI,
      id_doi_tuong: don.id,
      noi_dung: `Đơn ${don.maDon ?? don.id.slice(0, 8)} đã tự đóng vì hết hạn xác nhận nhận hàng.`,
    });
    await insertSocialThongBao(admin, {
      nguoi_nhan: don.idNguoiBan,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_DON_KHAO_SAT_LOAI,
      id_doi_tuong: don.id,
      noi_dung: `Đơn ${don.maDon ?? don.id.slice(0, 8)} tự đóng (buyer im lặng) — đã ghi phí nền tảng nếu có.`,
    });
    return "tu_dong";
  }

  const khaoDen = ngayDenKhaoSat(don, cfg);
  if (
    khaoDen &&
    today >= khaoDen &&
    !don.khaoSatLuc &&
    don.khaoSatTraLoi == null
  ) {
    await admin
      .from("shop_don_hang")
      .update({
        khao_sat_luc: now.toISOString(),
        cap_nhat_luc: now.toISOString(),
      })
      .eq("id", don.id)
      .is("khao_sat_luc", null);
    await insertSocialThongBao(admin, {
      nguoi_nhan: don.idNguoiMua,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_DON_KHAO_SAT_LOAI,
      id_doi_tuong: don.id,
      noi_dung: `Bạn đã nhận hàng đơn ${don.maDon ?? ""} chưa? Mở đơn để xác nhận — hoặc báo chưa nhận để được hoãn.`,
    });
    await guiChatKhaoSatBuyerOnly(
      don,
      `Bạn đã nhận hàng đơn ${don.maDon ?? don.id.slice(0, 8)} chưa? Mở đơn để xác nhận — hoặc báo chưa nhận để được hoãn.`,
    );
    return "khao_sat";
  }

  if (
    don.khaoSatTraLoi === "chua_nhan" &&
    don.hoanKhaoSatDen &&
    today >= don.hoanKhaoSatDen
  ) {
    const nhac = `Hết hạn hoãn — xác nhận đã nhận hoặc báo chưa nhận lại cho đơn ${don.maDon ?? don.id.slice(0, 8)}.`;
    await insertSocialThongBao(admin, {
      nguoi_nhan: don.idNguoiMua,
      loai: "thong_tin",
      loai_doi_tuong: SHOP_DON_KHAO_SAT_LOAI,
      id_doi_tuong: don.id,
      noi_dung: nhac,
    });
    await guiChatKhaoSatBuyerOnly(don, nhac);
  }

  return "skip";
}

/**
 * Lazy tick khi mở chi tiết đơn (bổ sung cron) — chỉ xử lý nếu đơn còn mở P3a.
 */
export async function tickDonHangDongDonLazy(
  donId: string,
  now = new Date(),
): Promise<ShopDonHang | null> {
  const don = await getDonHang(donId);
  if (!don) return null;
  if (!(OPEN_TT as readonly string[]).includes(don.trangThai)) return don;
  const cfg = dongDonCfgFromTaiChinh(await getCinsTaiChinh());
  const today = todayYmdVn(now);
  try {
    await processOpenDonDong(don, cfg, now, today);
  } catch (e) {
    console.error(
      "[shop] tickDonHangDongDonLazy",
      donId,
      e instanceof Error ? e.message : e,
    );
  }
  return getDonHang(donId);
}

/**
 * Cron/lazy: gửi khảo sát (đánh dấu khao_sat_luc lần đầu) + tự đóng quá hạn im lặng.
 */
export async function tickDongDonShop(
  now = new Date(),
  limit = 80,
): Promise<TickDongDonResult> {
  const admin = createServiceRoleClient();
  const cfg = dongDonCfgFromTaiChinh(await getCinsTaiChinh());
  const today = todayYmdVn(now);
  let khaoSat = 0;
  let tuDong = 0;
  let errors = 0;

  const { data: rows } = await admin
    .from("shop_don_hang")
    .select(
      "id, id_nguoi_mua, id_nguoi_ban, trang_thai, xac_nhan_luc, tao_luc, hinh_thuc_giao, van_chuyen_ma, khao_sat_luc, khao_sat_tra_loi, so_lan_hoan_chua_nhan, hoan_khao_sat_den",
    )
    .in("trang_thai", [...OPEN_TT])
    .order("xac_nhan_luc", { ascending: true, nullsFirst: false })
    .limit(Math.min(200, Math.max(1, limit)));

  for (const raw of rows ?? []) {
    try {
      const don = await getDonHang(raw.id as string);
      if (!don) continue;
      const r = await processOpenDonDong(don, cfg, now, today);
      if (r === "tu_dong") tuDong += 1;
      else if (r === "khao_sat") khaoSat += 1;
    } catch (e) {
      errors += 1;
      console.error(
        "[shop] tickDongDon",
        raw.id,
        e instanceof Error ? e.message : e,
      );
    }
  }

  return { khaoSat, tuDong, errors };
}
