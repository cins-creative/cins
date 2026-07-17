"use client";

import {
  BadgeCheck,
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronUp,
  CornerDownRight,
  FileText,
  FolderKanban,
  Globe,
  Eye,
  Lock,
  MessageCircle,
  Palette,
  Star,
  Tag,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthorRoleTooltip } from "@/components/journey/AuthorRoleTooltip";
import {
  joinVaiTroPositions,
  parseVaiTroPositions,
} from "@/lib/social/vai-tro";
import { JourneyAuthorRowFriendAction } from "@/components/journey/JourneyAuthorRowFriendAction";
import { JourneyOwnCoAuthorRoleEditor } from "@/components/journey/JourneyOwnCoAuthorRoleEditor";
import { JourneyBookmarkListingCard } from "@/components/journey/JourneyBookmarkListingCard";
import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import { JourneyMilestoneUnfold } from "@/components/journey/JourneyMilestoneUnfold";
import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import { VerifiedTick } from "@/components/journey/VerifiedTick";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { POST_COMMENTS_SYNC_EVENT } from "@/lib/journey/comments-sync-client";
import {
  isMilestoneArticleCard,
  milestoneCardContentKind,
  milestoneCardPhotoGrid,
} from "@/lib/journey/milestone-card-kind";
import { JourneyCommentLink } from "@/components/journey/JourneyCommentLink";
import { JourneyArticleTagManager } from "@/components/journey/JourneyArticleTagManager";
import { JourneyCoAuthorProposal } from "@/components/journey/JourneyCoAuthorProposal";
import { JourneyOrgAttachTrigger } from "@/components/journey/JourneyOrgAttachTrigger";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyMilestoneInlineControls } from "@/components/journey/JourneyMilestoneInlineControls";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { JourneyDislikeButton } from "@/components/journey/JourneyDislikeButton";
import { PostShareMenu } from "@/components/journey/PostActionsRail";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyMilestoneInsightsModal } from "@/components/journey/JourneyMilestoneInsightsModal";
import { JourneyMilestoneViewerMenu } from "@/components/social/JourneyMilestoneViewerMenu";
import { WorldBoostToggle } from "@/components/cins/world-journey/WorldBoostToggle";
import { useWorldBoostAdminOptional } from "@/components/cins/world-journey/WorldBoostAdminContext";
import { worldBoostTargetFromMilestoneLike } from "@/lib/cins/world-boost-client";
import { IdentityPendingMilestoneCard } from "@/components/journey/IdentityPendingMilestoneCard";
import { IdentityVerifiedMilestoneCard } from "@/components/journey/IdentityVerifiedMilestoneCard";
import {
  PersonalFilterBadge,
  personalFilterBadgeClass,
} from "@/components/journey/PersonalFilterVisual";
import { OrgSuKienFeedMilestoneCard } from "@/components/journey/OrgSuKienFeedMilestoneCard";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  trackSuKien,
  useImpressionTracker,
} from "@/lib/social/track-su-kien";
import type {
  LoaiDoiTuongSuKien,
  NguonSuKien,
} from "@/lib/social/su-kien-constants";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type {
  CoAuthorCredit,
  MilestoneAttribution,
  MilestoneBookmarkSource,
  MilestoneCongDongOrg,
  MilestoneItem,
  MilestoneOrgBaiDangRef,
  MilestoneType,
} from "@/components/journey/milestone-types";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import {
  bookmarkFrameCssKind,
  resolveBookmarkFrameKind,
} from "@/lib/journey/bookmark-source-theme";
import {
  articleCardEmbedInteractivePeek,
  articleCardHasExpandableContent,
  plainTextCardPlain,
  chiChuBodyPlain,
  milestoneCardCaptionPlain,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
import {
  splitChiChuParagraphs,
  chiChuNeedsCollapse,
} from "@/lib/journey/plain-text-bg";
import { JOURNEY_MILESTONE_TYPE_OPTIONS } from "@/lib/journey/milestone-type-options";
import {
  FILTER_LOAI_COT_MOC,
  FILTER_LOAI_ORG_BAI_DANG,
} from "@/lib/filter/types";
import { getNameInitials } from "@/lib/journey/profile";
import { truongRootPath } from "@/lib/truong/truong-routes";

type Props = {
  milestone: MilestoneItem;
  /** Owner đang xem → render kebab menu (sửa / nhóm / hiển thị / xoá). */
  isOwner?: boolean;
  /** Slug owner — wire link "Sửa bài viết" trong menu. Bắt buộc nếu `isOwner`. */
  ownerSlug?: string;
  /** UUID chủ Journey — loại khỏi picker cộng sự. */
  ownerProfileId?: string;
  /** UUID viewer đăng nhập — trạng thái kết bạn trên author row. */
  viewerProfileId?: string | null;
  /**
   * Author của Journey hiện tại — render trong badge "Cá nhân" thay vì
   * label cứng "Cá nhân", để identify rõ ai là người post. URL avatar
   * đã được resolve qua Cloudflare ở server (xem `getAvatarUrl`).
   */
  authorAvatarUrl?: string | null;
  authorName?: string | null;
  /** Trang entity — mỗi card từ tác giả khác nhau, luôn hiện người đăng. */
  entityLens?: boolean;
  /**
   * Nguồn bề mặt cho analytics (tách "ngoài / trong trang tổ chức"). Mặc định
   * suy từ `entityLens`, nhưng feed world-journey nên truyền "journey_home"
   * (vì cũng dùng layout entityLens nhưng KHÔNG phải trang tổ chức).
   */
  analyticsNguon?: NguonSuKien;
  /** Mở rộng inline — chỉ bài viết (nội dung / bình luận tách riêng). */
  inlineExpand?: {
    showContent: boolean;
    showComments: boolean;
    postOwnerSlug: string;
    onToggleContent(): void;
    onOpenComments(): void;
    onClose(): void;
  };
  /** Feed tổng hợp — ảnh/video không full grid/album trên card. */
  feedCompactMedia?: boolean;
  /** Permalink — dùng cho ảnh/video trên feed (không unfold inline). */
  readMoreHref?: string | null;
  /** Trang org đang mở — ẩn bar xác thực nếu attr trùng org này. */
  hostOrgSlug?: string | null;
  hostOrgName?: string | null;
  /** Menu ghim lên đầu Journey timeline — chỉ view Journey. */
  showJourneyPin?: boolean;
};

const TYPE_LABEL: Record<MilestoneType, string> = {
  hoc: "Học",
  lam: "Làm việc",
  "du-an": "Dự án",
  "su-kien": "Sự kiện",
  "thanh-tuu": "Thành tựu",
  "ca-nhan": "Cá nhân",
  bookmark: "Lưu về",
};

const TYPE_CLASS: Record<MilestoneType, string> = {
  hoc: "j-type-hoc",
  lam: "j-type-lam",
  "du-an": "j-type-du-an",
  "su-kien": "j-type-su-kien",
  "thanh-tuu": "j-type-thanh-tuu",
  "ca-nhan": "j-type-ca-nhan",
  bookmark: "j-type-bookmark",
};

/** Icon Lucide cho từng loại cột mốc. Match design system v2. */
const TYPE_ICON: Record<MilestoneType, LucideIcon> = {
  hoc: BookOpen,
  lam: Briefcase,
  "du-an": FolderKanban,
  "su-kien": Calendar,
  "thanh-tuu": Trophy,
  "ca-nhan": UserCircle2,
  bookmark: Bookmark,
};

const EDITABLE_TYPE_OPTIONS = JOURNEY_MILESTONE_TYPE_OPTIONS;

function usesOrgVerifyTypeBadge(
  type: MilestoneType,
  verifiedBy: string | null | undefined,
  isCongDongPost: boolean,
): boolean {
  return Boolean(verifiedBy?.trim()) && type === "ca-nhan" && !isCongDongPost;
}

/** Org xác thực milestone — bar «Đã xác thực bởi», không phải via-bar «Được gắn bởi». */
function attributionUsesVerifyBar(
  attr: MilestoneAttribution | null | undefined,
  variant: MilestoneItem["variant"],
): boolean {
  if (!attr?.isOrg || attr.orgKind === "cong_dong") return false;
  if (attr.orgKind === "truong") return true;
  return variant === "verified";
}

type TruongVerifyBarContext = {
  orgBaiDangRef?: MilestoneOrgBaiDangRef | null;
  posterSlug?: string | null;
  posterName?: string | null;
  /** Đang xem trang org này — bar «Đã xác thực bởi» cùng org là thừa. */
  hostOrgSlug?: string | null;
  hostOrgName?: string | null;
};

function normalizeOrgCompareKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function attributionMatchesOrgPoster(
  attr: MilestoneAttribution,
  posterSlug?: string | null,
  posterName?: string | null,
): boolean {
  const attrSlug = attr.slug?.trim();
  const posterSlugTrimmed = posterSlug?.trim();
  if (
    attrSlug &&
    posterSlugTrimmed &&
    attrSlug.toLowerCase() === posterSlugTrimmed.toLowerCase()
  ) {
    return true;
  }

  const attrName = normalizeOrgCompareKey(attr.name);
  const posterNameKey = posterName ? normalizeOrgCompareKey(posterName) : "";
  return Boolean(posterNameKey) && attrName === posterNameKey;
}

/** Bài do chính org đăng — không cần bar «Đã xác thực bởi» cùng org. */
function isOrgSelfAuthoredPost(
  attr: MilestoneAttribution | null | undefined,
  ctx: TruongVerifyBarContext,
  variant?: MilestoneItem["variant"],
): boolean {
  if (!attr?.isOrg) return false;
  /* Cộng sự org bài đăng trên Journey cá nhân — org gắn user = xác thực, không ẩn bar. */
  if (ctx.orgBaiDangRef && variant === "verified") return false;
  if (ctx.orgBaiDangRef) {
    return attributionMatchesOrgPoster(
      attr,
      ctx.orgBaiDangRef.orgSlug,
      ctx.orgBaiDangRef.orgName,
    );
  }
  return attributionMatchesOrgPoster(attr, ctx.posterSlug, ctx.posterName);
}

function isHostOrgVerify(
  attr: MilestoneAttribution,
  ctx: TruongVerifyBarContext,
): boolean {
  return attributionMatchesOrgPoster(attr, ctx.hostOrgSlug, ctx.hostOrgName);
}

function shouldShowTruongVerifyBar(
  attr: MilestoneAttribution | null | undefined,
  variant: MilestoneItem["variant"],
  ctx: TruongVerifyBarContext,
): boolean {
  if (!attr || !attributionUsesVerifyBar(attr, variant)) return false;
  if (isOrgSelfAuthoredPost(attr, ctx, variant)) return false;
  if (isHostOrgVerify(attr, ctx)) return false;
  return true;
}

function MilestoneVerifyBadge() {
  return (
    <span
      className="ctx-badge j-vis-verified"
      title="Verified"
      aria-label="Verified"
    >
      <BadgeCheck size={11} strokeWidth={1.7} aria-hidden />
      Verified
    </span>
  );
}

const EDITABLE_VIS_OPTIONS: ReadonlyArray<{
  ui: NonNullable<MilestoneItem["visibility"]>;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "feature", db: "feature", label: "Feature", Icon: Star },
  { ui: "public", db: "public", label: "Công khai", Icon: Globe },
  { ui: "unlisted", db: "theo_nhom", label: "Bạn bè", Icon: Users },
  { ui: "private", db: "chi_minh", label: "Chỉ mình tôi", Icon: Lock },
];

/** Đổi từ `cong_dong` sang thẻ Journey thường — rời feed cộng đồng. */
const CONG_DONG_GRADUATE_VIS_OPTIONS: ReadonlyArray<{
  ui: NonNullable<MilestoneItem["visibility"]>;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "public", db: "public", label: "Công khai", Icon: Globe },
  { ui: "unlisted", db: "theo_nhom", label: "Bạn bè", Icon: Users },
  { ui: "private", db: "chi_minh", label: "Chỉ mình tôi", Icon: Lock },
  { ui: "feature", db: "feature", label: "Feature", Icon: Star },
];

/** Tagged / Lưu về — chỉ đổi hiển thị trên Journey của viewer. */
const FOREIGN_JOURNEY_VIS_OPTIONS: ReadonlyArray<{
  ui: NonNullable<MilestoneItem["visibility"]>;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "feature", db: "feature", label: "Feature", Icon: Star },
  { ui: "public", db: "public", label: "Công khai", Icon: Globe },
  { ui: "private", db: "chi_minh", label: "Ẩn khỏi Journey", Icon: Lock },
];

const MAX_VISIBLE_COAUTHORS = 5;
const AVATAR_TONE_CLASSES = [
  "av-blue",
  "av-green",
  "av-amber",
  "av-purple",
  "av-coral",
];

function MilestoneTypeBadgeContent({ type }: { type: MilestoneType }) {
  const TypeIco = TYPE_ICON[type];
  return (
    <>
      <TypeIco size={11} strokeWidth={1.8} aria-hidden />
      {TYPE_LABEL[type]}
    </>
  );
}

