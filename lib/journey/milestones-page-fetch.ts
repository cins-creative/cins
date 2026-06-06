import "server-only";

import { cache } from "react";

import type {
  MilestoneItem,
  MilestoneType,
  MilestoneVariant,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import {
  attachSocialState,
  buildSelfMilestonesForCotMocs,
  fetchBookmarkedMilestonesForUser,
  fetchTaggedMilestonesForUser,
} from "@/lib/journey/milestones-fetch";
import { loadVerifiedCotMocIdSet } from "@/lib/journey/milestone-verify";
import {
  isForeignMilestoneVisibleToViewer,
  isSelfMilestoneVisibleToViewer,
  loadMilestoneViewerAccess,
  type MilestoneViewerAccess,
} from "@/lib/journey/milestone-viewer-access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Số cột mốc hydrate mỗi lần user cuộn tới cuối timeline. */
export const MILESTONE_SCROLL_PAGE_SIZE = 20;

export type MilestoneFilterCounts = {
  all: number;
  hoc: number;
  lam: number;
  "du-an": number;
  "su-kien": number;
  "thanh-tuu": number;
  "ca-nhan": number;
  bookmark: number;
  verified: number;
};

export type MilestoneTimelinePageResult = {
  milestones: MilestoneItem[];
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalCount: number;
  filterCounts: MilestoneFilterCounts;
};

type TimelineStub = {
  id: string;
  source: "self" | "tagged" | "bookmark";
  cotMocId: string;
  visibility: MilestoneVisibility;
  variant: MilestoneVariant;
  type: MilestoneType;
  thoiDiem: string;
  taoLuc: string | null;
  year: number;
  month: number;
  day: number;
};

type CotMocStubRow = {
  id: string;
  id_nguoi_dung?: string;
  loai_moc:
    | "hoc"
    | "lam_viec"
    | "du_an"
    | "su_kien"
    | "thanh_tuu"
    | "ca_nhan";
  thoi_diem: string;
  tao_luc: string | null;
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
};

const LOAI_MOC_TO_TYPE: Record<CotMocStubRow["loai_moc"], MilestoneType> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

function mapVisibility(
  v: CotMocStubRow["che_do_hien_thi"],
): MilestoneVisibility {
  if (v === "feature") return "feature";
  if (v === "chi_minh") return "private";
  if (v === "theo_nhom") return "unlisted";
  return "public";
}

function parseUtcDateParts(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const dateObj = new Date(iso);
  return {
    year: dateObj.getUTCFullYear(),
    month: dateObj.getUTCMonth() + 1,
    day: dateObj.getUTCDate(),
  };
}

function compareTimelineStubs(a: TimelineStub, b: TimelineStub): number {
  const aFeat = a.visibility === "feature" ? 1 : 0;
  const bFeat = b.visibility === "feature" ? 1 : 0;
  if (aFeat !== bFeat) return bFeat - aFeat;

  const aDate = new Date(
    `${a.year}-${String(a.month).padStart(2, "0")}-${String(a.day).padStart(2, "0")}`,
  ).getTime();
  const bDate = new Date(
    `${b.year}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`,
  ).getTime();
  if (aDate !== bDate) return bDate - aDate;

  const aCreated = a.taoLuc ? Date.parse(a.taoLuc) : 0;
  const bCreated = b.taoLuc ? Date.parse(b.taoLuc) : 0;
  return bCreated - aCreated;
}

function computeFilterCounts(stubs: TimelineStub[]): MilestoneFilterCounts {
  const counts: MilestoneFilterCounts = {
    all: stubs.length,
    hoc: 0,
    lam: 0,
    "du-an": 0,
    "su-kien": 0,
    "thanh-tuu": 0,
    "ca-nhan": 0,
    bookmark: 0,
    verified: 0,
  };
  for (const stub of stubs) {
    if (stub.type === "hoc") counts.hoc += 1;
    else if (stub.type === "lam") counts.lam += 1;
    else if (stub.type === "du-an") counts["du-an"] += 1;
    else if (stub.type === "su-kien") counts["su-kien"] += 1;
    else if (stub.type === "thanh-tuu") counts["thanh-tuu"] += 1;
    else if (stub.type === "ca-nhan") counts["ca-nhan"] += 1;
    if (stub.variant === "bookmark") counts.bookmark += 1;
    if (stub.variant === "verified") counts.verified += 1;
  }
  return counts;
}

async function collectSelfStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  isOwner: boolean,
  access: MilestoneViewerAccess,
): Promise<TimelineStub[]> {
  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select("id, loai_moc, thoi_diem, tao_luc, che_do_hien_thi")
    .eq("id_nguoi_dung", userId)
    .order("thoi_diem", { ascending: false })
    .order("tao_luc", { ascending: false, nullsFirst: false })
    .returns<CotMocStubRow[]>();

  const visible = (cotMocs ?? []).filter((m) =>
    isSelfMilestoneVisibleToViewer({
      loaiMoc: LOAI_MOC_TO_TYPE[m.loai_moc],
      cheDoHienThi: m.che_do_hien_thi,
      isOwner,
      filterVisibility: access.filterVisibility,
      viewerIsFriend: access.viewerIsFriend,
    }),
  );

  const verifiedIds = await loadVerifiedCotMocIdSet(visible.map((m) => m.id));

  return visible.map((m) => {
    const { year, month, day } = parseUtcDateParts(m.thoi_diem);
    return {
      id: m.id,
      source: "self" as const,
      cotMocId: m.id,
      visibility: mapVisibility(m.che_do_hien_thi),
      variant: (verifiedIds.has(m.id) ? "verified" : "self") as MilestoneVariant,
      type: LOAI_MOC_TO_TYPE[m.loai_moc],
      thoiDiem: m.thoi_diem,
      taoLuc: m.tao_luc,
      year,
      month,
      day,
    };
  });
}

