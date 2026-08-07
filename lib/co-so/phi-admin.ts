import "server-only";

import { tienPhaiTra } from "@/lib/co-so/phi-config";
import { phanBoSoTienVaoKyNo } from "@/lib/co-so/phi-sepay";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AdminCsdtPhiKy = {
  id: string;
  idToChuc: string;
  orgTen: string | null;
  orgSlug: string | null;
  loaiKy: "kich_hoat" | "thang";
  ngayChot: string;
  hanTra: string;
  phiPhaiTraVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  conNoVnd: number;
  trangThai: "chua_tra" | "qua_han" | "da_tra" | "mien";
  maThamChieu: string;
  soHoaDon: string | null;
  xuatHoaDonLuc: string | null;
};

export type AdminCsdtPhiGd = {
  id: string;
  sepayId: string;
  soTienVnd: number;
  noiDung: string | null;
  taiKhoanNguon: string | null;
  nhanLuc: string;
  taoLuc: string;
  idKy: string | null;
  idToChuc: string | null;
};

/** Kỳ chờ / quá hạn + kỳ đã trả chưa có số HĐ. */
export async function listKyChoAdmin(limit = 60): Promise<AdminCsdtPhiKy[]> {
  const admin = createServiceRoleClient();
  const lim = Math.min(120, Math.max(1, limit));
  const selectCols =
    "id, id_to_chuc, loai_ky, ngay_chot, han_tra, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, so_hoa_don, xuat_hoa_don_luc";

  const [noRes, hdRes] = await Promise.all([
    admin
      .from("org_phi_ky")
      .select(selectCols)
      .in("trang_thai", ["chua_tra", "qua_han"])
      .order("han_tra", { ascending: true })
      .limit(lim),
    admin
      .from("org_phi_ky")
      .select(selectCols)
      .eq("trang_thai", "da_tra")
      .is("so_hoa_don", null)
      .order("han_tra", { ascending: false })
      .limit(Math.min(40, lim)),
  ]);

  if (noRes.error) {
    console.error("[csdt-phi] listKyChoAdmin", noRes.error.message);
  }
  if (hdRes.error) {
    console.error("[csdt-phi] listKyChoAdmin hd", hdRes.error.message);
  }

  type Row = {
    id: string;
    id_to_chuc: string;
    loai_ky: "kich_hoat" | "thang";
    ngay_chot: string;
    han_tra: string;
    phi_phai_tra_vnd: number | string;
    dieu_chinh_vnd: number | string;
    da_tra_vnd: number | string;
    trang_thai: AdminCsdtPhiKy["trangThai"];
    ma_tham_chieu: string;
    so_hoa_don: string | null;
    xuat_hoa_don_luc: string | null;
  };

  const byId = new Map<string, Row>();
  for (const r of (noRes.data ?? []) as Row[]) byId.set(r.id, r);
  for (const r of (hdRes.data ?? []) as Row[]) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  const rows = [...byId.values()];
  if (rows.length === 0) return [];

  const orgIds = [...new Set(rows.map((r) => r.id_to_chuc))];
  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug")
    .in("id", orgIds);
  const orgMap = new Map(
    ((orgs ?? []) as Array<{ id: string; ten: string; slug: string }>).map(
      (o) => [o.id, o],
    ),
  );

  return rows.map((r) => {
    const phi = Number(r.phi_phai_tra_vnd) || 0;
    const dieu = Number(r.dieu_chinh_vnd) || 0;
    const da = Number(r.da_tra_vnd) || 0;
    const phai = tienPhaiTra(phi, dieu);
    const org = orgMap.get(r.id_to_chuc);
    return {
      id: r.id,
      idToChuc: r.id_to_chuc,
      orgTen: org?.ten ?? null,
      orgSlug: org?.slug ?? null,
      loaiKy: r.loai_ky,
      ngayChot: r.ngay_chot,
      hanTra: r.han_tra,
      phiPhaiTraVnd: phi,
      dieuChinhVnd: dieu,
      daTraVnd: da,
      conNoVnd: Math.max(0, phai - da),
      trangThai: r.trang_thai,
      maThamChieu: r.ma_tham_chieu,
      soHoaDon: r.so_hoa_don,
      xuatHoaDonLuc: r.xuat_hoa_don_luc,
    };
  });
}

/** Giao dịch Sepay chưa khớp kỳ. */
export async function listGiaoDichChuaKhop(
  limit = 40,
): Promise<AdminCsdtPhiGd[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_phi_thanh_toan")
    .select(
      "id, sepay_id, so_tien_vnd, noi_dung, tai_khoan_nguon, nhan_luc, tao_luc, id_ky, id_to_chuc",
    )
    .is("id_ky", null)
    .order("tao_luc", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));

  if (error) {
    console.error("[csdt-phi] listGdChuaKhop", error.message);
    return [];
  }

  return (
    (data ?? []) as Array<{
      id: string;
      sepay_id: string;
      so_tien_vnd: number | string;
      noi_dung: string | null;
      tai_khoan_nguon: string | null;
      nhan_luc: string;
      tao_luc: string;
      id_ky: string | null;
      id_to_chuc: string | null;
    }>
  ).map((r) => ({
    id: r.id,
    sepayId: r.sepay_id,
    soTienVnd: Number(r.so_tien_vnd) || 0,
    noiDung: r.noi_dung,
    taiKhoanNguon: r.tai_khoan_nguon,
    nhanLuc: r.nhan_luc,
    taoLuc: r.tao_luc,
    idKy: r.id_ky,
    idToChuc: r.id_to_chuc,
  }));
}

