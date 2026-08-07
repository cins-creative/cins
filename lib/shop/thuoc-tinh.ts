import "server-only";

import { normalizeTaxonomyKeyword } from "@/lib/shop/danh-muc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ShopThuocTinh = {
  id: string;
  slug: string;
  ten: string;
  nganhHang: string | null;
  kieu: "chon_nhieu" | "chon_mot";
  sellerDeXuatDuoc: boolean;
  hienOHub: boolean;
  thuTu: number;
  trangThai: "hien" | "an";
};

export type ShopThuocTinhGiaTri = {
  id: string;
  idThuocTinh: string;
  slug: string;
  ten: string;
  nhom: string | null;
  loai: string | null;
  trangThai: "de_xuat" | "hien" | "an";
  soShopDung: number;
  thuTu: number;
};

type FacetRow = {
  id: string;
  slug: string;
  ten: string;
  nganh_hang: string | null;
  kieu: string;
  seller_de_xuat_duoc: boolean;
  hien_o_hub: boolean;
  thu_tu: number;
  trang_thai: string;
};

type GiaTriRow = {
  id: string;
  id_thuoc_tinh: string;
  slug: string;
  ten: string;
  nhom: string | null;
  loai: string | null;
  trang_thai: string;
  so_shop_dung: number;
  thu_tu: number;
};

function mapFacet(row: FacetRow): ShopThuocTinh {
  return {
    id: row.id,
    slug: row.slug,
    ten: row.ten,
    nganhHang: row.nganh_hang,
    kieu: row.kieu === "chon_mot" ? "chon_mot" : "chon_nhieu",
    sellerDeXuatDuoc: row.seller_de_xuat_duoc === true,
    hienOHub: row.hien_o_hub !== false,
    thuTu: row.thu_tu,
    trangThai: row.trang_thai === "an" ? "an" : "hien",
  };
}

function mapGiaTri(row: GiaTriRow): ShopThuocTinhGiaTri {
  const tt =
    row.trang_thai === "de_xuat"
      ? "de_xuat"
      : row.trang_thai === "an"
        ? "an"
        : "hien";
  return {
    id: row.id,
    idThuocTinh: row.id_thuoc_tinh,
    slug: row.slug,
    ten: row.ten,
    nhom: row.nhom?.trim() || null,
    loai: row.loai?.trim() || null,
    trangThai: tt,
    soShopDung: Math.max(0, Math.trunc(Number(row.so_shop_dung) || 0)),
    thuTu: row.thu_tu,
  };
}

/** Facet đang `hien` (+ tùy chọn chỉ hub). */
export async function listFacets(opts?: {
  nganhHang?: string | null;
  hubOnly?: boolean;
}): Promise<ShopThuocTinh[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from("shop_thuoc_tinh")
    .select(
      "id, slug, ten, nganh_hang, kieu, seller_de_xuat_duoc, hien_o_hub, thu_tu, trang_thai",
    )
    .eq("trang_thai", "hien")
    .order("thu_tu", { ascending: true })
    .limit(50);

  if (opts?.hubOnly) q = q.eq("hien_o_hub", true);

  const { data, error } = await q.returns<FacetRow[]>();
  if (error) {
    console.error("[shop] listFacets", error);
    return [];
  }

  let list = (data ?? []).map(mapFacet);
  if (opts?.nganhHang != null) {
    const nh = opts.nganhHang;
    list = list.filter((f) => f.nganhHang == null || f.nganhHang === nh);
  }
  return list;
}

/** Giá trị `hien` của một facet (theo slug facet hoặc id). */
export async function listGiaTriHien(opts: {
  facetSlug?: string;
  facetId?: string;
}): Promise<ShopThuocTinhGiaTri[]> {
  const admin = createServiceRoleClient();
  let facetId = opts.facetId?.trim() || null;
  if (!facetId && opts.facetSlug) {
    const { data } = await admin
      .from("shop_thuoc_tinh")
      .select("id")
      .eq("slug", opts.facetSlug)
      .maybeSingle<{ id: string }>();
    facetId = data?.id ?? null;
  }
  if (!facetId) return [];

  const { data, error } = await admin
    .from("shop_thuoc_tinh_gia_tri")
    .select(
      "id, id_thuoc_tinh, slug, ten, nhom, loai, trang_thai, so_shop_dung, thu_tu",
    )
    .eq("id_thuoc_tinh", facetId)
    .eq("trang_thai", "hien")
    .order("thu_tu", { ascending: true })
    .limit(200)
    .returns<GiaTriRow[]>();
  if (error) {
    console.error("[shop] listGiaTriHien", error);
    return [];
  }
  return (data ?? []).map(mapGiaTri);
}

