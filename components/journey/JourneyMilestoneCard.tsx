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
  Star,
  Tag,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthorRoleTooltip } from "@/components/journey/AuthorRoleTooltip";
import { JourneyAuthorRowFriendAction } from "@/components/journey/JourneyAuthorRowFriendAction";
import { JourneyMilestoneCardBodyContent } from "@/components/journey/JourneyMilestoneCardBodyContent";
import { JourneyMilestoneUnfold } from "@/components/journey/JourneyMilestoneUnfold";
import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { POST_COMMENTS_SYNC_EVENT } from "@/lib/journey/comments-sync-client";
import { isMilestoneArticleCard } from "@/lib/journey/milestone-card-kind";
import { JourneyCommentLink } from "@/components/journey/JourneyCommentLink";
import { JourneyArticleTagManager } from "@/components/journey/JourneyArticleTagManager";
import { JourneyCoAuthorProposal } from "@/components/journey/JourneyCoAuthorProposal";
import { JourneyOrgAttachTrigger } from "@/components/journey/JourneyOrgAttachTrigger";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyMilestoneInlineControls } from "@/components/journey/JourneyMilestoneInlineControls";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { IdentityPendingMilestoneCard } from "@/components/journey/IdentityPendingMilestoneCard";
import { IdentityVerifiedMilestoneCard } from "@/components/journey/IdentityVerifiedMilestoneCard";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { photoGridImagesFromBlocks } from "@/lib/journey/image-grid";
import {
  detectMediaPostKind,
  milestoneCardCaptionPlain,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
import { JOURNEY_MILESTONE_TYPE_OPTIONS } from "@/lib/journey/milestone-type-options";
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
  /** Mở rộng inline — chỉ bài viết (nội dung / bình luận tách riêng). */
  inlineExpand?: {
    showContent: boolean;
    showComments: boolean;
    postOwnerSlug: string;
    onToggleContent(): void;
    onOpenComments(): void;
    onClose(): void;
  };
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

function MilestoneVerifyBadge() {
  return <span className="verify-badge">Verify</span>;
}

const EDITABLE_VIS_OPTIONS: ReadonlyArray<{
  ui: NonNullable<MilestoneItem["visibility"]>;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "feature", db: "feature", label: "Nổi bật", Icon: Star },
  { ui: "public", db: "public", label: "Công khai", Icon: Globe },
  { ui: "unlisted", db: "theo_nhom", label: "Theo nhóm", Icon: Users },
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
  { ui: "unlisted", db: "theo_nhom", label: "Theo nhóm", Icon: Users },
  { ui: "private", db: "chi_minh", label: "Chỉ mình tôi", Icon: Lock },
  { ui: "feature", db: "feature", label: "Nổi bật", Icon: Star },
];

