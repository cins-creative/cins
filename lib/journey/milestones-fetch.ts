import "server-only";

import type {
  MilestoneCardLayout,
  MilestoneItem,
  MilestoneMediaItem,
  MilestoneType,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import type { Block as ServerBlock } from "@/lib/editor/types";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { loadCoAuthorCredits } from "@/lib/journey/coauthor-credits";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { loadVerifiedMetaForCotMocs, type VerifiedMilestoneMeta } from "@/lib/journey/milestone-verify";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  isHiddenOnForeignJourney,
  mapForeignJourneyVisibilityToUi,
} from "@/lib/journey/foreign-milestone-visibility";
import { loadPersonalFiltersForCotMocs } from "@/lib/filter/gan";
import { loadCongDongOrgsForMilestones } from "@/lib/journey/cong-dong-milestone-org";
import {
  dedupeMembershipCotMocs,
  loadMembershipMilestoneContextForCotMocs,
} from "@/lib/journey/membership-milestone";
import {
  CHE_DO_MOC_CONG_DONG,
  isMilestoneVisibleOnPublicJourney,
  mapCheDoToMilestoneVisibility,
} from "@/lib/journey/journey-visible-clause";
import {
  compareTimelineOrder,
  resolveTaggedTimelineSortAt,
} from "@/lib/journey/timeline-sort";
import {
  isBookmarkHiddenOnViewerJourney,
  mapCheDoLuuToForeignJourney,
} from "@/lib/journey/bookmark-visibility";
import { fetchBookmarkedOrgBaiDangMilestones } from "@/lib/truong/org-bai-dang-bookmark";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Fetch milestones cho 1 user (Journey center column).             ║
   ║                                                                  ║
   ║ Source: `content_cot_moc` của user, kèm các tác phẩm gắn vào     ║
   ║ qua `content_tac_pham_thuoc_moc → content_tac_pham`. Adapter map ║
   ║ về `MilestoneItem` (component-level type).                       ║
   ║                                                                  ║
   ║ Visibility visitor: xem `milestone-viewer-access.ts` (che_do_hien_thi   ║
   ║ từng cột mốc). Dropdown loại: `journey_loai_moc_visibility`.          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type CotMocRow = {
  id: string;
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
  thoi_diem: string; // YYYY-MM-DD
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature" | "cong_dong";
  /** Thời điểm tạo record (timestamptz) — tiebreak khi cùng `thoi_diem`. */
  tao_luc: string | null;
  id_nguoi_dung?: string;
  id_to_chuc?: string | null;
};

type ThuocMocRow = {
  id_cot_moc: string;
  id_tac_pham: string;
  thu_tu: number;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
    cover_id: string | null;
    loai_tac_pham: string;
    noi_dung_blocks: unknown;
  } | null;
};

type BookmarkRow = {
  id_doi_tuong: string;
  loai_doi_tuong: string;
  tao_luc: string | null;
  che_do_hien_thi?: string | null;
};

type BookmarkLinkRow = {
  id_cot_moc: string;
  id_tac_pham: string;
  thu_tu: number;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
    cover_id: string | null;
    loai_tac_pham: string;
    noi_dung_blocks: unknown;
    id_nguoi_dung: string;
  } | null;
};

const LOAI_MOC_TO_TYPE: Record<CotMocRow["loai_moc"], MilestoneType> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

function resolveOrgCreateCardLayout(
  verified: VerifiedMilestoneMeta | undefined,
  nguonGoc: string | null | undefined,
): MilestoneCardLayout {
  if (!verified?.attribution || nguonGoc !== "sinh_tu_org_assign") return "default";
  if (
    verified.attribution.orgKind === "cong_dong" &&
    verified.attribution.role === "Người tạo cộng đồng"
  ) {
    return "cong-dong-create";
  }
  if (
    verified.attribution.orgKind === "co_so_dao_tao" &&
    verified.attribution.role === "Người tạo cơ sở đào tạo"
  ) {
    return "co-so-create";
  }
  return "default";
}

function milestoneCoverMedia(
  coverId: string | null | undefined,
  blocks: unknown,
  label: string,
): MilestoneMediaItem[] {
  return milestonePreviewMedia(coverId, parseServerBlocks(blocks), label);
}