function CongDongTypeBadge() {
  return (
    <span className="ctx-badge j-type-cong-dong">
      <Users size={11} strokeWidth={1.8} aria-hidden />
      Cộng đồng
    </span>
  );
}

function CoSoTypeBadge() {
  return (
    <span className="ctx-badge j-type-co-so">
      <BookOpen size={11} strokeWidth={1.8} aria-hidden />
      Cơ sở đào tạo
    </span>
  );
}

function StudioTypeBadge() {
  return (
    <span className="ctx-badge j-type-studio">
      <Palette size={11} strokeWidth={1.8} aria-hidden />
      Studio
    </span>
  );
}

function congDongInlineContext(
  org?: MilestoneItem["congDongOrg"] | null,
  postTitle?: string | null,
) {
  if (!org) return { orgName: null, postTitle: postTitle?.trim() || null };
  return {
    orgName: org.name,
    orgSlug: org.slug,
    orgAvatarUrl: org.avatarUrl,
    orgCoverUrl: org.coverUrl,
    orgInitial: org.initial,
    postTitle: postTitle?.trim() || null,
  };
}

function visibilityIcon(
  v: MilestoneItem["visibility"] | undefined,
  congDongOrg?: MilestoneItem["congDongOrg"],
): { Icon: LucideIcon; label: string } | null {
  if (v === "cong-dong") {
    return {
      Icon: Users,
      label: congDongOrg?.name
        ? `Cộng đồng · ${congDongOrg.name}`
        : "Cộng đồng",
    };
  }
  if (v === "feature") return { Icon: Star, label: "Feature" };
  if (!v || v === "public") return { Icon: Globe, label: "Công khai" };
  if (v === "unlisted") return { Icon: Users, label: "Bạn bè" };
  if (v === "private") return { Icon: Lock, label: "Chỉ mình tôi" };
  return null;
}

/**
 * 1 cột mốc trên Journey — render theo `variant` (self / tagged / verified / bookmark).
 * Cẩn thận:
 *  - Card nội dung nằm trong `.j-m-body-wrap` → `.j-m-card`.
 */
