import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveTruongImageSrc } from "@/lib/truong/media-url";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hasSupabaseEnv } from "@/lib/supabase/env";

import {
  type NganhTruongRow,
  labelHeDaoTao,
  labelLoaiTruong,
  formatThoiGianThang,
  truongDetailHref,
  countUniqueTruong,
  uniqueTruongByOrg,
  truongSidebarMeta,
} from "@/lib/nganh/truong-shared";

export type { NganhTruongRow } from "@/lib/nganh/truong-shared";
export {
  labelHeDaoTao,
  labelLoaiTruong,
  formatThoiGianThang,
  truongDetailHref,
  countUniqueTruong,
  uniqueTruongByOrg,
  truongSidebarMeta,
};

type OrgDaiHocEmbed = {
  ma_truong?: string | null;
  loai_truong?: string | null;
  website?: string | null;
};

type RawTruongRow = {
  id?: string;
  he_dao_tao?: string | null;
  thoi_gian_thang?: number | null;
  org_to_chuc?: {
    id?: string;
    slug?: string | null;
    ten?: string | null;
    logo_id?: string | null;
    avatar_id?: string | null;
    cover_id?: string | null;
    tinh_thanh?: string | null;
    org_truong_dai_hoc?: OrgDaiHocEmbed | OrgDaiHocEmbed[] | null;
  } | null;
};

const TRUONG_SELECT = `
  id,
  he_dao_tao,
  thoi_gian_thang,
  org_to_chuc!inner (
    id,
    slug,
    ten,
    logo_id,
    avatar_id,
    cover_id,
    tinh_thanh,
    org_truong_dai_hoc!inner (
      ma_truong,
      loai_truong,
      website
    )
  )
`;

function pickDaiHoc(
  embed: OrgDaiHocEmbed | OrgDaiHocEmbed[] | null | undefined,
): OrgDaiHocEmbed | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function mapRawRow(row: RawTruongRow): NganhTruongRow | null {
  const programId = row.id?.trim();
  const org = row.org_to_chuc;
  if (!programId || !org) return null;
  const id = org.id?.trim();
  const slug = org.slug?.trim();
  const ten = org.ten?.trim();
  if (!id || !slug || !ten) return null;

  const otd = pickDaiHoc(org.org_truong_dai_hoc);

  return {
    programId,
    id,
    slug,
    ten,
    logo_id: org.logo_id ?? null,
    avatar_id: org.avatar_id ?? org.logo_id ?? null,
    cover_id: org.cover_id ?? null,
    tinh_thanh: org.tinh_thanh?.trim() || null,
    nganhTags: [],
    nganhCount: 0,
    he_dao_tao: row.he_dao_tao?.trim() || null,
    thoi_gian_thang:
      typeof row.thoi_gian_thang === "number" ? row.thoi_gian_thang : null,
    ma_truong: otd?.ma_truong?.trim() || null,
    loai_truong: otd?.loai_truong?.trim() || null,
    website: otd?.website?.trim() || null,
  };
}

async function enrichTruongRowMedia(row: NganhTruongRow): Promise<NganhTruongRow> {
  const avatarImageId = row.avatar_id ?? row.logo_id;
  const [avatar_src, cover_src] = await Promise.all([
    avatarImageId
      ? resolveTruongImageSrc(avatarImageId, ["public", "avatar"])
      : Promise.resolve(null),
    row.cover_id
      ? resolveTruongImageSrc(row.cover_id, ["public", "cover", "medium"])
      : Promise.resolve(null),
  ]);
  return {
    ...row,
    avatar_src: avatar_src ?? null,
    cover_src: cover_src ?? null,
  };
}

type RawNganhLinkForOrg = {
  id_to_chuc?: string | null;
  article_bai_viet?: {
    tieu_de_viet?: string | null;
    tieu_de?: string | null;
    loai_bai_viet?: string | null;
  } | null;
};