export async function buildSelfMilestonesForCotMocs(
  admin: ReturnType<typeof createServiceRoleClient>,
  cotMocs: CotMocRow[],
): Promise<MilestoneItem[]> {
  if (cotMocs.length === 0) return [];

  const ids = cotMocs.map((m) => m.id);
  const { data: thuocMocRows } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, id_tac_pham, thu_tu, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, loai_tac_pham, noi_dung_blocks)",
    )
    .in("id_cot_moc", ids)
    .order("thu_tu", { ascending: true })
    .returns<ThuocMocRow[]>();

  const thuocMocs = thuocMocRows ?? [];
  const tpByMoc = new Map<string, ThuocMocRow[]>();
  for (const t of thuocMocs) {
    const arr = tpByMoc.get(t.id_cot_moc) || [];
    arr.push(t);
    tpByMoc.set(t.id_cot_moc, arr);
  }

  const firstPostIds: string[] = [];
  for (const arr of tpByMoc.values()) {
    const first = arr[0]?.content_tac_pham;
    if (first?.id) firstPostIds.push(first.id);
  }
  const tagsByTacPham = await fetchArticleTagsForTacPham(admin, firstPostIds);
  const creditsByTacPham = await loadCoAuthorCredits(admin, firstPostIds);
  const orgByCotMoc = new Map(cotMocs.map((m) => [m.id, m.id_to_chuc ?? null]));
  const verifiedMeta = await loadVerifiedMetaForCotMocs(ids, orgByCotMoc);

  const congDongOrgIds = cotMocs
    .filter((m) => m.che_do_hien_thi === CHE_DO_MOC_CONG_DONG && m.id_to_chuc)
    .map((m) => m.id_to_chuc as string);

  const [personalFiltersByMoc, congDongOrgs, membershipContextByMoc] = await Promise.all([
    loadPersonalFiltersForCotMocs(ids),
    loadCongDongOrgsForMilestones(congDongOrgIds),
    loadMembershipMilestoneContextForCotMocs(admin, ids),
  ]);

  const cotMocsForCards = dedupeMembershipCotMocs(cotMocs, membershipContextByMoc);

  const sorted = [...cotMocsForCards].sort((a, b) => {
    const aFeat = a.che_do_hien_thi === "feature" ? 1 : 0;
    const bFeat = b.che_do_hien_thi === "feature" ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    return 0;
  });

  return sorted.map((m) => {
    const tps = tpByMoc.get(m.id) || [];
    const dateObj = new Date(m.thoi_diem);
    let year = dateObj.getUTCFullYear();
    let month = dateObj.getUTCMonth() + 1;
    let day = dateObj.getUTCDate();
    let createdAt: string | null = m.tao_luc;
    const firstPost = tps[0]?.content_tac_pham ?? null;
    const firstPostSlug = firstPost?.slug ?? null;
    const noiDungBlocks = parseServerBlocks(firstPost?.noi_dung_blocks);
    const articleTags = firstPost?.id
      ? (tagsByTacPham.get(firstPost.id) ?? [])
      : [];
    const verified = verifiedMeta.get(m.id);
    const membershipCtx = membershipContextByMoc.get(m.id);
    const membershipPending = membershipCtx?.pending ?? null;
    const isApprovedMembership = membershipCtx?.approved ?? false;
    let cardLayout = resolveOrgCreateCardLayout(verified, m.nguon_goc);
    if (membershipPending) {
      cardLayout = "identity-pending";
    } else if (
      isApprovedMembership &&
      verified &&
      !firstPost?.id &&
      verified.attribution?.isOrg
    ) {
      cardLayout = "identity-verified";
    } else if (
      verified &&
      !firstPost?.id &&
      verified.attribution?.isOrg &&
      verified.attribution.role === "Xác nhận bởi tổ chức"
    ) {
      cardLayout = "identity-verified";
    }
    const isOrgCreateCard =
      cardLayout !== "default" &&
      cardLayout !== "identity-pending" &&
      cardLayout !== "identity-verified";
    const isIdentityPending = cardLayout === "identity-pending";
    const isIdentityVerified = cardLayout === "identity-verified";
    const isIdentityCard = isIdentityPending || isIdentityVerified;

    if (isIdentityCard && membershipCtx?.submittedAt) {
      const submitted = new Date(membershipCtx.submittedAt);
      year = submitted.getUTCFullYear();
      month = submitted.getUTCMonth() + 1;
      day = submitted.getUTCDate();
      createdAt = membershipCtx.submittedAt;
    }

    const personalFilters = personalFiltersByMoc.get(m.id) ?? [];
    const pendingAttribution = membershipPending
      ? {
          name: membershipPending.orgTen,
          avatarUrl: membershipPending.orgAvatarUrl,
          initial: membershipPending.orgTen.charAt(0) || "?",
          isOrg: true,
          orgKind:
            membershipPending.orgLoai === "co_so_dao_tao"
              ? ("co_so_dao_tao" as const)
              : membershipPending.orgLoai === "truong_dai_hoc"
                ? ("truong" as const)
                : null,
          href: membershipPending.orgHref,
        }
      : null;

    return {
      id: m.id,
      cotMocId: m.id,
      variant: (verified ? "verified" : "self") as MilestoneVariant,
      type: LOAI_MOC_TO_TYPE[m.loai_moc],
      visibility: mapCheDoToMilestoneVisibility(m.che_do_hien_thi),
      congDongOrg:
        m.che_do_hien_thi === CHE_DO_MOC_CONG_DONG && m.id_to_chuc
          ? (congDongOrgs.get(m.id_to_chuc) ?? null)
          : null,
      personalFilterSlugs: personalFilters.map((f) => f.slug),
      personalFilters,
      year,
      month,
      day,
      createdAt,
      title: isIdentityCard ? m.tieu_de : (firstPost?.tieu_de ?? m.tieu_de),
      body: isIdentityPending ? m.mo_ta || "Chờ xác thực" : m.mo_ta || null,
      org: verified?.attribution.role ?? pendingAttribution?.name ?? null,
      postSlug: isOrgCreateCard || isIdentityCard ? null : firstPostSlug,
      tacPhamId: isOrgCreateCard || isIdentityCard ? null : (firstPost?.id ?? null),
      attribution: verified?.attribution ?? pendingAttribution,
      verifiedBy: verified?.verifiedBy ?? null,
      cardLayout,
      membershipPending,
      orgHref: isOrgCreateCard
        ? (verified?.orgHref ?? null)
        : isIdentityPending
          ? (membershipPending?.orgHref ?? null)
          : isIdentityVerified
            ? (verified?.orgHref ?? null)
            : null,
      media: isOrgCreateCard || isIdentityCard
        ? []
        : milestoneCoverMedia(
            firstPost?.cover_id,
            firstPost?.noi_dung_blocks,
            firstPost?.tieu_de ?? m.tieu_de,
          ),
      noiDungBlocks: isOrgCreateCard || isIdentityCard ? null : noiDungBlocks,
      articleTags: isOrgCreateCard || isIdentityCard ? [] : articleTags,
      coAuthorCredits: isOrgCreateCard || isIdentityCard
        ? []
        : firstPost?.id
          ? (creditsByTacPham.get(firstPost.id) ?? [])
          : [],
    };
  });
}

