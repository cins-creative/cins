import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { getGiaiDoanLabel } from "@/lib/journey/profile";
import type { GiaiDoan } from "@/lib/auth/session";
import {
  attachSocialState,
  buildSelfMilestonesForCotMocs,
} from "@/lib/journey/milestones-fetch";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isMilestoneVisibleOnEntityPage } from "@/lib/tag/entity-visible-clause";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";

type EntityCotMocRow = {
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

function unwrapJoinRow<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function collectVisibleCotMoc(
  byId: Map<string, EntityCotMocRow>,
  raw: unknown,
): void {
  const moc = unwrapJoinRow(raw) as EntityCotMocRow | null;
  if (!moc?.id) return;
  if (!isMilestoneVisibleOnEntityPage(String(moc.che_do_hien_thi ?? ""))) return;
  byId.set(moc.id, moc);
}

async function loadLinkedCotMocsFromCotMocJunction(
  admin: ReturnType<typeof createServiceRoleClient>,
  entityId: string,
  byId: Map<string, EntityCotMocRow>,
): Promise<void> {
  const { data: links } = await admin
    .from("article_gan_cot_moc")
    .select(
      "content_cot_moc:content_cot_moc!inner(id, id_nguoi_dung, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_to_chuc)",
    )
    .eq("id_bai_viet", entityId);

  for (const link of links ?? []) {
    collectVisibleCotMoc(
      byId,
      (link as { content_cot_moc?: unknown }).content_cot_moc,
    );
  }
}

/** Fallback — tag gắn qua `article_gan_tac_pham` chưa sync sang `article_gan_cot_moc`. */
async function loadLinkedCotMocsFromTacPhamJunction(
  admin: ReturnType<typeof createServiceRoleClient>,
  entityId: string,
  byId: Map<string, EntityCotMocRow>,
): Promise<void> {
  const { data: links } = await admin
    .from("article_gan_tac_pham")
    .select(
      "content_tac_pham:content_tac_pham!inner(content_tac_pham_thuoc_moc ( content_cot_moc:content_cot_moc!inner ( id, id_nguoi_dung, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_to_chuc )))",
    )
    .eq("id_bai_viet", entityId);

  for (const link of links ?? []) {
    const tp = unwrapJoinRow(
      (link as { content_tac_pham?: unknown }).content_tac_pham,
    ) as { content_tac_pham_thuoc_moc?: unknown } | null;
    const thuocList = tp?.content_tac_pham_thuoc_moc;
    const thuocRows = Array.isArray(thuocList)
      ? thuocList
      : thuocList
        ? [thuocList]
        : [];
    for (const thuoc of thuocRows) {
      collectVisibleCotMoc(
        byId,
        (thuoc as { content_cot_moc?: unknown }).content_cot_moc,
      );
    }
  }
}

async function loadLinkedCotMocs(
  admin: ReturnType<typeof createServiceRoleClient>,
  entityId: string,
): Promise<EntityCotMocRow[]> {
  const byId = new Map<string, EntityCotMocRow>();
  await Promise.all([
    loadLinkedCotMocsFromCotMocJunction(admin, entityId, byId),
    loadLinkedCotMocsFromTacPhamJunction(admin, entityId, byId),
  ]);
  return [...byId.values()];
}

function sortCotMocs(
  rows: EntityCotMocRow[],
  sort: TagAggSort,
  reactionByMoc: Map<string, number>,
): EntityCotMocRow[] {
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

function enrichMilestoneLensOwners(
  milestones: MilestoneItem[],
  ownerById: Map<string, OwnerRow>,
  mocOwnerById: Map<string, string>,
): MilestoneItem[] {
  return milestones.map((m) => {
    const ownerId = mocOwnerById.get(m.cotMocId ?? m.id);
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

export async function fetchEntityMilestones(
  entityId: string,
  sort: TagAggSort,
  viewerId: string | null,
): Promise<MilestoneItem[]> {
  const admin = createServiceRoleClient();
  const cotMocs = await loadLinkedCotMocs(admin, entityId);
  if (cotMocs.length === 0) return [];

  const mocIds = cotMocs.map((m) => m.id);
  const reactionByMoc = await reactionCountsForMilestones(admin, mocIds);
  const sorted = sortCotMocs(cotMocs, sort, reactionByMoc);

  const ownerIds = [...new Set(cotMocs.map((m) => m.id_nguoi_dung).filter(Boolean))];
  const { data: owners } = ownerIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
        .in("id", ownerIds)
    : { data: [] };

  const ownerById = new Map(
    (owners ?? []).map((o) => [o.id as string, o as OwnerRow]),
  );
  const mocOwnerById = new Map(
    cotMocs.map((m) => [m.id, m.id_nguoi_dung]),
  );

  const built = await buildSelfMilestonesForCotMocs(admin, sorted);
  const withSocial = await attachSocialState(admin, built, viewerId);
  return enrichMilestoneLensOwners(withSocial, ownerById, mocOwnerById);
}

export async function fetchEntityTaggedUsers(
  entityId: string,
): Promise<TagAggUser[]> {
  const admin = createServiceRoleClient();
  const cotMocs = await loadLinkedCotMocs(admin, entityId);
  const ownerIds = [...new Set(cotMocs.map((m) => m.id_nguoi_dung).filter(Boolean))];
  if (ownerIds.length === 0) return [];

  const { data: owners } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, giai_doan")
    .in("id", ownerIds);

  return (owners ?? [])
    .map((u) => ({
      id: u.id as string,
      slug: u.slug as string,
      tenHienThi: (u.ten_hien_thi as string | null)?.trim() || (u.slug as string),
      avatarId: (u.avatar_id as string | null) ?? null,
      ngheChinh: u.giai_doan
        ? getGiaiDoanLabel(u.giai_doan as GiaiDoan)
        : null,
    }))
    .sort((a, b) => a.tenHienThi.localeCompare(b.tenHienThi, "vi"));
}
