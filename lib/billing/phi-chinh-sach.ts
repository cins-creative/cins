import "server-only";

import { getCinsTaiChinh } from "@/lib/cins/tai-chinh-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PhiDoiTuong = "shop" | "csdt";

export type PhiThongBaoPublic = {
  id: string;
  doiTuong: PhiDoiTuong;
  tieuDe: string;
  noiDung: string;
  tyLeDuKien: number | null;
  hieuLucDuKien: string | null;
  congBoLuc: string;
};

export type PhiDangApDungShop = {
  doiTuong: "shop";
  tyLe: number;
  tyLePercent: number;
  nguongVnd: number;
  toiThieuXuatKyVnd: number;
  soNgayHanTra: number;
  camKetCongBoTruocNgay: number;
};

export type PhiDangApDungCsdt = {
  doiTuong: "csdt";
  tyLe: number;
  tyLePercent: number;
  nguongVnd: number;
  soNgayHanTra: number;
  camKetCongBoTruocNgay: number;
};

export type PhiThongBaoAdmin = PhiThongBaoPublic & {
  trangThai: "nhap" | "da_cong_bo" | "huy";
  taoLuc: string;
  capNhatLuc: string;
};

const CAM_KET_CONG_BO_TRUOC_NGAY = 30;

function pct(tyLe: number): number {
  return Math.round(tyLe * 10000) / 100;
}

export async function getPhiDangApDungShop(): Promise<PhiDangApDungShop> {
  const cfg = await getCinsTaiChinh();
  return {
    doiTuong: "shop",
    tyLe: cfg.shop.tyLe,
    tyLePercent: pct(cfg.shop.tyLe),
    nguongVnd: cfg.shop.nguongVnd,
    toiThieuXuatKyVnd: cfg.shop.toiThieuXuatKyVnd,
    soNgayHanTra: cfg.shop.soNgayHanTra,
    camKetCongBoTruocNgay: CAM_KET_CONG_BO_TRUOC_NGAY,
  };
}

export async function getPhiDangApDungCsdt(): Promise<PhiDangApDungCsdt> {
  const cfg = await getCinsTaiChinh();
  return {
    doiTuong: "csdt",
    tyLe: cfg.csdt.tyLe,
    tyLePercent: pct(cfg.csdt.tyLe),
    nguongVnd: cfg.csdt.nguongVnd,
    soNgayHanTra: cfg.csdt.soNgayHanTra,
    camKetCongBoTruocNgay: CAM_KET_CONG_BO_TRUOC_NGAY,
  };
}

type TbDb = {
  id: string;
  doi_tuong: string;
  tieu_de: string;
  noi_dung: string;
  ty_le_du_kien: number | string | null;
  hieu_luc_du_kien: string | null;
  cong_bo_luc: string | null;
  trang_thai: string;
  tao_luc: string;
  cap_nhat_luc: string;
};

function mapPublic(r: TbDb): PhiThongBaoPublic | null {
  if (r.trang_thai !== "da_cong_bo" || !r.cong_bo_luc) return null;
  if (r.doi_tuong !== "shop" && r.doi_tuong !== "csdt") return null;
  return {
    id: r.id,
    doiTuong: r.doi_tuong,
    tieuDe: r.tieu_de,
    noiDung: r.noi_dung,
    tyLeDuKien:
      r.ty_le_du_kien == null ? null : Number(r.ty_le_du_kien),
    hieuLucDuKien: r.hieu_luc_du_kien,
    congBoLuc: r.cong_bo_luc,
  };
}

function mapAdmin(r: TbDb): PhiThongBaoAdmin | null {
  if (
    r.doi_tuong !== "shop" &&
    r.doi_tuong !== "csdt"
  ) {
    return null;
  }
  if (
    r.trang_thai !== "nhap" &&
    r.trang_thai !== "da_cong_bo" &&
    r.trang_thai !== "huy"
  ) {
    return null;
  }
  return {
    id: r.id,
    doiTuong: r.doi_tuong,
    tieuDe: r.tieu_de,
    noiDung: r.noi_dung,
    tyLeDuKien:
      r.ty_le_du_kien == null ? null : Number(r.ty_le_du_kien),
    hieuLucDuKien: r.hieu_luc_du_kien,
    congBoLuc: r.cong_bo_luc ?? "",
    trangThai: r.trang_thai,
    taoLuc: r.tao_luc,
    capNhatLuc: r.cap_nhat_luc,
  };
}

/** Public: chỉ bản đã công bố. */
export async function listPhiThongBaoCongBo(
  doiTuong: PhiDoiTuong,
  limit = 20,
): Promise<PhiThongBaoPublic[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_phi_thong_bao")
    .select(
      "id, doi_tuong, tieu_de, noi_dung, ty_le_du_kien, hieu_luc_du_kien, cong_bo_luc, trang_thai, tao_luc, cap_nhat_luc",
    )
    .eq("doi_tuong", doiTuong)
    .eq("trang_thai", "da_cong_bo")
    .order("cong_bo_luc", { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)));

  if (error) {
    console.error("[phi-chinh-sach] list cong bo", error.message);
    return [];
  }
  return ((data ?? []) as TbDb[])
    .map(mapPublic)
    .filter((x): x is PhiThongBaoPublic => Boolean(x));
}

