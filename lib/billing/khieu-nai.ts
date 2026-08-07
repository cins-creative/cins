import "server-only";

import {
  listKhieuNaiOrg,
  type OrgPhiKhieuNaiRow,
} from "@/lib/co-so/phi-khieu-nai";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { canSuaTk, listDichVuForTk } from "./tk";

export type KhieuNaiLoai =
  | "khong_ghi_nhan"
  | "sai_so_tien"
  | "trung_lap"
  | "khac";

export type KhieuNaiTrangThai = "mo" | "dang_xu_ly" | "da_xu_ly" | "tu_choi";

export type BillingKhieuNaiItem = {
  id: string;
  nguon: "cins" | "org_legacy";
  idTk: string | null;
  idHoaDon: string | null;
  idDichVu: string | null;
  orgId: string | null;
  loai: KhieuNaiLoai | "legacy";
  noiDung: string;
  maGiaoDich: string | null;
  soTienKhai: number | null;
  ckLuc: string | null;
  anhIds: string[];
  trangThai: KhieuNaiTrangThai;
  phanHoiAdmin: string | null;
  nguoiTao: string;
  xuLyBoi: string | null;
  taoLuc: string;
  capNhatLuc: string;
  tenDichVu: string | null;
};

const LOAI_OK = new Set<KhieuNaiLoai>([
  "khong_ghi_nhan",
  "sai_so_tien",
  "trung_lap",
  "khac",
]);

const CF_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CinsKnRow = {
  id: string;
  id_tk: string;
  id_hoa_don: string | null;
  id_dich_vu: string | null;
  loai: string;
  noi_dung: string;
  ma_giao_dich: string | null;
  so_tien_khai: number | string | null;
  ck_luc: string | null;
  anh_ids: string[] | null;
  trang_thai: string;
  phan_hoi_admin: string | null;
  nguoi_tao: string;
  xu_ly_boi: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
};

function mapCins(
  r: CinsKnRow,
  tenDichVu: string | null,
): BillingKhieuNaiItem {
  return {
    id: r.id,
    nguon: "cins",
    idTk: r.id_tk,
    idHoaDon: r.id_hoa_don,
    idDichVu: r.id_dich_vu,
    orgId: null,
    loai: (LOAI_OK.has(r.loai as KhieuNaiLoai)
      ? r.loai
      : "khac") as KhieuNaiLoai,
    noiDung: r.noi_dung,
    maGiaoDich: r.ma_giao_dich,
    soTienKhai:
      r.so_tien_khai == null ? null : Math.round(Number(r.so_tien_khai) || 0),
    ckLuc: r.ck_luc,
    anhIds: Array.isArray(r.anh_ids) ? r.anh_ids.filter(Boolean) : [],
    trangThai: r.trang_thai as KhieuNaiTrangThai,
    phanHoiAdmin: r.phan_hoi_admin,
    nguoiTao: r.nguoi_tao,
    xuLyBoi: r.xu_ly_boi,
    taoLuc: r.tao_luc,
    capNhatLuc: r.cap_nhat_luc,
    tenDichVu,
  };
}

function mapLegacy(
  kn: OrgPhiKhieuNaiRow,
  tenDichVu: string | null,
): BillingKhieuNaiItem {
  return {
    id: kn.id,
    nguon: "org_legacy",
    idTk: null,
    idHoaDon: null,
    idDichVu: null,
    orgId: kn.idToChuc,
    loai: "legacy",
    noiDung: kn.noiDung,
    maGiaoDich: kn.maGiaoDich,
    soTienKhai: null,
    ckLuc: null,
    anhIds: kn.bienLaiAnhId ? [kn.bienLaiAnhId] : [],
    trangThai: kn.trangThai as KhieuNaiTrangThai,
    phanHoiAdmin: kn.phanHoiAdmin,
    nguoiTao: kn.nguoiTao,
    xuLyBoi: kn.xuLyBoi,
    taoLuc: kn.taoLuc,
    capNhatLuc: kn.capNhatLuc,
    tenDichVu,
  };
}

