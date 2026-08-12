import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ShopDanhMuc = {
  id: string;
  slug: string;
  ten: string;
  idCha: string | null;
  nganhHang: string;
  moTa: string | null;
  thuTu: number;
  icon: string | null;
  trangThai: "hien" | "an";
};

type DanhMucRow = {
  id: string;
  slug: string;
  ten: string;
  id_cha: string | null;
  nganh_hang: string;
  mo_ta: string | null;
  thu_tu: number;
  icon: string | null;
  trang_thai: string;
};

function mapDanhMuc(row: DanhMucRow): ShopDanhMuc {
  return {
    id: row.id,
    slug: row.slug,
    ten: row.ten,
    idCha: row.id_cha,
    nganhHang: row.nganh_hang,
    moTa: row.mo_ta?.trim() || null,
    thuTu: row.thu_tu,
    icon: row.icon?.trim() || null,
    trangThai: row.trang_thai === "an" ? "an" : "hien",
  };
}

/** Chuẩn hoá chuỗi alias: lower + bỏ dấu + bỏ ký tự đặc biệt. */
export function normalizeTaxonomyKeyword(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Id các node có con — không được gắn loại / không lên chip hub. */
export function parentIdsOf(list: ShopDanhMuc[]): Set<string> {
  const ids = new Set<string>();
  for (const d of list) {
    if (d.idCha) ids.add(d.idCha);
  }
  return ids;
}

export function isDanhMucLa(d: ShopDanhMuc, parentIds: Set<string>): boolean {
  return !parentIds.has(d.id);
}

/**
 * Cây danh mục đang `hien`.
 * `forHubFilter`: bỏ `khac` và cấp cha (chip chỉ lá).
 */
export async function listDanhMucTree(opts?: {
  nganhHang?: string;
  forHubFilter?: boolean;
}): Promise<ShopDanhMuc[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_danh_muc")
    .select(
      "id, slug, ten, id_cha, nganh_hang, mo_ta, thu_tu, icon, trang_thai",
    )
    .eq("trang_thai", "hien")
    .order("thu_tu", { ascending: true })
    .limit(200);

  if (opts?.nganhHang) q = q.eq("nganh_hang", opts.nganhHang);

  const { data, error } = await q.returns<DanhMucRow[]>();
  if (error) {
    console.error("[shop] listDanhMucTree", error);
    return [];
  }

  let list = (data ?? []).map(mapDanhMuc);
  if (opts?.forHubFilter) {
    const parentIds = parentIdsOf(list);
    list = list.filter((d) => d.slug !== "khac" && isDanhMucLa(d, parentIds));
  }
  return list;
}

/** Map id → slug cho enrich listing. */
export async function mapDanhMucSlugByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_danh_muc")
    .select("id, slug")
    .in("id", unique)
    .returns<Array<{ id: string; slug: string }>>();
  if (error) {
    console.error("[shop] mapDanhMucSlugByIds", error);
    return out;
  }
  for (const row of data ?? []) out.set(row.id, row.slug);
  return out;
}

/**
 * Gợi ý danh mục từ tên loại (alias lookup).
 * Trả về tối đa vài ứng viên theo độ khớp từ khóa.
 */
export async function suggestDanhMucFromTen(
  tenRaw: string,
  limit = 5,
): Promise<ShopDanhMuc[]> {
  const q = normalizeTaxonomyKeyword(tenRaw);
  if (!q) return [];

  const admin = createServiceRoleClient();
  const tokens = q.split(" ").filter((t) => t.length >= 2);
  const candidates = tokens.length > 0 ? tokens : [q];

  const { data: aliasRows, error } = await admin
    .from("shop_danh_muc_alias")
    .select("tu_khoa, id_danh_muc")
    .limit(500)
    .returns<Array<{ tu_khoa: string; id_danh_muc: string }>>();
  if (error) {
    console.error("[shop] suggestDanhMucFromTen alias", error);
    return [];
  }

  const scoreById = new Map<string, number>();
  for (const row of aliasRows ?? []) {
    const kw = row.tu_khoa;
    let score = 0;
    if (q.includes(kw) || kw.includes(q)) score += 10;
    for (const t of candidates) {
      if (kw.includes(t) || t.includes(kw)) score += 3;
    }
    if (score <= 0) continue;
    scoreById.set(
      row.id_danh_muc,
      Math.max(scoreById.get(row.id_danh_muc) ?? 0, score),
    );
  }

  const ranked = [...scoreById.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (ranked.length === 0) return [];

  const { data: dmRows, error: dmErr } = await admin
    .from("shop_danh_muc")
    .select(
      "id, slug, ten, id_cha, nganh_hang, mo_ta, thu_tu, icon, trang_thai",
    )
    .in("id", ranked)
    .eq("trang_thai", "hien")
    .returns<DanhMucRow[]>();
  if (dmErr) {
    console.error("[shop] suggestDanhMucFromTen dm", dmErr);
    return [];
  }

  const byId = new Map((dmRows ?? []).map((r) => [r.id, mapDanhMuc(r)]));
  return ranked.map((id) => byId.get(id)).filter(Boolean) as ShopDanhMuc[];
}