const COT_MOC_CARD_SELECT =
  "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_nguoi_dung, id_to_chuc";

/** Build một `MilestoneItem` sau publish/edit — dùng optimistic merge timeline. */
export async function buildMilestoneItemForCotMoc(
  admin: ReturnType<typeof createServiceRoleClient>,
  cotMocId: string,
): Promise<MilestoneItem | null> {
  const { data, error } = await admin
    .from("content_cot_moc")
    .select(COT_MOC_CARD_SELECT)
    .eq("id", cotMocId)
    .maybeSingle<CotMocRow>();
  if (error || !data) return null;
  const items = await buildSelfMilestonesForCotMocs(admin, [data]);
  return items[0] ?? null;
}

export async function fetchMilestonesForUser(params: {
  userId: string;
  isOwner: boolean;
  viewerId?: string | null;
}): Promise<{
  milestones: MilestoneItem[];
  stats: { cotMoc: number; cotMocVerified: number; tacPham: number; noiBat: number };
}> {
  const { userId, isOwner, viewerId = null } = params;
  const admin = createServiceRoleClient();
  const { count: totalTacPham } = await admin
    .from("content_tac_pham")
    .select("id", { count: "exact", head: true })
    .eq("id_nguoi_dung", userId);

  const { data: cotMocs, error } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_to_chuc",
    )
    .eq("id_nguoi_dung", userId)
    /* Order chính: ngày xảy ra (`thoi_diem`) DESC. Tiebreak: `tao_luc` DESC
       → milestone mới tạo trong cùng ngày lên trên. */
    .order("thoi_diem", { ascending: false })
    .order("tao_luc", { ascending: false, nullsFirst: false })
    .returns<CotMocRow[]>();

  if (error || !cotMocs) {
    return {
      milestones: [],
      stats: {
        cotMoc: 0,
        cotMocVerified: 0,
        tacPham: totalTacPham ?? 0,
        noiBat: 0,
      },
    };
  }

  if (cotMocs.length === 0) {
    const [tagged, bookmarks] = await Promise.all([
      fetchTaggedMilestonesForUser({
        userId,
        isOwner,
        admin,
      }),
      fetchBookmarkedMilestonesForUser({ userId, isOwner, admin }),
    ]);
    const merged = mergeMilestoneLists(tagged, bookmarks);
    return {
      milestones: await attachSocialState(admin, merged, viewerId),
      stats: {
        cotMoc: 0,
        cotMocVerified: 0,
        tacPham: totalTacPham ?? 0,
        noiBat: 0,
      },
    };
  }

  /* Lọc theo visibility. Owner thấy tất cả; guest bỏ `chi_minh` + `cong_dong`. */
  const visible = isOwner
    ? cotMocs
    : cotMocs.filter(
        (m) =>
          m.che_do_hien_thi !== "chi_minh" &&
          isMilestoneVisibleOnPublicJourney({
            cheDoHienThi: m.che_do_hien_thi,
            isOwner: false,
          }),
      );

  const milestones = await buildSelfMilestonesForCotMocs(admin, visible);

  const [tagged, bookmarks] = await Promise.all([
    fetchTaggedMilestonesForUser({
      userId,
      isOwner,
      admin,
    }),
    fetchBookmarkedMilestonesForUser({ userId, isOwner, admin }),
  ]);

  const merged = mergeMilestoneLists(mergeMilestoneLists(milestones, tagged), bookmarks);
  const withSocial = await attachSocialState(admin, merged, viewerId);
  const cotMocVerified = withSocial.filter((m) => m.variant === "verified").length;

  return {
    milestones: withSocial,
    stats: {
      cotMoc: cotMocs.length,
      cotMocVerified,
      tacPham: totalTacPham ?? 0,
      noiBat: visible.filter((m) => m.che_do_hien_thi === "feature").length,
    },
  };
}