/** Tagged / Lưu về — chỉ đổi hiển thị trên Journey của viewer. */
const FOREIGN_JOURNEY_VIS_OPTIONS: ReadonlyArray<{
  ui: NonNullable<MilestoneItem["visibility"]>;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "feature", db: "feature", label: "Nổi bật", Icon: Star },
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
  if (v === "feature") return { Icon: Star, label: "Nổi bật" };
  if (!v || v === "public") return { Icon: Globe, label: "Công khai" };
  if (v === "unlisted") return { Icon: Users, label: "Theo nhóm" };
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
  inlineExpand,
}: Props) {
  const {
    variant,
    type,
    title,
    body,
    attribution,
    bookmark,
    verifiedBy,
    media = [],
    tags = [],
    articleTags = [],
    coAuthorCredits = [],
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
    cardLayout = "default",
    orgHref,
    congDongOrg,
    personalFilterSlugs = [],
    membershipPending,
  } = milestone;

  const articleTagsKey = articleTags.map((t) => t.id).join("\0");
  const [liveArticleTags, setLiveArticleTags] = useState<ArticleTagRef[]>(() => [
    ...articleTags,
  ]);

  useEffect(() => {
    setLiveArticleTags([...articleTags]);
  }, [articleTagsKey]);

  const handleArticleTagsSaved = useCallback((tags: ArticleTagRef[]) => {
    setLiveArticleTags(tags);
  }, []);

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
    variant === "tagged" &&
    Boolean(postOwnerSlug?.trim()) &&
    Boolean(ownerSlug?.trim()) &&
    postOwnerSlug!.trim() !== ownerSlug!.trim();
  const isCongDongSelfPost =
    variant === "self" && isCongDongPost && Boolean(congDongOrg);
  const useForeignFrame =
    (isBookmarkMilestone && Boolean(bookmark)) ||
    isTaggedFromOthers ||
    isCongDongSelfPost;
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
    (variant === "self" || variant === "verified" || isBookmarkMilestone) &&
    Boolean(ownerSlug);
  const canManageTagged =
    isOwner && variant === "tagged" && Boolean(ownerSlug) && Boolean(tacPhamId);
  const canManageForeignJourney =
    (canManageTagged || (isBookmarkMilestone && canManageSelf)) &&
    Boolean(cotMocId) &&
    Boolean(tacPhamId);
  const canManage = canManageSelf || canManageTagged;
  const foreignJourneyContext =
    canManageForeignJourney && cotMocId && tacPhamId
      ? {
          variant: (isBookmarkMilestone ? "bookmark" : "tagged") as
            | "bookmark"
            | "tagged",
          cotMocId,
          tacPhamId,
        }
      : undefined;
  const canBookmark = !(isOwner && (variant === "self" || isBookmarkMilestone));
  const canManageCoAuthors =
    isOwner && (variant === "self" || variant === "verified") && Boolean(tacPhamId);
  const showOrgVerifyBadge = usesOrgVerifyTypeBadge(type, verifiedBy, isCongDongPost);
  const showsTruongVerifyBar =
    Boolean(
      attribution?.isOrg &&
        attribution.orgKind === "truong" &&
        (variant === "tagged" || variant === "verified") &&
        !useForeignFrame &&
        (canManageTagged || !entityLens),
    );
  const showMilestoneVerifyBadge =
    !showsTruongVerifyBar &&
    (showOrgVerifyBadge || Boolean(verifiedBy?.trim()));
  const canManageArticleTags = canManageCoAuthors;
  const coAuthorExcludeOwnerId =
    variant === "tagged" && postOwnerId
      ? postOwnerId
      : ownerProfileId ?? "";
  const canShowCoAuthorAction =
    (canProposeCoAuthor || canManageCoAuthors) && Boolean(tacPhamId);
  const visibleCoAuthors = coAuthorCredits.slice(0, MAX_VISIBLE_COAUTHORS);
  const hiddenCoAuthorCount = Math.max(
    0,
    coAuthorCredits.length - visibleCoAuthors.length,
  );
  const coAuthorsOnly = coAuthorCredits.filter((c) => !c.laChuSoHuu);
  const showAuthorsStrip = coAuthorsOnly.length > 0;
  const preview = media[0] ?? null;
  const photoGridImages = photoGridImagesFromBlocks(noiDungBlocks);
  const mediaKind = detectMediaPostKind(noiDungBlocks);
  const isPhotoAlbum = mediaKind === "photo" && photoGridImages !== null;
  const isVideoPost = mediaKind === "video";
  const showCardTitle = shouldShowMilestoneCardTitle(title, noiDungBlocks);
  const cardCaption = milestoneCardCaptionPlain(body, noiDungBlocks);
  const cardContentKind = isPhotoAlbum
    ? "photo"
    : isVideoPost
      ? "video"
      : "article";
  const contributorCount = coAuthorCredits.length;
  const otherContributorCount = coAuthorsOnly.length;
  const resolvedPostOwner = postOwnerSlug || ownerSlug || null;
  const isArticle = cardContentKind === "article";
  const showContent = inlineExpand?.showContent ?? false;
  const showComments = inlineExpand?.showComments ?? false;
  const showUnfold = showContent || showComments;
  const isContentOpen = isArticle && showContent;
  const pinActionsAboveComments = Boolean(
    inlineExpand && showUnfold && showComments,
  );
  const authorsInUnfold = pinActionsAboveComments && showAuthorsStrip;
  const milestoneId = cotMocId ?? milestone.id;
  const orgAttachCotMocId = cotMocId ?? milestone.id;
  const [liveCommentCount, setLiveCommentCount] = useState(comments ?? 0);

  useEffect(() => {
    setLiveCommentCount(comments ?? 0);
  }, [comments]);

  useEffect(() => {
    function onCommentsSync(event: Event) {
      const detail = (
        event as CustomEvent<{ milestoneId?: string; count?: number }>
      ).detail;
      if (detail?.milestoneId !== milestoneId || typeof detail.count !== "number") {
        return;
      }
      setLiveCommentCount(detail.count);
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
  /** Trang entity — luôn hiện datebar đọc-only (kể cả khi viewer là chủ bài). */
  const showEntityDatebar =
    entityLens &&
    !useForeignFrame &&
    (Boolean(entityPosterLabel || authorAvatarUrl || milestone.lensOwnerAvatarUrl) ||
      (isCongDongPost && Boolean(congDongOrg)));

  function shouldIgnoreExpandTrigger(target: Element | null): boolean {
    return Boolean(
      target?.closest(
        "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions",
      ),
    );
  }

  function handleExpandTrigger(e: React.MouseEvent<HTMLElement>) {
    if (!isArticle || !inlineExpand || isContentOpen || shouldIgnoreExpandTrigger(e.target as Element)) {
      return;
    }
    inlineExpand.onToggleContent();
  }

  function handleExpandKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (!isArticle || !inlineExpand || isContentOpen) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (shouldIgnoreExpandTrigger(e.target as Element)) return;
    e.preventDefault();
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
                    {c.role ? <AuthorRoleTooltip role={c.role} /> : null}
                  </span>
                </span>
              </JourneyUserPopover>
              {c.laChuSoHuu ? (
                <span className="abadge abadge-owner">Chủ bài</span>
              ) : variant === "tagged" && c.slug && c.slug === ownerSlug ? (
                <span className="abadge abadge-you">Bạn</span>
              ) : c.trangThai === "pending" ? (
                <span className="abadge abadge-pending">Chờ xác nhận</span>
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
        milestoneId={cotMocId ?? milestone.id}
        initialLiked={social?.viewerLiked}
        initialCount={social?.likeCount}
        showCount={social?.showCounts}
      />
      {inlineExpand ? (
        <JourneyCommentLink
          commentCount={liveCommentCount}
          onOpenComments={inlineExpand.onOpenComments}
        />
      ) : (
        <button
          type="button"
          className="action-btn"
          aria-label="Bình luận"
          data-open-post="true"
        >
          <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
          {liveCommentCount ? <span>{liveCommentCount}</span> : null}
        </button>
      )}
      {canBookmark ? (
        <JourneyBookmarkButton
          milestoneId={cotMocId ?? milestone.id}
          title={title}
          initialSaved={social?.viewerBookmarked}
          initialCount={social?.bookmarkCount}
          showCount={social?.showCounts}
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
      {inlineExpand && showUnfold ? (
        <button
          type="button"
          className="jcard-unfold-toggle"
          onClick={inlineExpand.onClose}
          aria-label="Thu gọn"
        >
          <ChevronUp size={15} strokeWidth={2.2} aria-hidden />
          <span>Thu gọn</span>
        </button>
      ) : null}
      {views ? (
        <span className="jcard-view-count" aria-label={`${formatViews(views)} lượt xem`}>
          {formatViews(views)}
        </span>
      ) : null}
    </div>
  );

  return (
    <article
      className={milestoneCls + (showUnfold ? " is-card-expanded" : "")}
      data-mid={cotMocId ?? milestone.id}
      data-content-kind={cardContentKind}
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
                cardContentKind +
                (isArticle ? " has-unfold" : "") +
                (showUnfold ? " is-expanded" : isArticle ? " is-collapsed" : "")
              }
            >
              {renderMilestoneCardInterior()}
            </div>
          </div>
        ) : (
          <div
            className={
              "j-m-card jcard jcard--" +
              cardContentKind +
              (isArticle ? " has-unfold" : "") +
              (showUnfold ? " is-expanded" : isArticle ? " is-collapsed" : "")
            }
          >
            {renderMilestoneCardInterior()}
          </div>
        )}
      </div>
    </article>
  );

  function renderForeignFrameToolbar() {
    const canEditToolbar =
      (isBookmarkMilestone && canManageSelf) ||
      (isTaggedFromOthers && canManageTagged) ||
      (isCongDongSelfPost && canManageSelf);
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
              ) : showMilestoneVerifyBadge && showOrgVerifyBadge ? (
                <MilestoneVerifyBadge />
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
                      {visibility === "feature" ? "Nổi bật" : vis.label}
                    </span>
                  )}
                </JourneyMilestoneInlineControls>
              ) : null}
            </>
          ) : (
            <>
              {isCongDongSelfPost ? (
                <CongDongTypeBadge />
              ) : showMilestoneVerifyBadge && showOrgVerifyBadge ? (
                <MilestoneVerifyBadge />
              ) : (
                <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                  <MilestoneTypeBadgeContent type={type} />
                </span>
              )}
              {vis ? (
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
                    ? "Nổi bật"
                    : vis.label}
                </span>
              ) : null}
            </>
          )}
        </span>
        {canEditToolbar && ownerSlug ? (
          <JourneyMilestoneOwnerMenu
            milestoneId={cotMocId ?? milestone.id}
            ownerSlug={ownerSlug}
            permalinkOwnerSlug={resolvedPostOwner}
            currentType={type}
            currentVisibility={visibility ?? "public"}
            postSlug={postSlug ?? null}
            hideTypeChange={isBookmarkMilestone || isCongDongSelfPost}
            hideEdit={isBookmarkMilestone || isTaggedFromOthers}
            hideDelete={isTaggedFromOthers}
            foreignJourney={foreignJourneyContext}
            personalFilterSlugs={personalFilterSlugs}
            className="jcard-date-menu"
          />
        ) : null}
      </>
    );
  }

  function renderMilestoneCardInterior() {
    return (
      <>
          {variant === "tagged" || variant === "verified" ? (
            attribution && !canManageTagged && !useForeignFrame && !entityLens ? (
              <TaggedByPanel attr={attribution} dateLabel={displayDate} />
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
                <CongDongSourceChip
                  org={congDongOrg}
                  dateLabel={displayDate}
                  posterName={entityPosterLabel}
                  posterSlug={entityPosterSlug}
                  posterAvatarUrl={entityPosterAvatar}
                />
              ) : (
                <JourneyUserPopover
                  slug={entityPosterSlug ?? ""}
                  fallbackName={
                    entityPosterLabel ?? entityPosterSlug ?? "Người dùng"
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
                          (ownerSlug ? `@${ownerSlug}` : "Người dùng")}
                      </strong>
                      <small>{displayDate}</small>
                    </span>
                  </span>
                </JourneyUserPopover>
              )}
              <span className="badge-row">
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
                ) : showMilestoneVerifyBadge && showOrgVerifyBadge ? (
                  <MilestoneVerifyBadge />
                ) : (
                  <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                    <MilestoneTypeBadgeContent type={type} />
                  </span>
                )}
                {vis && !isCongDongPost ? (
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
                    {visibility === "feature" ? "Nổi bật" : vis.label}
                  </span>
                ) : null}
              </span>
            </div>
          ) : canManage && ownerSlug ? (
            <div
              className={
                "jcard-datebar" +
                (canManageTagged ? " jcard-datebar--tagged" : "") +
                (isCongDongPost && congDongOrg ? " jcard-datebar--cong-dong" : "") +
                (useForeignFrame ? " jcard-datebar--bookmark-source" : "")
              }
            >
              {canManageTagged && attribution && !useForeignFrame ? (
                <TaggedByPanel attr={attribution} dateLabel={displayDate} />
              ) : null}
              {isCongDongPost && congDongOrg ? (
                <CongDongSourceChip
                  org={congDongOrg}
                  dateLabel={displayDate}
                  posterName={useForeignFrame ? undefined : entityPosterLabel}
                  frameInner={useForeignFrame}
                />
              ) : isTaggedFromOthers && attribution ? (
                <TaggedOriginalAuthorChip
                  attr={attribution}
                  dateLabel={displayDate}
                />
              ) : isBookmarkMilestone && bookmark ? (
                <BookmarkOriginalPosterChip
                  bookmark={bookmark}
                  orgBaiDangRef={orgBaiDangRef}
                  dateLabel={displayDate}
                />
              ) : showAuthorBadge ? (
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
                    <strong>{authorName || `@${ownerSlug ?? ""}`}</strong>
                    <small>{displayDate}</small>
                  </span>
                </span>
              ) : null}
              {!useForeignFrame ? (
                <>
                  <span className="badge-row">
                    {showMilestoneVerifyBadge && showOrgVerifyBadge ? (
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
                    {showMilestoneVerifyBadge && !showOrgVerifyBadge ? (
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
                            {visibility === "feature" ? "Nổi bật" : vis.label}
                          </span>
                        )}
                      </JourneyMilestoneInlineControls>
                    ) : null}
                  </span>
                  <JourneyMilestoneOwnerMenu
                    milestoneId={cotMocId ?? milestone.id}
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
                    className="jcard-date-menu"
                  />
                </>
              ) : null}
            </div>
          ) : isCongDongSelfPost && congDongOrg ? (
            <div className="jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source">
              <CongDongSourceChip
                org={congDongOrg}
                dateLabel={displayDate}
                frameInner
              />
            </div>
          ) : variant === "self" ? (
            <div className="jcard-datebar jcard-datebar--guest">
              <span className="org-copy">
                <small>{displayDate}</small>
              </span>
              <span className="badge-row">
                <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                  <MilestoneTypeBadgeContent type={type} />
                </span>
              </span>
            </div>
          ) : isTaggedFromOthers && attribution ? (
            <div className="jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source">
              <TaggedOriginalAuthorChip
                attr={attribution}
                dateLabel={displayDate}
              />
            </div>
          ) : isBookmarkMilestone && bookmark ? (
            <div className="jcard-datebar jcard-datebar--guest jcard-datebar--bookmark-source">
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
                    <strong>{authorName || `@${ownerSlug ?? ""}`}</strong>
                    <small>{displayDate}</small>
                  </span>
                </span>
              </JourneyUserPopover>
              <span className="badge-row">
                {showMilestoneVerifyBadge && showOrgVerifyBadge ? (
                  <MilestoneVerifyBadge />
                ) : (
                  <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                    <MilestoneTypeBadgeContent type={type} />
                  </span>
                )}
                {showMilestoneVerifyBadge && !showOrgVerifyBadge ? (
                  <MilestoneVerifyBadge />
                ) : null}
                {vis ? (
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
                    {visibility === "feature" ? "Nổi bật" : vis.label}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}

          <JourneyMilestoneCardBodyContent
            title={title}
            body={body}
            noiDungBlocks={noiDungBlocks}
            preview={preview}
            articleTags={liveArticleTags}
            expandTrigger={
              isArticle && inlineExpand && !isContentOpen
                ? {
                    enabled: true,
                    expanded: isContentOpen,
                    ariaLabel: `Mở bài viết: ${showCardTitle ? title : cardCaption || title}`,
                    onClick: handleExpandTrigger,
                    onKeyDown: handleExpandKeyDown,
                  }
                : isArticle && inlineExpand
                  ? { enabled: false, expanded: isContentOpen }
                  : undefined
            }
            onTagLinkClick={(e) => e.stopPropagation()}
          />

          {inlineExpand && showUnfold ? (
            <div
              className="j-m-card-unfold"
              data-open="true"
              aria-hidden={false}
            >
              {orgBaiDangRef && showContent && noiDungBlocks?.length ? (
                <div className="j-m-card-unfold-inner">
                  <div className="cins-editor-page cins-post-view j-m-unfold-post">
                    {isMilestoneArticleCard(noiDungBlocks) ? (
                      <JourneyUnfoldArticleContent
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
                  active
                  showBlocks={showContent}
                  showComments={showComments}
                  commentsFocus={showComments}
                  postOwnerSlug={inlineExpand.postOwnerSlug}
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
              )}
            </div>
          ) : null}

          {showAuthorsStrip && !authorsInUnfold ? jcardAuthors : null}

          {!pinActionsAboveComments ? jcardActions : null}

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
  /** Trong khung ngoài — chỉ nhóm + ngày đăng gốc (không lặp người đăng). */
  frameInner?: boolean;
}) {
  const orgInitial = (org.initial || org.name.charAt(0) || "?").toUpperCase();

  if (frameInner) {
    return (
      <JourneyOrgPopover
        slug={org.slug}
        orgKind="cong_dong"
        href={org.href}
        fallbackName={org.name}
        fallbackAvatarUrl={org.avatarUrl}
      >
        <span className="org-chip">
          <span className="org-logo" aria-hidden>
            {org.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={org.avatarUrl} alt="" />
            ) : (
              orgInitial
            )}
          </span>
          <span className="org-copy">
            <strong>{org.name}</strong>
            <small title="Ngày đăng trong nhóm">{dateLabel}</small>
          </span>
        </span>
      </JourneyOrgPopover>
    );
  }
  const posterDisplay = posterName?.trim() || null;
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
          <small className="cd-source-meta">
            <Users size={11} strokeWidth={2} aria-hidden />
            <span>Cộng đồng</span>
            {!posterDisplay ? (
              <>
                <span className="cd-source-sep" aria-hidden>
                  ·
                </span>
                <time>{dateLabel}</time>
              </>
            ) : null}
          </small>
        </span>
      </span>
    </JourneyOrgPopover>
  );
}

