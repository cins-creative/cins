import {
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronUp,
  CornerDownRight,
  FolderKanban,
  Globe,
  Eye,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MessageCircle,
  Star,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { JourneyCoAuthorProposal } from "@/components/journey/JourneyCoAuthorProposal";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyMilestoneInlineControls } from "@/components/journey/JourneyMilestoneInlineControls";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import type {
  CoAuthorCredit,
  MilestoneAttribution,
  MilestoneBookmarkSource,
  MilestoneItem,
  MilestoneType,
} from "@/components/journey/milestone-types";
import { articlePublicHref } from "@/lib/articles/article-href";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import { photoGridImagesFromBlocks } from "@/lib/journey/image-grid";
import {
  isMediaPost,
  milestoneCardCaption,
  shouldShowMilestoneCardTitle,
} from "@/lib/journey/post-media";
import { getNameInitials } from "@/lib/journey/profile";

type Props = {
  milestone: MilestoneItem;
  /** Owner đang xem → render kebab menu (sửa / nhóm / hiển thị / xoá). */
  isOwner?: boolean;
  /** Slug owner — wire link "Sửa bài viết" trong menu. Bắt buộc nếu `isOwner`. */
  ownerSlug?: string;
  /**
   * Author của Journey hiện tại — render trong badge "Cá nhân" thay vì
   * label cứng "Cá nhân", để identify rõ ai là người post. URL avatar
   * đã được resolve qua Cloudflare ở server (xem `getAvatarUrl`).
   */
  authorAvatarUrl?: string | null;
  authorName?: string | null;
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
  authorAvatarUrl,
  authorName,
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
    cotMocId,
    tacPhamId,
    canProposeCoAuthor,
    social,
    noiDungBlocks,
  } = milestone;

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
  const canManage = isOwner && variant === "self" && Boolean(ownerSlug);
  const canBookmark = !(isOwner && variant === "self");
  const canManageCoAuthors = isOwner && variant === "self" && Boolean(tacPhamId);
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
  const isPhotoAlbum = isMediaPost(noiDungBlocks) && photoGridImages !== null;
  const showCardTitle = shouldShowMilestoneCardTitle(title, noiDungBlocks);
  const cardCaption = milestoneCardCaption(body, noiDungBlocks);
  const contributorCount = coAuthorCredits.length;
  const otherContributorCount = coAuthorsOnly.length;
  const displayDate = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  const resolvedPostOwner = postOwnerSlug || ownerSlug || null;
  const postHref =
    postSlug && resolvedPostOwner
      ? resolvedPostOwner === ownerSlug
        ? `/${resolvedPostOwner}/p/${postSlug}`
        : `/${resolvedPostOwner}/p/${postSlug}?owner=${encodeURIComponent(resolvedPostOwner)}`
      : null;

  /* Hiển thị badge người đăng (avatar + tên) khi:
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
    variant === "self" && Boolean(authorName || authorAvatarUrl);
  return (
    <article
      className={milestoneCls}
      data-mid={cotMocId ?? milestone.id}
      data-group={type}
      data-post-slug={postSlug ?? undefined}
      data-post-owner-slug={postOwnerSlug ?? undefined}
    >
      <div className="j-m-body-wrap">
        <div
          className="j-m-card jcard is-clickable"
          {...(postHref
            ? {}
            : { role: "button" as const, tabIndex: 0 })}
        >
          {postHref ? (
            <Link
              href={postHref}
              scroll={false}
              prefetch
              className="j-m-card-hit"
              aria-label={`Xem chi tiết: ${showCardTitle ? title : cardCaption || title}`}
            />
          ) : null}
          {variant === "tagged" || variant === "verified" ? (
            attribution ? <TaggedByPanel attr={attribution} dateLabel={displayDate} /> : null
          ) : null}

          {variant === "bookmark" && bookmark ? (
            <BookmarkSourcePanel src={bookmark} dateLabel={displayDate} />
          ) : null}

          {canManage && ownerSlug ? (
            <div className="jcard-datebar">
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
                {type !== "bookmark" ? (
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
                ) : null}
                {vis ? (
                  <JourneyMilestoneInlineControls
                    kind="visibility"
                    milestoneId={cotMocId ?? milestone.id}
                    current={visibility ?? "public"}
                    options={EDITABLE_VIS_OPTIONS}
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
                currentType={type}
                currentVisibility={visibility ?? "public"}
                postSlug={postSlug ?? null}
                className="jcard-date-menu"
              />
            </div>
          ) : null}

          <div className="jcard-body">
            {showCardTitle ? <h2 className="jcard-title">{title}</h2> : null}
            {cardCaption ? <p className="jcard-desc">{cardCaption}</p> : null}

            {articleTags.length > 0 ? (
              <div className="tags" aria-label="Bài viết liên quan">
                {articleTags.map((t) => (
                  <Link
                    key={t.id}
                    href={articlePublicHref(t.loai_bai_viet, t.slug)}
                    className={`tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                  >
                    #{t.tieu_de}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className={`preview${isPhotoAlbum ? " preview--photo-grid" : ""}`}>
              {isPhotoAlbum && photoGridImages ? (
                <ImageGrid images={photoGridImages} readOnly />
              ) : preview ? (
                <JourneyCoverImage
                  src={preview.src}
                  srcSet={preview.srcSet}
                  sizes={preview.srcSet ? "(max-width: 767px) 100vw, 680px" : undefined}
                  width={preview.width}
                  height={preview.height}
                  alt={preview.label || title}
                />
              ) : (
                <div className="preview-inner">
                  <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
                  <span className="preview-label">Cover - ảnh đầu tiên trong bài</span>
                </div>
              )}
              <span className="preview-open-hint" aria-label="Xem bài đầy đủ">
                <Maximize2 size={14} strokeWidth={2} aria-hidden />
              </span>
            </div>
          </div>

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
                      {canShowCoAuthorAction && tacPhamId ? (
                        <JourneyCoAuthorProposal
                          tacPhamId={tacPhamId}
                          mode={canManageCoAuthors ? "owner" : "proposal"}
                        />
                      ) : null}
                    </span>
                  </summary>
                  <div className="authors-expanded">
                    <div className="expanded-header">
                      <span>{contributorCount} người đóng góp</span>
                    </div>
                    {coAuthorCredits.map((c, i) => (
                      <div key={`${c.slug ?? c.name}-${i}`} className="author-row-item">
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
                              {c.role ? <span className="author-row-role">{c.role}</span> : null}
                            </span>
                          </span>
                        </JourneyUserPopover>
                        {c.laChuSoHuu ? (
                          <span className="abadge abadge-owner">Chủ bài</span>
                        ) : variant === "tagged" && c.slug && c.slug === ownerSlug ? (
                          <span className="abadge abadge-you">Bạn</span>
                        ) : null}
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
            {postHref ? (
              <Link
                href={postHref}
                scroll={false}
                prefetch
                className="action-btn"
                aria-label="Bình luận"
              >
                <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
                {comments ? <span>{comments}</span> : null}
              </Link>
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
  return (
    <div className="via-bar is-bookmark-source">
      <CornerDownRight size={13} strokeWidth={1.8} aria-hidden />
      <span>Được gắn bởi</span>
      <JourneyUserPopover
        slug={attr.slug}
        fallbackName={attr.name}
        fallbackAvatarUrl={attr.avatarUrl}
      >
        <span className="via-author">
          <span className="via-avatar" aria-hidden>
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
      </JourneyUserPopover>
    </div>
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