async function collectTaggedStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  isOwner: boolean,
  access: MilestoneViewerAccess,
): Promise<TimelineStub[]> {
  const { data: tagRows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham")
    .eq("id_nguoi_dung", userId)
    .in("trang_thai", isOwner ? ["accepted", "pending"] : ["accepted"])
    .eq("la_chu_so_huu", false);

  if (!tagRows?.length) return [];

  const tacPhamIds = tagRows.map((r) => r.id_tac_pham as string);
  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select("id, slug")
    .in("id", tacPhamIds);

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham, id_cot_moc")
    .in("id_tac_pham", tacPhamIds)
    .order("thu_tu", { ascending: true });

  const cotMocIdByTp = new Map<string, string>();
  for (const link of links ?? []) {
    const tpId = link.id_tac_pham as string;
    if (!cotMocIdByTp.has(tpId)) {
      cotMocIdByTp.set(tpId, link.id_cot_moc as string);
    }
  }

  const cotMocIds = [...new Set(cotMocIdByTp.values())];
  if (cotMocIds.length === 0) return [];

  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select("id, loai_moc, thoi_diem, tao_luc, che_do_hien_thi")
    .in("id", cotMocIds)
    .returns<CotMocStubRow[]>();

  const cmById = new Map((cotMocs ?? []).map((cm) => [cm.id, cm]));
  const stubs: TimelineStub[] = [];

  for (const tp of tacPhams ?? []) {
    if (!tp.slug) continue;
    const cmId = cotMocIdByTp.get(tp.id as string);
    const cm = cmId ? cmById.get(cmId) : undefined;
    if (!cm) continue;
    if (
      !isForeignMilestoneVisibleToViewer(cm.che_do_hien_thi, {
        isOwner,
        viewerIsFriend: access.viewerIsFriend,
      })
    ) {
      continue;
    }
    const { year, month, day } = parseUtcDateParts(cm.thoi_diem);
    stubs.push({
      id: `${cm.id}:${tp.id as string}`,
      source: "tagged",
      cotMocId: cm.id,
      visibility: mapVisibility(cm.che_do_hien_thi),
      variant: "tagged",
      type: LOAI_MOC_TO_TYPE[cm.loai_moc],
      thoiDiem: cm.thoi_diem,
      taoLuc: cm.tao_luc,
      year,
      month,
      day,
    });
  }

  return stubs;
}

async function collectBookmarkStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  isOwner: boolean,
  access: MilestoneViewerAccess,
): Promise<TimelineStub[]> {
  const { data: savedRows } = await admin
    .from("social_luu")
    .select("id_doi_tuong")
    .eq("id_nguoi_dung", userId)
    .eq("loai_doi_tuong", "cot_moc");

  const cotMocIds = [
    ...new Set(
      (savedRows ?? [])
        .map((row) => row.id_doi_tuong as string)
        .filter(Boolean),
    ),
  ];
  if (cotMocIds.length === 0) return [];

  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select("id, loai_moc, thoi_diem, tao_luc, che_do_hien_thi, id_nguoi_dung")
    .in("id", cotMocIds)
    .returns<CotMocStubRow[]>();

  const visible = (cotMocs ?? []).filter((m) => {
    if (m.id_nguoi_dung === userId) return false;
    return isForeignMilestoneVisibleToViewer(m.che_do_hien_thi, {
      isOwner,
      viewerIsFriend: access.viewerIsFriend,
    });
  });
  if (visible.length === 0) return [];

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, id_tac_pham, content_tac_pham:content_tac_pham!inner(id, slug)",
    )
    .in(
      "id_cot_moc",
      visible.map((cm) => cm.id),
    )
    .order("thu_tu", { ascending: true });

  const firstTpByMoc = new Map<string, string>();
  for (const link of links ?? []) {
    const mocId = link.id_cot_moc as string;
    const tp = link.content_tac_pham as { id?: string; slug?: string | null } | null;
    if (!firstTpByMoc.has(mocId) && tp?.id && tp.slug) {
      firstTpByMoc.set(mocId, tp.id);
    }
  }

  const stubs: TimelineStub[] = [];
  for (const cm of visible) {
    const tpId = firstTpByMoc.get(cm.id);
    if (!tpId) continue;
    const { year, month, day } = parseUtcDateParts(cm.thoi_diem);
    stubs.push({
      id: `bookmark:${cm.id}:${tpId}`,
      source: "bookmark",
      cotMocId: cm.id,
      visibility: mapVisibility(cm.che_do_hien_thi),
      variant: "bookmark",
      type: LOAI_MOC_TO_TYPE[cm.loai_moc],
      thoiDiem: cm.thoi_diem,
      taoLuc: cm.tao_luc,
      year,
      month,
      day,
    });
  }

  return stubs;
}

