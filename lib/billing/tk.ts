import "server-only";

import {
  CSDT_PHI_NGUONG_VND_DEFAULT,
  CSDT_PHI_SO_NGAY_HAN_DEFAULT,
  CSDT_PHI_TY_LE_DEFAULT,
  getCinsTaiChinh,
} from "@/lib/cins/tai-chinh-config";
import { shopPhiTyLe } from "@/lib/shop/phi-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  CinsDichVu,
  CinsNguoiPhuTrach,
  CinsTkThanhToan,
  DichVuLoai,
  DichVuTrangThai,
  TkTrangThai,
} from "./types";

type TkDb = {
  id: string;
  id_nguoi_dung: string;
  ten_phap_nhan: string | null;
  mst: string | null;
  dia_chi: string | null;
  email_hoa_don: string | null;
  han_muc_vnd: number | string;
  trang_thai: TkTrangThai;
  ly_do_khoa_tu_dong: string | null;
  ly_do_khoa_thu_cong: string | null;
  no_da_xoa_vnd: number | string;
  tao_luc: string;
  cap_nhat_luc: string;
};

const TK_SELECT =
  "id, id_nguoi_dung, ten_phap_nhan, mst, dia_chi, email_hoa_don, han_muc_vnd, trang_thai, ly_do_khoa_tu_dong, ly_do_khoa_thu_cong, no_da_xoa_vnd, tao_luc, cap_nhat_luc";

type DvDb = {
  id: string;
  id_tk: string;
  loai: DichVuLoai;
  tham_chieu_id: string;
  ty_le: number | string | null;
  nguong_chot_vnd: number | string | null;
  toi_thieu_xuat_ky_vnd: number | string | null;
  so_ngay_han_tra: number | null;
  da_dung_chay_thu: boolean;
  trang_thai: DichVuTrangThai;
  hd_ten_phap_nhan: string | null;
  hd_mst: string | null;
  hd_dia_chi: string | null;
  hd_email: string | null;
};

const DV_SELECT =
  "id, id_tk, loai, tham_chieu_id, ty_le, nguong_chot_vnd, toi_thieu_xuat_ky_vnd, so_ngay_han_tra, da_dung_chay_thu, trang_thai, hd_ten_phap_nhan, hd_mst, hd_dia_chi, hd_email";

export function mapTk(r: TkDb): CinsTkThanhToan {
  return {
    id: r.id,
    idNguoiDung: r.id_nguoi_dung,
    tenPhapNhan: r.ten_phap_nhan,
    mst: r.mst,
    diaChi: r.dia_chi,
    emailHoaDon: r.email_hoa_don,
    hanMucVnd: Number(r.han_muc_vnd) || 0,
    trangThai: r.trang_thai,
    lyDoKhoaTuDong: r.ly_do_khoa_tu_dong,
    lyDoKhoaThuCong: r.ly_do_khoa_thu_cong,
    noDaXoaVnd: Number(r.no_da_xoa_vnd) || 0,
    taoLuc: r.tao_luc,
    capNhatLuc: r.cap_nhat_luc,
  };
}

export function mapDichVu(r: DvDb): CinsDichVu {
  return {
    id: r.id,
    idTk: r.id_tk,
    loai: r.loai,
    thamChieuId: r.tham_chieu_id,
    tyLe: r.ty_le == null ? null : Number(r.ty_le),
    nguongChotVnd:
      r.nguong_chot_vnd == null ? null : Number(r.nguong_chot_vnd),
    toiThieuXuatKyVnd:
      r.toi_thieu_xuat_ky_vnd == null
        ? null
        : Number(r.toi_thieu_xuat_ky_vnd),
    soNgayHanTra: r.so_ngay_han_tra,
    daDungChayThu: r.da_dung_chay_thu,
    trangThai: r.trang_thai,
    hdTenPhapNhan: r.hd_ten_phap_nhan,
    hdMst: r.hd_mst,
    hdDiaChi: r.hd_dia_chi,
    hdEmail: r.hd_email,
  };
}

/** Lấy tk theo user; null nếu chưa tạo. */
export async function getTkByUserId(
  userId: string,
): Promise<CinsTkThanhToan | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_tk_thanh_toan")
    .select(TK_SELECT)
    .eq("id_nguoi_dung", userId)
    .maybeSingle<TkDb>();
  if (error) {
    console.error("[billing] getTkByUserId", error.message);
    return null;
  }
  return data ? mapTk(data) : null;
}