/**
 * Gán giao dịch sai mã vào kỳ — cộng da_tra + ghi gan_boi.
 * Chỉ khi `id_ky` hiện null.
 */
export async function ganGiaoDichVaoKy(input: {
  thanhToanId: string;
  kyId: string;
  actorId: string;
}): Promise<
  | { ok: true; daTraKy: boolean }
  | { ok: false; error: string }
> {
  const admin = createServiceRoleClient();

  const { data: gd, error: gdErr } = await admin
    .from("org_phi_thanh_toan")
    .select("id, id_ky, so_tien_vnd")
    .eq("id", input.thanhToanId)
    .maybeSingle<{
      id: string;
      id_ky: string | null;
      so_tien_vnd: number | string;
    }>();

  if (gdErr || !gd) {
    return { ok: false, error: gdErr?.message ?? "Không tìm thấy giao dịch." };
  }
  if (gd.id_ky) {
    return { ok: false, error: "Giao dịch đã được gán kỳ." };
  }

  const { data: ky, error: kyErr } = await admin
    .from("org_phi_ky")
    .select("id, id_to_chuc")
    .eq("id", input.kyId)
    .maybeSingle<{ id: string; id_to_chuc: string }>();

  if (kyErr || !ky) {
    return { ok: false, error: kyErr?.message ?? "Không tìm thấy kỳ." };
  }

  const soTien = Number(gd.so_tien_vnd) || 0;
  const now = new Date().toISOString();

  const { error: linkErr } = await admin
    .from("org_phi_thanh_toan")
    .update({
      id_ky: ky.id,
      id_to_chuc: ky.id_to_chuc,
      gan_boi: input.actorId,
      gan_luc: now,
    })
    .eq("id", gd.id)
    .is("id_ky", null);

  if (linkErr) {
    return { ok: false, error: linkErr.message };
  }

  const allocated = await phanBoSoTienVaoKyNo(ky.id_to_chuc, soTien, {
    uuTienKyId: ky.id,
  });
  if (!allocated.ok) {
    /* Rollback link nếu cộng tiền fail */
    await admin
      .from("org_phi_thanh_toan")
      .update({
        id_ky: null,
        id_to_chuc: null,
        gan_boi: null,
        gan_luc: null,
      })
      .eq("id", gd.id);
    return { ok: false, error: "Không phân bổ được số tiền." };
  }

  return { ok: true, daTraKy: allocated.daTraKyIds.length > 0 };
}

/** Nhập số hóa đơn thủ công (xuất ngoài hệ thống). */
export async function capNhatSoHoaDonKy(input: {
  kyId: string;
  soHoaDon: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const so = input.soHoaDon?.trim() || null;
  if (so && so.length > 80) {
    return { ok: false, error: "Số hóa đơn quá dài." };
  }

  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    so_hoa_don: so,
    cap_nhat_luc: new Date().toISOString(),
  };
  if (so) {
    patch.xuat_hoa_don_luc = new Date().toISOString();
  } else {
    patch.xuat_hoa_don_luc = null;
  }

  const { error } = await admin
    .from("org_phi_ky")
    .update(patch)
    .eq("id", input.kyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Gợi ý kỳ theo mã tham chiếu / org — hỗ trợ UI gán. */
export async function timKyTheoMaHoacOrg(input: {
  maThamChieu?: string | null;
  orgId?: string | null;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    idToChuc: string;
    maThamChieu: string;
    trangThai: string;
    ngayChot: string;
    conNoVnd: number;
    orgTen: string | null;
  }>
> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("org_phi_ky")
    .select(
      "id, id_to_chuc, ma_tham_chieu, trang_thai, ngay_chot, phi_phai_tra_vnd, dieu_chinh_vnd, da_tra_vnd",
    )
    .in("trang_thai", ["chua_tra", "qua_han", "da_tra"])
    .order("ngay_chot", { ascending: false })
    .limit(Math.min(30, Math.max(1, input.limit ?? 12)));

  const ma = input.maThamChieu?.trim().toUpperCase();
  if (ma) {
    q = q.eq("ma_tham_chieu", ma);
  } else if (input.orgId) {
    q = q.eq("id_to_chuc", input.orgId);
  } else {
    return [];
  }

  const { data, error } = await q;
  if (error) {
    console.error("[csdt-phi] timKy", error.message);
    return [];
  }

  type Row = {
    id: string;
    id_to_chuc: string;
    ma_tham_chieu: string;
    trang_thai: string;
    ngay_chot: string;
    phi_phai_tra_vnd: number | string;
    dieu_chinh_vnd: number | string;
    da_tra_vnd: number | string;
  };
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  const orgIds = [...new Set(rows.map((r) => r.id_to_chuc))];
  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, ten")
    .in("id", orgIds);
  const orgMap = new Map(
    ((orgs ?? []) as Array<{ id: string; ten: string }>).map((o) => [
      o.id,
      o.ten,
    ]),
  );

  return rows.map((r) => {
    const phai = tienPhaiTra(
      Number(r.phi_phai_tra_vnd) || 0,
      Number(r.dieu_chinh_vnd) || 0,
    );
    const da = Number(r.da_tra_vnd) || 0;
    return {
      id: r.id,
      idToChuc: r.id_to_chuc,
      maThamChieu: r.ma_tham_chieu,
      trangThai: r.trang_thai,
      ngayChot: r.ngay_chot,
      conNoVnd: Math.max(0, phai - da),
      orgTen: orgMap.get(r.id_to_chuc) ?? null,
    };
  });
}