/** Gom khiếu nại bảng mới + legacy CSĐT, sort mới nhất. */
export async function listKhieuNaiForTk(
  tkId: string,
): Promise<BillingKhieuNaiItem[]> {
  const admin = createServiceRoleClient();
  const dichVus = await listDichVuForTk(tkId);

  const { data: cinsRows } = await admin
    .from("cins_hoa_don_khieu_nai")
    .select(
      "id, id_tk, id_hoa_don, id_dich_vu, loai, noi_dung, ma_giao_dich, so_tien_khai, ck_luc, anh_ids, trang_thai, phan_hoi_admin, nguoi_tao, xu_ly_boi, tao_luc, cap_nhat_luc",
    )
    .eq("id_tk", tkId)
    .order("tao_luc", { ascending: false })
    .limit(50);

  const tenByDv = new Map(
    dichVus.map((d) => [d.id, d.tenHienThi?.trim() || d.loai]),
  );

  /* Bổ sung tên shop/org nếu thiếu tenHienThi */
  const needShop = dichVus.filter((d) => d.loai === "shop_phi");
  const needOrg = dichVus.filter((d) => d.loai === "csdt_phi");
  if (needShop.length) {
    const { data } = await admin
      .from("shop_cua_hang")
      .select("id_nguoi_dung, ten")
      .in(
        "id_nguoi_dung",
        needShop.map((d) => d.thamChieuId),
      );
    for (const r of (data ?? []) as Array<{
      id_nguoi_dung: string;
      ten: string | null;
    }>) {
      const dv = needShop.find((d) => d.thamChieuId === r.id_nguoi_dung);
      if (dv) tenByDv.set(dv.id, r.ten?.trim() || "Shop");
    }
  }
  if (needOrg.length) {
    const { data } = await admin
      .from("org_to_chuc")
      .select("id, ten")
      .in(
        "id",
        needOrg.map((d) => d.thamChieuId),
      );
    for (const r of (data ?? []) as Array<{
      id: string;
      ten: string | null;
    }>) {
      const dv = needOrg.find((d) => d.thamChieuId === r.id);
      if (dv) tenByDv.set(dv.id, r.ten?.trim() || "Cơ sở");
    }
  }

  const cinsItems = ((cinsRows ?? []) as CinsKnRow[]).map((r) =>
    mapCins(r, r.id_dich_vu ? tenByDv.get(r.id_dich_vu) ?? null : null),
  );

  const csdt = dichVus.filter((d) => d.loai === "csdt_phi");
  const legacyLists = await Promise.all(
    csdt.map(async (d) => {
      const items = await listKhieuNaiOrg(d.thamChieuId, 20);
      return items.map((kn) =>
        mapLegacy(kn, tenByDv.get(d.id) ?? null),
      );
    }),
  );

  return [...cinsItems, ...legacyLists.flat()].sort((a, b) =>
    a.taoLuc < b.taoLuc ? 1 : a.taoLuc > b.taoLuc ? -1 : 0,
  );
}

export async function taoKhieuNaiBilling(input: {
  actorId: string;
  hoaDonId?: string | null;
  dichVuId?: string | null;
  loai?: string | null;
  noiDung: string;
  maGiaoDich?: string | null;
  soTienKhai?: number | null;
  ckLuc?: string | null;
  anhIds: string[];
}): Promise<
  | { ok: true; item: BillingKhieuNaiItem }
  | { ok: false; error: string; status: number }