export function JourneyMilestoneCard({
  milestone,
  isOwner = false,
  ownerSlug,
  ownerProfileId,
  viewerProfileId = null,
  authorAvatarUrl,
  authorName,
  entityLens = false,
  analyticsNguon,
  inlineExpand,
  feedCompactMedia = false,
  readMoreHref = null,
  hostOrgSlug = null,
  hostOrgName = null,
  showJourneyPin = false,
}: Props) {
  const {
    variant,
    type,
    title,
    body,
    attribution,
    bookmark,
    bookmarkListing,
    verifiedBy,
    media = [],
    tags = [],
    articleTags = [],
    coAuthorCredits: initialCoAuthorCredits = [],
    views,
    comments,
    visibility,
    year,
    month,
    day,
    postSlug,
    postOwnerSlug,
    postOwnerId,
    cotMocId,
    tacPhamId,
    canProposeCoAuthor,
    social,
    noiDungBlocks,
    orgBaiDangRef,
    orgSuKienRef,
    cardLayout = "default",
    orgHref,
    congDongOrg,
    personalFilterSlugs = [],
    personalFilters = [],
    membershipPending,
    feedSuggestion = false,
  } = milestone;

  const articleTagsKey = articleTags.map((t) => t.id).join("\0");
  const [liveArticleTags, setLiveArticleTags] = useState<ArticleTagRef[]>(() => [
    ...articleTags,
  ]);
  const [coAuthorRoleOverrides, setCoAuthorRoleOverrides] = useState<
    Record<string, string | null>
  >({});
  const coAuthorCredits = initialCoAuthorCredits.map((credit) => {
    const id = credit.idNguoiDung;
    if (!id || !Object.hasOwn(coAuthorRoleOverrides, id)) return credit;
    return { ...credit, role: coAuthorRoleOverrides[id] };
  });

  useEffect(() => {
    setLiveArticleTags([...articleTags]);
  }, [articleTagsKey]);

  const handleArticleTagsSaved = useCallback((tags: ArticleTagRef[]) => {
    setLiveArticleTags(tags);
  }, []);

  const worldBoostAdmin = useWorldBoostAdminOptional();

  const displayDate = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  const bookmarkSavedDateLabel = milestone.bookmarkSavedAt
    ? formatIsoToDisplayDate(milestone.bookmarkSavedAt)
    : null;
  const bookmarkFrameKind = resolveBookmarkFrameKind({
    bookmark,
    orgBaiDangRef,
    congDongOrg,
  });
  const bookmarkOwnerLabel =
    authorName?.trim() ||
    (ownerSlug?.trim() ? `@${ownerSlug.trim()}` : null) ||
    "Journey của bạn";

  if (orgSuKienRef) {
    return (
      <OrgSuKienFeedMilestoneCard milestone={milestone} entityLens={entityLens} />
    );
  }

  if (cardLayout === "cong-dong-create") {
    return (
      <CongDongCreateMilestoneCard
        milestoneCls={[
          "j-milestone",
          "j-tagged",
          "j-verified",
          "j-cong-dong-create",
        ]
          .filter(Boolean)
          .join(" ")}
        displayDate={displayDate}
        title={title}
        body={body}
        attribution={attribution}
        orgHref={orgHref}
        milestoneId={cotMocId ?? milestone.id}
        year={year}
        month={month}
        day={day}
      />
    );
  }

  if (cardLayout === "co-so-create") {
    return (
      <CoSoCreateMilestoneCard
        milestoneCls={[
          "j-milestone",
          "j-tagged",
          "j-verified",
          "j-co-so-create",
        ]
          .filter(Boolean)
          .join(" ")}
        displayDate={displayDate}
        title={title}
        body={body}
        attribution={attribution}
        orgHref={orgHref}
        milestoneId={cotMocId ?? milestone.id}
        year={year}
        month={month}
        day={day}
      />
    );
  }

  if (cardLayout === "studio-create") {
    return (
      <StudioCreateMilestoneCard
        milestoneCls={[
          "j-milestone",
          "j-tagged",
          "j-verified",
          "j-studio-create",
        ]
          .filter(Boolean)
          .join(" ")}
        displayDate={displayDate}
        title={title}
        body={body}
        attribution={attribution}
        orgHref={orgHref}
        milestoneId={cotMocId ?? milestone.id}
        year={year}
        month={month}
        day={day}
      />
    );
  }

  if (cardLayout === "identity-pending" && membershipPending) {
    return (
      <IdentityPendingMilestoneCard
        milestoneCls={["j-milestone", "j-self", "j-identity-pending"]
          .filter(Boolean)
          .join(" ")}
        milestoneId={cotMocId ?? milestone.id}
        cotMocId={cotMocId ?? milestone.id}
        ownerSlug={ownerSlug ?? ""}
        displayDate={displayDate}
        year={year}
        month={month}
        day={day}
        title={title}
        body={body}
        type={type}
        visibility={visibility}
        attribution={attribution}
        membershipPending={membershipPending}
        isOwner={isOwner}
      />
    );
  }

  if (cardLayout === "identity-verified") {
    return (
      <IdentityVerifiedMilestoneCard
        milestoneCls={["j-milestone", "j-self", "j-verified", "j-identity-verified"]
          .filter(Boolean)
          .join(" ")}
        milestoneId={cotMocId ?? milestone.id}
        cotMocId={cotMocId ?? milestone.id}
        ownerSlug={ownerSlug ?? ""}
        displayDate={displayDate}
        year={year}
        month={month}
        day={day}
        title={title}
        body={body}
        type={type}
        visibility={visibility}
        attribution={attribution}
        verifiedBy={verifiedBy}
        orgHref={orgHref}
        isOwner={isOwner}
      />
    );
  }

  const milestoneCls = [
    "j-milestone",
    variant === "self" && "j-self",
    variant === "tagged" && "j-tagged",
    variant === "verified" && "j-tagged j-verified",
    variant === "bookmark" && "j-bookmark",
  ]
    .filter(Boolean)
    .join(" ");

  const vis = visibilityIcon(visibility, congDongOrg);
  const isCongDongPost = visibility === "cong-dong";
  const isBookmarkMilestone = variant === "bookmark";
  const isTaggedFromOthers =
    (variant === "tagged" || variant === "verified") &&
    Boolean(postOwnerSlug?.trim()) &&
    Boolean(ownerSlug?.trim()) &&
    postOwnerSlug!.trim() !== ownerSlug!.trim();
  const isJourneyPostAuthor =
    (Boolean(postOwnerSlug?.trim()) &&
      Boolean(ownerSlug?.trim()) &&
      postOwnerSlug!.trim() === ownerSlug!.trim()) ||
    (Boolean(ownerProfileId) &&
      Boolean(postOwnerId) &&
      postOwnerId === ownerProfileId);
  const isCreditOwnerOnTacPham =
    Boolean(ownerProfileId) &&
    coAuthorCredits.some(
      (c) => c.laChuSoHuu && c.idNguoiDung === ownerProfileId,
    );
  /** Gắn thẻ / verify nhưng chủ Journey cũng là tác giả bài — coi như bài của mình. */
  const isSelfAuthoredTagged =
    isOwner &&
    (variant === "tagged" || variant === "verified") &&
    Boolean(ownerSlug?.trim()) &&
    (isJourneyPostAuthor || isCreditOwnerOnTacPham);
  const isCongDongSelfPost =
    variant === "self" && isCongDongPost && Boolean(congDongOrg);
  const isTaggedOrgBaiDang =
    (variant === "tagged" || variant === "verified") &&
    Boolean(orgBaiDangRef) &&
    Boolean(bookmark);
  const useForeignFrame =
    !isSelfAuthoredTagged &&
    ((isBookmarkMilestone && Boolean(bookmark)) ||
      isTaggedFromOthers ||
      isCongDongSelfPost ||
      isTaggedOrgBaiDang);
  const foreignFrameKind = isBookmarkMilestone
    ? bookmarkFrameKind
    : isCongDongSelfPost
      ? "cong_dong"
      : "user";
  const foreignFrameDateLabel = isBookmarkMilestone
    ? bookmarkSavedDateLabel
    : isCongDongSelfPost
      ? displayDate
      : milestone.createdAt
        ? formatIsoToDisplayDate(milestone.createdAt)
        : null;
  const foreignFrameDateLead: "bookmark" | "tag" | "cong-dong" =
    isBookmarkMilestone ? "bookmark" : isCongDongSelfPost ? "cong-dong" : "tag";
  const foreignFrameDateTitle = isBookmarkMilestone
    ? "Ngày lưu về"
    : isCongDongSelfPost
      ? "Ngày đăng"
      : "Ngày gắn thẻ";
  const canManageSelf =
    isOwner &&
    (variant === "self" ||
      variant === "verified" ||
      isBookmarkMilestone ||
      isSelfAuthoredTagged) &&
    Boolean(ownerSlug);
  const canManageTagged =
    isOwner &&
    (variant === "tagged" || variant === "verified") &&
    !isSelfAuthoredTagged &&
    Boolean(ownerSlug) &&
    (Boolean(tacPhamId) || isTaggedOrgBaiDang);
  const canManageForeignJourney =
    (canManageTagged || (isBookmarkMilestone && canManageSelf)) &&
    Boolean(cotMocId) &&
    (Boolean(tacPhamId) || isTaggedOrgBaiDang);
  const canManage = canManageSelf || canManageTagged;
  const foreignJourneyContext =
    canManageForeignJourney && cotMocId
      ? isBookmarkMilestone && tacPhamId
        ? {
            variant: "bookmark" as const,
            cotMocId,
            tacPhamId,
          }
        : isTaggedOrgBaiDang && orgBaiDangRef?.postId
          ? {
              variant: "org_tagged" as const,
              cotMocId: orgBaiDangRef.postId,
            }
          : tacPhamId
            ? {
                variant: "tagged" as const,
                cotMocId,
                tacPhamId,
              }
            : undefined
      : undefined;
  const personalFilterLoai = isTaggedOrgBaiDang
    ? FILTER_LOAI_ORG_BAI_DANG
    : FILTER_LOAI_COT_MOC;
  const personalFilterMenuId =
    isTaggedOrgBaiDang && orgBaiDangRef?.postId
      ? orgBaiDangRef.postId
      : (cotMocId ?? milestone.id);
  const primaryPersonalFilter = personalFilters[0] ?? null;
  const allowPersonalFilterOnMenu = Boolean(
    isOwner && ownerSlug && (canManage || foreignJourneyContext),
  );
  const canBookmark = !(isOwner && (variant === "self" || isBookmarkMilestone));
  const canManageCoAuthors =
    isOwner &&
    (variant === "self" ||
      variant === "verified" ||
      isSelfAuthoredTagged) &&
    Boolean(tacPhamId);
  const showOrgVerifyBadge = usesOrgVerifyTypeBadge(type, verifiedBy, isCongDongPost);
  const truongVerifyBarContext: TruongVerifyBarContext = {
    orgBaiDangRef,
    posterSlug:
      orgBaiDangRef?.orgSlug ??
      milestone.lensOwnerSlug?.trim() ??
      ownerSlug?.trim() ??
      postOwnerSlug?.trim() ??
      null,
    posterName:
      orgBaiDangRef?.orgName ??
      milestone.lensOwnerName?.trim() ??
      authorName?.trim() ??
      null,
    hostOrgSlug,
    hostOrgName,
  };
  const showsTruongVerifyBar =
    Boolean(
      (variant === "tagged" || variant === "verified") &&
        !useForeignFrame &&
        shouldShowTruongVerifyBar(attribution, variant, truongVerifyBarContext),
    );
  const showMilestoneVerifyBadge =
    !showsTruongVerifyBar &&
    (showOrgVerifyBadge || Boolean(verifiedBy?.trim()));
  const canManageArticleTags = canManageCoAuthors;
  const coAuthorExcludeOwnerId =
    variant === "tagged" && postOwnerId && !isSelfAuthoredTagged
      ? postOwnerId
      : ownerProfileId ?? "";
  const canShowCoAuthorAction =
    (canProposeCoAuthor || canManageCoAuthors) && Boolean(tacPhamId);
  /** Id để PATCH vị trí — tác phẩm user hoặc bài đăng org (tagged). */
  const roleEditTargetId = tacPhamId ?? orgBaiDangRef?.postId ?? null;
  const visibleCoAuthors = coAuthorCredits.slice(0, MAX_VISIBLE_COAUTHORS);
  const hiddenCoAuthorCount = Math.max(
    0,
    coAuthorCredits.length - visibleCoAuthors.length,
  );
  const coAuthorsOnly = coAuthorCredits.filter((c) => !c.laChuSoHuu);
  const showAuthorsStrip = coAuthorsOnly.length > 0;
  const preview = media[0] ?? null;
  const hasCoverPreview = Boolean(preview?.src);
  const photoGridImages = milestoneCardPhotoGrid(
    noiDungBlocks,
    hasCoverPreview,
    body,
  );
  const showCardTitle = shouldShowMilestoneCardTitle(title, noiDungBlocks, body);
  const cardCaption = milestoneCardCaptionPlain(body, noiDungBlocks);
  const cardContentKind = milestoneCardContentKind(
    noiDungBlocks,
    hasCoverPreview,
    body,
  );
  const cardShellKind = bookmarkListing ? "listing" : cardContentKind;
  const contributorCount = coAuthorCredits.length;
  const otherContributorCount = coAuthorsOnly.length;
  const resolvedPostOwner = postOwnerSlug || ownerSlug || null;
  const isArticle = cardContentKind === "article";
  const isTextCard = cardContentKind === "text";
  const embedInteractivePeek =
    isArticle && articleCardEmbedInteractivePeek(body, noiDungBlocks);
  const articleHasExpandableContent =
    isArticle && articleCardHasExpandableContent(body, noiDungBlocks);
  /* Chỉ bài viết dài — xổ/thu nội dung; ảnh·video·bình luận không dùng sticky «Thu gọn». */
  const supportsInlineUnfold =
    articleHasExpandableContent && !embedInteractivePeek;
  const useFeedCompactMedia = feedCompactMedia && cardContentKind === "photo";
  const cardReadMoreHref =
    useFeedCompactMedia && readMoreHref ? readMoreHref : null;
  const chiChuCardText = useMemo(() => {
    if (!isTextCard) return null;
    return chiChuBodyPlain(title, body, noiDungBlocks);
  }, [isTextCard, title, body, noiDungBlocks]);
  const chiChuParagraphs = useMemo(
    () => (chiChuCardText ? splitChiChuParagraphs(chiChuCardText) : []),
    [chiChuCardText],
  );
  const chiChuCollapsible = Boolean(
    chiChuCardText &&
      chiChuNeedsCollapse(chiChuCardText, chiChuParagraphs.length),
  );
  const [chiChuExpanded, setChiChuExpanded] = useState(false);
  const [unfoldMounted, setUnfoldMounted] = useState(false);
  const [unfoldReady, setUnfoldReady] = useState(false);
  const showContent = inlineExpand?.showContent ?? false;
  const showComments = inlineExpand?.showComments ?? false;
  const showUnfold = showContent || showComments;
  const unfoldOpen = showUnfold && unfoldReady;
  const showChiChuUnfold =
    isTextCard && chiChuCollapsible && chiChuExpanded;
  const showUnfoldToggle = Boolean(
    (supportsInlineUnfold && showContent) || showChiChuUnfold,
  );
  const isContentOpen = supportsInlineUnfold && showContent;
  /* Khối xổ inline render khi: bài viết (xổ nội dung) HOẶC bất kỳ loại card nào
     đang mở bình luận. Ảnh/video/text không hỗ trợ xổ nội dung nhưng vẫn cho
     bình luận inline — nếu chỉ gate theo `supportsInlineUnfold` thì action bar
     (đã dời vào khối xổ) lẫn khối bình luận đều biến mất, khiến media "fill" chỗ
     trống. */
  const canRenderInlineUnfold = Boolean(
    inlineExpand && (supportsInlineUnfold || showComments),
  );
  const pinActionsAboveComments = Boolean(
    inlineExpand && showUnfold && showComments,
  );
  const authorsInUnfold = pinActionsAboveComments && showAuthorsStrip;
  const milestoneId = cotMocId ?? milestone.id;
  const likeActorsMediaLabel =
    cardContentKind === "photo" || cardContentKind === "video" ? "anh" : undefined;
  const orgAttachCotMocId = cotMocId ?? milestone.id;
  /* Đối tượng analytics: bài đăng tổ chức (`org_bai_dang`, vd. feed world) tính
     riêng theo `org_bai_dang`; còn lại là cột mốc thường. `cotMocId` của org
     post chính là `org_bai_dang.id` (xem worldJourneyOrgFeed). */
  const trackLoaiDoiTuong: LoaiDoiTuongSuKien = orgBaiDangRef
    ? "org_bai_dang"
    : "cot_moc";
  const trackIdDoiTuong = orgBaiDangRef?.postId ?? milestoneId;
  const [liveCommentCount, setLiveCommentCount] = useState(comments ?? 0);
  const [liveViewerCommented, setLiveViewerCommented] = useState(
    social?.viewerCommented ?? false,
  );
  /* Like/bookmark optimistic sống trên card — khi mở comment, action bar
     chuyển chỗ (pinActionsAboveComments) nên nút remount; nếu chỉ dựa props
     `social` từ server thì trạng thái local bị mất. */
  const [liveSocial, setLiveSocial] = useState(() => ({
    viewerLiked: social?.viewerLiked ?? false,
    likeCount: social?.likeCount ?? 0,
    viewerDisliked: social?.viewerDisliked ?? false,
    dislikeCount: social?.dislikeCount ?? 0,
    viewerBookmarked: social?.viewerBookmarked ?? false,
    bookmarkCount: social?.bookmarkCount ?? 0,
    showCounts: social?.showCounts ?? false,
  }));

  /* Analytics tiếp cận/tương tác — KHÔNG đo nội dung của chính mình. */
  const articleRef = useRef<HTMLElement | null>(null);
  /** Giữ scroll khi xổ bài dài — tránh viewport nhảy xuống cuối nội dung. */
  const expandScrollYRef = useRef<number | null>(null);
  /* Nguồn bề mặt — ưu tiên prop tường minh; fallback theo entityLens. */
  const nguonSuKien: NguonSuKien =
    analyticsNguon ?? (entityLens ? "entity_lens" : "journey_home");
  const [insightsOpen, setInsightsOpen] = useState(false);
  /* "Nội dung của mình" → KHÔNG tự đếm. Với BOOKMARK, chủ journey là NGƯỜI LƯU
     (không phải tác giả) nên lượt xem của họ + mọi người khác vẫn tính cho bài
     gốc (`cotMocId`); chỉ loại trừ đúng TÁC GIẢ GỐC (`postOwnerId`). */
  const trackOwnContent =
    variant === "bookmark"
      ? Boolean(viewerProfileId) && viewerProfileId === postOwnerId
      : isOwner ||
        (Boolean(viewerProfileId) &&
          (viewerProfileId === postOwnerId || viewerProfileId === ownerProfileId));
  /* Nút "Số liệu" — bài của mình (self/verified) hoặc bài mình được gắn thẻ
     (tagged → số liệu chung). Bookmark loại ngoài. Quyền cụ thể enforce ở server. */
  const canSeeInsights =
    isOwner &&
    Boolean(cotMocId) &&
    (variant === "self" || variant === "verified" || variant === "tagged");
  const onOpenInsights = canSeeInsights
    ? () => setInsightsOpen(true)
    : undefined;
  useImpressionTracker(
    articleRef,
    {
      loaiDoiTuong: trackLoaiDoiTuong,
      idDoiTuong: trackIdDoiTuong,
      nguon: nguonSuKien,
    },
    !trackOwnContent,
  );

  useEffect(() => {
    setLiveCommentCount(comments ?? 0);
  }, [comments]);

  useEffect(() => {
    setLiveViewerCommented(social?.viewerCommented ?? false);
  }, [social?.viewerCommented]);

  useEffect(() => {
    setLiveSocial({
      viewerLiked: social?.viewerLiked ?? false,
      likeCount: social?.likeCount ?? 0,
      viewerDisliked: social?.viewerDisliked ?? false,
      dislikeCount: social?.dislikeCount ?? 0,
      viewerBookmarked: social?.viewerBookmarked ?? false,
      bookmarkCount: social?.bookmarkCount ?? 0,
      showCounts: social?.showCounts ?? false,
    });
  }, [
    social?.viewerLiked,
    social?.likeCount,
    social?.viewerDisliked,
    social?.dislikeCount,
    social?.viewerBookmarked,
    social?.bookmarkCount,
    social?.showCounts,
  ]);

  useEffect(() => {
    function onSocialAction(event: Event) {
      const detail = (
        event as CustomEvent<{
          milestoneId?: string;
          liked?: boolean;
          likeCount?: number;
          disliked?: boolean;
          dislikeCount?: number;
          bookmarked?: boolean;
          bookmarkCount?: number;
        }>
      ).detail;
      if (!detail?.milestoneId || detail.milestoneId !== milestoneId) return;
      setLiveSocial((prev) => ({
        ...prev,
        ...(typeof detail.liked === "boolean"
          ? { viewerLiked: detail.liked }
          : {}),
        ...(typeof detail.likeCount === "number"
          ? { likeCount: detail.likeCount }
          : {}),
        ...(typeof detail.disliked === "boolean"
          ? { viewerDisliked: detail.disliked }
          : {}),
        ...(typeof detail.dislikeCount === "number"
          ? { dislikeCount: detail.dislikeCount }
          : {}),
        ...(typeof detail.bookmarked === "boolean"
          ? { viewerBookmarked: detail.bookmarked }
          : {}),
        ...(typeof detail.bookmarkCount === "number"
          ? { bookmarkCount: detail.bookmarkCount }
          : {}),
      }));
    }
    window.addEventListener("cins:social-action", onSocialAction);
    return () =>
      window.removeEventListener("cins:social-action", onSocialAction);
  }, [milestoneId]);

  useEffect(() => {
    setChiChuExpanded(false);
  }, [chiChuCardText, title]);

  useEffect(() => {
    if (!showUnfold) {
      setUnfoldReady(false);
      expandScrollYRef.current = null;
      return;
    }
    setUnfoldMounted(true);
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setUnfoldReady(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [showUnfold]);

  useLayoutEffect(() => {
    if (!showUnfold) return;
    const y = expandScrollYRef.current;
    if (y == null) return;
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
  }, [showUnfold, unfoldReady, showContent]);

  useEffect(() => {
    function onCommentsSync(event: Event) {
      const detail = (
        event as CustomEvent<{
          milestoneId?: string;
          count?: number;
          viewerCommented?: boolean;
        }>
      ).detail;
      if (detail?.milestoneId !== milestoneId) return;
      if (typeof detail.count === "number") {
        setLiveCommentCount(detail.count);
      }
      if (typeof detail.viewerCommented === "boolean") {
        setLiveViewerCommented(detail.viewerCommented);
      }
    }

    window.addEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
    return () =>
      window.removeEventListener(POST_COMMENTS_SYNC_EVENT, onCommentsSync);
  }, [milestoneId]);

  /* Hiển thị badge người đăng
   *   - variant === "self" (chính chủ đăng — `authorName` là tác giả thật)
   *   - có thông tin tên / avatar
   * Với "tagged"/"verified"/"bookmark": tác giả thật là người khác → KHÔNG
   * dùng `authorName` (chủ Journey). Bookmark: `via-bar` = lưu/chia sẻ của bạn;
   * `datebar` = người/tổ chức đăng bài gốc (`bookmark` / `orgBaiDangRef`).
   *
   * Với type === "ca-nhan": chỉ render user-badge, không kèm type-badge —
   * label "Cá nhân" trùng nghĩa với user-badge nên thừa.
   * Với các type khác (hoc/lam/du-an/...): render CẢ user-badge VÀ type-badge
   * để giữ ngữ cảnh loại cột mốc. */
  const showAuthorBadge =
    (variant === "self" || variant === "verified") &&
    Boolean(authorName || authorAvatarUrl || ownerSlug) &&
    !isCongDongPost;
  /** Badge loại «Cá nhân» — phân loại nội bộ; bạn bè / người lạ không cần thấy. */
  const showPersonalTypeBadge = isOwner || type !== "ca-nhan";
  /** Visibility (Công khai / Bạn bè / …) — metadata chỉ chủ Journey. */
  const showVisibilityMetaBadge = isOwner;
  const entityPosterLabel =
    authorName?.trim() ||
    milestone.lensOwnerName?.trim() ||
    (ownerSlug?.trim() ? `@${ownerSlug.trim()}` : null) ||
    (postOwnerSlug?.trim() ? `@${postOwnerSlug.trim()}` : null);
  const entityPosterSlug =
    ownerSlug?.trim() ||
    postOwnerSlug?.trim() ||
    milestone.lensOwnerSlug?.trim() ||
    null;
  const entityPosterAvatar =
    authorAvatarUrl ?? milestone.lensOwnerAvatarUrl ?? null;
  /* Người đăng entity là 1 TỔ CHỨC (bài org đăng, không phải org tag bài user)
   * → dùng card org (cover + theo dõi + nhắn tin) thay vì card cá nhân. */
  const entityPosterOrgKind =
    attribution?.isOrg &&
    attribution.slug?.trim() &&
    attribution.slug.trim() === entityPosterSlug
      ? orgKindForOrgPopover(attribution.orgKind)
      : undefined;
  /** Trang entity / feed tổng hợp — datebar đọc-only cho người xem.
   * Chủ bài (`canManage`) dùng datebar chuẩn như `/[slug]/journey`. */
  const showEntityDatebar =
    entityLens &&
    !useForeignFrame &&
    !(canManage && ownerSlug) &&
    (Boolean(entityPosterLabel || authorAvatarUrl || milestone.lensOwnerAvatarUrl) ||
      (isCongDongPost && Boolean(congDongOrg)));

  /* Người xem nội dung của người khác → menu "..." (mở / chia sẻ / copy / báo cáo).
   * Chỉ hiện khi viewer KHÔNG quản lý được nội dung và đây không phải bài của
   * chính họ. Báo cáo gắn vào cột mốc (`cot_moc`). */
  const viewerReportTargetId = cotMocId ?? milestone.id;
  const viewerPostOwnerSlug =
    postOwnerSlug?.trim() ||
    entityPosterSlug ||
    ownerSlug?.trim() ||
    null;
  const viewerPostHref =
    postSlug && viewerPostOwnerSlug
      ? `/${viewerPostOwnerSlug}/p/${postSlug}`
      : null;
  const isOwnContent =
    Boolean(viewerProfileId) &&
    (viewerProfileId === postOwnerId || viewerProfileId === ownerProfileId);
  const showViewerMenu =
    !canManage && !isOwnContent && Boolean(viewerReportTargetId);
  const viewerMenuNode = showViewerMenu ? (
    <JourneyMilestoneViewerMenu
      reportTargetId={viewerReportTargetId}
      reportTargetTitle={title}
      postHref={viewerPostHref}
      viewerLoggedIn={Boolean(viewerProfileId)}
      className="jcard-viewer-menu"
    />
  ) : null;

  const worldBoostTarget = worldBoostTargetFromMilestoneLike({
    cotMocId: cotMocId ?? milestone.cotMocId,
    orgBaiDangRef,
    orgSuKienRef,
  });
  const worldBoostToggleNode =
    worldBoostAdmin?.canBoost && worldBoostTarget ? (
      <WorldBoostToggle
        loai={worldBoostTarget.loai}
        id={worldBoostTarget.id}
        className="jcard-world-boost"
      />
    ) : null;

  /* "Đẩy World" đứng trước badge loại (Cá nhân / …) trong cùng badge-row.
   * Góc phải chỉ còn menu "..." — và boost fallback khi card không có cụm loại. */
  const boostBesideTypeBadge =
    Boolean(worldBoostToggleNode) &&
    ((Boolean(canManage && ownerSlug) && !useForeignFrame) ||
      (variant === "self" && !canManage));
  const boostInCorner =
    Boolean(worldBoostToggleNode) && !boostBesideTypeBadge;
  const viewerCornerActionsNode =
    viewerMenuNode || boostInCorner ? (
      <div className="jcard-corner-actions">
        {boostInCorner ? worldBoostToggleNode : null}
        {viewerMenuNode}
      </div>
    ) : null;
  const typeBadgeBoostNode = boostBesideTypeBadge
    ? worldBoostToggleNode
    : null;

  function shouldIgnoreExpandTrigger(target: Element | null): boolean {
    return Boolean(
      target?.closest(
        "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-video-native, .jcard-video-root, .jcard-actions",
      ),
    );
  }

  function trackContentOpen() {
    if (trackOwnContent) return;
    trackSuKien({
      loai_su_kien: "mo_card",
      loai_doi_tuong: trackLoaiDoiTuong,
      id_doi_tuong: trackIdDoiTuong,
      nguon: nguonSuKien,
    });
  }

  function trackCommentOpen() {
    if (trackOwnContent) return;
    trackSuKien({
      loai_su_kien: "xem_binh_luan",
      loai_doi_tuong: trackLoaiDoiTuong,
      id_doi_tuong: trackIdDoiTuong,
      nguon: nguonSuKien,
    });
  }

  function handleExpandTrigger(e: React.MouseEvent<HTMLElement>) {
    if (
      !supportsInlineUnfold ||
      !inlineExpand ||
      isContentOpen ||
      shouldIgnoreExpandTrigger(e.target as Element)
    ) {
      return;
    }
    expandScrollYRef.current = window.scrollY;
    trackContentOpen();
    inlineExpand.onToggleContent();
  }

  function handleExpandKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (!supportsInlineUnfold || !inlineExpand || isContentOpen) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (shouldIgnoreExpandTrigger(e.target as Element)) return;
    e.preventDefault();
    expandScrollYRef.current = window.scrollY;
    trackContentOpen();
    inlineExpand.onToggleContent();
  }

  const jcardAuthors = showAuthorsStrip ? (
    <div className="jcard-authors" aria-label="Đồng tác giả">
      <details className="authors-details">
        <summary className="authors-collapsed">
          <span className="av-stack" aria-hidden>
            {visibleCoAuthors.map((c, i) => (
              <AuthorAvatar
                key={`${c.slug ?? c.name}-${i}`}
                credit={c}
                tone={AVATAR_TONE_CLASSES[i % AVATAR_TONE_CLASSES.length] ?? "av-blue"}
              />
            ))}
            {hiddenCoAuthorCount > 0 ? (
              <span className="av-more">+{hiddenCoAuthorCount}</span>
            ) : null}
          </span>
          <span className="authors-right">
            <span className="authors-summary">
              {otherContributorCount} người đóng góp khác
            </span>
            <span className="authors-toggle-slot">
              <span className="expand-hint" aria-label="Xem tất cả">
                <Eye size={15} strokeWidth={1.9} aria-hidden />
              </span>
              <span className="collapse-hint" aria-label="Thu gọn">
                <ChevronUp size={15} strokeWidth={2} aria-hidden />
              </span>
            </span>
          </span>
        </summary>
        <div className="authors-expanded">
          <div className="expanded-header">
            <span>{contributorCount} người đóng góp</span>
          </div>
          {coAuthorCredits.map((c, i) => (
            <div
              key={`${c.slug ?? c.name}-${i}`}
              className={
                "author-row-item" +
                (c.trangThai === "pending" ? " is-pending-credit" : "")
              }
            >
              <JourneyUserPopover
                slug={c.slug}
                fallbackName={c.name}
                fallbackAvatarUrl={c.avatarUrl}
              >
                <span className="author-row-person">
                  <AuthorAvatar
                    credit={c}
                    tone={AVATAR_TONE_CLASSES[i % AVATAR_TONE_CLASSES.length] ?? "av-blue"}
                  />
                  <span className="author-row-info author-row-inline">
                    <span
                      className={`author-row-name${
                        variant === "tagged" && c.slug && c.slug === ownerSlug
                          ? " is-you"
                          : ""
                      }`}
                    >
                      {c.name}
                    </span>
                    {parseVaiTroPositions(c.role).map((pos) => (
                      <AuthorRoleTooltip key={pos} role={pos} />
                    ))}
                  </span>
                </span>
              </JourneyUserPopover>
              {c.laChuSoHuu ? (
                <span className="abadge abadge-owner">Chủ bài</span>
              ) : c.trangThai === "pending" ? (
                <span className="abadge abadge-pending">Chờ xác nhận</span>
              ) : null}
              {/* Org bài đăng tagged không có `tacPhamId` — dùng `orgBaiDangRef.postId`
                  (API PATCH /tac-pham/... fallback sang org_bai_dang_tac_gia). */}
              {roleEditTargetId &&
              viewerProfileId &&
              (c.idNguoiDung === viewerProfileId ||
                (isOwner && Boolean(c.slug) && c.slug === ownerSlug)) &&
              c.trangThai !== "pending" ? (
                <JourneyOwnCoAuthorRoleEditor
                  tacPhamId={roleEditTargetId}
                  userId={viewerProfileId}
                  role={c.role}
                  onSaved={(positions) => {
                    const nextRole = joinVaiTroPositions(positions);
                    setCoAuthorRoleOverrides((current) => ({
                      ...current,
                      [c.idNguoiDung ?? viewerProfileId]: nextRole,
                    }));
                  }}
                />
              ) : null}
              <JourneyAuthorRowFriendAction
                targetUserId={c.idNguoiDung}
                viewerProfileId={viewerProfileId}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  ) : null;

  const jcardActions = (
    <div className="jcard-actions">
      <JourneyLikeButton
        milestoneId={milestoneId}
        initialLiked={liveSocial.viewerLiked}
        initialCount={liveSocial.likeCount}
        showCount={liveSocial.showCounts}
        actorsMediaLabel={likeActorsMediaLabel}
        sharePath={viewerPostHref}
        shareTitle={title}
      />
      <JourneyDislikeButton
        milestoneId={milestoneId}
        initialDisliked={liveSocial.viewerDisliked}
        initialCount={liveSocial.dislikeCount}
        showCount={liveSocial.showCounts}
        actorsMediaLabel={likeActorsMediaLabel}
      />
      {inlineExpand ? (
        <JourneyCommentLink
          commentCount={liveCommentCount}
          viewerCommented={liveViewerCommented}
          idDoiTuong={milestoneId}
          sharePath={viewerPostHref}
          shareTitle={title}
          onOpenComments={() => {
            trackCommentOpen();
            inlineExpand.onOpenComments();
          }}
        />
      ) : (
        <JourneyCommentLink
          commentCount={liveCommentCount}
          viewerCommented={liveViewerCommented}
          idDoiTuong={milestoneId}
          sharePath={viewerPostHref}
          shareTitle={title}
          openPostPopup
        />
      )}
      {canBookmark ? (
        <JourneyBookmarkButton
          milestoneId={milestoneId}
          title={title}
          initialSaved={liveSocial.viewerBookmarked}
          initialCount={liveSocial.bookmarkCount}
          showCount={liveSocial.showCounts}
        />
      ) : null}
      <span className="action-spacer" />
      {canManageArticleTags && tacPhamId ? (
        <JourneyArticleTagManager
          tacPhamId={tacPhamId}
          initialTags={liveArticleTags}
          onTagsSaved={handleArticleTagsSaved}
        />
      ) : null}
      {canShowCoAuthorAction && tacPhamId && !isCongDongPost ? (
        <JourneyCoAuthorProposal
          tacPhamId={tacPhamId}
          mode={canManageCoAuthors ? "owner" : "proposal"}
          ownerId={coAuthorExcludeOwnerId}
        />
      ) : null}
      {canManageCoAuthors && tacPhamId && !isCongDongPost && ownerSlug && orgAttachCotMocId ? (
        <JourneyOrgAttachTrigger
          tacPhamId={tacPhamId}
          cotMocId={orgAttachCotMocId}
          milestoneTitle={title}
          milestoneKind={type}
          ownerSlug={ownerSlug}
          postSlug={postSlug}
          coverSrc={media[0]?.src ?? null}
          coverAlt={media[0]?.label ?? title}
          photoCount={media.length > 0 ? media.length : null}
          bodyExcerpt={body ?? null}
        />
      ) : null}
      {views ? (
        <span className="jcard-view-count" aria-label={`${formatViews(views)} lượt xem`}>
          {formatViews(views)}
        </span>
      ) : null}
      {viewerPostHref ? (
        <PostShareMenu
          sharePath={viewerPostHref}
          shareTitle={title}
          className="jcard-share"
          buttonClassName="share-btn"
        />
      ) : null}
    </div>
  );

  function renderPersonalFilterToolbarControl() {
    if (!primaryPersonalFilter || !ownerSlug) return null;
    return (
      <JourneyMilestoneInlineControls
        kind="type"
        milestoneId={personalFilterMenuId}
        current={type}
        options={EDITABLE_TYPE_OPTIONS}
        personalFilterSlugs={personalFilterSlugs}
      >
        <span
          className={`ctx-badge ${personalFilterBadgeClass(primaryPersonalFilter.slug)}`}
          title={primaryPersonalFilter.ten}
          aria-label={primaryPersonalFilter.ten}
        >
          <PersonalFilterBadge filter={primaryPersonalFilter} />
        </span>
      </JourneyMilestoneInlineControls>
    );
  }

  return (
    <article
      ref={articleRef}
      className={milestoneCls + ((showUnfold || showChiChuUnfold) ? " is-card-expanded" : "")}
      data-mid={cotMocId ?? milestone.id}
      data-content-kind={cardShellKind}
      data-year={year}
      data-month={month}
      data-group={type}
      data-post-slug={postSlug ?? undefined}
      data-post-owner-slug={postOwnerSlug ?? undefined}
    >
      <div className="j-m-body-wrap">
        {useForeignFrame ? (
          <div
            className={
              "j-bookmark-frame j-bookmark-frame--" +
              bookmarkFrameCssKind(foreignFrameKind)
            }
          >
            <BookmarkFrameHeader
              ownerName={bookmarkOwnerLabel}
              ownerSlug={ownerSlug ?? null}
              ownerAvatarUrl={authorAvatarUrl}
              dateLabel={foreignFrameDateLabel}
              dateLead={foreignFrameDateLead}
              dateTitle={foreignFrameDateTitle}
              toolbar={renderForeignFrameToolbar()}
            />
            <div
              className={
                "j-m-card jcard j-bookmark-frame-card jcard--" +
                cardShellKind +
                (supportsInlineUnfold ? " has-unfold" : "") +
                (showUnfold
                  ? " is-expanded"
                  : supportsInlineUnfold
                    ? " is-collapsed"
                    : "")
              }
            >
              {renderMilestoneCardInterior()}
            </div>
          </div>
        ) : (
          <div
            className={
              "j-m-card jcard jcard--" +
              cardShellKind +
              (supportsInlineUnfold ? " has-unfold" : "") +
              (showUnfold
                ? " is-expanded"
                : supportsInlineUnfold
                  ? " is-collapsed"
                  : "")
            }
          >
            {renderMilestoneCardInterior()}
          </div>
        )}
      </div>
      {canSeeInsights ? (
        <JourneyMilestoneInsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          milestoneId={cotMocId ?? milestone.id}
        />
      ) : null}
    </article>
  );

  function renderForeignFrameToolbar() {
    const canEditToolbar =
      isOwner &&
      Boolean(ownerSlug) &&
      ((isBookmarkMilestone && canManageSelf) ||
        (canManageTagged && (isTaggedFromOthers || isTaggedOrgBaiDang)) ||
        (isCongDongSelfPost && canManageSelf));
    return (
      <>
        <span className="badge-row">
          {canEditToolbar && ownerSlug ? (
            <>
              {isCongDongSelfPost ? (
                <JourneyMilestoneInlineControls
                  kind="type"
                  milestoneId={cotMocId ?? milestone.id}
                  current={type}
                  options={EDITABLE_TYPE_OPTIONS}
                  personalFilterSlugs={personalFilterSlugs}
                  congDongPost={congDongInlineContext(congDongOrg, title)}
                >
                  <CongDongTypeBadge />
                </JourneyMilestoneInlineControls>
              ) : showMilestoneVerifyBadge && showOrgVerifyBadge && !isSelfAuthoredTagged ? (
                <>
                  <MilestoneVerifyBadge />
                  {renderPersonalFilterToolbarControl()}
                </>
              ) : (
                <JourneyMilestoneInlineControls
                  kind="type"
                  milestoneId={cotMocId ?? milestone.id}
                  current={type}
                  options={EDITABLE_TYPE_OPTIONS}
                  personalFilterSlugs={
                    !foreignJourneyContext ? personalFilterSlugs : undefined
                  }
                >
                  <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                    <MilestoneTypeBadgeContent type={type} />
                  </span>
                </JourneyMilestoneInlineControls>
              )}
              {vis ? (
                <JourneyMilestoneInlineControls
                  kind="visibility"
                  milestoneId={cotMocId ?? milestone.id}
                  current={visibility ?? "public"}
                  options={
                    foreignJourneyContext
                      ? FOREIGN_JOURNEY_VIS_OPTIONS
                      : isCongDongSelfPost
                        ? CONG_DONG_GRADUATE_VIS_OPTIONS
                        : EDITABLE_VIS_OPTIONS
                  }
                  foreignJourney={foreignJourneyContext}
                  congDongPost={
                    isCongDongSelfPost
                      ? congDongInlineContext(congDongOrg, title)
                      : undefined
                  }
                >
                  {isCongDongSelfPost ? (
                    <span
                      className="ctx-badge j-vis-cong-dong j-vis-cong-dong--icon"
                      title={vis.label}
                      aria-label={vis.label}
                    >
                      <vis.Icon size={11} strokeWidth={1.8} aria-hidden />
                    </span>
                  ) : (
                    <span
                      className={`ctx-badge j-vis-${visibility ?? "public"}`}
                      title={vis.label}
                      aria-label={vis.label}
                    >
                      <vis.Icon
                        size={11}
                        strokeWidth={1.8}
                        aria-hidden
                        {...(visibility === "feature"
                          ? { fill: "currentColor" }
                          : {})}
                      />
                      {visibility === "feature" ? "Feature" : vis.label}
                    </span>
                  )}
                </JourneyMilestoneInlineControls>
              ) : null}
            </>
          ) : (
            <>
              {isCongDongSelfPost ? (
                <CongDongTypeBadge />
              ) : showMilestoneVerifyBadge && showOrgVerifyBadge && !isSelfAuthoredTagged ? (
                <MilestoneVerifyBadge />
              ) : showPersonalTypeBadge ? (
                <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                  <MilestoneTypeBadgeContent type={type} />
                </span>
              ) : null}
              {vis && showVisibilityMetaBadge ? (
                <span
                  className={`ctx-badge ${
                    isCongDongSelfPost
                      ? "j-vis-cong-dong"
                      : `j-vis-${visibility ?? "public"}`
                  }`}
                  title={vis.label}
                  aria-label={vis.label}
                >
                  <vis.Icon
                    size={11}
                    strokeWidth={1.8}
                    aria-hidden
                    {...(visibility === "feature" ? { fill: "currentColor" } : {})}
                  />
                  {visibility === "feature" && !isCongDongSelfPost
                    ? "Feature"
                    : vis.label}
                </span>
              ) : null}
            </>
          )}
        </span>
        {canEditToolbar && ownerSlug ? (
          <JourneyMilestoneOwnerMenu
            milestoneId={personalFilterMenuId}
            ownerSlug={ownerSlug}
            permalinkOwnerSlug={resolvedPostOwner}
            currentType={type}
            currentVisibility={visibility ?? "public"}
            postSlug={postSlug ?? null}
            hideTypeChange={
              isBookmarkMilestone ||
              isCongDongSelfPost ||
              (isTaggedOrgBaiDang && !isSelfAuthoredTagged)
            }
            hideEdit={
              isBookmarkMilestone ||
              isTaggedFromOthers ||
              (isTaggedOrgBaiDang && !isSelfAuthoredTagged)
            }
            hideDelete={isTaggedFromOthers || isTaggedOrgBaiDang}
            foreignJourney={foreignJourneyContext}
            personalFilterSlugs={personalFilterSlugs}
            personalFilterLoai={personalFilterLoai}
            allowPersonalFilter={allowPersonalFilterOnMenu}
            className="jcard-date-menu"
            onOpenInsights={onOpenInsights}
            milestoneKey={milestone.id}
            journeyGhimLuc={milestone.journeyGhimLuc ?? null}
            showJourneyPin={showJourneyPin}
          />
        ) : null}
      </>
    );
  }

  function renderMilestoneCardInterior() {
    const unfoldToggle = showUnfoldToggle ? (
      <div className="jcard-unfold-sticky">
        <button
          type="button"
          className="jcard-unfold-toggle"
          onClick={() => {
            if (showChiChuUnfold) {
              setChiChuExpanded(false);
              return;
            }
            /* Thu gọn nội dung — không đóng bình luận nếu đang mở. */
            inlineExpand?.onToggleContent();
          }}
          aria-label="Thu gọn"
        >
          <ChevronUp size={15} strokeWidth={2.2} aria-hidden />
          <span>Thu gọn</span>
        </button>
      </div>
    ) : null;

    return (
      <>
        {/* Phạm vi sticky «Thu gọn»: chỉ phần nội dung (trước action bar). */}
        <div className="j-m-card-main">
          {unfoldToggle}
          {/* Verify bar (trường xác thực) — hiện cho mọi người, kể cả trên home/entity feed. */}
          {showsTruongVerifyBar && attribution ? (
            <TruongVerifyBar attr={attribution} />
          ) : null}

          {variant === "tagged" || variant === "verified" ? (
            attribution &&
            !canManageTagged &&
            !isSelfAuthoredTagged &&
            !useForeignFrame &&
            !entityLens &&
            !showsTruongVerifyBar ? (
              <TaggedByPanel
                attr={attribution}
                dateLabel={displayDate}
                variant={variant}
                verifyBarContext={truongVerifyBarContext}
              />
            ) : null
          ) : null}

          {showEntityDatebar ? (
            <div
              className={
                "jcard-datebar jcard-datebar--entity-lens" +
                (isCongDongPost && congDongOrg ? " jcard-datebar--cong-dong" : "")
              }
            >
              {isCongDongPost && congDongOrg ? (
                <>
                  <CongDongSourceChip
                    org={congDongOrg}
                    dateLabel={displayDate}
                    posterName={entityPosterLabel}
                    posterSlug={entityPosterSlug}
                    posterAvatarUrl={entityPosterAvatar}
                  />
                  {feedSuggestion ? (
                    <span className="ctx-badge j-feed-suggestion-badge">
                      Gợi ý
                    </span>
                  ) : null}
                </>
              ) : entityPosterOrgKind ? (
                <JourneyOrgPopover
                  slug={entityPosterSlug ?? attribution?.slug ?? ""}
                  orgKind={entityPosterOrgKind}
                  href={attribution?.href ?? undefined}
                  fallbackName={
                    entityPosterLabel ?? entityPosterSlug ?? "Tổ chức"
                  }
                  fallbackAvatarUrl={entityPosterAvatar}
                >
                  <span className="org-chip">
                    <span className="org-logo" aria-hidden>
                      {entityPosterAvatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={entityPosterAvatar} alt="" />
                      ) : (
                        getNameInitials(
                          entityPosterLabel ?? null,
                          entityPosterSlug ?? "C",
                        )
                      )}
                    </span>
                    <span className="org-copy">
                      <strong>
                        {entityPosterLabel ||
                          (ownerSlug ? `@${ownerSlug}` : "Tổ chức")}
                      </strong>
                      <small>{displayDate}</small>
                    </span>
                  </span>
                </JourneyOrgPopover>
              ) : (
                <JourneyUserPopover
                  slug={entityPosterSlug ?? ""}
                  fallbackName={
                    entityPosterLabel ?? entityPosterSlug ?? "Người dùng"
                  }
                  fallbackAvatarUrl={entityPosterAvatar}
                  track={
                    trackOwnContent
                      ? null
                      : {
                          idBoiCanh: milestoneId,
                          nguon: nguonSuKien,
                        }
                  }
                >
                  <span className="org-chip">
                    <span className="org-logo" aria-hidden>
                      {entityPosterAvatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={entityPosterAvatar} alt="" />
                      ) : (
                        getNameInitials(
                          entityPosterLabel ?? null,
                          entityPosterSlug ?? "C",
                        )
                      )}
                    </span>
                    <span className="org-copy">
                      <strong>
                        {entityPosterLabel ||
                          (ownerSlug ? `@${ownerSlug}` : "Người dùng")}
                        <VerifiedTick slug={entityPosterSlug} />
                      </strong>
                      <small>{displayDate}</small>
                    </span>
                  </span>
                </JourneyUserPopover>
              )}
              {/* Trang chủ/entity: badge trạng thái chỉ chủ bài thấy & sửa được. */}
              {canManage && ownerSlug ? (
                <span className="badge-row">
                  {typeBadgeBoostNode}
                  {isBookmarkMilestone ? (
                    <span className="ctx-badge j-type-bookmark">
                      <Bookmark size={11} strokeWidth={1.8} aria-hidden />
                      {TYPE_LABEL.bookmark}
                    </span>
                  ) : isCongDongPost ? (
                    <span className="ctx-badge j-vis-cong-dong">
                      <Users size={11} strokeWidth={1.8} aria-hidden />
                      Cộng đồng
                    </span>
                  ) : showMilestoneVerifyBadge && showOrgVerifyBadge && !isSelfAuthoredTagged ? (
                    <MilestoneVerifyBadge />
                  ) : (
                    <JourneyMilestoneInlineControls
                      kind="type"
                      milestoneId={cotMocId ?? milestone.id}
                      current={type}
                      options={EDITABLE_TYPE_OPTIONS}
                      personalFilterSlugs={
                        canManageSelf && !foreignJourneyContext
                          ? personalFilterSlugs
                          : undefined
                      }
                    >
                      <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                        <MilestoneTypeBadgeContent type={type} />
                      </span>
                    </JourneyMilestoneInlineControls>
                  )}
                  {showMilestoneVerifyBadge && (!showOrgVerifyBadge || isSelfAuthoredTagged) ? (
                    <MilestoneVerifyBadge />
                  ) : null}
                  {vis && !isCongDongPost ? (
                    <JourneyMilestoneInlineControls
                      kind="visibility"
                      milestoneId={cotMocId ?? milestone.id}
                      current={visibility ?? "public"}
                      options={
                        foreignJourneyContext
                          ? FOREIGN_JOURNEY_VIS_OPTIONS
                          : EDITABLE_VIS_OPTIONS
                      }
                      foreignJourney={foreignJourneyContext}
                    >
                      <span
                        className={`ctx-badge j-vis-${visibility ?? "public"}`}
                        title={vis.label}
                        aria-label={vis.label}
                      >
                        <vis.Icon
                          size={11}
                          strokeWidth={1.8}
                          aria-hidden
                          {...(visibility === "feature"
                            ? { fill: "currentColor" }
                            : {})}
                        />
                        {visibility === "feature" ? "Feature" : vis.label}
                      </span>
                    </JourneyMilestoneInlineControls>
                  ) : null}
                </span>
              ) : null}
              {viewerCornerActionsNode}
            </div>
          ) : canManage && ownerSlug ? (
            <div
              className={
                "jcard-datebar" +
                (canManageTagged ? " jcard-datebar--tagged" : "") +
                (congDongOrg ? " jcard-datebar--cong-dong" : "") +
                (useForeignFrame ? " jcard-datebar--bookmark-source" : "")
              }
            >
              {canManageTagged &&
              attribution &&
              !isSelfAuthoredTagged &&
              !useForeignFrame &&
              !showsTruongVerifyBar ? (
                <TaggedByPanel
                  attr={attribution}
                  dateLabel={displayDate}
                  variant={variant}
                  verifyBarContext={truongVerifyBarContext}
                />
              ) : null}
              {isCongDongPost && congDongOrg ? (
                <>
                  <CongDongSourceChip
                    org={congDongOrg}
                    dateLabel={displayDate}
                    posterName={useForeignFrame ? undefined : entityPosterLabel}
                    frameInner={useForeignFrame}
                  />
                  {feedSuggestion ? (
                    <span className="ctx-badge j-feed-suggestion-badge">
                      Gợi ý
                    </span>
                  ) : null}
                </>
              ) : isTaggedFromOthers && attribution ? (
                <TaggedOriginalAuthorChip
                  attr={attribution}
                  dateLabel={displayDate}
                />
              ) : isBookmarkMilestone && congDongOrg ? (
                <CongDongSourceChip
                  org={congDongOrg}
                  dateLabel={displayDate}
                  frameInner
                />
              ) : (isBookmarkMilestone || isTaggedOrgBaiDang) && bookmark ? (
                <BookmarkOriginalPosterChip
                  bookmark={bookmark}
                  orgBaiDangRef={orgBaiDangRef}
                  dateLabel={displayDate}
                />
              ) : showAuthorBadge ? (
                ownerSlug ? (
                  <JourneyUserPopover
                    slug={ownerSlug}
                    fallbackName={
                      authorName || (ownerSlug ? `@${ownerSlug}` : "Người dùng")
                    }
                    fallbackAvatarUrl={authorAvatarUrl}
                    track={
                      trackOwnContent
                        ? null
                        : {
                            idBoiCanh: milestoneId,
                            nguon: nguonSuKien,
                          }
                    }
                  >
                    <span className="org-chip">
                      <span className="org-logo" aria-hidden>
                        {authorAvatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={authorAvatarUrl} alt="" />
                        ) : (
                          getNameInitials(authorName ?? null, ownerSlug ?? "C")
                        )}
                      </span>
                      <span className="org-copy">
                        <strong>
                          {authorName || `@${ownerSlug ?? ""}`}
                          <VerifiedTick slug={ownerSlug} />
                        </strong>
                        <small>{displayDate}</small>
                      </span>
                    </span>
                  </JourneyUserPopover>
                ) : (
                  <span className="org-chip">
                    <span className="org-logo" aria-hidden>
                      {authorAvatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={authorAvatarUrl} alt="" />
                      ) : (
                        getNameInitials(authorName ?? null, "C")
                      )}
                    </span>
                    <span className="org-copy">
                      <strong>{authorName || "Người dùng"}</strong>
                      <small>{displayDate}</small>
                    </span>
                  </span>
                )
              ) : null}
              {!useForeignFrame ? (
                <>
                  <span className="badge-row">
                    {typeBadgeBoostNode}
                    {showMilestoneVerifyBadge &&
                    showOrgVerifyBadge &&
                    !isSelfAuthoredTagged ? (
                      <MilestoneVerifyBadge />
                    ) : isCongDongPost ? (
                      <JourneyMilestoneInlineControls
                        kind="type"
                        milestoneId={cotMocId ?? milestone.id}
                        current={type}
                        options={EDITABLE_TYPE_OPTIONS}
                        personalFilterSlugs={
                          canManageSelf && !foreignJourneyContext
                            ? personalFilterSlugs
                            : undefined
                        }
                        congDongPost={congDongInlineContext(congDongOrg, title)}
                      >
                        <CongDongTypeBadge />
                      </JourneyMilestoneInlineControls>
                    ) : (
                      <JourneyMilestoneInlineControls
                        kind="type"
                        milestoneId={cotMocId ?? milestone.id}
                        current={type}
                        options={EDITABLE_TYPE_OPTIONS}
                        personalFilterSlugs={
                          canManageSelf && !foreignJourneyContext
                            ? personalFilterSlugs
                            : undefined
                        }
                      >
                        <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                          <MilestoneTypeBadgeContent type={type} />
                        </span>
                      </JourneyMilestoneInlineControls>
                    )}
                    {showMilestoneVerifyBadge && (!showOrgVerifyBadge || isSelfAuthoredTagged) ? (
                      <MilestoneVerifyBadge />
                    ) : null}
                    {vis ? (
                      <JourneyMilestoneInlineControls
                        kind="visibility"
                        milestoneId={cotMocId ?? milestone.id}
                        current={visibility ?? "public"}
                        options={
                          foreignJourneyContext
                            ? FOREIGN_JOURNEY_VIS_OPTIONS
                            : isCongDongPost
                              ? CONG_DONG_GRADUATE_VIS_OPTIONS
                              : EDITABLE_VIS_OPTIONS
                        }
                        foreignJourney={foreignJourneyContext}
                        congDongPost={
                          isCongDongPost
                            ? congDongInlineContext(congDongOrg, title)
                            : undefined
                        }
                      >
                        {isCongDongPost ? (
                          <span
                            className="ctx-badge j-vis-cong-dong j-vis-cong-dong--icon"
                            title={vis.label}
                            aria-label={vis.label}
                          >
                            <vis.Icon size={11} strokeWidth={1.8} aria-hidden />
                          </span>
                        ) : (
                          <span
                            className={`ctx-badge j-vis-${visibility ?? "public"}`}
                            title={vis.label}
                            aria-label={vis.label}
                          >
                            <vis.Icon
                              size={11}
                              strokeWidth={1.8}
                              aria-hidden
                              {...(visibility === "feature"
                                ? { fill: "currentColor" }
                                : {})}
                            />
                            {visibility === "feature" ? "Feature" : vis.label}
                          </span>
                        )}
                      </JourneyMilestoneInlineControls>
                    ) : null}
                  </span>
                  <JourneyMilestoneOwnerMenu
                    milestoneId={personalFilterMenuId}
                    ownerSlug={ownerSlug}
                    permalinkOwnerSlug={
                      canManageTagged ? resolvedPostOwner : ownerSlug
                    }
                    currentType={type}
                    currentVisibility={visibility ?? "public"}
                    postSlug={postSlug ?? null}
                    hideTypeChange={isCongDongPost}
                    hideEdit={canManageTagged}
                    hideDelete={canManageTagged}
                    foreignJourney={foreignJourneyContext}
                    personalFilterSlugs={personalFilterSlugs}
                    personalFilterLoai={personalFilterLoai}
                    allowPersonalFilter={allowPersonalFilterOnMenu}
                    className="jcard-date-menu"
                    onOpenInsights={onOpenInsights}
                    milestoneKey={milestone.id}
                    journeyGhimLuc={milestone.journeyGhimLuc ?? null}
                    showJourneyPin={showJourneyPin}
                  />
                </>
              ) : null}
            </div>
          ) : isCongDongSelfPost && congDongOrg ? (
            <div className="jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source jcard-datebar--cong-dong">
              <CongDongSourceChip
                org={congDongOrg}
                dateLabel={displayDate}
                frameInner
              />
            </div>
          ) : variant === "self" ? (
            <div className="jcard-datebar jcard-datebar--guest">
              {Boolean(authorName || authorAvatarUrl || ownerSlug) ? (
                <JourneyUserPopover
                  slug={ownerSlug ?? ""}
                  fallbackName={
                    authorName || (ownerSlug ? `@${ownerSlug}` : "Người dùng")
                  }
                  fallbackAvatarUrl={authorAvatarUrl}
                  track={
                    trackOwnContent
                      ? null
                      : {
                          idBoiCanh: milestoneId,
                          nguon: nguonSuKien,
                        }
                  }
                >
                  <span className="org-chip">
                    <span className="org-logo" aria-hidden>
                      {authorAvatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={authorAvatarUrl} alt="" />
                      ) : (
                        getNameInitials(authorName ?? null, ownerSlug ?? "C")
                      )}
                    </span>
                    <span className="org-copy">
                      <strong>
                        {authorName || `@${ownerSlug ?? ""}`}
                        <VerifiedTick slug={ownerSlug} />
                      </strong>
                      <small>{displayDate}</small>
                    </span>
                  </span>
                </JourneyUserPopover>
              ) : (
                <span className="org-copy">
                  <small>{displayDate}</small>
                </span>
              )}
              <span className="badge-row">
                {typeBadgeBoostNode}
                {showPersonalTypeBadge ? (
                  <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                    <MilestoneTypeBadgeContent type={type} />
                  </span>
                ) : null}
              </span>
              {viewerCornerActionsNode}
            </div>
          ) : isTaggedFromOthers && attribution ? (
            <div className="jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source">
              <TaggedOriginalAuthorChip
                attr={attribution}
                dateLabel={displayDate}
              />
            </div>
          ) : isBookmarkMilestone && congDongOrg ? (
            <div className="jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source jcard-datebar--cong-dong">
              <CongDongSourceChip
                org={congDongOrg}
                dateLabel={displayDate}
                frameInner
              />
            </div>
          ) : isBookmarkMilestone && bookmark ? (
            <div
              className={
                "jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source" +
                (bookmark.sourceKind === "cong_dong" ||
                orgBaiDangRef?.orgKind === "cong_dong"
                  ? " jcard-datebar--cong-dong"
                  : "")
              }
            >
              <BookmarkOriginalPosterChip
                bookmark={bookmark}
                orgBaiDangRef={orgBaiDangRef}
                dateLabel={displayDate}
              />
            </div>
          ) : variant === "verified" &&
            Boolean(authorName || authorAvatarUrl || ownerSlug) &&
            !isCongDongPost ? (
            <div className="jcard-datebar jcard-datebar--guest">
              <JourneyUserPopover
                slug={ownerSlug ?? ""}
                fallbackName={authorName || (ownerSlug ? `@${ownerSlug}` : "Người dùng")}
                fallbackAvatarUrl={authorAvatarUrl}
                track={
                  trackOwnContent
                    ? null
                    : {
                        idBoiCanh: milestoneId,
                        nguon: nguonSuKien,
                      }
                }
              >
                <span className="org-chip">
                  <span className="org-logo" aria-hidden>
                    {authorAvatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={authorAvatarUrl} alt="" />
                    ) : (
                      getNameInitials(authorName ?? null, ownerSlug ?? "C")
                    )}
                  </span>
                  <span className="org-copy">
                    <strong>
                      {authorName || `@${ownerSlug ?? ""}`}
                      <VerifiedTick slug={ownerSlug} />
                    </strong>
                    <small>{displayDate}</small>
                  </span>
                </span>
              </JourneyUserPopover>
              <span className="badge-row">
                {showMilestoneVerifyBadge && showOrgVerifyBadge && !isSelfAuthoredTagged ? (
                  <>
                    <MilestoneVerifyBadge />
                    {renderPersonalFilterToolbarControl()}
                  </>
                ) : showPersonalTypeBadge ? (
                  <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                    <MilestoneTypeBadgeContent type={type} />
                  </span>
                ) : null}
                {showMilestoneVerifyBadge && (!showOrgVerifyBadge || isSelfAuthoredTagged) ? (
                  <MilestoneVerifyBadge />
                ) : null}
                {vis && showVisibilityMetaBadge ? (
                  <span
                    className={`ctx-badge j-vis-${visibility ?? "public"}`}
                    title={vis.label}
                    aria-label={vis.label}
                  >
                    <vis.Icon
                      size={11}
                      strokeWidth={1.8}
                      aria-hidden
                      {...(visibility === "feature" ? { fill: "currentColor" } : {})}
                    />
                    {visibility === "feature" ? "Feature" : vis.label}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}

          {bookmarkListing ? (
            <div className="j-bm-listing-wrap">
              <JourneyBookmarkListingCard title={title} listing={bookmarkListing} />
            </div>
          ) : (
            <JourneyMilestoneCardBodyContent
              title={title}
              body={body}
              noiDungBlocks={noiDungBlocks}
              preview={preview}
              photoGridImages={photoGridImages}
              contentKind={cardContentKind}
              compactMediaPreview={useFeedCompactMedia}
              readMoreHref={cardReadMoreHref}
              hasLinkedPost={Boolean(postSlug)}
              captionExpandMode={
                cardContentKind === "photo" || cardContentKind === "video"
                  ? "inline"
                  : "overlay"
              }
              canEditChiChuNen={
                canManageSelf &&
                variant === "self" &&
                cardContentKind === "text" &&
                Boolean(tacPhamId)
              }
              tacPhamId={tacPhamId}
              chiChuExpanded={
                chiChuCollapsible ? chiChuExpanded : undefined
              }
              onChiChuExpandedChange={
                chiChuCollapsible ? setChiChuExpanded : undefined
              }
              articleTags={liveArticleTags}
              expandTrigger={
                supportsInlineUnfold && inlineExpand && !isContentOpen
                  ? {
                      enabled: true,
                      expanded: isContentOpen,
                      ariaLabel: `Xem đầy đủ: ${showCardTitle ? title : cardCaption || title}`,
                      onClick: handleExpandTrigger,
                      onKeyDown: handleExpandKeyDown,
                    }
                  : supportsInlineUnfold && inlineExpand
                    ? { enabled: false, expanded: isContentOpen }
                    : undefined
              }
              onTagLinkClick={(e) => e.stopPropagation()}
            />
          )}

          {canRenderInlineUnfold ? (
            <div
              className="j-m-card-unfold"
              data-open={unfoldOpen ? "true" : "false"}
              aria-hidden={!showUnfold}
            >
              {unfoldMounted ? (
                orgBaiDangRef && showContent && noiDungBlocks?.length ? (
                  <div className="j-m-card-unfold-inner">
                    <div className="cins-editor-page cins-post-view j-m-unfold-post">
                      {isMilestoneArticleCard(
                        noiDungBlocks,
                        hasCoverPreview,
                        body,
                      ) ? (
                        <JourneyUnfoldArticleContent
                          blocksOnly
                          title={title}
                          tomTat={body}
                          blocks={noiDungBlocks}
                        />
                      ) : (
                        <PostBlockRenderer blocks={noiDungBlocks} />
                      )}
                    </div>
                  </div>
                ) : (
                  <JourneyMilestoneUnfold
                    active={showUnfold}
                    showBlocks={showContent}
                    showComments={showComments}
                    commentsFocus={showComments}
                    postOwnerSlug={inlineExpand!.postOwnerSlug}
                    postSlug={postSlug}
                    milestoneId={milestoneId}
                    actionsBeforeComments={
                      pinActionsAboveComments ? (
                        <>
                          {authorsInUnfold ? jcardAuthors : null}
                          {jcardActions}
                        </>
                      ) : undefined
                    }
                    inlineSkip={{
                      byline: true,
                      tags: liveArticleTags.length > 0,
                      contributors: showAuthorsStrip,
                    }}
                  />
                )
              ) : null}
            </div>
          ) : null}
        </div>

          {showAuthorsStrip && !authorsInUnfold ? jcardAuthors : null}

          {!bookmarkListing && !pinActionsAboveComments ? jcardActions : null}

          {tags.length > 0 ? (
            <div className="j-m-tags">
              {tags.map((t, i) => (
                <span
                  key={`${t.label}-${i}`}
                  className={"j-tag" + (t.isSystem ? " is-system" : "")}
                >
                  {t.isSystem ? `#${t.label.replace(/^#/, "")}` : t.label}
                </span>
              ))}
            </div>
          ) : null}
      </>
    );
  }
}

function AuthorAvatar({
  credit,
  tone,
}: {
  credit: CoAuthorCredit;
  tone: string;
}) {
  return (
    <span className={`av ${tone}`}>
      {credit.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={credit.avatarUrl} alt="" />
      ) : (
        credit.initial ?? credit.name.slice(0, 1)
      )}
    </span>
  );
}

