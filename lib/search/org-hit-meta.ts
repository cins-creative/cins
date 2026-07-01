import "server-only";

import { labelLoaiTruong } from "@/lib/nganh/truong-shared";
import { labelLoaiCoSo } from "@/lib/to-chuc/constants";
import { labelTinhThanh } from "@/lib/truong/contact";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { resolveSchoolCoverSrc } from "@/lib/truong/school-cover";
import type { SearchHit, SearchOrgMeta } from "@/lib/search/types";
import { orgLoaiLabel, orgPublicHref } from "@/lib/search/helpers";
import type { ScoredSearchItem } from "@/lib/search/ranking";
import type { SupabaseClient } from "@supabase/supabase-js";

type OrgEmbedTruong = {
  ma_truong?: string | null;
  loai_truong?: string | null;
  ten_chinh_thuc?: string | null;
};

type OrgEmbedCoSo = {
  loai_co_so?: string | null;
  ten_chinh_thuc?: string | null;
};

export type RawOrgSearchRow = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
  avatar_id: string | null;
  logo_id: string | null;
  cover_id: string | null;
  mo_ta: string | null;
  tinh_thanh: string | null;
  org_truong_dai_hoc?: OrgEmbedTruong | OrgEmbedTruong[] | null;
  org_co_so_dao_tao?: OrgEmbedCoSo | OrgEmbedCoSo[] | null;
};

export type OrgFootCounts = {
  nganhByOrg: Map<string, number>;
  khoaByOrg: Map<string, number>;
};

function pickOne<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

export async function fetchOrgFootCounts(
  admin: SupabaseClient,
  rows: RawOrgSearchRow[],
): Promise<OrgFootCounts> {
  const nganhByOrg = new Map<string, number>();
  const khoaByOrg = new Map<string, number>();

  const truongIds = rows
    .filter((row) => row.loai_to_chuc === "truong_dai_hoc")
    .map((row) => String(row.id));
  const coSoIds = rows
    .filter((row) => row.loai_to_chuc === "co_so_dao_tao")
    .map((row) => String(row.id));

  const tasks: Promise<void>[] = [];

  if (truongIds.length > 0) {
    tasks.push(
      (async () => {
        const { data } = await admin
          .from("org_truong_nganh")
          .select("id_to_chuc")
          .in("id_to_chuc", truongIds)
          .eq("trang_thai_chuong_trinh", "dang_tuyen");
        for (const row of data ?? []) {
          const id = String(row.id_to_chuc);
          nganhByOrg.set(id, (nganhByOrg.get(id) ?? 0) + 1);
        }
      })(),
    );
  }

  if (coSoIds.length > 0) {
    tasks.push(
      (async () => {
        const { data } = await admin
          .from("org_khoa_hoc")
          .select("id_to_chuc")
          .in("id_to_chuc", coSoIds);
        for (const row of data ?? []) {
          const id = String(row.id_to_chuc);
          khoaByOrg.set(id, (khoaByOrg.get(id) ?? 0) + 1);
        }
      })(),
    );
  }

  await Promise.all(tasks);
  return { nganhByOrg, khoaByOrg };
}

export function buildOrgSearchMeta(
  row: RawOrgSearchRow,
  counts: OrgFootCounts,
): SearchOrgMeta {
  const loai = String(row.loai_to_chuc ?? "").trim();
  const truong = pickOne(row.org_truong_dai_hoc);
  const coSo = pickOne(row.org_co_so_dao_tao);
  const ten = String(row.ten ?? "").trim() || "Tổ chức";
  const rawOfficial =
    truong?.ten_chinh_thuc?.trim() || coSo?.ten_chinh_thuc?.trim() || null;
  const officialName =
    rawOfficial && rawOfficial !== ten ? rawOfficial : null;

  let typeLabel: string | null = null;
  if (loai === "truong_dai_hoc") {
    const label = labelLoaiTruong(truong?.loai_truong);
    typeLabel = label !== "—" ? label : null;
  } else if (loai === "co_so_dao_tao") {
    const label = labelLoaiCoSo(coSo?.loai_co_so);
    typeLabel = label.trim() ? label : null;
  }

  let footLabel = "Xem trang";
  if (loai === "truong_dai_hoc") {
    const count = counts.nganhByOrg.get(String(row.id)) ?? 0;
    footLabel =
      count > 0 ? `${count} ngành đào tạo` : "Chưa có ngành đào tạo";
  } else if (loai === "co_so_dao_tao") {
    const count = counts.khoaByOrg.get(String(row.id)) ?? 0;
    footLabel = count > 0 ? `${count} khóa học` : "Chưa có khóa học";
  }

  const location = labelTinhThanh(row.tinh_thanh);
  const moTa = row.mo_ta ? String(row.mo_ta).trim() : null;

  return {
    coverUrl: resolveSchoolCoverSrc({ cover_id: row.cover_id, cover_src: null }),
    officialName,
    locationLabel: location || null,
    typeLabel,
    maTruong: truong?.ma_truong?.trim() || null,
    footLabel,
    moTa,
  };
}

function resolveOrgAvatarUrl(row: RawOrgSearchRow): string | null {
  const imageId = row.avatar_id ?? row.logo_id;
  return imageId
    ? resolveTruongImageSrcSync(imageId, ["public", "avatar"])
    : null;
}

export function buildOrgSearchItem(
  row: RawOrgSearchRow,
  trigramSim: number,
  counts: OrgFootCounts,
): ScoredSearchItem {
  const slug = String(row.slug ?? "").trim();
  const ten = String(row.ten ?? "").trim() || "Tổ chức";
  const moTa = row.mo_ta ? String(row.mo_ta).trim() : null;
  const orgMeta = buildOrgSearchMeta(row, counts);

  const hit: SearchHit = {
    id: String(row.id),
    kind: "org",
    title: ten,
    subtitle: slug ? `@${slug}` : null,
    snippet: moTa,
    href: orgPublicHref(String(row.loai_to_chuc ?? ""), slug),
    avatarUrl: resolveOrgAvatarUrl(row),
    badge: orgLoaiLabel(String(row.loai_to_chuc ?? "")),
    entityLoai: String(row.loai_to_chuc ?? "").trim() || null,
    slug: slug || null,
    orgMeta,
  };

  return {
    trigramSim,
    fields: {
      title: ten,
      titleAlt: orgMeta.officialName,
      slug,
      summary: moTa,
    },
    hit,
  };
}

export const ORG_SEARCH_SELECT = `
  id,
  ten,
  slug,
  loai_to_chuc,
  avatar_id,
  logo_id,
  cover_id,
  mo_ta,
  tinh_thanh,
  org_truong_dai_hoc ( ma_truong, loai_truong, ten_chinh_thuc ),
  org_co_so_dao_tao ( loai_co_so, ten_chinh_thuc )
`;