function orgKindForOrgPopover(
  kind: MilestoneAttribution["orgKind"],
): "cong_dong" | "truong" | "co_so_dao_tao" | undefined {
  if (
    kind === "cong_dong" ||
    kind === "truong" ||
    kind === "co_so_dao_tao"
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
      orgKind="truong"
      href={attr.href ?? undefined}
      fallbackName={attr.name}
      fallbackAvatarUrl={attr.avatarUrl}
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
}: {
  attr: MilestoneAttribution;
  dateLabel: string;
}) {
  if (attr.isOrg && attr.orgKind === "truong") {
    return <TruongVerifyBar attr={attr} />;
  }

  const initial = (attr.initial || attr.name.charAt(0) || "?").toUpperCase();
  const isOrgSource = Boolean(
    attr.isOrg &&
      (attr.orgKind === "cong_dong" ||
        attr.orgKind === "co_so_dao_tao"),
  );
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
        orgKind={orgKindForOrgPopover(attr.orgKind)}
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
        <strong>{ownerName}</strong>
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
  const isCongDong = attr.isOrg && attr.orgKind === "cong_dong";
  const Popover = isCongDong ? JourneyOrgPopover : JourneyUserPopover;
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
      orgKind={orgKindForOrgPopover(attr.orgKind)}
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
    return (
      <JourneyOrgPopover
        slug={orgBaiDangRef.orgSlug}
        orgKind="truong"
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