export async function fetchTaggedMilestonesForUser(params: {
  userId: string;
  isOwner: boolean;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, isOwner, admin } = params;

  const { data: tagRows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, vai_tro, trang_thai, xu_ly_luc")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted")
    .eq("la_chu_so_huu", false);

  if (!tagRows?.length) return [];

  const tacPhamIds = tagRows.map((r) => r.id_tac_pham as string);
  const roleByTp = new Map(
    tagRows.map((r) => [r.id_tac_pham as string, r.vai_tro as string | null]),
  );
  const journeyVisByTp = new Map(
    tagRows.map((r) => [r.id_tac_pham as string, "public" as const]),
  );
  const acceptedAtByTp = new Map(
    tagRows.map((r) => [
      r.id_tac_pham as string,
      (r.xu_ly_luc as string | null) ?? null,
    ]),
  );

  const { data: tacPhams } = await admin
    .from("content_tac_pham")
    .select(
      "id, slug, tieu_de, cover_id, loai_tac_pham, noi_dung_blocks, id_nguoi_dung",
    )
    .in("id", tacPhamIds);

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham, id_cot_moc")
    .in("id_tac_pham", tacPhamIds)
    .order("thu_tu", { ascending: true });

  const cotMocIdByTp = new Map<string, string>();
  for (const link of links ?? []) {
    if (!cotMocIdByTp.has(link.id_tac_pham as string)) {
      cotMocIdByTp.set(link.id_tac_pham as string, link.id_cot_moc as string);
    }
  }

  const cotMocIds = [...new Set(cotMocIdByTp.values())];
  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc",
    )
    .in("id", cotMocIds)
    .returns<CotMocRow[]>();

  const cmById = new Map((cotMocs ?? []).map((cm) => [cm.id, cm]));

  const items: Array<{
    cm: CotMocRow;
    tp: NonNullable<typeof tacPhams>[number];
    myRole: string | null;
    tacPhamId: string;
  }> = [];

  for (const tp of tacPhams ?? []) {
    if (!tp.slug) continue;
    const tpId = tp.id as string;
    if (isHiddenOnForeignJourney(journeyVisByTp.get(tpId))) continue;
    const cmId = cotMocIdByTp.get(tpId);
    const cm = cmId ? cmById.get(cmId) : undefined;
    if (!cm) continue;
    if (!isOwner && cm.che_do_hien_thi === "chi_minh") continue;
    if (
      !isOwner &&
      cm.che_do_hien_thi !== "public" &&
      cm.che_do_hien_thi !== "feature"
    ) {
      continue;
    }
    items.push({
      cm,
      tp,
      myRole: roleByTp.get(tpId) ?? null,
      tacPhamId: tpId,
    });
  }

  if (items.length === 0) return [];

  const ownerIds = [...new Set(items.map((i) => i.tp.id_nguoi_dung))];
  const { data: owners } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", ownerIds);
  const ownerById = new Map((owners ?? []).map((o) => [o.id as string, o]));

  const taggedTpIds = items.map((i) => i.tacPhamId);
  const creditsByTacPham = await loadCoAuthorCredits(admin, taggedTpIds);
  const tagsByTacPham = await fetchArticleTagsForTacPham(admin, taggedTpIds);

  return items.map(({ cm, tp, myRole, tacPhamId }) => {
    const owner = ownerById.get(tp.id_nguoi_dung);
    const dateObj = new Date(cm.thoi_diem);
    return {
      id: `${cm.id}:${tacPhamId}`,
      cotMocId: cm.id,
      variant: "tagged" as MilestoneVariant,
      type: LOAI_MOC_TO_TYPE[cm.loai_moc],
      visibility: mapForeignJourneyVisibilityToUi(
        journeyVisByTp.get(tacPhamId),
      ),
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: resolveTaggedTimelineSortAt(
        acceptedAtByTp.get(tacPhamId),
        cm.tao_luc,
      ),
      title: (tp.tieu_de as string) || cm.tieu_de,
      body: cm.mo_ta || null,
      postSlug: tp.slug,
      postOwnerSlug: (owner?.slug as string) ?? null,
      postOwnerId: tp.id_nguoi_dung as string,
      tacPhamId,
      canProposeCoAuthor: isOwner,
      media: milestoneCoverMedia(
        tp.cover_id as string,
        tp.noi_dung_blocks,
        (tp.tieu_de as string) || cm.tieu_de,
      ),
      noiDungBlocks: parseServerBlocks(tp.noi_dung_blocks),
      articleTags: tagsByTacPham.get(tacPhamId) ?? [],
      attribution: owner
        ? {
            name: (owner.ten_hien_thi as string) || (owner.slug as string),
            role: myRole,
            slug: owner.slug as string,
            avatarUrl: getAvatarUrl((owner.avatar_id as string) || null) ?? null,
            initial: ((owner.ten_hien_thi as string) || owner.slug as string)
              .slice(0, 1)
              .toUpperCase(),
            isOrg: false,
          }
        : null,
      coAuthorCredits: creditsByTacPham.get(tacPhamId) ?? [],
    };
  });
}