/** Lazy create — lần đầu phát sinh phí / backfill. */
export async function getOrCreateTk(
  userId: string,
): Promise<CinsTkThanhToan> {
  const existing = await getTkByUserId(userId);
  if (existing) return existing;

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("cins_tk_thanh_toan")
    .insert({
      id_nguoi_dung: userId,
      han_muc_vnd: 0,
      trang_thai: "hoat_dong",
      no_da_xoa_vnd: 0,
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select(TK_SELECT)
    .single<TkDb>();

  if (error) {
    /* Race UNIQUE — đọc lại. */
    if (error.code === "23505") {
      const again = await getTkByUserId(userId);
      if (again) return again;
    }
    throw new Error(`CREATE_TK_FAILED: ${error.message}`);
  }
  return mapTk(data);
}

/**
 * Owner billing của org = membership `owner` sớm nhất (tu_ngay ASC, id ASC).
 * Fallback: `org_to_chuc.nguoi_tao`.
 */
export async function resolveOrgBillingOwner(
  orgId: string,
): Promise<{ ownerId: string | null; ownerCount: number }> {
  const admin = createServiceRoleClient();
  const { data: owners } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, tu_ngay")
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "owner")
    .eq("trang_thai", "active")
    .order("tu_ngay", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  const list = (owners ?? []) as Array<{
    id: string;
    id_nguoi_dung: string;
    tu_ngay: string | null;
  }>;

  if (list.length > 0) {
    return { ownerId: list[0].id_nguoi_dung, ownerCount: list.length };
  }

  /* Một số org cũ có thể dùng trang_thai khác — thử không lọc. */
  const { data: ownersAny } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id, id_nguoi_dung, tu_ngay")
    .eq("id_to_chuc", orgId)
    .eq("vai_tro", "owner")
    .order("tu_ngay", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  const list2 = (ownersAny ?? []) as Array<{
    id: string;
    id_nguoi_dung: string;
  }>;
  if (list2.length > 0) {
    return { ownerId: list2[0].id_nguoi_dung, ownerCount: list2.length };
  }

  const { data: org } = await admin
    .from("org_to_chuc")
    .select("nguoi_tao")
    .eq("id", orgId)
    .maybeSingle<{ nguoi_tao: string | null }>();

  return {
    ownerId: org?.nguoi_tao ?? null,
    ownerCount: org?.nguoi_tao ? 1 : 0,
  };
}

async function defaultParamsForLoai(loai: DichVuLoai): Promise<{
  tyLe: number | null;
  nguongChotVnd: number | null;
  toiThieuXuatKyVnd: number | null;
  soNgayHanTra: number | null;
}> {
  if (loai === "csdt_phi") {
    try {
      const cfg = await getCinsTaiChinh();
      return {
        tyLe: cfg.csdt.tyLe,
        nguongChotVnd: cfg.csdt.nguongVnd,
        toiThieuXuatKyVnd: null,
        soNgayHanTra: cfg.csdt.soNgayHanTra,
      };
    } catch {
      return {
        tyLe: CSDT_PHI_TY_LE_DEFAULT,
        nguongChotVnd: CSDT_PHI_NGUONG_VND_DEFAULT,
        toiThieuXuatKyVnd: null,
        soNgayHanTra: CSDT_PHI_SO_NGAY_HAN_DEFAULT,
      };
    }
  }
  if (loai === "shop_phi") {
    const tyLe = await shopPhiTyLe();
    return {
      tyLe,
      nguongChotVnd: null,
      toiThieuXuatKyVnd: null,
      soNgayHanTra: 15,
    };
  }
  return {
    tyLe: null,
    nguongChotVnd: null,
    toiThieuXuatKyVnd: null,
    soNgayHanTra: null,
  };
}

/** Lấy hoặc tạo dòng dịch vụ UNIQUE (loai, tham_chieu_id). */
export async function ensureDichVu(input: {
  idTk: string;
  loai: DichVuLoai;
  thamChieuId: string;
}): Promise<CinsDichVu> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("cins_dich_vu")
    .select(DV_SELECT)
    .eq("loai", input.loai)
    .eq("tham_chieu_id", input.thamChieuId)
    .maybeSingle<DvDb>();
  if (existing) return mapDichVu(existing);

  const defaults = await defaultParamsForLoai(input.loai);
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("cins_dich_vu")
    .insert({
      id_tk: input.idTk,
      loai: input.loai,
      tham_chieu_id: input.thamChieuId,
      ty_le: defaults.tyLe,
      nguong_chot_vnd: defaults.nguongChotVnd,
      toi_thieu_xuat_ky_vnd: defaults.toiThieuXuatKyVnd,
      so_ngay_han_tra: defaults.soNgayHanTra,
      da_dung_chay_thu: false,
      trang_thai: "hoat_dong",
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select(DV_SELECT)
    .single<DvDb>();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await admin
        .from("cins_dich_vu")
        .select(DV_SELECT)
        .eq("loai", input.loai)
        .eq("tham_chieu_id", input.thamChieuId)
        .maybeSingle<DvDb>();
      if (again) return mapDichVu(again);
    }
    throw new Error(`CREATE_DICH_VU_FAILED: ${error.message}`);
  }
  return mapDichVu(data);
}

export async function listDichVuForTk(
  tkId: string,
): Promise<CinsDichVu[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_dich_vu")
    .select(DV_SELECT)
    .eq("id_tk", tkId)
    .order("tao_luc", { ascending: true });
  if (error) {
    console.error("[billing] listDichVu", error.message);
    return [];
  }
  return ((data ?? []) as DvDb[]).map(mapDichVu);
}

/** Viewer có quyền đọc tk? (owner hoặc phụ trách). */
export async function canDocTk(
  tkId: string,
  userId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data: tk } = await admin
    .from("cins_tk_thanh_toan")
    .select("id_nguoi_dung")
    .eq("id", tkId)
    .maybeSingle<{ id_nguoi_dung: string }>();
  if (!tk) return false;
  if (tk.id_nguoi_dung === userId) return true;
  const { data: pt } = await admin
    .from("cins_tk_nguoi_phu_trach")
    .select("id")
    .eq("id_tk", tkId)
    .eq("id_nguoi_dung", userId)
    .maybeSingle<{ id: string }>();
  return Boolean(pt?.id);
}

export async function canSuaTk(
  tkId: string,
  userId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data: tk } = await admin
    .from("cins_tk_thanh_toan")
    .select("id_nguoi_dung")
    .eq("id", tkId)
    .maybeSingle<{ id_nguoi_dung: string }>();
  if (!tk) return false;
  if (tk.id_nguoi_dung === userId) return true;
  const { data: pt } = await admin
    .from("cins_tk_nguoi_phu_trach")
    .select("id")
    .eq("id_tk", tkId)
    .eq("id_nguoi_dung", userId)
    .eq("vai_tro", "quan_ly")
    .maybeSingle<{ id: string }>();
  return Boolean(pt?.id);
}