> {
  const noiDung = input.noiDung.trim();
  if (noiDung.length < 10) {
    return {
      ok: false,
      error: "Nội dung khiếu nại cần ít nhất 10 ký tự.",
      status: 400,
    };
  }
  if (noiDung.length > 4000) {
    return { ok: false, error: "Nội dung quá dài.", status: 400 };
  }

  const anhIds = [
    ...new Set(
      input.anhIds
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean),
    ),
  ];
  if (anhIds.length < 1 || anhIds.length > 3) {
    return {
      ok: false,
      error: "Cần 1–3 ảnh bằng chứng (biên lai / sao kê).",
      status: 400,
    };
  }
  if (anhIds.some((id) => !CF_ID_RE.test(id))) {
    return { ok: false, error: "Ảnh bằng chứng không hợp lệ.", status: 400 };
  }

  const loai: KhieuNaiLoai = LOAI_OK.has(input.loai as KhieuNaiLoai)
    ? (input.loai as KhieuNaiLoai)
    : "khong_ghi_nhan";

  const admin = createServiceRoleClient();
  let idTk: string | null = null;
  let idHoaDon: string | null = input.hoaDonId?.trim() || null;
  let idDichVu: string | null = input.dichVuId?.trim() || null;

  if (idHoaDon) {
    const { data: hd } = await admin
      .from("cins_hoa_don")
      .select("id, id_tk, id_dich_vu, tu_khai_da_tra_luc")
      .eq("id", idHoaDon)
      .maybeSingle<{
        id: string;
        id_tk: string;
        id_dich_vu: string;
        tu_khai_da_tra_luc: string | null;
      }>();
    if (!hd) {
      return { ok: false, error: "Không tìm thấy hoá đơn.", status: 404 };
    }
    idTk = hd.id_tk;
    idDichVu = idDichVu || hd.id_dich_vu;

    const { data: mo } = await admin
      .from("cins_hoa_don_khieu_nai")
      .select("id")
      .eq("id_hoa_don", idHoaDon)
      .in("trang_thai", ["mo", "dang_xu_ly"])
      .maybeSingle<{ id: string }>();
    if (mo?.id) {
      return {
        ok: false,
        error: "Đã có khiếu nại đang mở cho hoá đơn này.",
        status: 409,
      };
    }
  } else if (idDichVu) {
    const { data: dv } = await admin
      .from("cins_dich_vu")
      .select("id, id_tk")
      .eq("id", idDichVu)
      .maybeSingle<{ id: string; id_tk: string }>();
    if (!dv) {
      return { ok: false, error: "Không tìm thấy dòng dịch vụ.", status: 404 };
    }
    idTk = dv.id_tk;
  } else {
    return {
      ok: false,
      error: "Thiếu hoá đơn hoặc dòng dịch vụ.",
      status: 400,
    };
  }

  if (!idTk || !(await canSuaTk(idTk, input.actorId))) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const maGd = input.maGiaoDich?.trim() || null;
  const soTien =
    input.soTienKhai == null || !Number.isFinite(input.soTienKhai)
      ? null
      : Math.max(0, Math.round(input.soTienKhai));
  const ckLuc =
    typeof input.ckLuc === "string" && input.ckLuc.trim()
      ? input.ckLuc.trim()
      : null;

  const { data: row, error } = await admin
    .from("cins_hoa_don_khieu_nai")
    .insert({
      id_tk: idTk,
      id_hoa_don: idHoaDon,
      id_dich_vu: idDichVu,
      loai,
      noi_dung: noiDung,
      ma_giao_dich: maGd,
      so_tien_khai: soTien,
      ck_luc: ckLuc,
      anh_ids: anhIds,
      trang_thai: "mo",
      nguoi_tao: input.actorId,
    })
    .select(
      "id, id_tk, id_hoa_don, id_dich_vu, loai, noi_dung, ma_giao_dich, so_tien_khai, ck_luc, anh_ids, trang_thai, phan_hoi_admin, nguoi_tao, xu_ly_boi, tao_luc, cap_nhat_luc",
    )
    .single<CinsKnRow>();

  if (error || !row) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "Đã có khiếu nại đang mở cho hoá đơn này.",
        status: 409,
      };
    }
    console.error("[billing] taoKhieuNai", error?.message);
    return {
      ok: false,
      error: error?.message ?? "Không tạo được khiếu nại.",
      status: 500,
    };
  }

  /* Soft-hold gate: tái dùng cửa sổ tự khai. */
  if (idHoaDon) {
    const { data: hd } = await admin
      .from("cins_hoa_don")
      .select("tu_khai_da_tra_luc")
      .eq("id", idHoaDon)
      .maybeSingle<{ tu_khai_da_tra_luc: string | null }>();
    if (!hd?.tu_khai_da_tra_luc) {
      await admin
        .from("cins_hoa_don")
        .update({ tu_khai_da_tra_luc: new Date().toISOString() })
        .eq("id", idHoaDon);
    }
  }

  let tenDichVu: string | null = null;
  if (row.id_dich_vu) {
    const dvs = await listDichVuForTk(idTk);
    const dv = dvs.find((d) => d.id === row.id_dich_vu);
    tenDichVu = dv?.tenHienThi?.trim() || dv?.loai || null;
  }

  return { ok: true, item: mapCins(row, tenDichVu) };
}

/** Admin: list khiếu nại mở / đang xử lý. */
export async function listKhieuNaiMoAdmin(
  limit = 40,
): Promise<BillingKhieuNaiItem[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("cins_hoa_don_khieu_nai")
    .select(
      "id, id_tk, id_hoa_don, id_dich_vu, loai, noi_dung, ma_giao_dich, so_tien_khai, ck_luc, anh_ids, trang_thai, phan_hoi_admin, nguoi_tao, xu_ly_boi, tao_luc, cap_nhat_luc",
    )
    .in("trang_thai", ["mo", "dang_xu_ly"])
    .order("tao_luc", { ascending: true })
    .limit(limit);

  return ((data ?? []) as CinsKnRow[]).map((r) => mapCins(r, null));
}

export async function xuLyKhieuNaiAdmin(input: {
  id: string;
  actorId: string;
  trangThai: "dang_xu_ly" | "da_xu_ly" | "tu_choi";
  phanHoiAdmin?: string | null;
}): Promise<
  | { ok: true; item: BillingKhieuNaiItem }
  | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from("cins_hoa_don_khieu_nai")
    .update({
      trang_thai: input.trangThai,
      phan_hoi_admin: input.phanHoiAdmin?.trim() || null,
      xu_ly_boi: input.actorId,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(
      "id, id_tk, id_hoa_don, id_dich_vu, loai, noi_dung, ma_giao_dich, so_tien_khai, ck_luc, anh_ids, trang_thai, phan_hoi_admin, nguoi_tao, xu_ly_boi, tao_luc, cap_nhat_luc",
    )
    .maybeSingle<CinsKnRow>();

  if (error || !row) {
    return {
      ok: false,
      error: error?.message ?? "Không cập nhật được.",
      status: 400,
    };
  }
  return { ok: true, item: mapCins(row, null) };
}