/** Admin: mọi trạng thái. */
export async function listPhiThongBaoAdmin(
  doiTuong?: PhiDoiTuong | null,
  limit = 40,
): Promise<PhiThongBaoAdmin[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("cins_phi_thong_bao")
    .select(
      "id, doi_tuong, tieu_de, noi_dung, ty_le_du_kien, hieu_luc_du_kien, cong_bo_luc, trang_thai, tao_luc, cap_nhat_luc",
    )
    .order("cap_nhat_luc", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));
  if (doiTuong) q = q.eq("doi_tuong", doiTuong);

  const { data, error } = await q;
  if (error) {
    console.error("[phi-chinh-sach] list admin", error.message);
    return [];
  }
  return ((data ?? []) as TbDb[])
    .map(mapAdmin)
    .filter((x): x is PhiThongBaoAdmin => Boolean(x));
}

export async function createPhiThongBao(input: {
  doiTuong: PhiDoiTuong;
  tieuDe: string;
  noiDung: string;
  tyLeDuKien: number | null;
  hieuLucDuKien: string | null;
  actorId: string;
}): Promise<{ ok: true; item: PhiThongBaoAdmin } | { ok: false; error: string }> {
  const tieuDe = input.tieuDe.trim();
  const noiDung = input.noiDung.trim();
  if (tieuDe.length < 3) return { ok: false, error: "Tiêu đề quá ngắn." };
  if (noiDung.length < 10) return { ok: false, error: "Nội dung quá ngắn." };

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("cins_phi_thong_bao")
    .insert({
      doi_tuong: input.doiTuong,
      tieu_de: tieuDe.slice(0, 200),
      noi_dung: noiDung.slice(0, 8000),
      ty_le_du_kien: input.tyLeDuKien,
      hieu_luc_du_kien: input.hieuLucDuKien,
      trang_thai: "nhap",
      tao_boi: input.actorId,
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select(
      "id, doi_tuong, tieu_de, noi_dung, ty_le_du_kien, hieu_luc_du_kien, cong_bo_luc, trang_thai, tao_luc, cap_nhat_luc",
    )
    .single<TbDb>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "INSERT_FAILED" };
  }
  const item = mapAdmin(data);
  if (!item) return { ok: false, error: "MAP_FAILED" };
  return { ok: true, item };
}

export async function updatePhiThongBao(input: {
  id: string;
  tieuDe?: string;
  noiDung?: string;
  tyLeDuKien?: number | null;
  hieuLucDuKien?: string | null;
  trangThai?: "nhap" | "da_cong_bo" | "huy";
}): Promise<{ ok: true; item: PhiThongBaoAdmin } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (typeof input.tieuDe === "string") {
    const t = input.tieuDe.trim();
    if (t.length < 3) return { ok: false, error: "Tiêu đề quá ngắn." };
    patch.tieu_de = t.slice(0, 200);
  }
  if (typeof input.noiDung === "string") {
    const n = input.noiDung.trim();
    if (n.length < 10) return { ok: false, error: "Nội dung quá ngắn." };
    patch.noi_dung = n.slice(0, 8000);
  }
  if (input.tyLeDuKien !== undefined) {
    patch.ty_le_du_kien = input.tyLeDuKien;
  }
  if (input.hieuLucDuKien !== undefined) {
    patch.hieu_luc_du_kien = input.hieuLucDuKien;
  }
  if (input.trangThai) {
    patch.trang_thai = input.trangThai;
    if (input.trangThai === "da_cong_bo") {
      patch.cong_bo_luc = new Date().toISOString();
    }
    if (input.trangThai === "nhap" || input.trangThai === "huy") {
      /* giữ cong_bo_luc cũ nếu từng công bố — hoặc null khi nháp lại */
      if (input.trangThai === "nhap") patch.cong_bo_luc = null;
    }
  }

  const { data, error } = await admin
    .from("cins_phi_thong_bao")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id, doi_tuong, tieu_de, noi_dung, ty_le_du_kien, hieu_luc_du_kien, cong_bo_luc, trang_thai, tao_luc, cap_nhat_luc",
    )
    .maybeSingle<TbDb>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "UPDATE_FAILED" };
  }
  const item = mapAdmin(data);
  if (!item) return { ok: false, error: "MAP_FAILED" };
  return { ok: true, item };
}

export async function getChinhSachPhiPayload(doiTuong: "shop"): Promise<{
  dangApDung: PhiDangApDungShop;
  thongBao: PhiThongBaoPublic[];
}>;
export async function getChinhSachPhiPayload(doiTuong: "csdt"): Promise<{
  dangApDung: PhiDangApDungCsdt;
  thongBao: PhiThongBaoPublic[];
}>;
export async function getChinhSachPhiPayload(doiTuong: PhiDoiTuong): Promise<{
  dangApDung: PhiDangApDungShop | PhiDangApDungCsdt;
  thongBao: PhiThongBaoPublic[];
}>;
export async function getChinhSachPhiPayload(doiTuong: PhiDoiTuong) {
  if (doiTuong === "shop") {
    const [dangApDung, thongBao] = await Promise.all([
      getPhiDangApDungShop(),
      listPhiThongBaoCongBo("shop"),
    ]);
    return { dangApDung, thongBao };
  }
  const [dangApDung, thongBao] = await Promise.all([
    getPhiDangApDungCsdt(),
    listPhiThongBaoCongBo("csdt"),
  ]);
  return { dangApDung, thongBao };
}
