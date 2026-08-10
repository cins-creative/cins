import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ShopFandomChip = {
  id: string;
  slug: string;
  ten: string;
  soShopDung: number;
};

export type ShopFandomRef = {
  id: string;
  slug: string;
  ten: string;
  daVerify: boolean;
};

const HUB_FANDOM_CHIP_MAX = 40;

/** Map nhomId → slug bài fandom đang gắn. */
export async function fandomSlugsByNhomIds(
  nhomIds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(nhomIds.filter(Boolean))];
  const out = new Map<string, string[]>();
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links, error } = await admin
    .from("shop_nhom_fandom")
    .select("id_nhom, id_bai_viet")
    .in("id_nhom", unique)
    .limit(Math.min(unique.length * 20, 4000))
    .returns<Array<{ id_nhom: string; id_bai_viet: string }>>();

  if (error) {
    console.error("[shop] fandomSlugsByNhomIds links", error);
    return out;
  }
  if (!links?.length) return out;

  const baiIds = [...new Set(links.map((l) => l.id_bai_viet))];
  const { data: baiRows, error: bErr } = await admin
    .from("article_bai_viet")
    .select("id, slug")
    .in("id", baiIds)
    .eq("loai_bai_viet", "fandom")
    .eq("trang_thai_noi_dung", "published")
    .returns<Array<{ id: string; slug: string }>>();
  if (bErr) {
    console.error("[shop] fandomSlugsByNhomIds articles", bErr);
    return out;
  }

  const slugById = new Map((baiRows ?? []).map((b) => [b.id, b.slug] as const));
  for (const link of links) {
    const slug = slugById.get(link.id_bai_viet);
    if (!slug) continue;
    const list = out.get(link.id_nhom) ?? [];
    if (!list.includes(slug)) list.push(slug);
    out.set(link.id_nhom, list);
  }
  return out;
}

/** Map nhomId → id bài fandom đang gắn. */
export async function fandomIdsByNhomIds(
  nhomIds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(nhomIds.filter(Boolean))];
  const out = new Map<string, string[]>();
  if (unique.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: links, error } = await admin
    .from("shop_nhom_fandom")
    .select("id_nhom, id_bai_viet")
    .in("id_nhom", unique)
    .limit(Math.min(unique.length * 20, 4000))
    .returns<Array<{ id_nhom: string; id_bai_viet: string }>>();

  if (error) {
    console.error("[shop] fandomIdsByNhomIds", error);
    return out;
  }
  for (const link of links ?? []) {
    const list = out.get(link.id_nhom) ?? [];
    if (!list.includes(link.id_bai_viet)) list.push(link.id_bai_viet);
    out.set(link.id_nhom, list);
  }
  return out;
}

/**
 * Chip fandom cho hub `/cua-hang` — top N theo số loại hàng đang gắn.
 * Shape giống giá trị facet cũ để UI không đổi.
 */
export async function listFandomChipsForHub(
  limit = HUB_FANDOM_CHIP_MAX,
): Promise<ShopFandomChip[]> {
  const admin = createServiceRoleClient();
  const { data: links, error } = await admin
    .from("shop_nhom_fandom")
    .select("id_bai_viet")
    .limit(8000)
    .returns<Array<{ id_bai_viet: string }>>();

  if (error) {
    console.error("[shop] listFandomChipsForHub links", error);
    return [];
  }

  const countById = new Map<string, number>();
  for (const row of links ?? []) {
    countById.set(row.id_bai_viet, (countById.get(row.id_bai_viet) ?? 0) + 1);
  }

  // Luôn hiện seed đã verify dù chưa có shop dùng; ưu tiên theo usage.
  const { data: articles, error: aErr } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, da_verify")
    .eq("loai_bai_viet", "fandom")
    .eq("trang_thai_noi_dung", "published")
    .order("da_verify", { ascending: false })
    .order("tieu_de", { ascending: true })
    .limit(200)
    .returns<
      Array<{
        id: string;
        slug: string;
        tieu_de: string;
        da_verify: boolean | null;
      }>
    >();

  if (aErr) {
    console.error("[shop] listFandomChipsForHub articles", aErr);
    return [];
  }

  const chips = (articles ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    ten: a.tieu_de,
    soShopDung: countById.get(a.id) ?? 0,
    verified: a.da_verify === true,
  }));

  chips.sort((a, b) => {
    if (b.soShopDung !== a.soShopDung) return b.soShopDung - a.soShopDung;
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.ten.localeCompare(b.ten, "vi");
  });

  return chips.slice(0, Math.max(1, limit)).map(({ id, slug, ten, soShopDung }) => ({
    id,
    slug,
    ten,
    soShopDung,
  }));
}

/** Load fandom refs by id (editor Kho). */
export async function loadFandomRefsByIds(
  ids: string[],
): Promise<ShopFandomRef[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, da_verify")
    .in("id", unique)
    .eq("loai_bai_viet", "fandom")
    .neq("trang_thai_noi_dung", "merged")
    .returns<
      Array<{
        id: string;
        slug: string;
        tieu_de: string;
        da_verify: boolean | null;
      }>
    >();

  if (error) {
    console.error("[shop] loadFandomRefsByIds", error);
    return [];
  }

  const byId = new Map(
    (data ?? []).map((r) => [
      r.id,
      {
        id: r.id,
        slug: r.slug,
        ten: r.tieu_de,
        daVerify: r.da_verify === true,
      } satisfies ShopFandomRef,
    ]),
  );

  return unique
    .map((id) => byId.get(id))
    .filter((x): x is ShopFandomRef => Boolean(x));
}

/**
 * Thay toàn bộ fandom gắn loại. Chỉ nhận bài `loai_bai_viet=fandom` published.
 */
export async function replaceNhomFandom(
  nhomId: string,
  fandomIds: string[],
): Promise<void> {
  const id = nhomId.trim();
  if (!id) throw new Error("NHOM_REQUIRED");

  const unique = [
    ...new Set(
      fandomIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ].slice(0, 40);

  const admin = createServiceRoleClient();

  if (unique.length > 0) {
    const { data: valid, error: vErr } = await admin
      .from("article_bai_viet")
      .select("id")
      .in("id", unique)
      .eq("loai_bai_viet", "fandom")
      .eq("trang_thai_noi_dung", "published")
      .returns<Array<{ id: string }>>();
    if (vErr) {
      console.error("[shop] replaceNhomFandom validate", vErr);
      throw new Error("FANDOM_INVALID");
    }
    if ((valid ?? []).length !== unique.length) {
      throw new Error("FANDOM_INVALID");
    }
  }

  const { error: delErr } = await admin
    .from("shop_nhom_fandom")
    .delete()
    .eq("id_nhom", id);
  if (delErr) {
    console.error("[shop] replaceNhomFandom delete", delErr);
    throw new Error("FANDOM_SYNC_FAILED");
  }

  if (unique.length === 0) return;

  const { error: insErr } = await admin.from("shop_nhom_fandom").insert(
    unique.map((idBaiViet) => ({
      id_nhom: id,
      id_bai_viet: idBaiViet,
    })),
  );
  if (insErr) {
    console.error("[shop] replaceNhomFandom insert", insErr);
    throw new Error("FANDOM_SYNC_FAILED");
  }
}
