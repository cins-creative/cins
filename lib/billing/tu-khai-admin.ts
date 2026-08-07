import "server-only";

import {
  anHanConHieuLuc,
  anHanDenIso,
  getSoNgayAnHanTuKhai,
} from "@/lib/billing/an-han";
import { conNoHoaDon } from "@/lib/billing/hoa-don-ma";
import { getCsdtPhiGate } from "@/lib/co-so/phi-gate";
import { applyShopGateFromSignals } from "@/lib/shop/gate";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type TuKhaiAdminItem = {
  id: string;
  idTk: string;
  idDichVu: string;
  loai: string;
  tenDichVu: string | null;
  maThamChieu: string;
  soTienVnd: number;
  dieuChinhVnd: number;
  daTraVnd: number;
  conNoVnd: number;
  trangThai: string;
  hanTra: string | null;
  tuKhaiDaTraLuc: string;
  tuKhaiLan: number;
  anHanHieuLuc: boolean;
  anHanDenIso: string | null;
  nguonBang: "org_phi_ky" | "shop_phi_ky" | null;
  nguonId: string | null;
};

type HdRow = {
  id: string;
  id_tk: string;
  id_dich_vu: string;
  han_tra: string | null;
  so_tien_vnd: number | string;
  dieu_chinh_vnd: number | string | null;
  da_tra_vnd: number | string | null;
  trang_thai: string;
  ma_tham_chieu: string;
  tu_khai_da_tra_luc: string;
  tu_khai_lan: number | string | null;
  nguon_bang: "org_phi_ky" | "shop_phi_ky" | null;
  nguon_id: string | null;
};

type DvRow = {
  id: string;
  loai: string;
  tham_chieu_id: string;
};

const HD_SELECT =
  "id, id_tk, id_dich_vu, han_tra, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd, trang_thai, ma_tham_chieu, tu_khai_da_tra_luc, tu_khai_lan, nguon_bang, nguon_id";

/**
 * Danh sách hoá đơn còn nợ đang / đã từng trong cửa sổ tự khai
 * (tu_khai_da_tra_luc IS NOT NULL + chưa da_tra).
 */
export async function listTuKhaiChoDoiSoat(
  limit = 50,
): Promise<TuKhaiAdminItem[]> {
  const admin = createServiceRoleClient();
  const soNgay = await getSoNgayAnHanTuKhai();
  const now = new Date();

  const { data: rows } = await admin
    .from("cins_hoa_don")
    .select(HD_SELECT)
    .not("tu_khai_da_tra_luc", "is", null)
    .in("trang_thai", ["chua_tra", "qua_han"])
    .order("tu_khai_da_tra_luc", { ascending: false })
    .limit(Math.max(1, Math.min(100, Math.floor(limit))));

  const list = (rows ?? []) as HdRow[];
  if (list.length === 0) return [];

  const dvIds = [...new Set(list.map((r) => r.id_dich_vu).filter(Boolean))];
  const { data: dvs } = await admin
    .from("cins_dich_vu")
    .select("id, loai, tham_chieu_id")
    .in("id", dvIds);

  const dvById = new Map(
    ((dvs ?? []) as DvRow[]).map((d) => [d.id, d] as const),
  );

  const shopRefs = [
    ...new Set(
      ((dvs ?? []) as DvRow[])
        .filter((d) => d.loai === "shop_phi")
        .map((d) => d.tham_chieu_id),
    ),
  ];
  const orgRefs = [
    ...new Set(
      ((dvs ?? []) as DvRow[])
        .filter((d) => d.loai === "csdt_phi")
        .map((d) => d.tham_chieu_id),
    ),
  ];

  const tenByTham = new Map<string, string>();
  if (shopRefs.length > 0) {
    const { data } = await admin
      .from("shop_cua_hang")
      .select("id_nguoi_dung, ten")
      .in("id_nguoi_dung", shopRefs);
    for (const r of (data ?? []) as Array<{
      id_nguoi_dung: string;
      ten: string | null;
    }>) {
      tenByTham.set(r.id_nguoi_dung, r.ten?.trim() || "Shop");
    }
  }
  if (orgRefs.length > 0) {
    const { data } = await admin
      .from("org_to_chuc")
      .select("id, ten")
      .in("id", orgRefs);
    for (const r of (data ?? []) as Array<{
      id: string;
      ten: string | null;
    }>) {
      tenByTham.set(r.id, r.ten?.trim() || "Cơ sở");
    }
  }

  return list.map((r) => {
    const soTienVnd = Math.round(Number(r.so_tien_vnd) || 0);
    const dieuChinhVnd = Math.round(Number(r.dieu_chinh_vnd) || 0);
    const daTraVnd = Math.round(Number(r.da_tra_vnd) || 0);
    const conNoVnd = conNoHoaDon({
      soTienVnd,
      dieuChinhVnd,
      daTraVnd,
      trangThai: r.trang_thai,
    });
    const tuKhaiDaTraLuc = r.tu_khai_da_tra_luc;
    const hieuLuc = anHanConHieuLuc(
      { tuKhaiDaTraLuc: tuKhaiDaTraLuc },
      soNgay,
      now,
    );
    const dv = dvById.get(r.id_dich_vu);
    const loai = dv?.loai ?? "khac";
    const tenDichVu = dv
      ? tenByTham.get(dv.tham_chieu_id) ??
        (loai === "shop_phi" ? "Shop" : loai === "csdt_phi" ? "Cơ sở" : loai)
      : null;

    return {
      id: r.id,
      idTk: r.id_tk,
      idDichVu: r.id_dich_vu,
      loai,
      tenDichVu,
      maThamChieu: r.ma_tham_chieu,
      soTienVnd,
      dieuChinhVnd,
      daTraVnd,
      conNoVnd,
      trangThai: r.trang_thai,
      hanTra: r.han_tra,
      tuKhaiDaTraLuc,
      tuKhaiLan: Math.max(0, Math.floor(Number(r.tu_khai_lan) || 0)),
      anHanHieuLuc: hieuLuc,
      anHanDenIso: hieuLuc
        ? anHanDenIso(tuKhaiDaTraLuc, soNgay)
        : null,
      nguonBang: r.nguon_bang,
      nguonId: r.nguon_id,
    };
  });
}

