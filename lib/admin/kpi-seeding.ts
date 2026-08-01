/**
 * KPI seeding theo ngày VN — phân bổ + đếm content_cot_moc.
 * Plan: docs/PLAN_tai_khoan_clone.md §5
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ngayVn } from "@/lib/autopilot/ngay-vn";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

function adminDb(): SupabaseClient {
  if (!hasServiceRoleEnv()) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY");
  }
  return createServiceRoleClient();
}

export type KpiCauHinh = {
  mucTieuNgay: number;
  baiMoiLuot: number;
  apDungLoai: string[];
};

export type KpiNickTrangThai = {
  idTaiKhoan: string;
  idNguoiDung: string | null;
  slug: string;
  loai: string;
  kpiMucTieu: number | null;
  daDangHomNay: number;
  du: boolean;
  nghi: boolean;
};

export type KpiTongQuan = {
  ngayVn: string;
  mucTieuNgay: number;
  tongDaDang: number;
  soTaiKhoanDu: number;
  soTaiKhoanCan: number;
  daPhanBo: boolean;
};

/** 00:00 VN của ngày YYYY-MM-DD → ISO UTC. */
export function dauNgayVnIso(ngay: string): string {
  return new Date(`${ngay}T00:00:00+07:00`).toISOString();
}

export function dauNgayMaiVnIso(ngay: string): string {
  const d = new Date(`${ngay}T00:00:00+07:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export async function layKpiCauHinh(
  db?: SupabaseClient,
): Promise<KpiCauHinh> {
  const client = db || adminDb();
  const { data, error } = await client
    .from("auto_kpi_cau_hinh")
    .select("muc_tieu_ngay, bai_moi_luot, ap_dung_loai")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    mucTieuNgay: data?.muc_tieu_ngay ?? 20,
    baiMoiLuot: data?.bai_moi_luot ?? 1,
    apDungLoai: (data?.ap_dung_loai as string[]) || ["ai", "clone"],
  };
}

export async function capNhatKpiCauHinh(params: {
  mucTieuNgay?: number;
  baiMoiLuot?: number;
  apDungLoai?: string[];
  capNhatBoi?: string | null;
}): Promise<KpiCauHinh> {
  const db = adminDb();
  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (typeof params.mucTieuNgay === "number") {
    patch.muc_tieu_ngay = Math.min(500, Math.max(0, Math.floor(params.mucTieuNgay)));
  }
  if (typeof params.baiMoiLuot === "number") {
    patch.bai_moi_luot = Math.min(20, Math.max(1, Math.floor(params.baiMoiLuot)));
  }
  if (params.apDungLoai) {
    patch.ap_dung_loai = params.apDungLoai.filter((x) =>
      x === "ai" || x === "clone",
    );
  }
  if (params.capNhatBoi) patch.cap_nhat_boi = params.capNhatBoi;

  const { error } = await db
    .from("auto_kpi_cau_hinh")
    .update(patch)
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return layKpiCauHinh(db);
}

/** Đếm bài công khai theo ngày VN — 1 query cho cả roster. */
export async function demBaiHomNayTheoUser(
  db: SupabaseClient,
  idNguoiDungs: string[],
  ngay?: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!idNguoiDungs.length) return map;
  const ngayX = ngay || ngayVn();
  const from = dauNgayVnIso(ngayX);
  const to = dauNgayMaiVnIso(ngayX);

  const { data, error } = await db
    .from("content_cot_moc")
    .select("id_nguoi_dung")
    .in("id_nguoi_dung", idNguoiDungs)
    .gte("tao_luc", from)
    .lt("tao_luc", to)
    .in("che_do_hien_thi", ["public", "feature"]);
  if (error) throw new Error(error.message);

  for (const row of data || []) {
    const id = row.id_nguoi_dung as string;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

/** Tổng số cột mốc (public/feature) trên tài khoản — roster admin. */
export async function demNoiDungTheoUser(
  db: SupabaseClient,
  idNguoiDungs: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!idNguoiDungs.length) return map;

  const { data, error } = await db
    .from("content_cot_moc")
    .select("id_nguoi_dung")
    .in("id_nguoi_dung", idNguoiDungs)
    .in("che_do_hien_thi", ["public", "feature"]);
  if (error) throw new Error(error.message);

  for (const row of data || []) {
    const id = row.id_nguoi_dung as string;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

type NickPhanBo = {
  id: string;
  slug: string;
  loai: string;
  han_muc_ngay: number;
  kpi_ngay: number | null;
  id_nguoi_dung: string | null;
};

/**
 * Phân bổ KPI ngày. Freeze nếu đã có kpi_phan_bo_luc (trừ khi epPhanBoLai).
 */
export async function damBaoPhanBoKpiHomNay(opts?: {
  epPhanBoLai?: boolean;
  db?: SupabaseClient;
}): Promise<{ phanBo: boolean; ngay: string }> {
  const db = opts?.db || adminDb();
  const ngay = ngayVn();
  const cfg = await layKpiCauHinh(db);

  const { data: nicks, error } = await db
    .from("auto_tai_khoan")
    .select("id, slug, loai, han_muc_ngay, kpi_ngay, id_nguoi_dung, tam_dung")
    .in("loai", cfg.apDungLoai.length ? cfg.apDungLoai : ["ai", "clone"])
    .eq("tam_dung", false)
    .order("slug");
  if (error) throw new Error(error.message);

  const list = (nicks || []) as (NickPhanBo & { tam_dung: boolean })[];
  if (!list.length) return { phanBo: false, ngay };

  const ids = list.map((n) => n.id);
  const { data: hmRows } = await db
    .from("auto_han_muc")
    .select("id_tai_khoan, kpi_muc_tieu, kpi_phan_bo_luc")
    .eq("ngay", ngay)
    .in("id_tai_khoan", ids);

  const hmByTk = new Map(
    (hmRows || []).map((r) => [
      r.id_tai_khoan as string,
      {
        kpiMucTieu: r.kpi_muc_tieu as number | null,
        kpiPhanBoLuc: r.kpi_phan_bo_luc as string | null,
      },
    ]),
  );

  const daFreeze =
    !opts?.epPhanBoLai &&
    list.every((n) => Boolean(hmByTk.get(n.id)?.kpiPhanBoLuc));
  if (daFreeze) return { phanBo: false, ngay };

  // Override cố định
  const mucTieu = new Map<string, number>();
  let conLai = cfg.mucTieuNgay;
  const pool: NickPhanBo[] = [];

  for (const n of list) {
    if (typeof n.kpi_ngay === "number" && n.kpi_ngay >= 0) {
      let k = n.kpi_ngay;
      if (n.loai === "ai") k = Math.min(k, n.han_muc_ngay ?? 3);
      mucTieu.set(n.id, k);
      conLai -= k;
    } else {
      pool.push(n);
    }
  }
  conLai = Math.max(0, conLai);

  // Sắp pool: chưa phân bổ gần đây trước (nulls first theo lần kpi_phan_bo_luc cũ)
  const { data: lichSu } = await db
    .from("auto_han_muc")
    .select("id_tai_khoan, kpi_phan_bo_luc")
    .in("id_tai_khoan", pool.map((p) => p.id))
    .not("kpi_phan_bo_luc", "is", null)
    .order("kpi_phan_bo_luc", { ascending: true });

  const lastPb = new Map<string, string>();
  for (const r of lichSu || []) {
    const id = r.id_tai_khoan as string;
    if (!lastPb.has(id) && r.kpi_phan_bo_luc) {
      lastPb.set(id, String(r.kpi_phan_bo_luc));
    }
  }

  pool.sort((a, b) => {
    // Ưu tiên clone (artist thật) trước nick AI fake cũ
    const pa = a.loai === "clone" ? 0 : 1;
    const pb = b.loai === "clone" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const la = lastPb.get(a.id) || "";
    const lb = lastPb.get(b.id) || "";
    if (la !== lb) return la.localeCompare(lb);
    return a.slug.localeCompare(b.slug);
  });

  const baiMoiLuot = cfg.baiMoiLuot;
  if (pool.length && conLai > 0) {
    const soCan = Math.ceil(conLai / baiMoiLuot);
    if (soCan <= pool.length) {
      // Chỉ lấy soCan nick đầu (đã ưu tiên clone) — AI chỉ vào nếu hết clone
      for (let i = 0; i < pool.length; i++) {
        const n = pool[i]!;
        let k = i < soCan ? baiMoiLuot : 0;
        if (n.loai === "ai" && k > 0) {
          k = Math.min(k, n.han_muc_ngay ?? 3);
        }
        mucTieu.set(n.id, k);
        if (i < soCan) conLai -= k;
      }
      // Rải phần dư do clamp AI → chỉ clone
      if (conLai > 0) {
        for (const n of pool) {
          if (conLai <= 0) break;
          if (n.loai !== "clone") continue;
          const cur = mucTieu.get(n.id) || 0;
          const them = Math.min(baiMoiLuot, conLai);
          if (them <= 0) continue;
          mucTieu.set(n.id, cur + them);
          conLai -= them;
        }
      }
    } else {
      // Mục tiêu lớn hơn số nick: chia đều nhưng phần dư ưu tiên clone (đầu list)
      const base = Math.floor(conLai / pool.length);
      let du = conLai - base * pool.length;
      for (let i = 0; i < pool.length; i++) {
        const n = pool[i]!;
        let k = base + (du > 0 ? 1 : 0);
        if (du > 0) du -= 1;
        if (n.loai === "ai") k = Math.min(k, n.han_muc_ngay ?? 3);
        mucTieu.set(n.id, k);
      }
    }
  } else {
    for (const n of pool) mucTieu.set(n.id, 0);
  }

  const now = new Date().toISOString();
  for (const n of list) {
    const kpi = mucTieu.get(n.id) ?? 0;
    const existing = hmByTk.get(n.id);
    if (existing) {
      const { error: upErr } = await db
        .from("auto_han_muc")
        .update({
          kpi_muc_tieu: kpi,
          kpi_phan_bo_luc: now,
          cap_nhat_luc: now,
        })
        .eq("id_tai_khoan", n.id)
        .eq("ngay", ngay);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { error: insErr } = await db.from("auto_han_muc").insert({
        id_tai_khoan: n.id,
        ngay,
        so_da_dang: 0,
        han_muc: n.han_muc_ngay ?? 3,
        kpi_muc_tieu: kpi,
        kpi_phan_bo_luc: now,
      });
      if (insErr) {
        // race → update
        await db
          .from("auto_han_muc")
          .update({
            kpi_muc_tieu: kpi,
            kpi_phan_bo_luc: now,
            cap_nhat_luc: now,
          })
          .eq("id_tai_khoan", n.id)
          .eq("ngay", ngay);
      }
    }
  }

  return { phanBo: true, ngay };
}

export async function layKpiTongQuan(
  nickRows: Array<{
    id: string;
    idNguoiDung: string | null;
    kpiMucTieu: number | null;
    daDangHomNay: number;
  }>,
  cauHinh?: KpiCauHinh,
): Promise<KpiTongQuan> {
  const cfg = cauHinh || (await layKpiCauHinh());
  const can = nickRows.filter((n) => (n.kpiMucTieu ?? 0) > 0);
  const soTaiKhoanDu = can.filter(
    (n) => n.daDangHomNay >= (n.kpiMucTieu ?? 0),
  ).length;
  const tongDaDang = nickRows.reduce((s, n) => s + n.daDangHomNay, 0);
  const daPhanBo = nickRows.some((n) => n.kpiMucTieu !== null);

  return {
    ngayVn: ngayVn(),
    mucTieuNgay: cfg.mucTieuNgay,
    tongDaDang,
    soTaiKhoanDu,
    soTaiKhoanCan: can.length,
    daPhanBo,
  };
}