function nganhTitleFromLink(
  art: NonNullable<RawNganhLinkForOrg["article_bai_viet"]>,
): string {
  return art.tieu_de_viet?.trim() || art.tieu_de?.trim() || "Ngành đào tạo";
}

/** Tất cả ngành `dang_tuyen` theo trường — giống listing, không lọc theo ngành trang. */
async function fetchNganhTagsByOrgIds(
  supabase: SupabaseClient,
  orgIds: string[],
): Promise<Map<string, string[]>> {
  if (!orgIds.length) return new Map();

  const { data: links } = await supabase
    .from("org_truong_nganh")
    .select(
      `
      id_to_chuc,
      article_bai_viet!inner (
        tieu_de_viet,
        tieu_de,
        loai_bai_viet
      )
    `,
    )
    .in("id_to_chuc", orgIds)
    .eq("trang_thai_chuong_trinh", "dang_tuyen");

  const tagsByOrg = new Map<string, string[]>();
  for (const row of (links ?? []) as RawNganhLinkForOrg[]) {
    const orgId = row.id_to_chuc?.trim();
    const art = row.article_bai_viet;
    if (!orgId || !art) continue;
    if (String(art.loai_bai_viet) !== "nganh_dao_tao") continue;
    const title = nganhTitleFromLink(art);
    const list = tagsByOrg.get(orgId) ?? [];
    if (!list.includes(title)) list.push(title);
    tagsByOrg.set(orgId, list);
  }
  return tagsByOrg;
}

function enrichTruongRowNganhTags(
  row: NganhTruongRow,
  tagsByOrg: Map<string, string[]>,
): NganhTruongRow {
  const all = tagsByOrg.get(row.id) ?? [];
  const sorted = [...all].sort((a, b) => a.localeCompare(b, "vi"));
  return {
    ...row,
    nganhTags: sorted.slice(0, 3),
    nganhCount: sorted.length,
  };
}

function sortTruongRows(rows: NganhTruongRow[]): NganhTruongRow[] {
  return [...rows].sort((a, b) => {
    const loai = (a.loai_truong ?? "").localeCompare(
      b.loai_truong ?? "",
      "vi",
    );
    if (loai !== 0) return loai;
    return a.ten.localeCompare(b.ten, "vi");
  });
}

async function fetchTruongDaoTaoQuery(
  supabase: SupabaseClient,
  articleId: string,
): Promise<NganhTruongRow[]> {
  const { data, error } = await supabase
    .from("org_truong_nganh")
    .select(TRUONG_SELECT)
    .eq("id_nganh", articleId)
    .eq("trang_thai_chuong_trinh", "dang_tuyen");

  if (error || !data?.length) return [];

  const mapped = (data as RawTruongRow[])
    .map(mapRawRow)
    .filter((r): r is NganhTruongRow => r != null);

  const orgIds = [...new Set(mapped.map((r) => r.id))];
  const tagsByOrg = await fetchNganhTagsByOrgIds(supabase, orgIds);

  const enriched = await Promise.all(
    mapped.map(async (row) => {
      const withMedia = await enrichTruongRowMedia(row);
      return enrichTruongRowNganhTags(withMedia, tagsByOrg);
    }),
  );
  return sortTruongRows(enriched);
}

/** Trường đào tạo ngành — chỉ chương trình `dang_tuyen`, có bản ghi `org_truong_dai_hoc`. */
export async function fetchTruongDaoTaoForNganh(
  articleId: string,
): Promise<NganhTruongRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    return await fetchTruongDaoTaoQuery(
      createPublicSupabaseClient(),
      articleId,
    );
  } catch {
    return [];
  }
}

export async function fetchTruongDaoTaoForNganhAdmin(
  articleId: string,
): Promise<NganhTruongRow[]> {
  try {
    return await fetchTruongDaoTaoQuery(
      createServiceRoleClient(),
      articleId,
    );
  } catch {
    return [];
  }
}