/**
 * Bác tự khai: xoá cửa sổ ân hạn (`tu_khai_da_tra_luc = null`),
 * giữ `tu_khai_lan` (không cho tự khai lại), dual-write legacy, chạy lại gate.
 */
export async function bacTuKhaiVaKhoa(input: {
  hoaDonId: string;
  /** Caller đã gate canGrantAdmin — giữ để audit / mở rộng sau. */
  actorId: string;
}): Promise<
  | { ok: true; trangThaiMoi: string | null }
  | { ok: false; error: string; status: number }
> {
  void input.actorId;
  const admin = createServiceRoleClient();
  const { data: hd } = await admin
    .from("cins_hoa_don")
    .select(
      "id, id_dich_vu, tu_khai_da_tra_luc, trang_thai, nguon_bang, nguon_id",
    )
    .eq("id", input.hoaDonId)
    .maybeSingle<{
      id: string;
      id_dich_vu: string;
      tu_khai_da_tra_luc: string | null;
      trang_thai: string;
      nguon_bang: "org_phi_ky" | "shop_phi_ky" | null;
      nguon_id: string | null;
    }>();

  if (!hd) {
    return { ok: false, error: "Không tìm thấy hoá đơn.", status: 404 };
  }
  if (!hd.tu_khai_da_tra_luc) {
    return {
      ok: false,
      error: "Hoá đơn không còn cửa sổ tự khai.",
      status: 400,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await admin
    .from("cins_hoa_don")
    .update({
      tu_khai_da_tra_luc: null,
      cap_nhat_luc: nowIso,
    })
    .eq("id", hd.id);

  if (upErr) {
    return { ok: false, error: upErr.message, status: 400 };
  }

  /* Dual-write legacy org_phi_ky jsonb */
  if (hd.nguon_bang === "org_phi_ky" && hd.nguon_id) {
    const { data: ky } = await admin
      .from("org_phi_ky")
      .select("id, hoa_don_thong_tin")
      .eq("id", hd.nguon_id)
      .maybeSingle<{ id: string; hoa_don_thong_tin: unknown }>();
    if (ky) {
      const base =
        ky.hoa_don_thong_tin &&
        typeof ky.hoa_don_thong_tin === "object" &&
        !Array.isArray(ky.hoa_don_thong_tin)
          ? { ...(ky.hoa_don_thong_tin as Record<string, unknown>) }
          : {};
      delete base.tu_khai_da_tra_luc;
      await admin
        .from("org_phi_ky")
        .update({
          hoa_don_thong_tin: base,
          cap_nhat_luc: nowIso,
        })
        .eq("id", ky.id);
    }
  }

  let trangThaiMoi: string | null = null;

  const { data: dv } = await admin
    .from("cins_dich_vu")
    .select("id, loai, tham_chieu_id")
    .eq("id", hd.id_dich_vu)
    .maybeSingle<DvRow>();

  if (dv?.loai === "shop_phi" && dv.tham_chieu_id) {
    trangThaiMoi = await applyShopGateFromSignals(dv.tham_chieu_id);
  } else if (dv?.loai === "csdt_phi" && dv.tham_chieu_id) {
    /* Gate CSĐT tính runtime từ cins_hoa_don — chỉ cần đọc lại. */
    const gate = await getCsdtPhiGate(dv.tham_chieu_id);
    trangThaiMoi = gate.trangThai;
  }

  return { ok: true, trangThaiMoi };
}
