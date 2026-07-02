import "server-only";

import { cache } from "react";

import type { FollowedOrgUpcomingItem } from "@/lib/cins/home-adaptive/followed-org-upcoming";
import { listFollowingOrgIds } from "@/lib/cins/worldJourneyOrgFeed";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import {
  loadUserSuKienPhanHoiMap,
  type LoaiPhanHoiSuKien,
} from "@/lib/to-chuc/su-kien-dang-ky";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import { truongRootPath } from "@/lib/truong/truong-routes";

export type SidebarUpcomingEventsBundle = {
  items: SidebarUpcomingEvent[];
  /** Số sự kiện sắp diễn ra mà viewer quan tâm hoặc sẽ tham gia. */
  myEventsTotal: number;
};

export function sidebarSuKienId(item: SidebarUpcomingEvent): string {
  return item.id.replace(/^sk:/, "");
}

export function sidebarEventHref(item: SidebarUpcomingEvent): string {
  if (item.phanHoi) {
    return `/su-kien?tab=cua-ban&suKien=${encodeURIComponent(sidebarSuKienId(item))}`;
  }
  return item.href;
}

export type SidebarUpcomingEvent = FollowedOrgUpcomingItem & {
  kind: "su_kien";
  phanHoi: LoaiPhanHoiSuKien | null;
  coverSrc: string | null;
  orgAvatarUrl: string | null;
  batDauIso: string;
  ketThucIso: string | null;
};

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type SuKienRow = {
  id: string;
  ten: string;
  loai_su_kien: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  cover_id: string | null;
  id_to_chuc: string;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

function pickOrg(org: SuKienRow["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

function orgSuKienHref(loai: string, slug: string): string {
  if (loai === "co_so_dao_tao") return coSoTabPath(slug, "su-kien");
  if (loai === "cong_dong") return `/cong-dong/${slug}`;
  if (loai === "studio" || loai === "doanh_nghiep") return `/studio/${slug}`;
  return truongRootPath(slug);
}

function eventSortKey(batDau: string): number {
  const t = new Date(batDau).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function priorityRank(
  phanHoi: LoaiPhanHoiSuKien | null,
  fromFollowedOrg: boolean,
): number {
  if (phanHoi === "se_tham_gia") return 0;
  if (phanHoi === "quan_tam") return 1;
  if (fromFollowedOrg) return 2;
  return 3;
}

function mapSuKienRow(
  row: SuKienRow,
  phanHoi: LoaiPhanHoiSuKien | null,
): SidebarUpcomingEvent | null {
  const org = pickOrg(row.org_to_chuc);
  if (!org?.slug?.trim() || !org.ten?.trim()) return null;

  const status = getStepStatus(row.bat_dau, row.ket_thuc);
  if (status === "done") return null;

  const startLabel = formatTimelineDate(row.bat_dau) ?? "";
  const endLabel = row.ket_thuc ? formatTimelineDate(row.ket_thuc) : null;
  let dateLabel =
    endLabel && endLabel !== startLabel
      ? `${startLabel} – ${endLabel}`
      : startLabel;
  if (status === "active") dateLabel = `${dateLabel} · Đang diễn ra`;

  const orgLoai = org.loai_to_chuc?.trim() ?? "co_so_dao_tao";
  const orgSlug = org.slug.trim();
  const orgAvatarId = org.avatar_id ?? org.logo_id;

  return {
    id: `sk:${row.id}`,
    kind: "su_kien",
    orgId: row.id_to_chuc,
    orgSlug,
    orgName: org.ten.trim(),
    orgLoai,
    href: orgSuKienHref(orgLoai, orgSlug),
    label: row.ten?.trim() || "Sự kiện",
    dateLabel,
    subLabel: labelLoaiSuKien(row.loai_su_kien),
    status: status === "active" ? "active" : "upcoming",
    sortKey: eventSortKey(row.bat_dau),
    phanHoi,
    coverSrc: row.cover_id
      ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
      : null,
    orgAvatarUrl: orgAvatarId
      ? resolveTruongImageSrcSync(orgAvatarId, ["public", "avatar"])
      : null,
    batDauIso: row.bat_dau,
    ketThucIso: row.ket_thuc,
  };
}

async function fetchUpcomingSuKienRows(
  options: {
    suKienIds?: string[];
    orgIds?: string[];
    loaiFilter: string[];
    limit: number;
    excludeIds: Set<string>;
  },
): Promise<SuKienRow[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  let query = admin
    .from("org_su_kien")
    .select(
      "id, ten, loai_su_kien, bat_dau, ket_thuc, cover_id, id_to_chuc, org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )",
    )
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: true })
    .limit(options.limit + options.excludeIds.size + 6);

  if (options.suKienIds?.length) {
    query = query.in("id", options.suKienIds);
  } else if (options.orgIds?.length) {
    query = query.in("id_to_chuc", options.orgIds);
  }

  if (options.loaiFilter.length > 0) {
    query = query.in("loai_su_kien", options.loaiFilter);
  }

  const { data } = await query.returns<SuKienRow[]>();
  const out: SuKienRow[] = [];
  for (const row of data ?? []) {
    if (options.excludeIds.has(row.id)) continue;
    out.push(row);
    if (out.length >= options.limit) break;
  }
  return out;
}

function sortSidebarEvents(
  pool: SidebarUpcomingEvent[],
  followedSet: Set<string>,
): SidebarUpcomingEvent[] {
  return [...pool].sort((a, b) => {
    const rankA = priorityRank(a.phanHoi, followedSet.has(a.orgId));
    const rankB = priorityRank(b.phanHoi, followedSet.has(b.orgId));
    if (rankA !== rankB) return rankA - rankB;
    const liveOrder =
      (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1);
    if (liveOrder !== 0) return liveOrder;
    return a.sortKey - b.sortKey;
  });
}

/**
 * Sidebar trang chủ — tối đa `limit` sự kiện (mặc định 3).
 * Ưu tiên sự kiện viewer quan tâm / sẽ tham gia; sau đó org theo dõi → gợi ý.
 */
export const loadSidebarUpcomingEvents = cache(
  async function loadSidebarUpcomingEvents(
    viewerId: string,
    loaiSuKienFilter: string[] = [],
    limit = 3,
  ): Promise<SidebarUpcomingEventsBundle> {
    const [followedOrgIds, phanHoiBySuKien] = await Promise.all([
      listFollowingOrgIds(viewerId),
      loadUserSuKienPhanHoiMap(viewerId),
    ]);

    const followedSet = new Set(followedOrgIds);
    const registeredIds = [...phanHoiBySuKien.keys()];
    const seenIds = new Set<string>();
    const myPool: SidebarUpcomingEvent[] = [];

    if (registeredIds.length > 0) {
      const registeredRows = await fetchUpcomingSuKienRows({
        suKienIds: registeredIds,
        loaiFilter: [],
        limit: registeredIds.length,
        excludeIds: seenIds,
      });
      for (const row of registeredRows) {
        seenIds.add(row.id);
        const item = mapSuKienRow(row, phanHoiBySuKien.get(row.id) ?? null);
        if (item?.phanHoi) myPool.push(item);
      }
    }

    const myEventsTotal = myPool.length;
    if (myEventsTotal > 0) {
      return {
        items: sortSidebarEvents(myPool, followedSet).slice(0, limit),
        myEventsTotal,
      };
    }

    const pool: SidebarUpcomingEvent[] = [];
    const followedOnlyIds = followedOrgIds.filter((id) => id);
    if (followedOnlyIds.length > 0) {
      const followedRows = await fetchUpcomingSuKienRows({
        orgIds: followedOnlyIds,
        loaiFilter: loaiSuKienFilter,
        limit: 8,
        excludeIds: seenIds,
      });
      for (const row of followedRows) {
        seenIds.add(row.id);
        const item = mapSuKienRow(row, phanHoiBySuKien.get(row.id) ?? null);
        if (item) pool.push(item);
      }
    }

    if (pool.length < limit) {
      const globalRows = await fetchUpcomingSuKienRows({
        loaiFilter: loaiSuKienFilter,
        limit: 8,
        excludeIds: seenIds,
      });
      for (const row of globalRows) {
        seenIds.add(row.id);
        const item = mapSuKienRow(row, phanHoiBySuKien.get(row.id) ?? null);
        if (item) pool.push(item);
      }
    }

    return {
      items: sortSidebarEvents(pool, followedSet).slice(0, limit),
      myEventsTotal: 0,
    };
  },
);
