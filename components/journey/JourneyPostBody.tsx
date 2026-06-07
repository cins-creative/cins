"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  ExternalLink,
  FolderKanban,
  Globe,
  Lock,
  Star,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  type MilestonePostAuthor,
  type MilestonePostComment,
  type MilestonePostContributor,
  type MilestonePostDetail,
} from "@/app/[slug]/journey/actions";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { PostBlocksRenderer, PostCover } from "@/components/editor/PostRenderer";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { usePostFocusModeState } from "@/app/[slug]/p/[postSlug]/_components/PostPageShell";
import { CommentBlock } from "@/components/journey/CommentBlock";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";
import {
  mapCheDoToMilestoneVisibility,
  mapLoaiMocToMilestoneType,
} from "@/lib/journey/milestone-ui-map";
import { isMediaPost } from "@/lib/journey/post-media";
import { getAvatarUrl } from "@/lib/journey/profile";

import { PostActionsRail, PostShareMenu } from "./PostActionsRail";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyPostBody — view layout cho bài viết. ĐỒNG BỘ với editor   ║
   ║ canvas (`EditorView`):                                           ║
   ║                                                                  ║
   ║   • Cover full-width 200px (giống editor cover-add.has)          ║
   ║   • Title (38px, font-sans, weight 800)                          ║
   ║   • Sub (19px, font-serif italic)                                ║
   ║   • Tag chips (meta-chips row)                                   ║
   ║   • Blocks (cùng class `.block` `.b-text` `.b-imgs` …)           ║
   ║   • Byline (author chip + ngày + chế độ hiển thị)                ║
   ║   • Comments                                                     ║
   ║                                                                  ║
   ║ Wrap = `main.cins-editor-page.cins-post-view.editor-canvas` — một    ║
   ║ khối duy nhất (modal + permalink), không wrapper thừa bên ngoài.  ║
   ║                                                                  ║
   ║ Cạnh phải byline: `PostActionsRail` (Thích · Lưu · BL · Chia sẻ).  ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const TYPE_LABEL: Record<string, string> = {
  hoc: "Học",
  lam_viec: "Làm việc",
  du_an: "Dự án",
  su_kien: "Sự kiện",
  thanh_tuu: "Thành tựu",
  ca_nhan: "Cá nhân",
};

const VIS_LABEL: Record<string, { Icon: LucideIcon; text: string }> = {
  feature: { Icon: Star, text: "Nổi bật" },
  public: { Icon: Globe, text: "Công khai" },
  theo_nhom: { Icon: Users, text: "Theo nhóm" },
  chi_minh: { Icon: Lock, text: "Chỉ mình tôi" },
};

const TYPE_ICON: Record<string, LucideIcon> = {
  hoc: BookOpen,
  lam_viec: Briefcase,
  du_an: FolderKanban,
  su_kien: Calendar,
  thanh_tuu: Trophy,
  ca_nhan: UserCircle2,
};

type Props = {
  initialDetail: MilestonePostDetail;
  postSlug?: string | null;
  isOwner?: boolean;
  /** Khi true → không render link permalink "Mở bài viết" (đang ở permalink rồi). */
  hideOpenLink?: boolean;
  /** Thay thế khối bình luận mặc định — dùng cho Suspense stream. */
  commentsSlot?: React.ReactNode;
  /** Ghi đè số bình luận trên action rail khi comments stream riêng. */
  commentCountOverride?: number;
  /** Sau khi owner đổi loại/hiển thị/xoá từ menu — refetch detail (modal). */
  onMilestoneUpdated?: () => void;
  /** `inline` — mở trong timeline, bỏ cover/title trùng với card. */
  variant?: "full" | "inline";
  /** Permalink — trái meta/đóng góp, giữa nội dung, phải bình luận. Modal/timeline giữ `stack`. */
  layout?: "stack" | "split";
  /** Id section bình luận — tránh trùng khi nhiều bài mở trên timeline. */
  commentsSectionId?: string;
  /** Timeline card — ẩn meta đã hiển thị trên `JourneyMilestoneCard`. */
  inlineSkip?: {
    byline?: boolean;
    tags?: boolean;
    contributors?: boolean;
  };
  /** Timeline inline — tách nội dung dài vs bình luận. */
  inlineParts?: {
    blocks?: boolean;
    comments?: boolean;
  };
  /** Timeline — action bar (like/bookmark/…) ngay trên bình luận. */
  inlineActionsSlot?: React.ReactNode;
};