function CongDongSourceChip({
  org,
  dateLabel,
  posterName,
  posterSlug,
  posterAvatarUrl,
  frameInner = false,
}: {
  org: MilestoneCongDongOrg;
  dateLabel: string;
  /** Trang entity — tên người đăng bài trong nhóm. */
  posterName?: string | null;
  posterSlug?: string | null;
  posterAvatarUrl?: string | null;
  /** Trong khung ngoài — chỉ nhóm + ngày (không lặp người đăng); vẫn giữ nhận diện cộng đồng. */
  frameInner?: boolean;
}) {
  const orgInitial = (org.initial || org.name.charAt(0) || "?").toUpperCase();
  const posterDisplay = frameInner ? null : posterName?.trim() || null;
  const posterSlugTrim = posterSlug?.trim() || null;
  const showPosterIdentity = Boolean(posterSlugTrim && posterDisplay);

  const orgAvatar = (
    <span className="cd-source-avatar" aria-hidden>
      {org.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={org.avatarUrl} alt="" />
      ) : (
        orgInitial
      )}
    </span>
  );

  const posterAvatar = posterDisplay ? (
    <span className="cd-source-poster-avatar" aria-hidden>
      {posterAvatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={posterAvatarUrl} alt="" />
      ) : (
        getNameInitials(posterDisplay, posterSlugTrim ?? "C")
      )}
    </span>
  ) : null;

  const posterBlock = posterDisplay ? (
    showPosterIdentity ? (
      <JourneyUserPopover
        slug={posterSlugTrim}
        fallbackName={posterDisplay}
        fallbackAvatarUrl={posterAvatarUrl ?? null}
      >
        <span className="cd-source-poster-row">
          {posterAvatar}
          <span className="cd-source-poster-text">
            <span className="cd-source-poster-name">{posterDisplay}</span>
            <span className="cd-source-poster-date">
              <span className="cd-source-sep" aria-hidden>
                {" "}
                ·{" "}
              </span>
              <time>{dateLabel}</time>
            </span>
          </span>
        </span>
      </JourneyUserPopover>
    ) : (
      <small className="cd-source-poster">
        đăng bởi {posterDisplay}
        <span className="cd-source-sep" aria-hidden>
          {" "}
          ·{" "}
        </span>
        <time>{dateLabel}</time>
      </small>
    )
  ) : null;

  if (showPosterIdentity) {
    return (
      <span className="cd-source-chip cd-source-chip--split cd-source-chip--entity">
        <JourneyOrgPopover
          slug={org.slug}
          orgKind="cong_dong"
          href={org.href}
          fallbackName={org.name}
          fallbackAvatarUrl={org.avatarUrl}
          fallbackCoverUrl={org.coverUrl}
        >
          <span className="cd-source-org-trigger cd-source-org-trigger--avatar">
            {orgAvatar}
          </span>
        </JourneyOrgPopover>
        <span className="cd-source-main">
          <JourneyOrgPopover
            slug={org.slug}
            orgKind="cong_dong"
            href={org.href}
            fallbackName={org.name}
            fallbackAvatarUrl={org.avatarUrl}
            fallbackCoverUrl={org.coverUrl}
          >
            <span className="cd-source-org-name">{org.name}</span>
          </JourneyOrgPopover>
          {posterBlock}
        </span>
      </span>
    );
  }

  return (
    <JourneyOrgPopover
      slug={org.slug}
      orgKind="cong_dong"
      href={org.href}
      fallbackName={org.name}
      fallbackAvatarUrl={org.avatarUrl}
      fallbackCoverUrl={org.coverUrl}
    >
      <span className="cd-source-chip">
        <span className="cd-source-avatar" aria-hidden>
          {org.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={org.avatarUrl} alt="" />
          ) : (
            orgInitial
          )}
        </span>
        <span className="cd-source-copy">
          <strong>{org.name}</strong>
          {posterBlock}
          {!posterDisplay ? (
            <small className="cd-source-meta">
              <Users size={12} strokeWidth={2} aria-hidden />
              <span>Trong cộng đồng</span>
              <span className="cd-source-sep" aria-hidden>
                ·
              </span>
              <time>{dateLabel}</time>
            </small>
          ) : null}
        </span>
      </span>
    </JourneyOrgPopover>
  );
}