export async function fetchBookmarkedMilestonesForUser(params: {
  userId: string;
  isOwner: boolean;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, isOwner, admin } = params;
  const { data: savedRows } = await admin
    .from("social_luu")
    .select("id_doi_tuong, loai_doi_tuong, tao_luc, che_do_hien_thi")
    .eq("id_nguoi_dung", userId)
    .eq("loai_doi_tuong", "cot_moc")
    .returns<BookmarkRow[]>();

  const savedAtByMoc = new Map(
    (savedRows ?? []).map((row) => [row.id_doi_tuong, row.tao_luc]),
  );
  const journeyVisByMoc = new Map(
    (savedRows ?? []).map((row) => [
      row.id_doi_tuong as string,
      mapCheDoLuuToForeignJourney(row.che_do_hien_thi as string | null),
    ]),
  );

  const orgBookmarks = await fetchBookmarkedOrgBaiDangMilestones({ userId, admin });

  const cotMocIds = [...new Set(savedAtByMoc.keys())];
  if (cotMocIds.length === 0) return orgBookmarks;

  const { data: cotMocs } = await admin
    .from("content_cot_moc")
    .select(
      "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_nguoi_dung, id_to_chuc",
    )
    .in("id", cotMocIds)
    .returns<CotMocRow[]>();

  const visibleCotMocs = (cotMocs ?? []).filter((cm) => {
    if (cm.id_nguoi_dung === userId) return false;
    if (isOwner) return true;
    if (cm.che_do_hien_thi === "chi_minh") return false;
    return isMilestoneVisibleOnPublicJourney({
      cheDoHienThi: cm.che_do_hien_thi,
      isOwner: false,
    });
  });
  if (visibleCotMocs.length === 0) return orgBookmarks;

  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, id_tac_pham, thu_tu, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, loai_tac_pham, noi_dung_blocks, id_nguoi_dung)",
    )
    .in("id_cot_moc", visibleCotMocs.map((cm) => cm.id))
    .order("thu_tu", { ascending: true })
    .returns<BookmarkLinkRow[]>();

  const firstLinkByMoc = new Map<string, NonNullable<typeof links>[number]>();
  for (const link of links ?? []) {
    const id = link.id_cot_moc as string;
    if (!firstLinkByMoc.has(id)) firstLinkByMoc.set(id, link);
  }

  const tacPhamIds = [
    ...new Set(
      [...firstLinkByMoc.values()]
        .map((link) => link.content_tac_pham?.id as string | undefined)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [tagsByTacPham, creditsByTacPham] = await Promise.all([
    fetchArticleTagsForTacPham(admin, tacPhamIds),
    loadCoAuthorCredits(admin, tacPhamIds),
  ]);

  const ownerIds = [
    ...new Set(
      [...firstLinkByMoc.values()]
        .map((link) => link.content_tac_pham?.id_nguoi_dung as string | undefined)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: owners } = ownerIds.length
    ? await admin
        .from("user_nguoi_dung")
        .select("id, slug, ten_hien_thi, avatar_id")
        .in("id", ownerIds)
    : { data: [] };
  const ownerById = new Map((owners ?? []).map((owner) => [owner.id as string, owner]));

  const congDongOrgIds = visibleCotMocs
    .filter((cm) => cm.che_do_hien_thi === "cong_dong" && cm.id_to_chuc)
    .map((cm) => cm.id_to_chuc as string);
  const congDongOrgs = await loadCongDongOrgsForMilestones(congDongOrgIds);

  const cotMocBookmarks = visibleCotMocs
    .map((cm): MilestoneItem | null => {
      if (
        isBookmarkHiddenOnViewerJourney(journeyVisByMoc.get(cm.id), isOwner)
      ) {
        return null;
      }
      const link = firstLinkByMoc.get(cm.id);
      const tp = link?.content_tac_pham;
      if (!tp?.id || !tp.slug) return null;
      const owner = ownerById.get(tp.id_nguoi_dung as string);
      const isCongDongBookmark =
        cm.che_do_hien_thi === "cong_dong" && Boolean(cm.id_to_chuc);
      const congDongOrg = isCongDongBookmark
        ? (congDongOrgs.get(cm.id_to_chuc as string) ?? null)
        : null;
      const dateObj = new Date(cm.thoi_diem);
      return {
        id: `bookmark:${cm.id}:${tp.id}`,
        cotMocId: cm.id,
        variant: "bookmark" as MilestoneVariant,
        type: LOAI_MOC_TO_TYPE[cm.loai_moc],
        visibility: mapForeignJourneyVisibilityToUi(journeyVisByMoc.get(cm.id)),
        year: dateObj.getUTCFullYear(),
        month: dateObj.getUTCMonth() + 1,
        day: dateObj.getUTCDate(),
        createdAt: savedAtByMoc.get(cm.id) ?? cm.tao_luc,
        bookmarkSavedAt: savedAtByMoc.get(cm.id) ?? null,
        title: (tp.tieu_de as string) || cm.tieu_de,
        body: cm.mo_ta || null,
        postSlug: tp.slug as string,
        postOwnerSlug: (owner?.slug as string) ?? null,
        tacPhamId: tp.id as string,
        media: milestoneCoverMedia(
          tp.cover_id as string,
          tp.noi_dung_blocks,
          (tp.tieu_de as string) || cm.tieu_de,
        ),
        noiDungBlocks: parseServerBlocks(tp.noi_dung_blocks),
        articleTags: tagsByTacPham.get(tp.id as string) ?? [],
        congDongOrg: isCongDongBookmark ? congDongOrg : null,
        bookmark: {
          name:
            (owner?.ten_hien_thi as string) ||
            (owner?.slug as string) ||
            "Journey",
          domain: owner?.slug ? `@${owner.slug}` : "CINS",
          initial: (
            (owner?.ten_hien_thi as string) ||
            (owner?.slug as string) ||
            "C"
          )
            .slice(0, 1)
            .toUpperCase(),
          avatarUrl:
            getAvatarUrl((owner?.avatar_id as string | null) ?? null) ?? null,
          sourceKind: congDongOrg ? ("cong_dong" as const) : ("user" as const),
        },
        coAuthorCredits: creditsByTacPham.get(tp.id as string) ?? [],
      };
    })
    .filter((item): item is MilestoneItem => item !== null);

  return mergeMilestoneLists(cotMocBookmarks, orgBookmarks);
}

function milestoneCotMocKey(item: MilestoneItem): string {
  return item.cotMocId ?? item.id;
}

function mergeMilestoneLists(
  primary: MilestoneItem[],
  secondary: MilestoneItem[],
): MilestoneItem[] {
  const seenCotMocIds = new Set(primary.map((m) => milestoneCotMocKey(m)));
  const extra = secondary.filter((m) => !seenCotMocIds.has(milestoneCotMocKey(m)));
  const all = [...primary, ...extra];
  return all.sort(compareTimelineOrder);
}

export async function attachSocialState(
  admin: ReturnType<typeof createServiceRoleClient>,
  milestones: MilestoneItem[],
  viewerId: string | null,
): Promise<MilestoneItem[]> {
  const cotMocIds = [
    ...new Set(
      milestones
        .map((item) => item.cotMocId ?? item.id)
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
    ),
  ];
  if (cotMocIds.length === 0) return milestones;

  const [viewerLikes, viewerBookmarks, allLikes, allBookmarks, allComments] = await Promise.all([
    viewerId
      ? admin
          .from("social_reaction")
          .select("id_doi_tuong")
          .eq("id_nguoi_dung", viewerId)
          .eq("loai_doi_tuong", "cot_moc")
          .eq("emoji", "heart")
          .in("id_doi_tuong", cotMocIds)
      : Promise.resolve({ data: [] }),
    viewerId
      ? admin
          .from("social_luu")
          .select("id_doi_tuong")
          .eq("id_nguoi_dung", viewerId)
          .eq("loai_doi_tuong", "cot_moc")
          .in("id_doi_tuong", cotMocIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("social_reaction")
      .select("id_doi_tuong")
      .eq("loai_doi_tuong", "cot_moc")
      .eq("emoji", "heart")
      .in("id_doi_tuong", cotMocIds),
    admin
      .from("social_luu")
      .select("id_doi_tuong")
      .eq("loai_doi_tuong", "cot_moc")
      .in("id_doi_tuong", cotMocIds),
    admin
      .from("social_binh_luan")
      .select("id_doi_tuong")
      .eq("loai_doi_tuong", "cot_moc")
      .eq("da_xoa", false)
      .in("id_doi_tuong", cotMocIds),
  ]);

  const likedIds = new Set((viewerLikes.data ?? []).map((row) => row.id_doi_tuong as string));
  const bookmarkedIds = new Set(
    (viewerBookmarks.data ?? []).map((row) => row.id_doi_tuong as string),
  );
  const likeCounts = countByTarget(allLikes.data ?? []);
  const bookmarkCounts = countByTarget(allBookmarks.data ?? []);
  const commentCounts = countByTarget(allComments.data ?? []);

  return milestones.map((item) => {
    const id = item.cotMocId ?? item.id;
    return {
      ...item,
      social: {
        viewerLiked: likedIds.has(id),
        viewerBookmarked: bookmarkedIds.has(id),
        likeCount: likeCounts.get(id) ?? 0,
        bookmarkCount: bookmarkCounts.get(id) ?? 0,
        showCounts: true,
      },
      comments: commentCounts.get(id) ?? item.comments ?? 0,
    };
  });
}

function countByTarget(rows: Array<{ id_doi_tuong?: string | null }>): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (!row.id_doi_tuong) continue;
    out.set(row.id_doi_tuong, (out.get(row.id_doi_tuong) ?? 0) + 1);
  }
  return out;
}

/**
 * Defensive parse `noi_dung_blocks` (jsonb / unknown) → canonical
 * `ServerBlock[]`. Trả `null` khi data trống/lỗi để consumer biết fallback
 * sang `body` / `mo_ta` thay vì render block list rỗng.
 */