export function JourneyPostBody({
  initialDetail,
  postSlug,
  isOwner = false,
  hideOpenLink = false,
  commentsSlot,
  commentCountOverride,
  onMilestoneUpdated,
  variant = "full",
  layout = "stack",
  commentsSectionId = "post-comments",
  inlineSkip,
  inlineParts,
  inlineActionsSlot,
}: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail>(initialDetail);
  const { milestone, owner, posts, comments, viewerCanComment, social } = detail;
  const displayCommentCount =
    commentCountOverride ??
    (comments.length > 0
      ? countCommentThreads(comments)
      : (social.commentCount ?? 0));

  useEffect(() => {
    queueMicrotask(() => setDetail(initialDetail));
  }, [initialDetail]);

  useEffect(() => {
    function focusCommentsSection() {
      if (window.location.hash !== "#post-comments") return;
      const section = document.getElementById("post-comments");
      if (!section) return;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        section
          .querySelector<HTMLInputElement>(".post-comments-input")
          ?.focus({ preventScroll: true });
      }, 350);
    }

    focusCommentsSection();
    window.addEventListener("hashchange", focusCommentsSection);
    return () => window.removeEventListener("hashchange", focusCommentsSection);
  }, [initialDetail.milestone.id]);

  /* `posts[0]` là tác phẩm chính. Khi cột mốc có nhiều tác phẩm (lượt sau)
     sẽ render tuần tự — hiện tại UI editor chỉ tạo 1 tác phẩm/cột mốc. */
  const mainPost = posts[0];
  const coverSeed = mainPost?.coverId ?? null;
  const heroTitle =
    milestone.tieuDe || mainPost?.tieuDe || "Cột mốc không tiêu đề";
  const heroSub = milestone.moTa || mainPost?.moTa || null;
  const blocks = mainPost?.noiDungBlocks ?? null;
  const mediaPost = isMediaPost(blocks);

  const typeLabel = TYPE_LABEL[milestone.loaiMoc] ?? "Cột mốc";
  const TypeIcon = TYPE_ICON[milestone.loaiMoc] ?? UserCircle2;
  const vis = VIS_LABEL[milestone.cheDoHienThi] ?? VIS_LABEL.public;
  const dateLabel = formatVnDate(milestone.thoiDiem);
  const ownerInitial = (owner.tenHienThi || owner.slug)
    .charAt(0)
    .toUpperCase();
  const ownerAvatarUrl = getAvatarUrl(owner.avatarId);

  const permalinkHref =
    !hideOpenLink && postSlug ? `/${owner.slug}/p/${postSlug}` : null;
  const sharePath = postSlug ? `/${owner.slug}/p/${postSlug}` : null;

  function onCommentAdded(c: MilestonePostComment) {
    setDetail((d) => ({
      ...d,
      comments: addCommentToThreads(d.comments, c),
    }));
  }
  function onCommentRemoved(id: string) {
    setDetail((d) => ({
      ...d,
      comments: removeCommentFromThreads(d.comments, id),
    }));
  }
  function onCommentUpdated(id: string, patch: Partial<MilestonePostComment>) {
    setDetail((d) => ({
      ...d,
      comments: updateCommentInThreads(d.comments, id, patch),
    }));
  }
  function onThreadsReordered(threads: MilestonePostComment[]) {
    setDetail((d) => ({ ...d, comments: threads }));
  }

  const isInline = variant === "inline";
  const showBlocks = !isInline || inlineParts?.blocks !== false;
  const showCommentsPart = !isInline || inlineParts?.comments !== false;
  const commentsOnlyInline =
    isInline && showCommentsPart && !showBlocks;
  const showByline = !isInline || !inlineSkip?.byline;
  const showTags = showBlocks && (!isInline || !inlineSkip?.tags);
  const showContributors =
    showBlocks && (!isInline || !inlineSkip?.contributors);
  const isSplit = variant === "full" && layout === "split";
  const focusMode = usePostFocusModeState();
  const Wrapper = isInline ? "div" : "main";
  const wrapperClass = isInline
    ? `cins-editor-page cins-post-view j-m-unfold-post${mediaPost ? " j-m-unfold-post--media" : ""}${commentsOnlyInline ? " j-m-unfold-post--comments-only" : ""}`
    : `cins-editor-page cins-post-view editor-canvas post-canvas${mediaPost ? " post-canvas--media" : ""}${isSplit ? " post-canvas--split" : ""}`;

  const coverEl =
    variant === "full" && !mediaPost && coverSeed ? (
      <PostCover seed={coverSeed} />
    ) : null;

  const heroEl =
    variant === "full" && !mediaPost ? (
      <>
        <h1 className="title-in title-ro">{heroTitle}</h1>
        {heroSub ? <p className="sub-in sub-ro">{heroSub}</p> : null}
      </>
    ) : null;

  const actionsRail = (
    <PostActionsRail
      milestoneId={milestone.id}
      initialLiked={social.viewerLiked}
      initialBookmarked={social.viewerBookmarked}
      likeCount={social.likeCount}
      bookmarkCount={social.bookmarkCount}
      commentCount={displayCommentCount}
      showCounts
      canBookmark={!isOwner}
      sharePath={sharePath}
      shareTitle={heroTitle}
      hideShare={isSplit}
    />
  );

  const bylineEl = showByline ? (
    <div className={`post-byline${isSplit ? " post-byline--sidebar" : ""}`}>
      <div className="post-byline-head">
        <Link
          href={`/${owner.slug}`}
          className="post-byline-author"
          prefetch={false}
        >
          <span className="post-byline-avatar" aria-hidden>
            {ownerAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ownerAvatarUrl} alt="" />
            ) : (
              ownerInitial
            )}
          </span>
          <span className="post-byline-name">
            <strong>{owner.tenHienThi}</strong>
            <span className="post-byline-handle">@{owner.slug}</span>
          </span>
        </Link>
        {isOwner ? (
          <JourneyMilestoneOwnerMenu
            className="post-byline-menu"
            milestoneId={milestone.id}
            ownerSlug={owner.slug}
            currentType={mapLoaiMocToMilestoneType(milestone.loaiMoc)}
            currentVisibility={mapCheDoToMilestoneVisibility(
              milestone.cheDoHienThi,
            )}
            postSlug={postSlug ?? null}
            onAfterChange={onMilestoneUpdated}
          />
        ) : null}
      </div>

      <div className="post-byline-meta">
        <time className="post-byline-date" dateTime={milestone.thoiDiem}>
          {dateLabel}
        </time>
        <div className="post-byline-badges" aria-label="Loại và chế độ hiển thị">
          <span
            className="post-byline-type"
            aria-label={`Loại cột mốc: ${typeLabel}`}
          >
            <TypeIcon size={12} strokeWidth={1.9} aria-hidden />
            <span>{typeLabel}</span>
          </span>
          <span
            className={`post-byline-vis post-byline-vis--${milestone.cheDoHienThi}`}
            aria-label={vis.text}
          >
            <vis.Icon
              size={12}
              strokeWidth={1.9}
              aria-hidden
              {...(milestone.cheDoHienThi === "feature"
                ? { fill: "currentColor" }
                : {})}
            />
            <span>{vis.text}</span>
          </span>
        </div>
      </div>

      <div className="post-byline-foot">
        {permalinkHref && !hideOpenLink ? (
          <Link href={permalinkHref} className="post-byline-action">
            <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
            <span>Mở bài viết</span>
          </Link>
        ) : null}
        {actionsRail}
        {isSplit ? (
          <PostShareMenu
            sharePath={sharePath}
            shareTitle={heroTitle}
            showLabel
            className="post-byline-share-standalone"
          />
        ) : null}
      </div>
    </div>
  ) : null;

  const tagsEl =
    showTags && mainPost && mainPost.articleTags.length > 0 ? (
      <div className="post-art-tags" aria-label="Bài viết liên quan">
        {mainPost.articleTags.map((t) => (
          <JourneyArticleTagLink
            key={t.id}
            tag={t}
            className={`post-art-tag ${articleTagLoaiClass(t.loai_bai_viet)}`}
          />
        ))}
      </div>
    ) : null;

  const contributorsEl =
    showContributors && mainPost ? (
      <PostContributors contributors={mainPost.contributors} />
    ) : null;

  const blocksEl =
    showBlocks && blocks && blocks.length > 0 ? (
      mediaPost ? (
        <PostBlockRenderer blocks={blocks} />
      ) : (
        <PostBlocksRenderer blocks={blocks} />
      )
    ) : showBlocks && mainPost?.noiDungHtml ? (
      <div
        className="post-html-fallback article-rich-content"
        dangerouslySetInnerHTML={{ __html: mainPost.noiDungHtml }}
      />
    ) : showBlocks ? (
      <div className="post-empty">Cột mốc này chưa có nội dung chi tiết.</div>
    ) : null;

  const commentsEl = showCommentsPart ? (
    commentsSlot ?? (
      <JourneyPostCommentsBlock
        milestoneId={milestone.id}
        contentOwnerId={owner.id}
        viewerIsOwner={detail.viewerIsOwner}
        comments={comments}
        viewerCanComment={viewerCanComment}
        onCommentAdded={onCommentAdded}
        onCommentUpdated={onCommentUpdated}
        onCommentRemoved={onCommentRemoved}
        onThreadsReordered={onThreadsReordered}
        sectionId={commentsSectionId}
      />
    )
  ) : null;

  if (isSplit) {
    return (
      <Wrapper className={wrapperClass} aria-label="Bài viết">
          <div className="post-view-layout">
            <aside
              className="post-view-meta"
              aria-label="Thông tin bài viết"
              aria-hidden={focusMode ? true : undefined}
              hidden={focusMode}
            >
              {bylineEl}
              {tagsEl}
              {contributorsEl}
            </aside>
            <div
              className={`post-view-main${mediaPost ? " post-view-main--media" : ""}`}
            >
              <div className="post-view-main-inner">
                {coverEl}
                {heroEl}
                {blocksEl}
              </div>
            </div>
            <aside
              className="post-view-comments"
              aria-label="Bình luận"
              aria-hidden={focusMode ? true : undefined}
              hidden={focusMode}
            >
              {commentsEl}
            </aside>
          </div>
        </Wrapper>
    );
  }

  return (
    <Wrapper className={wrapperClass} aria-label="Bài viết">
      {coverEl}
      {heroEl}
      {bylineEl}
      {tagsEl}
      {contributorsEl}
      {blocksEl}
      {showCommentsPart ? (
        <>
          {inlineActionsSlot}
          {!commentsOnlyInline && !inlineActionsSlot ? (
            <hr className="post-divider" />
          ) : null}
          {commentsEl}
        </>
      ) : null}
    </Wrapper>
  );
}

