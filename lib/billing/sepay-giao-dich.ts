import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { getHoaDonByMa } from "./hoa-don";
import { conNoHoaDon } from "./hoa-don-ma";
import { ghiThanhToanSepayVaPhanBo } from "./phan-bo";

const MA_CINS_RE = /CINS[A-Z0-9]{10}/i;
/** Validate mã CK đã chuẩn hoá (toàn chuỗi). */
const MA_CINS_EXACT_RE = /^CINS[A-Z0-9]{10}$/i;
const MA_SINEART_RE = /(?:SA|SC)\d{6}/i;

/** Escape giá trị trước khi nội suy vào PostgREST `.or()` filter. */
function escapePostgrestFilterValue(raw: string): string {
  return raw.replace(/[,.()\\%_]/g, "").replace(/"/g, "");
}

export type SepayMaHe = "cins" | "sineart" | "khac";
export type SepayTrangThaiXuLy =
  | "cho"
  | "da_khop"
  | "khong_khop"
  | "bo_qua"
  | "loi";

export type CinsSepayGiaoDichRow = {
  id: string;
  sepayId: string;
  soTienVnd: number;
  maTrichXuat: string | null;
  maHe: SepayMaHe;
  trangThaiXuLy: SepayTrangThaiXuLy;
  idThanhToan: string | null;
  nhanLuc: string;
};

function maskTk(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, "").trim();
  if (!s) return null;
  if (s.length <= 4) return `****${s}`;
  return `****${s.slice(-4)}`;
}

function str(v: unknown): string {
  return v != null ? String(v).trim() : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Chuẩn hoá JSON / form SePay (camelCase + snake_case). */
export function normalizeSepayPayload(
  raw: Record<string, unknown>,
): {
  id: string;
  gateway: string | null;
  transactionDate: string;
  transferAmount: number;
  transferType: string;
  content: string;
  code: string;
  description: string;
  accountNumber: string | null;
  raw: Record<string, unknown>;
} {
  const content = str(raw.content) || str(raw.description);
  const code = str(raw.code);
  return {
    id: str(raw.id),
    gateway: str(raw.gateway) || null,
    transactionDate: str(raw.transactionDate ?? raw.transaction_date),
    transferAmount: num(raw.transferAmount ?? raw.transfer_amount),
    transferType: (str(raw.transferType || raw.transfer_type) || "in").toLowerCase(),
    content,
    code,
    description: str(raw.description),
    accountNumber: str(raw.accountNumber ?? raw.account_number) || null,
    raw,
  };
}

export async function parseSepayRequestBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }
  if (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  ) {
    const fd = await request.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      out[k] = typeof v === "string" ? v : v.name;
    }
    return out;
  }
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(text);
    const out: Record<string, unknown> = {};
    for (const [k, v] of params) out[k] = v;
    return out;
  }
}

