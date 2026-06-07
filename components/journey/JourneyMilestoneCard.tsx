"use client";

import {
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  FileText,
  FolderKanban,
  Globe,
  Eye,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Star,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthorRoleTooltip } from "@/components/journey/AuthorRoleTooltip";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyAuthorRowFriendAction } from "@/components/journey/JourneyAuthorRowFriendAction";
import { JourneyCardVideo } from "@/components/journey/JourneyCardVideo";
import { JourneyMilestoneUnfold } from "@/components/journey/JourneyMilestoneUnfold";
import { JourneyCommentLink } from "@/components/journey/JourneyCommentLink";
import { JourneyArticleTagManager } from "@/components/journey/JourneyArticleTagManager";
import { JourneyCoAuthorProposal } from "@/components/journey/JourneyCoAuthorProposal";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyMilestoneInlineControls } from "@/components/journey/JourneyMilestoneInlineControls";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import Link from "next/link";
import type {
  CoAuthorCredit,
  MilestoneAttribution,
  MilestoneBookmarkSource,
  MilestoneItem,
  MilestoneType,
} from "@/components/journey/milestone-types";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import { photoGridImagesFromBlocks } from "@/lib/journey/image-grid";
import {
  detectMediaPostKind,
  extractVideoUrl,
  milestoneCardCaptionPlain,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";
import { getNameInitials } from "@/lib/journey/profile";

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

const EDITABLE_TYPE_OPTIONS: ReadonlyArray<{
  ui: Exclude<MilestoneType, "bookmark">;
  db: LoaiMoc;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "hoc", db: "hoc", label: "Học tập", Icon: BookOpen },
  { ui: "lam", db: "lam_viec", label: "Công việc", Icon: Briefcase },
  { ui: "du-an", db: "du_an", label: "Dự án", Icon: FolderKanban },
  { ui: "su-kien", db: "su_kien", label: "Sự kiện", Icon: Calendar },
  { ui: "thanh-tuu", db: "thanh_tuu", label: "Thành tựu", Icon: Trophy },
  { ui: "ca-nhan", db: "ca_nhan", label: "Cá nhân", Icon: UserCircle2 },
];

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