function orgKindForOrgPopover(
  kind: MilestoneAttribution["orgKind"],
): "cong_dong" | "truong" | "co_so_dao_tao" | "studio" | undefined {
  if (
    kind === "cong_dong" ||
    kind === "truong" ||
    kind === "co_so_dao_tao" ||
    kind === "studio"
  ) {
    return kind;
  }
  return undefined;
}

function viaBarPrefixLabel(attr: MilestoneAttribution): string {
  if (attr.isOrg && attr.orgKind === "cong_dong") return "Cộng đồng";
  if (attr.isOrg && attr.orgKind === "truong") {
    return "Đã xác thực bởi";
  }
  return "Được gắn bởi";
}

const TRUONG_VERIFY_SKIP_WORDS = new Set([
  "dai",
  "đại",
  "hoc",
  "học",
  "truong",
  "trường",
  "va",
  "và",
  "cua",
  "của",
  "university",
  "college",
]);

function orgMarkInitials(name: string, initial?: string | null): string {
  const trimmedInitial = initial?.trim();
  if (trimmedInitial && trimmedInitial.length >= 2) {
    return trimmedInitial.slice(0, 2).toUpperCase();
  }

  const parts = name
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const significant = parts.filter(
    (part) => !TRUONG_VERIFY_SKIP_WORDS.has(part.toLowerCase()),
  );

  if (significant.length >= 2) {
    const first = significant[0].charAt(0);
    const lastToken = significant[significant.length - 1];
    const dottedPart = lastToken.split(".").find((part) => part.trim());
    const last = dottedPart?.charAt(0) ?? lastToken.charAt(0);
    return (first + last).toUpperCase();
  }

  if (significant.length === 1 && significant[0].length >= 2) {
    return significant[0].slice(0, 2).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase() || "?";
}

function TruongVerifyBar({ attr }: { attr: MilestoneAttribution }) {
  const mark = orgMarkInitials(attr.name, attr.initial);
  const popoverKind = orgKindForOrgPopover(attr.orgKind) ?? "truong";

  const orgCluster = (
    <span className="j-truong-verify-org">
      <span className="j-truong-verify-mark" aria-hidden>
        {attr.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={attr.avatarUrl} alt="" />
        ) : (
          mark
        )}
      </span>
      <strong className="j-truong-verify-org-name">{attr.name}</strong>
    </span>
  );

  const orgLink = attr.slug?.trim() ? (
    <JourneyOrgPopover
      slug={attr.slug}
      orgKind={popoverKind}
      href={attr.href ?? undefined}
      fallbackName={attr.name}
      fallbackAvatarUrl={attr.avatarUrl}
      fallbackCoverUrl={attr.coverUrl}
    >
      {orgCluster}
    </JourneyOrgPopover>
  ) : (
    orgCluster
  );

  return (
    <div className="j-truong-verify-bar" role="status" aria-live="polite">
      <span className="j-truong-verify-icon" aria-hidden>
        <BadgeCheck size={14} strokeWidth={2.4} />
      </span>
      <p className="j-truong-verify-copy">
        <span className="j-truong-verify-lead">Đã xác thực bởi</span>
        {orgLink}
      </p>
    </div>
  );
}