/** Tk mà user được xem: sở hữu hoặc phụ trách. */
export async function findAccessibleTkForUser(
  userId: string,
): Promise<{ tk: CinsTkThanhToan; laChu: boolean } | null> {
  const owned = await getTkByUserId(userId);
  if (owned) return { tk: owned, laChu: true };

  const admin = createServiceRoleClient();
  const { data: pt } = await admin
    .from("cins_tk_nguoi_phu_trach")
    .select("id_tk")
    .eq("id_nguoi_dung", userId)
    .limit(1)
    .maybeSingle<{ id_tk: string }>();
  if (!pt?.id_tk) return null;

  const { data } = await admin
    .from("cins_tk_thanh_toan")
    .select(TK_SELECT)
    .eq("id", pt.id_tk)
    .maybeSingle<TkDb>();
  if (!data) return null;
  return { tk: mapTk(data), laChu: false };
}

export async function listPhuTrach(
  tkId: string,
): Promise<CinsNguoiPhuTrach[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_tk_nguoi_phu_trach")
    .select(
      "id, id_tk, id_nguoi_dung, vai_tro, tao_luc, user_nguoi_dung: id_nguoi_dung ( slug, ten_hien_thi )",
    )
    .eq("id_tk", tkId)
    .order("tao_luc", { ascending: true });
  if (error) {
    console.error("[billing] listPhuTrach", error.message);
    return [];
  }
  return ((data ?? []) as Array<{
    id: string;
    id_tk: string;
    id_nguoi_dung: string;
    vai_tro: "quan_ly";
    tao_luc: string;
    user_nguoi_dung:
      | { slug: string | null; ten_hien_thi: string | null }
      | { slug: string | null; ten_hien_thi: string | null }[]
      | null;
  }>).map((r) => {
    const u = Array.isArray(r.user_nguoi_dung)
      ? r.user_nguoi_dung[0]
      : r.user_nguoi_dung;
    return {
      id: r.id,
      idTk: r.id_tk,
      idNguoiDung: r.id_nguoi_dung,
      vaiTro: r.vai_tro,
      taoLuc: r.tao_luc,
      tenHienThi: u?.ten_hien_thi ?? null,
      slug: u?.slug ?? null,
    };
  });
}

export async function addPhuTrach(input: {
  tkId: string;
  actorId: string;
  targetUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canSuaTk(input.tkId, input.actorId))) {
    return { ok: false, error: "Forbidden" };
  }
  if (input.targetUserId === input.actorId) {
    return { ok: false, error: "Không thêm chính mình." };
  }
  const admin = createServiceRoleClient();
  const { data: tk } = await admin
    .from("cins_tk_thanh_toan")
    .select("id_nguoi_dung")
    .eq("id", input.tkId)
    .maybeSingle<{ id_nguoi_dung: string }>();
  if (tk?.id_nguoi_dung === input.targetUserId) {
    return { ok: false, error: "Người này đã là chủ tài khoản." };
  }
  const { data: user } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("id", input.targetUserId)
    .maybeSingle<{ id: string }>();
  if (!user) return { ok: false, error: "Không tìm thấy người dùng." };

  const { error } = await admin.from("cins_tk_nguoi_phu_trach").insert({
    id_tk: input.tkId,
    id_nguoi_dung: input.targetUserId,
    vai_tro: "quan_ly",
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Đã có trong danh sách." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removePhuTrach(input: {
  tkId: string;
  actorId: string;
  rowId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canSuaTk(input.tkId, input.actorId))) {
    return { ok: false, error: "Forbidden" };
  }
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("cins_tk_nguoi_phu_trach")
    .delete()
    .eq("id", input.rowId)
    .eq("id_tk", input.tkId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
