import {
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  CornerDownRight,
  ExternalLink,
  Eye,
  FolderKanban,
  Globe,
  Lock,
  Maximize2,
  MessageCircle,
  Pencil,
  Play,
  Star,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { PostBlocksRenderer } from "@/components/editor/PostRenderer";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import type {
  MilestoneAttribution,
  MilestoneBookmarkSource,
  MilestoneItem,
  MilestoneMediaItem,
  MilestoneType,
} from "@/components/journey/milestone-types";
import { articlePublicHref } from "@/lib/articles/article-href";
import {
  articleTagLabel,
  articleTagLoaiClass,
} from "@/lib/editor/article-tag";
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

function variantSourceTag(variant: MilestoneItem["variant"]): {
  Icon: LucideIcon | null;
  text: string;
  hide?: boolean;
} {
  switch (variant) {
    case "self":
      return { Icon: Pencil, text: "TỰ UP" };
    case "tagged":
      return { Icon: CornerDownRight, text: "TAG VÀO" };
    case "verified":
      return { Icon: CornerDownRight, text: "TAG VÀO" };
    case "bookmark":
      return { Icon: Bookmark, text: "LƯU VỀ" };
    default:
      return { Icon: null, text: "", hide: true };
  }
}

function visibilityIcon(
  v: MilestoneItem["visibility"] | undefined,
): { Icon: LucideIcon; label: string } | null {
  if (v === "feature") return { Icon: Star, label: "Nổi bật" };
  if (!v || v === "public") return { Icon: Globe, label: "Công khai" };
  if (v === "unlisted") return { Icon: Users, label: "Theo nhóm" };
  if (v === "private") return { Icon: Lock, label: "Chỉ mình tôi" };
  return null;
}

function mediaGridClass(count: number): string {
  if (count <= 1) return "j-media-single";
  if (count === 2) return "j-media-double";
  return "j-media-triple";
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
    org,
    body,
    attribution,
    bookmark,
    verifiedBy,
    media = [],
    tags = [],
    articleTags = [],
    views,
    comments,
    visibility,
    year,
    month,
    day,
    postSlug,
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

  const src = variantSourceTag(variant);
  const vis = visibilityIcon(visibility);
  const mediaCount = media.length;
  const TypeIco = TYPE_ICON[type];

  return (
    <article
      className={milestoneCls}
      data-mid={milestone.id}
      data-group={type}
      data-post-slug={postSlug ?? undefined}
    >
      <div className="j-m-month">
        <span className="j-month-text">
          NGÀY {day} · THÁNG {month}
        </span>
        <span>{year}</span>
        {!src.hide && src.Icon ? (
          <span className="j-source-tag">
            <src.Icon size={11} strokeWidth={2} aria-hidden /> {src.text}
          </span>
        ) : null}
        <span className="j-m-diamond" aria-hidden />
      </div>

      <div className="j-m-body-wrap">
        <div className="j-m-card is-clickable" role="button" tabIndex={0}>
          {isOwner && ownerSlug ? (
            <JourneyMilestoneOwnerMenu
              milestoneId={milestone.id}
              ownerSlug={ownerSlug}
              currentType={type}
              currentVisibility={visibility ?? "public"}
              postSlug={postSlug ?? null}
            />
          ) : (
            <span className="j-m-open-hint" aria-hidden>
              <Maximize2 size={12} strokeWidth={1.8} />
              <span>Xem chi tiết</span>
            </span>
          )}

          {variant === "tagged" || variant === "verified" ? (
            attribution ? <TaggedByPanel attr={attribution} /> : null
          ) : null}

          {variant === "bookmark" && bookmark ? (
            <BookmarkSourcePanel src={bookmark} />
          ) : null}

          <div className="j-m-badges">
            {type === "ca-nhan" && (authorName || authorAvatarUrl) ? (
              <span
                className={`j-type-badge ${TYPE_CLASS[type]} j-type-badge-user`}
              >
                <span className="j-type-badge-ava" aria-hidden>
                  {authorAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={authorAvatarUrl} alt="" />
                  ) : (
                    <span className="j-type-badge-ava-fallback">
                      {getNameInitials(authorName ?? null, ownerSlug ?? "C")}
                    </span>
                  )}
                </span>
                <span className="j-type-badge-name">
                  {authorName || `@${ownerSlug ?? ""}`}
                </span>
              </span>
            ) : (
              <span className={`j-type-badge ${TYPE_CLASS[type]}`}>
                <TypeIco size={13} strokeWidth={1.8} aria-hidden />
                {TYPE_LABEL[type]}
              </span>
            )}
            {verifiedBy ? (
              <span className="j-verify-badge">{verifiedBy}</span>
            ) : null}
            {vis ? (
              <span
                className={`j-visibility-icon j-vis-${visibility ?? "public"}`}
                aria-label={vis.label}
              >
                <vis.Icon
                  size={13}
                  strokeWidth={1.8}
                  aria-hidden
                  /* Sao "Nổi bật" → fill vàng đậm để pop khỏi card. */
                  {...(visibility === "feature"
                    ? { fill: "currentColor" }
                    : {})}
                />
                {visibility === "private" || visibility === "feature" ? (
                  <span>{vis.label}</span>
                ) : null}
              </span>
            ) : null}
          </div>

          <h2 className="j-m-title">{title}</h2>
          {org ? (
            <div
              className="j-m-org"
              /* `org` cho phép <span class="j-org-link"> & <span class="j-pct"> từ adapter. */
              dangerouslySetInnerHTML={{ __html: org }}
            />
          ) : null}
          {body ? <p className="j-m-body">{body}</p> : null}

          {/* Render nội dung blocks INLINE trên card (giống image #3 brief):
              h2/h3/body/quote text + image blocks + palette + divider/spacer.
              Cover image của tác phẩm KHÔNG render ở đây (dành cho Gallery).

              Wrapper `.cins-editor-page.cins-post-view` để các class
              `.block`, `.b-text-ro`, `.imgwrap`, ... được editor.css style
              đúng — `cins-post-view` override các style root không phù hợp
              (min-height, background) cho mode đứng-trong-container nhỏ. */}
          {noiDungBlocks && noiDungBlocks.length > 0 ? (
            <div className="j-m-blocks cins-editor-page cins-post-view">
              <PostBlocksRenderer blocks={noiDungBlocks} />
            </div>
          ) : mediaCount > 0 ? (
            <div className={`j-m-media ${mediaGridClass(mediaCount)}`}>
              {media.slice(0, 3).map((m, i) => (
                <MediaThumb key={`${m.src}-${i}`} m={m} />
              ))}
            </div>
          ) : null}

          {articleTags.length > 0 ? (
            <div className="j-m-art-tags" aria-label="Bài viết liên quan">
              {articleTags.map((t) => (
                <Link
                  key={t.id}
                  href={articlePublicHref(t.loai_bai_viet, t.slug)}
                  className={`j-m-art-tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
                  prefetch={false}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="j-m-art-tag-loai" aria-hidden>
                    {articleTagLabel(t.loai_bai_viet)}
                  </span>
                  <span className="j-m-art-tag-name">{t.tieu_de}</span>
                </Link>
              ))}
            </div>
          ) : null}

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

          {views || comments ? (
            <div className="j-m-footer">
              {views ? (
                <span className="j-fi j-views">
                  <Eye size={13} strokeWidth={1.7} aria-hidden />
                  {formatViews(views)} lượt xem
                </span>
              ) : null}
              {views && comments ? (
                <span className="j-dot" aria-hidden>
                  ·
                </span>
              ) : null}
              {comments ? (
                <span className="j-fi">
                  <MessageCircle size={13} strokeWidth={1.7} aria-hidden />
                  {comments} bình luận
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MediaThumb({ m }: { m: MilestoneMediaItem }) {
  return (
    <div
      className="j-media-thumb"
      data-label={m.label ?? undefined}
    >
      <img loading="lazy" src={m.src} alt={m.label || ""} />
      {m.isVideo ? (
        <div className="j-play-icon" aria-hidden>
          <Play size={18} strokeWidth={2} fill="currentColor" />
        </div>
      ) : null}
    </div>
  );
}

function TaggedByPanel({ attr }: { attr: MilestoneAttribution }) {
  const initial = (attr.initial || attr.name.charAt(0) || "?").toUpperCase();
  return (
    <div className="j-tagged-by">
      <div className={"j-tb-avatar" + (attr.isOrg ? " is-org" : "")}>
        {initial}
      </div>
      <span className="j-tb-text">
        <span className="j-tb-org">{attr.name}</span>{" "}
        {attr.role ? (
          <>
            tag bạn là <strong>{attr.role}</strong>
          </>
        ) : (
          "đã tag bạn"
        )}
      </span>
      <span className="j-tb-arrow" aria-hidden>
        <CornerDownRight size={14} strokeWidth={1.8} />
      </span>
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