async function collectTimelineStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  isOwner: boolean,
  access: MilestoneViewerAccess,
): Promise<TimelineStub[]> {
  const [self, tagged, bookmarks] = await Promise.all([
    collectSelfStubs(admin, userId, isOwner, access),
    collectTaggedStubs(admin, userId, isOwner, access),
    collectBookmarkStubs(admin, userId, isOwner, access),
  ]);

  const selfCotMocIds = new Set(self.map((s) => s.cotMocId));
  const taggedExtra = tagged.filter((s) => !selfCotMocIds.has(s.cotMocId));
  const seenCotMocIds = new Set([
    ...selfCotMocIds,
    ...taggedExtra.map((s) => s.cotMocId),
  ]);
  const bookmarkExtra = bookmarks.filter((s) => !seenCotMocIds.has(s.cotMocId));

  const merged = [...self, ...taggedExtra, ...bookmarkExtra];
  merged.sort(compareTimelineStubs);
  return merged;
}

const getTimelineStubsCached = cache(
  async (
    userId: string,
    isOwner: boolean,
    viewerId: string | null,
  ): Promise<TimelineStub[]> => {
    const admin = createServiceRoleClient();
    const access = await loadMilestoneViewerAccess(userId, {
      isOwner,
      viewerId,
    });
    return collectTimelineStubs(admin, userId, isOwner, access);
  },
);

type CotMocFullRow = {
  id: string;
  loai_moc: CotMocStubRow["loai_moc"];
  nguon_goc: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  che_do_hien_thi: CotMocStubRow["che_do_hien_thi"];
  tao_luc: string | null;
};