function shouldShowPostContributors(
  contributors: ReadonlyArray<MilestonePostContributor>,
): boolean {
  if (contributors.length === 0) return false;
  if (contributors.length === 1 && contributors[0]?.laChuSoHuu) return false;
  return true;
}

function PostContributors({
  contributors,
}: {
  contributors: ReadonlyArray<MilestonePostContributor>;
}) {
  if (!shouldShowPostContributors(contributors)) return null;

  return (
    <section className="post-contributors" aria-label="Người đóng góp dự án">
      <div className="post-contributors-head">
        <span>Người đóng góp dự án</span>
        <strong>{contributors.length}</strong>
      </div>
      <div className="post-contributor-list">
        {contributors.map((c) => {
          const avatarUrl = getAvatarUrl(c.avatarId);
          const initial = (c.tenHienThi || c.slug || "?").charAt(0).toUpperCase();
          const body = (
            <>
              <span className="post-contributor-avatar" aria-hidden>
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" />
                ) : (
                  initial
                )}
              </span>
              <span className="post-contributor-copy">
                <strong>{c.tenHienThi}</strong>
                <span>
                  {c.laChuSoHuu ? "Chủ bài viết" : c.vaiTro || "Cộng sự"}
                </span>
              </span>
            </>
          );
          return (
            <JourneyUserPopover
              key={c.id}
              slug={c.slug}
              fallbackName={c.tenHienThi}
              fallbackAvatarUrl={avatarUrl}
            >
              <span className="post-contributor-card">{body}</span>
            </JourneyUserPopover>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Comments (Comment Block v1) ───────────────────────────────── */

type CommentSubmitResult =
  | {
      ok: true;
      data: {
        id: string;
        noiDung: string;
        taoLuc: string;
        author: MilestonePostAuthor | null;
        idCha?: string | null;
      };
    }
  | { ok: false; error: string };

type CommentSectionProps = {
  milestoneId: string;
  contentOwnerId: string;
  viewerIsOwner: boolean;
  comments: ReadonlyArray<MilestonePostComment>;
  viewerCanComment: boolean;
  onCommentAdded(c: MilestonePostComment): void;
  onCommentUpdated(id: string, patch: Partial<MilestonePostComment>): void;
  onCommentRemoved(id: string): void;
  onThreadsReordered(threads: MilestonePostComment[]): void;
  sectionId?: string;
  submitComment?: (
    text: string,
    replyToId?: string | null,
  ) => Promise<CommentSubmitResult>;
};

export function JourneyPostCommentsBlock(props: CommentSectionProps) {
  return <CommentBlock {...props} />;
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatVnDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatRelative(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatVnDate(iso);
}
