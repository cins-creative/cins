import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OrgPhiKhieuNaiTrangThai =
  | "mo"
  | "dang_xu_ly"
  | "da_xu_ly"
  | "tu_choi";

export type OrgPhiKhieuNaiRow = {
  id: string;
  idToChuc: string;
  idKy: string | null;
  noiDung: string;
  maGiaoDich: string | null;
  bienLaiAnhId: string | null;
  trangThai: OrgPhiKhieuNaiTrangThai;
  phanHoiAdmin: string | null;
  nguoiTao: string;
  xuLyBoi: string | null;
  taoLuc: string;
  capNhatLuc: string;
  /** Admin list join */
  orgTen?: string | null;
  orgSlug?: string | null;
  kyMaThamChieu?: string | null;
};

type KnDb = {
  id: string;
  id_to_chuc: string;
  id_ky: string | null;
  noi_dung: string;
  ma_giao_dich: string | null;
  bien_lai_anh_id: string | null;
  trang_thai: OrgPhiKhieuNaiTrangThai;
  phan_hoi_admin: string | null;
  nguoi_tao: string;
  xu_ly_boi: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
};

const KN_SELECT =
  "id, id_to_chuc, id_ky, noi_dung, ma_giao_dich, bien_lai_anh_id, trang_thai, phan_hoi_admin, nguoi_tao, xu_ly_boi, tao_luc, cap_nhat_luc";

function mapKn(r: KnDb): OrgPhiKhieuNaiRow {
  return {
    id: r.id,
    idToChuc: r.id_to_chuc,
    idKy: r.id_ky,
    noiDung: r.noi_dung,
    maGiaoDich: r.ma_giao_dich,
    bienLaiAnhId: r.bien_lai_anh_id,
    trangThai: r.trang_thai,
    phanHoiAdmin: r.phan_hoi_admin,
    nguoiTao: r.nguoi_tao,
    xuLyBoi: r.xu_ly_boi,
    taoLuc: r.tao_luc,
    capNhatLuc: r.cap_nhat_luc,
  };
}

export async function listKhieuNaiOrg(
  orgId: string,
  limit = 20,
): Promise<OrgPhiKhieuNaiRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_khieu_nai")
    .select(KN_SELECT)
    .eq("id_to_chuc", orgId)
    .order("tao_luc", { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)));
  if (error) {
    console.error("[csdt-phi] listKhieuNaiOrg", error.message);
    return [];
  }
  return ((data ?? []) as KnDb[]).map(mapKn);
}

export async function taoKhieuNaiPhi(input: {
  orgId: string;
  actorId: string;
  noiDung: string;
  idKy?: string | null;
  maGiaoDich?: string | null;
  bienLaiAnhId?: string | null;
}): Promise<OrgPhiKhieuNaiRow | { error: string }> {
  const noiDung = input.noiDung.trim();
  if (noiDung.length < 10) {
    return { error: "Nội dung khiếu nại tối thiểu 10 ký tự." };
  }
  if (noiDung.length > 2000) {
    return { error: "Nội dung quá dài (tối đa 2000 ký tự)." };
  }

  const admin = createServiceRoleClient();

  if (input.idKy) {
    const { data: ky } = await admin
      .from("org_phi_ky")
      .select("id")
      .eq("id", input.idKy)
      .eq("id_to_chuc", input.orgId)
      .maybeSingle();
    if (!ky) return { error: "Kỳ không thuộc cơ sở này." };
  }

  const { data, error } = await admin
    .from("org_phi_khieu_nai")
    .insert({
      id_to_chuc: input.orgId,
      id_ky: input.idKy?.trim() || null,
      noi_dung: noiDung,
      ma_giao_dich: input.maGiaoDich?.trim() || null,
      bien_lai_anh_id: input.bienLaiAnhId?.trim() || null,
      nguoi_tao: input.actorId,
      trang_thai: "mo",
    })
    .select(KN_SELECT)
    .single<KnDb>();

  if (error || !data) {
    console.error("[csdt-phi] taoKhieuNai", error?.message);
    return { error: error?.message ?? "Không tạo được khiếu nại." };
  }
  return mapKn(data);
}

/** Khiếu nại đang mở / đang xử lý — cho admin. */
export async function listKhieuNaiMoChoAdmin(
  limit = 40,
): Promise<OrgPhiKhieuNaiRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_khieu_nai")
    .select(KN_SELECT)
    .in("trang_thai", ["mo", "dang_xu_ly"])
    .order("tao_luc", { ascending: true })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) {
    console.error("[csdt-phi] listKhieuNaiMo", error.message);
    return [];
  }
  const rows = ((data ?? []) as KnDb[]).map(mapKn);
  return enrichKhieuNaiAdmin(rows);
}

async function enrichKhieuNaiAdmin(
  rows: OrgPhiKhieuNaiRow[],
): Promise<OrgPhiKhieuNaiRow[]> {
  if (rows.length === 0) return rows;
  const admin = createServiceRoleClient();
  const orgIds = [...new Set(rows.map((r) => r.idToChuc))];
  const kyIds = [...new Set(rows.map((r) => r.idKy).filter(Boolean))] as string[];

  const [{ data: orgs }, { data: kys }] = await Promise.all([
    admin.from("org_to_chuc").select("id, ten, slug").in("id", orgIds),
    kyIds.length
      ? admin.from("org_phi_ky").select("id, ma_tham_chieu").in("id", kyIds)
      : Promise.resolve({ data: [] as Array<{ id: string; ma_tham_chieu: string }> }),
  ]);

  const orgMap = new Map(
    ((orgs ?? []) as Array<{ id: string; ten: string; slug: string }>).map(
      (o) => [o.id, o],
    ),
  );
  const kyMap = new Map(
    ((kys ?? []) as Array<{ id: string; ma_tham_chieu: string }>).map((k) => [
      k.id,
      k.ma_tham_chieu,
    ]),
  );

  return rows.map((r) => {
    const org = orgMap.get(r.idToChuc);
    return {
      ...r,
      orgTen: org?.ten ?? null,
      orgSlug: org?.slug ?? null,
      kyMaThamChieu: r.idKy ? (kyMap.get(r.idKy) ?? null) : null,
    };
  });
}

export async function xuLyKhieuNaiAdmin(input: {
  knId: string;
  actorId: string;
  trangThai: OrgPhiKhieuNaiTrangThai;
  phanHoi?: string | null;
}): Promise<OrgPhiKhieuNaiRow | { error: string }> {
  if (
    !["mo", "dang_xu_ly", "da_xu_ly", "tu_choi"].includes(input.trangThai)
  ) {
    return { error: "trangThai không hợp lệ." };
  }
  const phanHoi = input.phanHoi?.trim() || null;
  if (
    (input.trangThai === "da_xu_ly" || input.trangThai === "tu_choi") &&
    (!phanHoi || phanHoi.length < 3)
  ) {
    return { error: "Cần phản hồi khi đóng / từ chối khiếu nại." };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_khieu_nai")
    .update({
      trang_thai: input.trangThai,
      phan_hoi_admin: phanHoi,
      xu_ly_boi: input.actorId,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", input.knId)
    .select(KN_SELECT)
    .maybeSingle<KnDb>();

  if (error || !data) {
    return { error: error?.message ?? "Không cập nhật được." };
  }
  return mapKn(data);
}