/** `2024-07-02 11:08:33` (VN) → ISO. */
export function nhanLucFromSepay(transactionDate: string | undefined): string {
  if (!transactionDate?.trim()) return new Date().toISOString();
  const raw = transactionDate.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(`${raw}+07:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(transactionDate);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

export function parseMaTrichXuat(
  ...texts: Array<string | null | undefined>
): { ma: string | null; maHe: SepayMaHe } {
  for (const t of texts) {
    if (!t) continue;
    const upper = t.toUpperCase();
    const cins = upper.match(MA_CINS_RE);
    if (cins?.[0]) return { ma: cins[0].toUpperCase(), maHe: "cins" };
  }
  for (const t of texts) {
    if (!t) continue;
    const sa = t.toUpperCase().match(MA_SINEART_RE);
    if (sa?.[0]) return { ma: sa[0].toUpperCase(), maHe: "sineart" };
  }
  return { ma: null, maHe: "khac" };
}

type InsertLogInput = {
  sepayId: string;
  gateway: string | null;
  soTaiKhoan: string | null;
  loaiChuyen: "in" | "out";
  soTienVnd: number;
  noiDung: string | null;
  maTrichXuat: string | null;
  maHe: SepayMaHe;
  rawWebhook: Record<string, unknown>;
  nhanLuc: string;
  trangThaiXuLy?: SepayTrangThaiXuLy;
  ghiChuXuLy?: string | null;
};

/**
 * Ghi log thô — idempotent theo sepay_id.
 * Trùng → trả row cũ + duplicate.
 */
export async function insertSepayGiaoDich(
  input: InsertLogInput,
): Promise<
  | { ok: true; duplicate: false; row: CinsSepayGiaoDichRow }
  | { ok: true; duplicate: true; row: CinsSepayGiaoDichRow }
  | { ok: false; error: string; transient?: boolean }
> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("cins_sepay_giao_dich")
    .insert({
      sepay_id: input.sepayId,
      gateway: input.gateway,
      so_tai_khoan: input.soTaiKhoan,
      tai_khoan_nguon: null,
      loai_chuyen: input.loaiChuyen,
      so_tien_vnd: Math.max(0, Math.round(input.soTienVnd)),
      noi_dung: input.noiDung,
      ma_trich_xuat: input.maTrichXuat,
      ma_he: input.maHe,
      trang_thai_xu_ly: input.trangThaiXuLy ?? "cho",
      ghi_chu_xu_ly: input.ghiChuXuLy ?? null,
      raw_webhook: input.rawWebhook,
      nhan_luc: input.nhanLuc,
    })
    .select(
      "id, sepay_id, so_tien_vnd, ma_trich_xuat, ma_he, trang_thai_xu_ly, id_thanh_toan, nhan_luc",
    )
    .single<{
      id: string;
      sepay_id: string;
      so_tien_vnd: number;
      ma_trich_xuat: string | null;
      ma_he: SepayMaHe;
      trang_thai_xu_ly: SepayTrangThaiXuLy;
      id_thanh_toan: string | null;
      nhan_luc: string;
    }>();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin
        .from("cins_sepay_giao_dich")
        .select(
          "id, sepay_id, so_tien_vnd, ma_trich_xuat, ma_he, trang_thai_xu_ly, id_thanh_toan, nhan_luc",
        )
        .eq("sepay_id", input.sepayId)
        .maybeSingle<{
          id: string;
          sepay_id: string;
          so_tien_vnd: number;
          ma_trich_xuat: string | null;
          ma_he: SepayMaHe;
          trang_thai_xu_ly: SepayTrangThaiXuLy;
          id_thanh_toan: string | null;
          nhan_luc: string;
        }>();
      if (existing) {
        return {
          ok: true,
          duplicate: true,
          row: mapLogRow(existing),
        };
      }
    }
    console.error("[sepay-log] insert", error.message);
    return { ok: false, error: error.message, transient: true };
  }
  if (!data) return { ok: false, error: "INSERT_EMPTY", transient: true };
  return { ok: true, duplicate: false, row: mapLogRow(data) };
}

function mapLogRow(r: {
  id: string;
  sepay_id: string;
  so_tien_vnd: number;
  ma_trich_xuat: string | null;
  ma_he: SepayMaHe;
  trang_thai_xu_ly: SepayTrangThaiXuLy;
  id_thanh_toan: string | null;
  nhan_luc: string;
}): CinsSepayGiaoDichRow {
  return {
    id: r.id,
    sepayId: r.sepay_id,
    soTienVnd: Number(r.so_tien_vnd) || 0,
    maTrichXuat: r.ma_trich_xuat,
    maHe: r.ma_he,
    trangThaiXuLy: r.trang_thai_xu_ly,
    idThanhToan: r.id_thanh_toan,
    nhanLuc: r.nhan_luc,
  };
}

export async function capNhatSepayGiaoDich(input: {
  id: string;
  trangThaiXuLy: SepayTrangThaiXuLy;
  idThanhToan?: string | null;
  ghiChuXuLy?: string | null;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const patch: Record<string, unknown> = {
    trang_thai_xu_ly: input.trangThaiXuLy,
  };
  if (input.idThanhToan !== undefined) {
    patch.id_thanh_toan = input.idThanhToan;
  }
  if (input.ghiChuXuLy !== undefined) {
    patch.ghi_chu_xu_ly = input.ghiChuXuLy;
  }
  const { error } = await admin
    .from("cins_sepay_giao_dich")
    .update(patch)
    .eq("id", input.id);
  if (error) {
    console.error("[sepay-log] update", error.message);
  }
}

/**
 * Đối soát lại từ bảng log khi poll (webhook có thể đã ghi nhưng chưa khớp /
 * hoặc khớp xong nhưng client chưa biết).
 */
export async function trySyncHoaDonFromSepayLog(input: {
  hoaDonId: string;
  maThamChieu: string;
}): Promise<{ synced: boolean; idThanhToan: string | null }> {
  const ma = input.maThamChieu.trim().toUpperCase();
  if (!ma || !MA_CINS_EXACT_RE.test(ma)) {
    return { synced: false, idThanhToan: null };
  }

  const maSafe = escapePostgrestFilterValue(ma);
  if (!maSafe || !MA_CINS_EXACT_RE.test(maSafe)) {
    return { synced: false, idThanhToan: null };
  }

  const admin = createServiceRoleClient();
  const { data: txs } = await admin
    .from("cins_sepay_giao_dich")
    .select(
      "id, sepay_id, so_tien_vnd, noi_dung, ma_trich_xuat, trang_thai_xu_ly, id_thanh_toan, nhan_luc, so_tai_khoan",
    )
    .eq("loai_chuyen", "in")
    .in("trang_thai_xu_ly", ["cho", "khong_khop", "da_khop"])
    .or(`ma_trich_xuat.eq.${maSafe},noi_dung.ilike.%${maSafe}%`)
    .order("nhan_luc", { ascending: false })
    .limit(10);

  if (!txs?.length) return { synced: false, idThanhToan: null };

  type Tx = {
    id: string;
    sepay_id: string;
    so_tien_vnd: number;
    noi_dung: string | null;
    ma_trich_xuat: string | null;
    trang_thai_xu_ly: string;
    id_thanh_toan: string | null;
    nhan_luc: string;
    so_tai_khoan: string | null;
  };

  const hit = (txs as Tx[]).find((t) => {
    const extracted =
      (t.ma_trich_xuat ?? "").trim().toUpperCase() ||
      parseMaTrichXuat(t.noi_dung).ma ||
      "";
    return (
      extracted === ma ||
      (t.noi_dung ?? "").toUpperCase().includes(ma)
    );
  });
  if (!hit) return { synced: false, idThanhToan: null };

  if (hit.trang_thai_xu_ly === "da_khop" && hit.id_thanh_toan) {
    return { synced: true, idThanhToan: hit.id_thanh_toan };
  }

  const billing = await ghiThanhToanSepayVaPhanBo({
    sepayId: hit.sepay_id,
    soTienVnd: Number(hit.so_tien_vnd) || 0,
    noiDung: hit.noi_dung,
    taiKhoanNguon: hit.so_tai_khoan,
    nhanLuc: hit.nhan_luc,
    maThamChieu: ma,
  });

  if (billing.matched || billing.duplicate) {
    await capNhatSepayGiaoDich({
      id: hit.id,
      trangThaiXuLy: billing.matched || billing.idThanhToan ? "da_khop" : "khong_khop",
      idThanhToan: billing.idThanhToan || null,
      ghiChuXuLy: billing.matched
        ? null
        : billing.duplicate
          ? "duplicate_thanh_toan"
          : "chua_khop",
    });
  }

  /* Xác nhận hoá đơn đã hết nợ */
  const hd = await getHoaDonByMa(ma);
  if (hd && conNoHoaDon(hd) <= 0) {
    return { synced: true, idThanhToan: billing.idThanhToan || hit.id_thanh_toan };
  }
  if (billing.matched) {
    return { synced: true, idThanhToan: billing.idThanhToan };
  }
  return { synced: false, idThanhToan: billing.idThanhToan || null };
}

export async function getHoaDonByIdForPoll(
  hoaDonId: string,
): Promise<{
  id: string;
  idTk: string;
  maThamChieu: string;
  trangThai: string;
  daTraVnd: number;
  conNoVnd: number;
} | null> {
  const admin = createServiceRoleClient();
  let row = (
    await admin
      .from("cins_hoa_don")
      .select(
        "id, id_tk, ma_tham_chieu, trang_thai, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd",
      )
      .eq("id", hoaDonId)
      .maybeSingle<{
        id: string;
        id_tk: string;
        ma_tham_chieu: string;
        trang_thai: string;
        so_tien_vnd: number;
        dieu_chinh_vnd: number;
        da_tra_vnd: number;
      }>()
  ).data;

  if (!row) {
    row = (
      await admin
        .from("cins_hoa_don")
        .select(
          "id, id_tk, ma_tham_chieu, trang_thai, so_tien_vnd, dieu_chinh_vnd, da_tra_vnd",
        )
        .eq("nguon_id", hoaDonId)
        .maybeSingle<{
          id: string;
          id_tk: string;
          ma_tham_chieu: string;
          trang_thai: string;
          so_tien_vnd: number;
          dieu_chinh_vnd: number;
          da_tra_vnd: number;
        }>()
    ).data;
  }
  if (!row) return null;

  const daTraVnd = Number(row.da_tra_vnd) || 0;
  const conNoVnd = conNoHoaDon({
    soTienVnd: Number(row.so_tien_vnd) || 0,
    dieuChinhVnd: Number(row.dieu_chinh_vnd) || 0,
    daTraVnd,
    trangThai: row.trang_thai,
  });

  return {
    id: row.id,
    idTk: row.id_tk,
    maThamChieu: row.ma_tham_chieu,
    trangThai: row.trang_thai,
    daTraVnd,
    conNoVnd,
  };
}

/** Re-export mask helper for webhook path that still needs it. */
export { maskTk };