async function hydrateTimelineStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  stubs: TimelineStub[],
  params: { userId: string; isOwner: boolean },
): Promise<MilestoneItem[]> {
  if (stubs.length === 0) return [];

  const wantedIds = new Set(stubs.map((s) => s.id));
  const selfCotMocIds = [
    ...new Set(stubs.filter((s) => s.source === "self").map((s) => s.cotMocId)),
  ];

  const needsTagged = stubs.some((s) => s.source === "tagged");
  const needsBookmark = stubs.some((s) => s.source === "bookmark");

  const [selfRowsRes, taggedItems, bookmarkItems] = await Promise.all([
    selfCotMocIds.length > 0
      ? admin
          .from("content_cot_moc")
          .select(
            "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_to_chuc",
          )
          .in("id", selfCotMocIds)
          .returns<CotMocFullRow[]>()
      : Promise.resolve({ data: [] as CotMocFullRow[] }),
    needsTagged
      ? fetchTaggedMilestonesForUser({
          userId: params.userId,
          isOwner: params.isOwner,
          admin,
        })
      : Promise.resolve([] as MilestoneItem[]),
    needsBookmark
      ? fetchBookmarkedMilestonesForUser({
          userId: params.userId,
          isOwner: params.isOwner,
          admin,
        })
      : Promise.resolve([] as MilestoneItem[]),
  ]);

  const selfBuilt =
    selfCotMocIds.length > 0 && selfRowsRes.data?.length
      ? await buildSelfMilestonesForCotMocs(admin, selfRowsRes.data)
      : [];

  const byId = new Map<string, MilestoneItem>();
  for (const item of [...selfBuilt, ...taggedItems, ...bookmarkItems]) {
    if (wantedIds.has(item.id)) byId.set(item.id, item);
  }

  return stubs
    .map((stub) => byId.get(stub.id))
    .filter((item): item is MilestoneItem => item !== undefined);
}

export async function fetchMilestoneTimelinePage(params: {
  userId: string;
  isOwner: boolean;
  viewerId?: string | null;
  offset?: number;
  limit?: number;
}): Promise<MilestoneTimelinePageResult> {
  const { userId, isOwner, viewerId = null } = params;
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(
    50,
    Math.max(1, params.limit ?? MILESTONE_SCROLL_PAGE_SIZE),
  );

  const admin = createServiceRoleClient();
  const stubs = await getTimelineStubsCached(userId, isOwner, viewerId);
  const filterCounts = computeFilterCounts(stubs);
  const slice = stubs.slice(offset, offset + limit);

  const hydrated = await hydrateTimelineStubs(admin, slice, {
    userId,
    isOwner,
  });
  const milestones = await attachSocialState(
    admin,
    hydrated,
    viewerId,
    isOwner,
  );

  const nextOffset = offset + milestones.length;
  return {
    milestones,
    offset,
    nextOffset,
    hasMore: nextOffset < stubs.length,
    totalCount: stubs.length,
    filterCounts,
  };
}

/** Stats nhẹ cho sidebar nav — không hydrate toàn bộ timeline. */
export async function fetchMilestoneNavStats(params: {
  userId: string;
  isOwner: boolean;
  viewerId?: string | null;
}): Promise<{
  stats: {
    cotMoc: number;
    cotMocVerified: number;
    tacPham: number;
    noiBat: number;
  };
  totalCount: number;
}> {
  const admin = createServiceRoleClient();
  const [{ count: totalTacPham }, stubs] = await Promise.all([
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", params.userId),
    getTimelineStubsCached(
      params.userId,
      params.isOwner,
      params.viewerId ?? null,
    ),
  ]);

  const selfCount = stubs.filter((s) => s.source === "self").length;
  const featureCount = stubs.filter((s) => s.visibility === "feature").length;
  const verifiedCount = stubs.filter((s) => s.variant === "verified").length;

  return {
    stats: {
      cotMoc: selfCount,
      cotMocVerified: verifiedCount,
      tacPham: totalTacPham ?? 0,
      noiBat: featureCount,
    },
    totalCount: stubs.length,
  };
}
