import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { GiaiDoan } from "@/lib/auth/session";
import {
  attachSocialState,
  buildSelfMilestonesForCotMocs,
} from "@/lib/journey/milestones-fetch";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

type DoanCotMocRow = {
  id: string;
  id_nguoi_dung: string;
  loai_moc:
    | "hoc"
    | "lam_viec"
    | "du_an"
    | "su_kien"
    | "thanh_tuu"
    | "ca_nhan";
  nguon_goc: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  che_do_hien_thi:
    | "public"
    | "feature"
    | "theo_nhom"
    | "chi_minh"
    | "cong_dong";
  tao_luc: string | null;
  id_to_chuc?: string | null;
};

type OwnerRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  giai_doan: GiaiDoan | null;
};

function calendarKey(row: {
  thoi_diem: string;
  tao_luc: string | null;
}): number {
  const date = Date.parse(row.thoi_diem);
  const created = row.tao_luc ? Date.parse(row.tao_luc) : 0;
  return date * 1_000_000 + created;
}

async function reactionCountsForMilestones(
  admin: ReturnType<typeof createServiceRoleClient>,
  cotMocIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (cotMocIds.length === 0) return counts;

  const { data } = await admin
    .from("social_reaction")
    .select("id_doi_tuong")
    .eq("loai_doi_tuong", "cot_moc")
    .eq("emoji", "heart")
    .in("id_doi_tuong", cotMocIds);

  for (const row of data ?? []) {
    const id = String(row.id_doi_tuong);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function sortCotMocs(
  rows: DoanCotMocRow[],
  sort: TagAggSort,
  reactionByMoc: Map<string, number>,
): DoanCotMocRow[] {
  const list = [...rows];
  if (sort === "a_z") {
    list.sort((a, b) =>
      (a.tieu_de ?? "").localeCompare(b.tieu_de ?? "", "vi"),
    );
    return list;
  }
  if (sort === "nhieu_tuong_tac") {
    list.sort(
      (a, b) =>
        (reactionByMoc.get(b.id) ?? 0) - (reactionByMoc.get(a.id) ?? 0) ||
        calendarKey(b) - calendarKey(a),
    );
    return list;
  }
  list.sort((a, b) => calendarKey(b) - calendarKey(a));
  return list;
}

function unwrapJoinRow<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

async function loadPosterIdByMoc(
  admin: ReturnType<typeof createServiceRoleClient>,
  mocIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (mocIds.length === 0) return out;

  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, thu_tu, content_tac_pham:content_tac_pham!inner(id_nguoi_dung)",
    )
    .in("id_cot_moc", mocIds)
    .order("thu_tu", { ascending: true });

  for (const row of data ?? []) {
    const mocId = String((row as { id_cot_moc: string }).id_cot_moc);
    if (out.has(mocId)) continue;
    const tp = unwrapJoinRow(
      (row as { content_tac_pham?: unknown }).content_tac_pham,
    ) as { id_nguoi_dung?: string } | null;
    const posterId = tp?.id_nguoi_dung?.trim();
    if (posterId) out.set(mocId, posterId);
  }
  return out;
}

function enrichMilestoneLensOwners(
  milestones: MilestoneItem[],
  ownerById: Map<string, OwnerRow>,
  mocOwnerById: Map<string, string>,
  posterByMoc: Map<string, string>,
): MilestoneItem[] {
  return milestones.map((m) => {
    const mocId = m.cotMocId ?? m.id;
    const ownerId =
      mocOwnerById.get(mocId) ?? posterByMoc.get(mocId) ?? null;
    const owner = ownerId ? ownerById.get(ownerId) : null;
    return {
      ...m,
      postOwnerId: ownerId ?? m.postOwnerId ?? null,
      postOwnerSlug: owner?.slug ?? m.postOwnerSlug ?? null,
      lensOwnerId: ownerId ?? null,
      lensOwnerSlug: owner?.slug ?? null,
      lensOwnerName: owner?.ten_hien_thi?.trim() || owner?.slug || null,
      lensOwnerAvatarUrl: getAvatarUrl(owner?.avatar_id ?? null),
    };
  });
}

export async function fetchOrgDoanMilestones(
  orgId: string,
  sort: TagAggSort,
  viewerId: string | null,
): Promise<MilestoneItem[]> {
  const admin = createServiceRoleClient();

  const { data: approved } = await admin
    .from("verify_yeu_cau")
    .select("id_cot_moc")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_duyet");

  const mocIds = [
    ...new Set(
      (approved ?? [])
        .map((row) => row.id_cot_moc as string)
        .filter(Boolean),
    ),
  ];
  if (mocIds.length === 0) return [];

  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select(
      "id, id_nguoi_dung, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_to_chuc",
    )
    .in("id", mocIds)
    .returns<DoanCotMocRow[]>();

  if (!cotMocs?.length) return [];

  const reactionByMoc = await reactionCountsForMilestones(
    admin,
    cotMocs.map((m) => m.id),
  );
  const sorted = sortCotMocs(cotMocs, sort, reactionByMoc);

  const mocOwnerById = new Map(
    cotMocs.map((m) => [m.id, m.id_nguoi_dung]),
  );
  const posterByMoc = await loadPosterIdByMoc(admin, mocIds);
  const ownerIds = [
    ...new Set([
      ...cotMocs.map((m) => m.id_nguoi_dung).filter(Boolean),
      ...posterByMoc.values(),
    ]),
  ];
  const { data: owners } = ownerIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
        .in("id", ownerIds)
    : { data: [] };

  const ownerById = new Map(
    (owners ?? []).map((o) => [o.id as string, o as OwnerRow]),
  );

  const built = await buildSelfMilestonesForCotMocs(admin, sorted);
  const withSocial = await attachSocialState(admin, built, viewerId);
  return enrichMilestoneLensOwners(
    withSocial,
    ownerById,
    mocOwnerById,
    posterByMoc,
  );
}
