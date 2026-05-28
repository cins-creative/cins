import {
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  CornerDownRight,
  ExternalLink,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  Link2,
  Lock,
  MessageCircle,
  Star,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { JourneyCoAuthorProposal } from "@/components/journey/JourneyCoAuthorProposal";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import type {
  CoAuthorCredit,
  MilestoneAttribution,
  MilestoneBookmarkSource,
  MilestoneItem,
  MilestoneType,
} from "@/components/journey/milestone-types";
import { articlePublicHref } from "@/lib/articles/article-href";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
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
 *  - Diamond + đường dash horizontal trước card hoàn toàn nằm trong `.j-m-month` /
 *    `.j-m-body-wrap::before` — không cần markup riêng.
 *  - `.j-m-diamond` được dùng trong `.j-m-month` (theo mockup `cins-journey-desktop.html`).
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
  const canManageCoAuthors = isOwner && variant === "self" && Boolean(tacPhamId);
  const canShowCoAuthorAction =
    (canProposeCoAuthor || canManageCoAuthors) && Boolean(tacPhamId);
  const visibleCoAuthors = coAuthorCredits.slice(0, MAX_VISIBLE_COAUTHORS);
  const hiddenCoAuthorCount = Math.max(
    0,
    coAuthorCredits.length - visibleCoAuthors.length,
  );
  const preview = media[0] ?? null;
  const ownerCredit =
    coAuthorCredits.find((c) => c.laChuSoHuu) ??
    (variant === "tagged" || variant === "verified"
      ? attribution
        ? {
            name: attribution.name,
            role: attribution.role,
            slug: attribution.slug,
            avatarUrl: attribution.avatarUrl,
            initial: attribution.initial,
            laChuSoHuu: true,
          }
        : null
      : null) ??
    coAuthorCredits[0] ??
    null;
  const contributorCount = coAuthorCredits.length;
  const otherContributorCount = Math.max(0, contributorCount - 1);
  const dateLabel = `${day} tháng ${month}, ${year}`;

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
      <div className="j-m-month">
        <span className="j-month-text">
          {String(day).padStart(2, "0")}/{String(month).padStart(2, "0")}/{year}
        </span>
        <span className="j-m-diamond" aria-hidden />
      </div>

      <div className="j-m-body-wrap">
        <div className="j-m-card jcard is-clickable" role="button" tabIndex={0}>
          {canManage && ownerSlug ? (
            <JourneyMilestoneOwnerMenu
              milestoneId={milestone.id}
              ownerSlug={ownerSlug}
              currentType={type}
              currentVisibility={visibility ?? "public"}
              postSlug={postSlug ?? null}
            />
          ) : (
            null
          )}

          {variant === "tagged" || variant === "verified" ? (
            attribution ? <TaggedByPanel attr={attribution} /> : null
          ) : null}

          {variant === "bookmark" && bookmark ? (
            <BookmarkSourcePanel src={bookmark} />
          ) : null}

          <div className="jcard-datebar">
            <span className="date-text">
              <Calendar size={13} strokeWidth={1.8} aria-hidden />
              {dateLabel}
            </span>
            <span className="badge-row">
              {verifiedBy ? (
                <span className="verify-badge">{verifiedBy}</span>
              ) : null}
              <span className={`ctx-badge ${TYPE_CLASS[type]}`}>
                <TypeIco size={11} strokeWidth={1.8} aria-hidden />
                {TYPE_LABEL[type]}
              </span>
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

          {showAuthorBadge ? (
            <div className="org-row">
              <span className="org-chip">
                <span className="org-logo" aria-hidden>
                  {authorAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={authorAvatarUrl} alt="" />
                  ) : (
                    getNameInitials(authorName ?? null, ownerSlug ?? "C")
                  )}
                </span>
                <span>{authorName || `@${ownerSlug ?? ""}`}</span>
              </span>
            </div>
          ) : null}

          <div className="jcard-body">
            <h2 className="jcard-title">{title}</h2>
            {body ? <p className="jcard-desc">{body}</p> : null}

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
                    {t.tieu_de}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="preview">
              {preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview.src} alt={preview.label || title} loading="lazy" />
              ) : (
                <div className="preview-inner">
                  <ImageIcon size={28} strokeWidth={1.5} aria-hidden />
                  <span className="preview-label">Cover - ảnh đầu tiên trong bài</span>
                </div>
              )}
              <span className="preview-open-hint">
                <ExternalLink size={11} strokeWidth={1.8} aria-hidden />
                Xem bài đầy đủ
              </span>
            </div>
          </div>

          {coAuthorCredits.length > 0 || canShowCoAuthorAction ? (
            <div className="jcard-authors" aria-label="Đồng tác giả">
              {coAuthorCredits.length > 0 ? (
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
                        <strong>{ownerCredit?.name ?? "Tác giả"}</strong>
                        {otherContributorCount > 0
                          ? ` và ${otherContributorCount} người khác`
                          : ""}
                      </span>
                      <span className="expand-hint">Xem tất cả</span>
                    </span>
                  </summary>
                  <div className="authors-expanded">
                    <div className="expanded-header">
                      <span>{contributorCount} người đóng góp</span>
                      <span className="collapse-hint">Thu gọn</span>
                    </div>
                    {coAuthorCredits.map((c, i) => (
                      <div key={`${c.slug ?? c.name}-${i}`} className="author-row-item">
                        <AuthorAvatar
                          credit={c}
                          tone={AVATAR_TONE_CLASSES[i % AVATAR_TONE_CLASSES.length] ?? "av-blue"}
                        />
                        <span className="author-row-info">
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
                        {c.laChuSoHuu ? (
                          <span className="abadge abadge-owner">Chủ bài</span>
                        ) : variant === "tagged" && c.slug && c.slug === ownerSlug ? (
                          <span className="abadge abadge-you">Bạn</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              {canShowCoAuthorAction && tacPhamId ? (
                <JourneyCoAuthorProposal
                  tacPhamId={tacPhamId}
                  mode={canManageCoAuthors ? "owner" : "proposal"}
                />
              ) : null}
            </div>
          ) : null}

          <div className="jcard-actions">
            <JourneyLikeButton
              milestoneId={cotMocId ?? milestone.id}
              initialLiked={social?.viewerLiked}
              initialCount={social?.likeCount}
              showCount={social?.showCounts}
            />
            <button type="button" className="action-btn" aria-label="Bình luận">
              <MessageCircle size={16} strokeWidth={1.8} aria-hidden />
              {comments ? <span>{comments}</span> : null}
            </button>
            <JourneyBookmarkButton
              milestoneId={cotMocId ?? milestone.id}
              title={title}
              initialSaved={social?.viewerBookmarked}
              initialCount={social?.bookmarkCount}
              showCount={social?.showCounts}
            />
            <span className="action-spacer" />
            <button type="button" className="share-btn" aria-label="Copy link">
              <Link2 size={14} strokeWidth={1.8} aria-hidden />
              Copy link
            </button>
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

function TaggedByPanel({ attr }: { attr: MilestoneAttribution }) {
  const initial = (attr.initial || attr.name.charAt(0) || "?").toUpperCase();
  return (
    <div className="via-bar">
      <CornerDownRight size={13} strokeWidth={1.8} aria-hidden />
      <span>Được gắn bởi</span>
      <span className="via-author">
        <span className="via-avatar" aria-hidden>
          {attr.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={attr.avatarUrl} alt="" />
          ) : (
            initial
          )}
        </span>
        <strong>{attr.name}</strong>
      </span>
      {attr.role ? <span className="via-role">{attr.role}</span> : null}
    </div>
  );
}

function BookmarkSourcePanel({ src }: { src: MilestoneBookmarkSource }) {
  const initial = (src.initial || src.name.charAt(0) || "?").toUpperCase();
  return (
    <div className="j-bookmark-src">
      <div className="j-bs-ico">{initial}</div>
      <span className="j-bs-text">
        Lưu từ <strong>{src.name}</strong> ·{" "}
        <span className="j-bs-domain">{src.domain}</span>
      </span>
      <span className="j-bs-ext" aria-hidden>
        <ExternalLink size={14} strokeWidth={1.8} />
      </span>
    </div>
  );
}

function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}