/**
 * Facet + giá trị `hien` cho hub (cache-friendly payload).
 * Bỏ giá trị slug `khac` khỏi chip fandom nếu cần — để UI quyết.
 */
export async function listFacetsForHub(opts?: {
  nganhHang?: string;
}): Promise<
  Array<ShopThuocTinh & { giaTri: ShopThuocTinhGiaTri[] }>
> {
  const facets = await listFacets({
    nganhHang: opts?.nganhHang ?? "merch",
    hubOnly: true,
  });
  if (facets.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_thuoc_tinh_gia_tri")
    .select(
      "id, id_thuoc_tinh, slug, ten, nhom, loai, trang_thai, so_shop_dung, thu_tu",
    )
    .in(
      "id_thuoc_tinh",
      facets.map((f) => f.id),
    )
    .eq("trang_thai", "hien")
    .order("thu_tu", { ascending: true })
    .limit(500)
    .returns<GiaTriRow[]>();
  if (error) {
    console.error("[shop] listFacetsForHub gia_tri", error);
    return facets.map((f) => ({ ...f, giaTri: [] }));
  }

  const byFacet = new Map<string, ShopThuocTinhGiaTri[]>();
  for (const row of data ?? []) {
    const list = byFacet.get(row.id_thuoc_tinh) ?? [];
    list.push(mapGiaTri(row));
    byFacet.set(row.id_thuoc_tinh, list);
  }

  return facets.map((f) => ({
    ...f,
    giaTri: (byFacet.get(f.id) ?? []).filter((g) => g.slug !== "khac"),
  }));
}

/** Map nhomId → { facetSlug: giaTriSlug[] }. */
export async function facetsByNhomIds(
  nhomIds: string[],
): Promise<Map<string, Record<string, string[]>>> {
  const unique = [...new Set(nhomIds.filter(Boolean))];
  const out = new Map<string, Record<string, string[]>>();
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links, error } = await admin
    .from("shop_nhom_thuoc_tinh")
    .select("id_nhom, id_gia_tri")
    .in("id_nhom", unique)
    .limit(Math.min(unique.length * 20, 4000))
    .returns<Array<{ id_nhom: string; id_gia_tri: string }>>();

  if (error) {
    console.error("[shop] facetsByNhomIds links", error);
    return out;
  }
  if (!links?.length) return out;

  const giaTriIds = [...new Set(links.map((l) => l.id_gia_tri))];
  const { data: giaTriRows, error: gtErr } = await admin
    .from("shop_thuoc_tinh_gia_tri")
    .select("id, slug, id_thuoc_tinh, trang_thai")
    .in("id", giaTriIds)
    .eq("trang_thai", "hien")
    .returns<
      Array<{
        id: string;
        slug: string;
        id_thuoc_tinh: string;
        trang_thai: string;
      }>
    >();
  if (gtErr) {
    console.error("[shop] facetsByNhomIds gia_tri", gtErr);
    return out;
  }

  const facetIds = [
    ...new Set((giaTriRows ?? []).map((g) => g.id_thuoc_tinh)),
  ];
  const { data: facetRows, error: fErr } = await admin
    .from("shop_thuoc_tinh")
    .select("id, slug")
    .in("id", facetIds)
    .returns<Array<{ id: string; slug: string }>>();
  if (fErr) {
    console.error("[shop] facetsByNhomIds facets", fErr);
    return out;
  }

  const facetSlugById = new Map(
    (facetRows ?? []).map((f) => [f.id, f.slug] as const),
  );
  const giaTriMeta = new Map(
    (giaTriRows ?? []).map((g) => [
      g.id,
      {
        slug: g.slug,
        facetSlug: facetSlugById.get(g.id_thuoc_tinh) ?? null,
      },
    ]),
  );

  for (const link of links) {
    const meta = giaTriMeta.get(link.id_gia_tri);
    if (!meta?.facetSlug) continue;
    const rec = out.get(link.id_nhom) ?? {};
    const list = rec[meta.facetSlug] ?? [];
    if (!list.includes(meta.slug)) list.push(meta.slug);
    rec[meta.facetSlug] = list;
    out.set(link.id_nhom, rec);
  }

  return out;
}

/** Map nhomId → id giá trị facet đang gắn (mọi trang_thai còn trong junction). */
export async function giaTriIdsByNhomIds(
  nhomIds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(nhomIds.filter(Boolean))];
  const out = new Map<string, string[]>();
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links, error } = await admin
    .from("shop_nhom_thuoc_tinh")
    .select("id_nhom, id_gia_tri")
    .in("id_nhom", unique)
    .limit(Math.min(unique.length * 20, 4000))
    .returns<Array<{ id_nhom: string; id_gia_tri: string }>>();

  if (error) {
    console.error("[shop] giaTriIdsByNhomIds", error);
    return out;
  }
  for (const link of links ?? []) {
    const list = out.get(link.id_nhom) ?? [];
    if (!list.includes(link.id_gia_tri)) list.push(link.id_gia_tri);
    out.set(link.id_nhom, list);
  }
  return out;
}