function TaggedByPanel({
  attr,
  dateLabel,
  variant,
  verifyBarContext,
}: {
  attr: MilestoneAttribution;
  dateLabel: string;
  variant: MilestoneItem["variant"];
  verifyBarContext?: TruongVerifyBarContext;
}) {
  if (shouldShowTruongVerifyBar(attr, variant, verifyBarContext ?? {})) {
    return <TruongVerifyBar attr={attr} />;
  }

  const initial = (attr.initial || attr.name.charAt(0) || "?").toUpperCase();
  const orgPopoverKind = attr.isOrg
    ? orgKindForOrgPopover(attr.orgKind)
    : undefined;
  const isOrgSource = Boolean(orgPopoverKind);
  const Popover = isOrgSource ? JourneyOrgPopover : JourneyUserPopover;
  const avatarClass = isOrgSource ? "via-avatar is-org" : "via-avatar";

  return (
    <div
      className={`via-bar${isOrgSource ? " is-org-source" : " is-bookmark-source"}`}
    >
      <CornerDownRight size={13} strokeWidth={1.8} aria-hidden />
      <span>{viaBarPrefixLabel(attr)}</span>
      <Popover
        slug={attr.slug}
        orgKind={orgPopoverKind}
        href={attr.href}
        fallbackName={attr.name}
        fallbackAvatarUrl={attr.avatarUrl}
      >
        <span className="via-author">
          <span className={avatarClass} aria-hidden>
            {attr.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={attr.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <span className="via-copy">
            <strong>{attr.name}</strong>
            <small>{dateLabel}</small>
          </span>
        </span>
      </Popover>
    </div>
  );
}

function formatCongDongStatCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function CongDongCreateMilestoneCard({
  milestoneCls,
  displayDate,
  title,
  body,
  attribution,
  orgHref,
  milestoneId,
  year,
  month,
  day,
}: {
  milestoneCls: string;
  displayDate: string;
  title: string;
  body?: string | null;
  attribution?: MilestoneAttribution | null;
  orgHref?: string | null;
  milestoneId: string;
  year: number;
  month: number;
  day: number;
}) {
  const communityName = attribution?.name ?? title.replace(/^Tạo cộng đồng\s+/i, "");
  const avatarUrl = attribution?.avatarUrl ?? null;
  const coverUrl = attribution?.coverUrl ?? null;
  const href = orgHref ?? attribution?.href ?? null;
  const initial = (attribution?.initial || communityName.charAt(0) || "?").toUpperCase();
  const memberCount = attribution?.memberCount;
  const postCount = attribution?.postCount;
  const showStats =
    typeof memberCount === "number" || typeof postCount === "number";

  return (
    <article
      className={milestoneCls}
      data-mid={milestoneId}
      data-content-kind="cong-dong"
      data-year={year}
      data-month={month}
      data-group="cong-dong"
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--cong-dong">
          <div className={`jcd-hero${coverUrl ? " has-cover-img" : ""}`}>
            <div
              className={`jcd-cover${coverUrl ? " has-img" : ""}`}
              aria-hidden
            >
              {coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverUrl} alt="" />
              ) : null}
            </div>
            <div className="jcd-topbar">
              <CongDongTypeBadge />
            </div>
          </div>

          <div className="jcd-body">
            <div className="jcd-logo-wrap" aria-hidden>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="jcd-logo" />
              ) : (
                <span className="jcd-logo jcd-logo--fallback">{initial}</span>
              )}
            </div>
            <p className="jcd-kicker">Người tạo cộng đồng</p>
            <time className="jcd-date" dateTime={`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`}>
              {displayDate}
            </time>
            <h2 className="jcd-title">{communityName}</h2>
            {showStats ? (
              <div className="jcd-stats" aria-label="Quy mô cộng đồng">
                {typeof memberCount === "number" ? (
                  <span className="jcd-stat">
                    <Users size={14} strokeWidth={2} aria-hidden />
                    <strong>{formatCongDongStatCount(memberCount)}</strong>
                    thành viên
                  </span>
                ) : null}
                {typeof postCount === "number" ? (
                  <span className="jcd-stat">
                    <FileText size={14} strokeWidth={2} aria-hidden />
                    <strong>{formatCongDongStatCount(postCount)}</strong>
                    bài viết
                  </span>
                ) : null}
              </div>
            ) : null}
            {body ? <p className="jcd-desc">{body}</p> : null}
            {href ? (
              <Link href={href} className="jcd-cta" prefetch={false}>
                Xem cộng đồng
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function CoSoCreateMilestoneCard({
  milestoneCls,
  displayDate,
  title,
  body,
  attribution,
  orgHref,
  milestoneId,
  year,
  month,
  day,
}: {
  milestoneCls: string;
  displayDate: string;
  title: string;
  body?: string | null;
  attribution?: MilestoneAttribution | null;
  orgHref?: string | null;
  milestoneId: string;
  year: number;
  month: number;
  day: number;
}) {
  const orgName =
    attribution?.name ?? title.replace(/^Tạo cơ sở đào tạo\s+/i, "");
  const avatarUrl = attribution?.avatarUrl ?? null;
  const coverUrl = attribution?.coverUrl ?? null;
  const href = orgHref ?? attribution?.href ?? null;
  const initial = (attribution?.initial || orgName.charAt(0) || "?").toUpperCase();

  return (
    <article
      className={milestoneCls}
      data-mid={milestoneId}
      data-content-kind="co-so"
      data-year={year}
      data-month={month}
      data-group="co-so"
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--co-so">
          <div className={`jcs-hero${coverUrl ? " has-cover-img" : ""}`}>
            <div
              className={`jcs-cover${coverUrl ? " has-img" : ""}`}
              aria-hidden
            >
              {coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverUrl} alt="" />
              ) : null}
            </div>
            <div className="jcs-topbar">
              <CoSoTypeBadge />
            </div>
          </div>

          <div className="jcs-body">
            <div className="jcs-logo-wrap" aria-hidden>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="jcs-logo" />
              ) : (
                <span className="jcs-logo jcs-logo--fallback">{initial}</span>
              )}
            </div>
            <p className="jcs-kicker">Người tạo cơ sở đào tạo</p>
            <time
              className="jcs-date"
              dateTime={`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
            >
              {displayDate}
            </time>
            <h2 className="jcs-title">{orgName}</h2>
            {body ? <p className="jcs-desc">{body}</p> : null}
            {href ? (
              <Link href={href} className="jcs-cta" prefetch={false}>
                Xem cơ sở đào tạo
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function StudioCreateMilestoneCard({
  milestoneCls,
  displayDate,
  title,
  body,
  attribution,
  orgHref,
  milestoneId,
  year,
  month,
  day,
}: {
  milestoneCls: string;
  displayDate: string;
  title: string;
  body?: string | null;
  attribution?: MilestoneAttribution | null;
  orgHref?: string | null;
  milestoneId: string;
  year: number;
  month: number;
  day: number;
}) {
  const orgName = attribution?.name ?? title.replace(/^Tạo studio\s+/i, "");
  const avatarUrl = attribution?.avatarUrl ?? null;
  const coverUrl = attribution?.coverUrl ?? null;
  const href = orgHref ?? attribution?.href ?? null;
  const initial = (attribution?.initial || orgName.charAt(0) || "?").toUpperCase();

  return (
    <article
      className={milestoneCls}
      data-mid={milestoneId}
      data-content-kind="studio"
      data-year={year}
      data-month={month}
      data-group="studio"
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--studio">
          <div className={`jcs-hero${coverUrl ? " has-cover-img" : ""}`}>
            <div
              className={`jcs-cover${coverUrl ? " has-img" : ""}`}
              aria-hidden
            >
              {coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverUrl} alt="" />
              ) : null}
            </div>
            <div className="jcs-topbar">
              <StudioTypeBadge />
            </div>
          </div>

          <div className="jcs-body">
            <div className="jcs-logo-wrap" aria-hidden>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="jcs-logo" />
              ) : (
                <span className="jcs-logo jcs-logo--fallback">{initial}</span>
              )}
            </div>
            <p className="jcs-kicker">Người tạo studio</p>
            <time
              className="jcs-date"
              dateTime={`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
            >
              {displayDate}
            </time>
            <h2 className="jcs-title">{orgName}</h2>
            {body ? <p className="jcs-desc">{body}</p> : null}
            {href ? (
              <Link href={href} className="jcs-cta" prefetch={false}>
                Xem studio
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatIsoToDisplayDate(iso: string): string {
  const dateObj = new Date(iso);
  if (Number.isNaN(dateObj.getTime())) return "";
  const day = String(dateObj.getUTCDate()).padStart(2, "0");
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const year = dateObj.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/** Khung ngoài — chủ Journey (bạn) đã lưu bài này về. */
function BookmarkFrameHeader({
  ownerName,
  ownerSlug,
  ownerAvatarUrl,
  dateLabel,
  dateLead = "bookmark",
  dateTitle = "Ngày lưu về",
  toolbar,
}: {
  ownerName: string;
  ownerSlug?: string | null;
  ownerAvatarUrl?: string | null;
  dateLabel: string | null;
  dateLead?: "bookmark" | "tag" | "cong-dong";
  dateTitle?: string;
  toolbar?: ReactNode;
}) {
  const ownerChip = (
    <span className="org-chip">
      <span className="org-logo" aria-hidden>
        {ownerAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={ownerAvatarUrl} alt="" />
        ) : (
          getNameInitials(ownerName, ownerSlug ?? "C")
        )}
      </span>
      <span className="org-copy">
        <strong>
          {ownerName}
          <VerifiedTick slug={ownerSlug} />
        </strong>
        {dateLabel ? (
          <small className="j-bf-date" title={dateTitle}>
            {dateLead === "tag" ? (
              <Tag
                size={12}
                strokeWidth={2.4}
                className="j-bf-date-tag"
                aria-hidden
              />
            ) : dateLead === "cong-dong" ? (
              <Users
                size={12}
                strokeWidth={2.4}
                className="j-bf-date-cong-dong"
                aria-hidden
              />
            ) : (
              <span className="j-bf-date-prefix">Lưu</span>
            )}
            <span className="j-bf-date-sep" aria-hidden>
              ·
            </span>
            <span>{dateLabel}</span>
          </small>
        ) : null}
      </span>
    </span>
  );

  return (
    <div className="j-bookmark-frame-head">
      {ownerSlug ? (
        <JourneyUserPopover
          slug={ownerSlug}
          fallbackName={ownerName}
          fallbackAvatarUrl={ownerAvatarUrl}
        >
          {ownerChip}
        </JourneyUserPopover>
      ) : (
        ownerChip
      )}
      {toolbar ? <div className="j-bf-toolbar">{toolbar}</div> : null}
    </div>
  );
}

/** Datebar trong khung — tác giả gốc bài được gắn thẻ. */
function TaggedOriginalAuthorChip({
  attr,
  dateLabel,
}: {
  attr: MilestoneAttribution;
  dateLabel: string;
}) {
  const initial = (attr.initial || attr.name.charAt(0) || "?").toUpperCase();
  const orgPopoverKind = attr.isOrg
    ? orgKindForOrgPopover(attr.orgKind)
    : undefined;
  const Popover = orgPopoverKind ? JourneyOrgPopover : JourneyUserPopover;
  const chip = (
    <span className="org-chip">
      <span className="org-logo" aria-hidden>
        {attr.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={attr.avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      <span className="org-copy">
        <strong>{attr.name}</strong>
        <small title="Ngày đăng gốc">{dateLabel}</small>
      </span>
    </span>
  );

  if (!attr.slug?.trim()) return chip;

  return (
    <Popover
      slug={attr.slug}
      orgKind={orgPopoverKind}
      href={attr.href ?? undefined}
      fallbackName={attr.name}
      fallbackAvatarUrl={attr.avatarUrl}
    >
      {chip}
    </Popover>
  );
}

/** Datebar — người đăng / tổ chức gốc của bài được lưu. */
function BookmarkOriginalPosterChip({
  bookmark,
  orgBaiDangRef,
  dateLabel,
}: {
  bookmark: MilestoneBookmarkSource;
  orgBaiDangRef?: MilestoneOrgBaiDangRef | null;
  dateLabel: string;
}) {
  const initial = (bookmark.initial || bookmark.name.charAt(0) || "?").toUpperCase();
  const isCongDongSource =
    bookmark.sourceKind === "cong_dong" ||
    orgBaiDangRef?.orgKind === "cong_dong";

  if (isCongDongSource && orgBaiDangRef) {
    const href =
      bookmark.url ?? truongRootPath(orgBaiDangRef.orgSlug);
    return (
      <JourneyOrgPopover
        slug={orgBaiDangRef.orgSlug}
        orgKind="cong_dong"
        href={href}
        fallbackName={bookmark.name}
        fallbackAvatarUrl={bookmark.avatarUrl}
      >
        <span className="cd-source-chip">
          <span className="cd-source-avatar" aria-hidden>
            {bookmark.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={bookmark.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <span className="cd-source-copy">
            <strong>{bookmark.name}</strong>
            <small className="cd-source-meta">
              <Users size={12} strokeWidth={2} aria-hidden />
              <span>Trong cộng đồng</span>
              <span className="cd-source-sep" aria-hidden>
                ·
              </span>
              <time title="Ngày đăng gốc">{dateLabel}</time>
            </small>
          </span>
        </span>
      </JourneyOrgPopover>
    );
  }

  const chip = (
    <span className="org-chip">
      <span className="org-logo" aria-hidden>
        {bookmark.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={bookmark.avatarUrl} alt="" />
        ) : (
          initial
        )}
      </span>
      <span className="org-copy">
        <strong>{bookmark.name}</strong>
        <small title="Ngày đăng gốc">{dateLabel}</small>
      </span>
    </span>
  );

  if (orgBaiDangRef) {
    const href =
      bookmark.url ?? truongRootPath(orgBaiDangRef.orgSlug);
    const popoverKind =
      orgKindForOrgPopover(orgBaiDangRef.orgKind) ?? "truong";
    return (
      <JourneyOrgPopover
        slug={orgBaiDangRef.orgSlug}
        orgKind={popoverKind}
        href={href}
        fallbackName={bookmark.name}
        fallbackAvatarUrl={bookmark.avatarUrl}
      >
        {chip}
      </JourneyOrgPopover>
    );
  }

  const userSlug = bookmark.domain.replace(/^@/, "");
  return (
    <JourneyUserPopover
      slug={userSlug}
      fallbackName={bookmark.name}
      fallbackAvatarUrl={bookmark.avatarUrl}
    >
      {chip}
    </JourneyUserPopover>
  );
}

function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}
