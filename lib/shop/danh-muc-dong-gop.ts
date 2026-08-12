import "server-only";

import {
  normalizeTaxonomyKeyword,
  suggestDanhMucFromTen,
} from "@/lib/shop/danh-muc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const STOPWORDS = new Set([
  "va",
  "cua",
  "cho",
  "voi",
  "the",
  "and",
  "or",
  "in",
  "de",
  "mot",
  "cac",
  "nay",
  "do",
  "hang",
  "loai",
  "san",
  "pham",
  "cm",
  "mm",
]);

const YEU_CAU_PER_DAY = 5;
const ALIAS_PROMOTE_MIN_SHOP = 3;

function tokensFromNhan(nhan: string): string[] {
  const q = normalizeTaxonomyKeyword(nhan);
  if (!q) return [];
  const parts = q.split(" ").filter((t) => t.length >= 3 && t.length <= 16);
  const out: string[] = [];
  for (const t of parts) {
    if (STOPWORDS.has(t)) continue;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}

function clusterKey(raw: string): string {
  return normalizeTaxonomyKeyword(raw).slice(0, 48) || "khac";
}

/**
 * D1 — khi seller chọn tay khác gợi ý alias, ghi ứng viên.
 * Không throw ra ngoài updateNhom.
 */
export async function ghiAliasUngVienTuChonTay(opts: {
  ownerId: string;
  nhomId: string;
  nhan: string;
  idDanhMuc: string;
}): Promise<void> {
  const tokens = tokensFromNhan(opts.nhan);
  if (tokens.length === 0) return;

  try {
    const suggested = await suggestDanhMucFromTen(opts.nhan, 3);
    if (suggested.some((d) => d.id === opts.idDanhMuc)) return;

    const admin = createServiceRoleClient();
    for (const tuKhoa of tokens) {
      const { error } = await admin.from("shop_danh_muc_alias_ung_vien").upsert(
        {
          tu_khoa: tuKhoa,
          id_danh_muc: opts.idDanhMuc,
          id_nguoi_dung: opts.ownerId,
          id_nhom: opts.nhomId,
        },
        { onConflict: "tu_khoa,id_danh_muc,id_nguoi_dung" },
      );
      if (error) {
        console.error("[shop] ghiAliasUngVien", error);
        return;
      }
    }
  } catch (e) {
    console.error("[shop] ghiAliasUngVien", e);
  }
}

export async function taoYeuCauDanhMuc(opts: {
  ownerId: string;
  nhomId: string;
  moTa: string;
  tuKhoa?: string;
  idDanhMucGanNhat?: string | null;
}): Promise<{ idKhac: string }> {
  const moTa = opts.moTa.trim();
  if (moTa.length < 20 || moTa.length > 500) {
    throw new Error("MO_TA_YEU_CAU");
  }

  const admin = createServiceRoleClient();
  const { data: nhom, error: nhomErr } = await admin
    .from("shop_nhom")
    .select("id, nhan")
    .eq("id", opts.nhomId)
    .eq("id_nguoi_dung", opts.ownerId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string; nhan: string }>();
  if (nhomErr || !nhom) throw new Error("NHOM_NOT_FOUND");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await admin
    .from("shop_danh_muc_yeu_cau")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", opts.ownerId)
    .gte("tao_luc", since);
  if (countErr) {
    console.error("[shop] taoYeuCauDanhMuc count", countErr);
    throw new Error("YEU_CAU_FAILED");
  }
  if ((count ?? 0) >= YEU_CAU_PER_DAY) throw new Error("YEU_CAU_LIMIT");

  const { data: khac, error: khacErr } = await admin
    .from("shop_danh_muc")
    .select("id")
    .eq("slug", "khac")
    .eq("trang_thai", "hien")
    .maybeSingle<{ id: string }>();
  if (khacErr || !khac) throw new Error("DANH_MUC_INVALID");

  let ganNhat: string | null = opts.idDanhMucGanNhat?.trim() || null;
  if (ganNhat) {
    const { data: dm } = await admin
      .from("shop_danh_muc")
      .select("id")
      .eq("id", ganNhat)
      .eq("trang_thai", "hien")
      .maybeSingle<{ id: string }>();
    if (!dm) ganNhat = null;
  }

  const tuKhoa =
    (opts.tuKhoa || nhom.nhan).trim().slice(0, 80) || "khac";
  const { error: insErr } = await admin.from("shop_danh_muc_yeu_cau").insert({
    id_nguoi_dung: opts.ownerId,
    id_nhom: opts.nhomId,
    tu_khoa_chuan: tuKhoa,
    mo_ta: moTa,
    id_danh_muc_gan_nhat: ganNhat,
    cum: clusterKey(moTa),
    trang_thai: "moi",
  });
  if (insErr) {
    console.error("[shop] taoYeuCauDanhMuc insert", insErr);
    throw new Error("YEU_CAU_FAILED");
  }

  return { idKhac: khac.id };
}

/** Tên đề xuất đang `moi` — hiện trên Kho thay vì chữ «Khác». */
export async function mapDeXuatDanhMucByNhomIds(
  nhomIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(nhomIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_danh_muc_yeu_cau")
    .select("id_nhom, tu_khoa_chuan, tao_luc")
    .in("id_nhom", ids)
    .eq("trang_thai", "moi")
    .order("tao_luc", { ascending: false });
  if (error) {
    console.error("[shop] mapDeXuatDanhMucByNhomIds", error);
    return out;
  }
  for (const row of data ?? []) {
    const id = typeof row.id_nhom === "string" ? row.id_nhom : "";
    if (!id || out.has(id)) continue;
    const ten = String(row.tu_khoa_chuan ?? "").trim();
    if (ten) out.set(id, ten);
  }
  return out;
}

export type AliasUngVienHangCho = {
  tuKhoa: string;
  idDanhMuc: string;
  tenDanhMuc: string;
  soShop: number;
  soNhom: number;
};

export type YeuCauDanhMucHangCho = {
  id: string;
  idNhom: string;
  nhanNhom: string | null;
  tuKhoaChuan: string;
  moTa: string;
  idDanhMucGanNhat: string | null;
  tenDanhMucGanNhat: string | null;
  cum: string;
  trangThai: string;
  taoLuc: string;
  soShopCungCum: number;
};

export async function listHangChoDanhMuc(): Promise<{
  alias: AliasUngVienHangCho[];
  yeuCau: YeuCauDanhMucHangCho[];
}> {
  const admin = createServiceRoleClient();

  const { data: ungVien, error: uvErr } = await admin
    .from("shop_danh_muc_alias_ung_vien")
    .select("tu_khoa, id_danh_muc, id_nguoi_dung, id_nhom")
    .limit(2000)
    .returns<
      Array<{
        tu_khoa: string;
        id_danh_muc: string;
        id_nguoi_dung: string;
        id_nhom: string;
      }>
    >();
  if (uvErr) {
    console.error("[shop] listHangCho alias", uvErr);
  }

  const grouped = new Map<
    string,
    { shops: Set<string>; nhoms: Set<string>; idDanhMuc: string; tuKhoa: string }
  >();
  for (const row of ungVien ?? []) {
    const key = `${row.tu_khoa}\t${row.id_danh_muc}`;
    const g = grouped.get(key) ?? {
      shops: new Set<string>(),
      nhoms: new Set<string>(),
      idDanhMuc: row.id_danh_muc,
      tuKhoa: row.tu_khoa,
    };
    g.shops.add(row.id_nguoi_dung);
    g.nhoms.add(row.id_nhom);
    grouped.set(key, g);
  }

  const dmIds = [...new Set([...grouped.values()].map((g) => g.idDanhMuc))];
  const tenById = new Map<string, string>();
  if (dmIds.length > 0) {
    const { data: dms } = await admin
      .from("shop_danh_muc")
      .select("id, ten")
      .in("id", dmIds)
      .returns<Array<{ id: string; ten: string }>>();
    for (const d of dms ?? []) tenById.set(d.id, d.ten);
  }

  const alias: AliasUngVienHangCho[] = [...grouped.values()]
    .filter((g) => g.shops.size >= ALIAS_PROMOTE_MIN_SHOP)
    .map((g) => ({
      tuKhoa: g.tuKhoa,
      idDanhMuc: g.idDanhMuc,
      tenDanhMuc: tenById.get(g.idDanhMuc) ?? g.idDanhMuc,
      soShop: g.shops.size,
      soNhom: g.nhoms.size,
    }))
    .sort((a, b) => b.soShop - a.soShop || a.tuKhoa.localeCompare(b.tuKhoa, "vi"));

  const { data: ycRows, error: ycErr } = await admin
    .from("shop_danh_muc_yeu_cau")
    .select(
      "id, id_nhom, tu_khoa_chuan, mo_ta, id_danh_muc_gan_nhat, cum, trang_thai, tao_luc",
    )
    .eq("trang_thai", "moi")
    .order("tao_luc", { ascending: false })
    .limit(80)
    .returns<
      Array<{
        id: string;
        id_nhom: string;
        tu_khoa_chuan: string;
        mo_ta: string;
        id_danh_muc_gan_nhat: string | null;
        cum: string;
        trang_thai: string;
        tao_luc: string;
      }>
    >();
  if (ycErr) {
    console.error("[shop] listHangCho yeu cau", ycErr);
  }

  const nhomIds = [...new Set((ycRows ?? []).map((r) => r.id_nhom))];
  const nhanByNhom = new Map<string, string>();
  if (nhomIds.length > 0) {
    const { data: nhoms } = await admin
      .from("shop_nhom")
      .select("id, nhan")
      .in("id", nhomIds)
      .returns<Array<{ id: string; nhan: string }>>();
    for (const n of nhoms ?? []) nhanByNhom.set(n.id, n.nhan);
  }

  const ganIds = [
    ...new Set(
      (ycRows ?? [])
        .map((r) => r.id_danh_muc_gan_nhat)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const tenGan = new Map<string, string>();
  if (ganIds.length > 0) {
    const { data: dms } = await admin
      .from("shop_danh_muc")
      .select("id, ten")
      .in("id", ganIds)
      .returns<Array<{ id: string; ten: string }>>();
    for (const d of dms ?? []) tenGan.set(d.id, d.ten);
  }

  const shopByCum = new Map<string, Set<string>>();
  if ((ycRows ?? []).length > 0) {
    const cums = [...new Set((ycRows ?? []).map((r) => r.cum))];
    const { data: cumRows } = await admin
      .from("shop_danh_muc_yeu_cau")
      .select("cum, id_nguoi_dung")
      .in("cum", cums)
      .eq("trang_thai", "moi")
      .limit(500)
      .returns<Array<{ cum: string; id_nguoi_dung: string }>>();
    for (const r of cumRows ?? []) {
      const set = shopByCum.get(r.cum) ?? new Set<string>();
      set.add(r.id_nguoi_dung);
      shopByCum.set(r.cum, set);
    }
  }

  const yeuCau: YeuCauDanhMucHangCho[] = (ycRows ?? []).map((r) => ({
    id: r.id,
    idNhom: r.id_nhom,
    nhanNhom: nhanByNhom.get(r.id_nhom) ?? null,
    tuKhoaChuan: r.tu_khoa_chuan,
    moTa: r.mo_ta,
    idDanhMucGanNhat: r.id_danh_muc_gan_nhat,
    tenDanhMucGanNhat: r.id_danh_muc_gan_nhat
      ? (tenGan.get(r.id_danh_muc_gan_nhat) ?? null)
      : null,
    cum: r.cum,
    trangThai: r.trang_thai,
    taoLuc: r.tao_luc,
    soShopCungCum: shopByCum.get(r.cum)?.size ?? 1,
  }));

  return { alias, yeuCau };
}

export async function promoteAliasUngVien(opts: {
  tuKhoa: string;
  idDanhMuc: string;
}): Promise<{ ok: true } | { ok: false; conflictTen: string }> {
  const tuKhoa = normalizeTaxonomyKeyword(opts.tuKhoa);
  if (!tuKhoa) throw new Error("TU_KHOA_INVALID");

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("shop_danh_muc_alias")
    .select("id_danh_muc")
    .eq("tu_khoa", tuKhoa)
    .maybeSingle<{ id_danh_muc: string }>();
  if (existing && existing.id_danh_muc !== opts.idDanhMuc) {
    const { data: dm } = await admin
      .from("shop_danh_muc")
      .select("ten")
      .eq("id", existing.id_danh_muc)
      .maybeSingle<{ ten: string }>();
    return { ok: false, conflictTen: dm?.ten ?? existing.id_danh_muc };
  }

  const { error } = await admin.from("shop_danh_muc_alias").upsert(
    { tu_khoa: tuKhoa, id_danh_muc: opts.idDanhMuc },
    { onConflict: "tu_khoa" },
  );
  if (error) {
    console.error("[shop] promoteAliasUngVien", error);
    throw new Error("PROMOTE_FAILED");
  }

  await admin
    .from("shop_danh_muc_alias_ung_vien")
    .delete()
    .eq("tu_khoa", tuKhoa)
    .eq("id_danh_muc", opts.idDanhMuc);

  return { ok: true };
}

export async function xuLyYeuCauDanhMuc(opts: {
  id: string;
  trangThai: "gop_alias" | "da_tao" | "tu_choi";
  idDanhMucKetQua?: string | null;
  lyDoTuChoi?: string | null;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    trang_thai: opts.trangThai,
  };
  if (opts.idDanhMucKetQua) patch.id_danh_muc_ket_qua = opts.idDanhMucKetQua;
  if (opts.trangThai === "tu_choi") {
    const lyDo = opts.lyDoTuChoi?.trim() || "";
    if (!lyDo) throw new Error("LY_DO_REQUIRED");
    patch.ly_do_tu_choi = lyDo.slice(0, 300);
  }
  const { error } = await admin
    .from("shop_danh_muc_yeu_cau")
    .update(patch)
    .eq("id", opts.id)
    .eq("trang_thai", "moi");
  if (error) {
    console.error("[shop] xuLyYeuCauDanhMuc", error);
    throw new Error("YEU_CAU_FAILED");
  }
}