/**
 * Thay toàn bộ facet gắn loại. Chỉ nhận giá trị `hien` hoặc `de_xuat`.
 * Xóa link cũ rồi insert mới (idempotent theo set id).
 */
export async function replaceNhomGiaTri(
  nhomId: string,
  giaTriIds: string[],
): Promise<void> {
  const id = nhomId.trim();
  if (!id) throw new Error("NHOM_REQUIRED");

  const unique = [
    ...new Set(
      giaTriIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].slice(0, 40);

  const admin = createServiceRoleClient();

  if (unique.length > 0) {
    const { data: valid, error: vErr } = await admin
      .from("shop_thuoc_tinh_gia_tri")
      .select("id, trang_thai")
      .in("id", unique)
      .in("trang_thai", ["hien", "de_xuat"])
      .returns<Array<{ id: string; trang_thai: string }>>();
    if (vErr) {
      console.error("[shop] replaceNhomGiaTri validate", vErr);
      throw new Error("GIA_TRI_INVALID");
    }
    if ((valid ?? []).length !== unique.length) {
      throw new Error("GIA_TRI_INVALID");
    }
  }

  const { error: delErr } = await admin
    .from("shop_nhom_thuoc_tinh")
    .delete()
    .eq("id_nhom", id);
  if (delErr) {
    console.error("[shop] replaceNhomGiaTri delete", delErr);
    throw new Error("FACET_SYNC_FAILED");
  }

  if (unique.length === 0) return;

  const { error: insErr } = await admin.from("shop_nhom_thuoc_tinh").insert(
    unique.map((idGiaTri) => ({
      id_nhom: id,
      id_gia_tri: idGiaTri,
    })),
  );
  if (insErr) {
    console.error("[shop] replaceNhomGiaTri insert", insErr);
    throw new Error("FACET_SYNC_FAILED");
  }
}

/** Gợi ý giá trị facet từ text (alias trong cùng facet). */
export async function suggestGiaTriFromText(
  facetSlug: string,
  tenRaw: string,
  limit = 5,
): Promise<ShopThuocTinhGiaTri[]> {
  const q = normalizeTaxonomyKeyword(tenRaw);
  if (!q || !facetSlug.trim()) return [];

  const admin = createServiceRoleClient();
  const { data: facet } = await admin
    .from("shop_thuoc_tinh")
    .select("id")
    .eq("slug", facetSlug.trim())
    .maybeSingle<{ id: string }>();
  if (!facet?.id) return [];

  const { data: aliasRows, error } = await admin
    .from("shop_thuoc_tinh_alias")
    .select("tu_khoa, id_gia_tri")
    .eq("id_thuoc_tinh", facet.id)
    .limit(500)
    .returns<Array<{ tu_khoa: string; id_gia_tri: string }>>();
  if (error) {
    console.error("[shop] suggestGiaTriFromText", error);
    return [];
  }

  const tokens = q.split(" ").filter((t) => t.length >= 2);
  const scoreById = new Map<string, number>();
  for (const row of aliasRows ?? []) {
    const kw = row.tu_khoa;
    let score = 0;
    if (q.includes(kw) || kw.includes(q)) score += 10;
    for (const t of tokens) {
      if (kw.includes(t) || t.includes(kw)) score += 3;
    }
    if (score <= 0) continue;
    scoreById.set(
      row.id_gia_tri,
      Math.max(scoreById.get(row.id_gia_tri) ?? 0, score),
    );
  }

  const ranked = [...scoreById.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (ranked.length === 0) return [];

  const { data: gtRows, error: gtErr } = await admin
    .from("shop_thuoc_tinh_gia_tri")
    .select(
      "id, id_thuoc_tinh, slug, ten, nhom, loai, trang_thai, so_shop_dung, thu_tu",
    )
    .in("id", ranked)
    .eq("trang_thai", "hien")
    .returns<GiaTriRow[]>();
  if (gtErr) {
    console.error("[shop] suggestGiaTriFromText gt", gtErr);
    return [];
  }

  const byId = new Map((gtRows ?? []).map((r) => [r.id, mapGiaTri(r)]));
  return ranked
    .map((id) => byId.get(id))
    .filter(Boolean) as ShopThuocTinhGiaTri[];
}