function visibilityIcon(
  v: MilestoneItem["visibility"] | undefined,
): { Icon: LucideIcon; label: string } | null {
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
    cardLayout = "default",
    orgHref,
  } = milestone;

  const displayDate = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;

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
        type={type}
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

  const milestoneCls = [
    "j-milestone",
    variant === "self" && "j-self",
    variant === "tagged" && "j-tagged",
    variant === "verified" && "j-tagged j-verified",
    variant === "bookmark" && "j-bookmark",
  ]
    .filter(Boolean)
    .join(" ");

  const vis = visibilityIcon(visibility);
  const TypeIco = TYPE_ICON[type];
  const isBookmarkMilestone = variant === "bookmark";
  const canManageSelf =
    isOwner && (variant === "self" || isBookmarkMilestone) && Boolean(ownerSlug);
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
  const canManageCoAuthors = isOwner && variant === "self" && Boolean(tacPhamId);
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
  const videoEmbedUrl = isVideoPost
    ? extractVideoUrl(noiDungBlocks ?? [])
    : null;
  const videoProcessingMeta = isVideoPost
    ? extractVideoProcessingMeta(noiDungBlocks ?? [])
    : null;
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
  const milestoneId = cotMocId ?? milestone.id;

  /* Hiển thị badge người đăng
   *   - variant === "self" (chính chủ đăng — `authorName` là tác giả thật)
   *   - có thông tin tên / avatar
   * Với "tagged"/"verified"/"bookmark": tác giả thật là người khác → KHÔNG
   * dùng `authorName` (vốn là chủ Journey, không phải author bài). Các panel
   * `TaggedByPanel` / `BookmarkSourcePanel` đã hiển thị attribution riêng.
   *
   * Với type === "ca-nhan": chỉ render user-badge, không kèm type-badge —
   * label "Cá nhân" trùng nghĩa với user-badge nên thừa.
   * Với các type khác (hoc/lam/du-an/...): render CẢ user-badge VÀ type-badge
   * để giữ ngữ cảnh loại cột mốc. */
  const showAuthorBadge =
    (variant === "self" || isBookmarkMilestone) &&
    Boolean(authorName || authorAvatarUrl);

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
        <div
          className={
            "j-m-card jcard jcard--" +
            cardContentKind +
            (isArticle ? " has-unfold" : "") +
            (showUnfold ? " is-expanded" : isArticle ? " is-collapsed" : "")
          }
        >
          {variant === "tagged" || variant === "verified" ? (
            attribution && !canManageTagged ? (
              <TaggedByPanel attr={attribution} dateLabel={displayDate} />
            ) : null
          ) : null}

          {variant === "bookmark" && bookmark ? (
            <BookmarkSourcePanel src={bookmark} dateLabel={displayDate} />
          ) : null}

          {canManage && ownerSlug ? (
            <div
              className={
                "jcard-datebar" + (canManageTagged ? " jcard-datebar--tagged" : "")
              }
            >
              {canManageTagged && attribution ? (
                <TaggedByPanel attr={attribution} dateLabel={displayDate} />
              ) : null}
              {showAuthorBadge ? (
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
              <span className="badge-row">
                {verifiedBy ? (
                  <span className="verify-badge">{verifiedBy}</span>
                ) : null}
                {isBookmarkMilestone ? (
                  <span className="ctx-badge j-type-bookmark" title="Lưu về">
                    <Bookmark size={11} strokeWidth={1.8} aria-hidden />
                    {TYPE_LABEL.bookmark}
                  </span>
                ) : (
                  <JourneyMilestoneInlineControls
                    kind="type"
                    milestoneId={cotMocId ?? milestone.id}
                    current={type}
                    options={EDITABLE_TYPE_OPTIONS}
                  >
                    <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                      <TypeIco size={11} strokeWidth={1.8} aria-hidden />
                      {TYPE_LABEL[type]}
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
                        {...(visibility === "feature" ? { fill: "currentColor" } : {})}
                      />
                      {visibility === "feature" ? "Nổi bật" : vis.label}
                    </span>
                  </JourneyMilestoneInlineControls>
                ) : null}
              </span>
              <JourneyMilestoneOwnerMenu
                milestoneId={cotMocId ?? milestone.id}
                ownerSlug={ownerSlug}
                permalinkOwnerSlug={
                  isBookmarkMilestone || canManageTagged
                    ? resolvedPostOwner
                    : ownerSlug
                }
                currentType={type}
                currentVisibility={visibility ?? "public"}
                postSlug={postSlug ?? null}
                hideTypeChange={isBookmarkMilestone}
                hideEdit={isBookmarkMilestone || canManageTagged}
                hideDelete={canManageTagged}
                foreignJourney={foreignJourneyContext}
                className="jcard-date-menu"
              />
            </div>
          ) : variant === "self" || isBookmarkMilestone ? (
            <div className="jcard-datebar jcard-datebar--guest">
              <span className="org-copy">
                <small>{displayDate}</small>
              </span>
              <span className="badge-row">
                {isBookmarkMilestone ? (
                  <span className="ctx-badge j-type-bookmark">
                    <Bookmark size={11} strokeWidth={1.8} aria-hidden />
                    {TYPE_LABEL.bookmark}
                  </span>
                ) : (
                  <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                    <TypeIco size={11} strokeWidth={1.8} aria-hidden />
                    {TYPE_LABEL[type]}
                  </span>
                )}
                {isBookmarkMilestone && vis ? (
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

          <div
            className={`jcard-body${isArticle && !isContentOpen ? " is-expand-trigger" : ""}`}
            {...(isArticle && !isContentOpen
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  "aria-expanded": isContentOpen,
                  "aria-label": `Mở bài viết: ${showCardTitle ? title : cardCaption || title}`,
                  onClick: handleExpandTrigger,
                  onKeyDown: handleExpandKeyDown,
                }
              : {})}
          >
            <div className="jcard-content">
              {showCardTitle ? (
                <h2 className="jcard-title">{title}</h2>
              ) : null}

              {cardCaption && cardContentKind !== "article" ? (
                <div className="jcard-lead">
                  <p className="jcard-desc">{cardCaption}</p>
                </div>
              ) : null}

              {cardCaption && cardContentKind === "article" ? (
                <div
                  className="jcard-lead"
                  data-collapsed={isContentOpen ? "true" : "false"}
                  aria-hidden={isContentOpen}
                >
                  <p className="jcard-desc">{cardCaption}</p>
                </div>
              ) : null}

              {articleTags.length > 0 ? (
                <div className="tags jcard-tags" aria-label="Bài viết liên quan">
                  {articleTags.map((t) => (
                    <JourneyArticleTagLink
                      key={t.id}
                      tag={t}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ))}
                </div>
              ) : null}

              <div
                className="jcard-media-zone"
                data-collapsed={isArticle && isContentOpen ? "true" : "false"}
                aria-hidden={isArticle && isContentOpen}
              >
                {isVideoPost && videoEmbedUrl ? (
                  <JourneyCardVideo
                    url={videoEmbedUrl}
                    title={showCardTitle ? title : cardCaption || title}
                    processing={videoProcessingMeta?.processing === true}
                    preview={preview}
                    noiDungBlocks={noiDungBlocks ?? undefined}
                  />
                ) : isPhotoAlbum && photoGridImages ? (
                  <div className="preview preview--photo-grid">
                    <ImageGrid
                      images={photoGridImages}
                      readOnly
                      timelineLightbox
                    />
                  </div>
                ) : (
                  <div className="preview">
                    {preview ? (
                      <JourneyCoverImage
                        src={preview.src}
                        srcSet={preview.srcSet}
                        sizes={
                          preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined
                        }
                        width={preview.width}
                        height={preview.height}
                        alt={preview.label || title}
                      />
                    ) : (
                      <div className="preview-inner">
                        <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
                        <span className="preview-label">Ảnh bìa bài viết</span>
                      </div>
                    )}
                    {isArticle && !isContentOpen ? (
                      <span className="jcard-expand-cta" aria-hidden>
                        <ChevronDown size={14} strokeWidth={2.4} />
                        Đọc bài viết
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {inlineExpand && showUnfold ? (
            <div
              className="j-m-card-unfold"
              data-open="true"
              aria-hidden={false}
            >
              <JourneyMilestoneUnfold
                active
                showBlocks={showContent}
                showComments={showComments}
                commentsFocus={showComments}
                postOwnerSlug={inlineExpand.postOwnerSlug}
                postSlug={postSlug}
                milestoneId={milestoneId}
                inlineSkip={{
                  byline: canManage && showAuthorBadge,
                  tags: articleTags.length > 0,
                  contributors: showAuthorsStrip,
                }}
              />
            </div>
          ) : null}

          {showAuthorsStrip ? (
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
                              {c.role ? (
                                <AuthorRoleTooltip role={c.role} />
                              ) : null}
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
          ) : null}

          <div className="jcard-actions">
            <JourneyLikeButton
              milestoneId={cotMocId ?? milestone.id}
              initialLiked={social?.viewerLiked}
              initialCount={social?.likeCount}
              showCount={social?.showCounts}
            />
            {inlineExpand ? (
              <JourneyCommentLink
                commentCount={comments}
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
                {comments ? <span>{comments}</span> : null}
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
                initialTags={articleTags}
              />
            ) : null}
            {canShowCoAuthorAction && tacPhamId ? (
              <JourneyCoAuthorProposal
                tacPhamId={tacPhamId}
                mode={canManageCoAuthors ? "owner" : "proposal"}
                ownerId={coAuthorExcludeOwnerId}
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
        </div>
      </div>
    </article>
  );
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

function TaggedByPanel({
  attr,
  dateLabel,
}: {
  attr: MilestoneAttribution;
  dateLabel: string;
}) {
  const initial = (attr.initial || attr.name.charAt(0) || "?").toUpperCase();
  const isCongDong = attr.isOrg && attr.orgKind === "cong_dong";
  const Popover = isCongDong ? JourneyOrgPopover : JourneyUserPopover;
  const avatarClass = isCongDong ? "via-avatar is-org" : "via-avatar";

  return (
    <div className={`via-bar${isCongDong ? " is-org-source" : " is-bookmark-source"}`}>
      <CornerDownRight size={13} strokeWidth={1.8} aria-hidden />
      <span>{isCongDong ? "Cộng đồng" : "Được gắn bởi"}</span>
      <Popover
        slug={attr.slug}
        orgKind={attr.orgKind ?? undefined}
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
  type,
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
  type: MilestoneType;
  title: string;
  body?: string | null;
  attribution?: MilestoneAttribution | null;
  orgHref?: string | null;
  milestoneId: string;
  year: number;
  month: number;
  day: number;
}) {
  const TypeIco = TYPE_ICON[type];
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
      data-group={type}
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
              <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                <TypeIco size={11} strokeWidth={1.8} aria-hidden />
                {TYPE_LABEL[type]}
              </span>
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

function BookmarkSourcePanel({
  src,
  dateLabel,
}: {
  src: MilestoneBookmarkSource;
  dateLabel: string;
}) {
  const initial = (src.initial || src.name.charAt(0) || "?").toUpperCase();
  return (
    <div className="via-bar">
      <Bookmark size={13} strokeWidth={1.8} aria-hidden />
      <span>Lưu từ</span>
      <JourneyUserPopover
        slug={src.domain.replace(/^@/, "")}
        fallbackName={src.name}
        fallbackAvatarUrl={src.avatarUrl}
      >
        <span className="via-author">
          <span className="via-avatar" aria-hidden>
            {src.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={src.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <span className="via-copy">
            <strong>{src.name}</strong>
            <small>{dateLabel}</small>
          </span>
        </span>
      </JourneyUserPopover>
    </div>
  );
}

function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}
