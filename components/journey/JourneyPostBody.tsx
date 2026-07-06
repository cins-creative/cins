"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  ExternalLink,
  FileText,
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
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type MilestonePostAuthor,
  type MilestonePostComment,
  type MilestonePostContributor,
  type MilestonePostDetail,
} from "@/app/[slug]/journey/actions";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { PostCover } from "@/components/editor/PostRenderer";
import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { CommentBlock } from "@/components/journey/CommentBlock";
import { articleTagLoaiClass } from "@/lib/editor/article-tag";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";
import { emitPostCommentsSync } from "@/lib/journey/comments-sync-client";
import { patchMilestoneDetailComments } from "@/lib/journey/milestone-detail-cache";
import {
  mapCheDoToMilestoneVisibility,
  mapLoaiMocToMilestoneType,
} from "@/lib/journey/milestone-ui-map";
import type { Block } from "@/lib/editor/types";
import {
  blocksForArticleCardUnfold,
  isMediaPost,
  partitionBlocksForSplitRail,
  shouldMovePostTextToSplitRail,
} from "@/lib/journey/post-media";
import { resolvePostDisplayKind } from "@/lib/journey/post-content-kind";
import { getAvatarUrl } from "@/lib/journey/profile";

import { PostActionsRail, PostShareMenu } from "./PostActionsRail";
import { PostMetaRail } from "./PostMetaRail";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyPostBody — view layout cho bài viết. ĐỒNG BỘ với editor   ║
   ║ canvas (`EditorView`):                                           ║
   ║                                                                  ║
   ║   • Title → Sub → Blocks (cover_id chỉ thumb lưới Gallery)        ║
   ║   • Split: hero trong `post-view-content`, rail = meta            ║
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
  theo_nhom: { Icon: Users, text: "Bạn bè" },
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
  /** Permalink — cột trái nội dung + BL, cột phải meta rail. Modal/timeline giữ `stack`. */
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
  /** Permalink split — ẩn phần hero rail (vd. kicker trùng thẻ). */
  splitSkip?: {
    kicker?: boolean;
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
  splitSkip,
  inlineActionsSlot,
}: Props) {
  const [detail, setDetail] = useState<MilestonePostDetail>(initialDetail);
  const { milestone, owner, posts, comments, viewerCanComment, social } = detail;
  const displayCommentCount =
    commentCountOverride ??
    (comments.length > 0
      ? countCommentThreads(comments)
      : (social.commentCount ?? 0));

  const initialDetailRef = useRef(initialDetail);
  initialDetailRef.current = initialDetail;

  useEffect(() => {
    const next = initialDetailRef.current;
    setDetail((prev) => {
      if (prev.milestone.id !== next.milestone.id) return next;
      const prevTotal = countCommentThreads(prev.comments);
      const nextTotal = countCommentThreads(next.comments);
      if (prevTotal > nextTotal) return prev;
      if (
        prevTotal === nextTotal &&
        (prev.social.commentCount ?? 0) >= (next.social.commentCount ?? 0)
      ) {
        return prev;
      }
      return next;
    });
  }, [
    initialDetail.milestone.id,
    initialDetail.comments.length,
    initialDetail.social.commentCount,
  ]);

  useEffect(() => {
    emitPostCommentsSync(milestone.id, comments);
    patchMilestoneDetailComments(
      milestone.id,
      comments,
      countCommentThreads(comments),
    );
  }, [milestone.id, comments]);

  useEffect(() => {
    function focusCommentsSection() {
      if (window.location.hash !== "#post-comments") return;
      const section = document.getElementById("post-comments");
      if (!section) return;
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  const inlineUnfoldBlocks =
    variant === "inline" && blocks && !mediaPost
      ? blocksForArticleCardUnfold(heroSub, blocks)
      : blocks;

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

  function applyCommentsUpdate(
    updater: (list: MilestonePostComment[]) => MilestonePostComment[],
  ) {
    setDetail((d) => {
      const nextComments = updater(d.comments);
      const commentCount = countCommentThreads(nextComments);
      return {
        ...d,
        comments: nextComments,
        social: { ...d.social, commentCount },
      };
    });
  }

  function onCommentAdded(c: MilestonePostComment) {
    applyCommentsUpdate((list) => addCommentToThreads(list, c));
  }
  function onCommentRemoved(id: string) {
    applyCommentsUpdate((list) => removeCommentFromThreads(list, id));
  }
  function onCommentUpdated(id: string, patch: Partial<MilestonePostComment>) {
    applyCommentsUpdate((list) => updateCommentInThreads(list, id, patch));
  }
  function onThreadsReordered(threads: MilestonePostComment[]) {
    applyCommentsUpdate(() => threads);
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
  const Wrapper = isInline ? "div" : "main";
  const wrapperClass = isInline
    ? `cins-editor-page cins-post-view j-m-unfold-post${mediaPost ? " j-m-unfold-post--media" : ""}${commentsOnlyInline ? " j-m-unfold-post--comments-only" : ""}`
    : `cins-editor-page cins-post-view editor-canvas post-canvas${mediaPost ? " post-canvas--media" : ""}${isSplit ? " post-canvas--split" : ""}`;

  const postDisplayKind = resolvePostDisplayKind({
    moTa: heroSub,
    coverId: coverSeed,
    blocks: blocks ?? [],
  });
  /** `cover_id` chỉ thumb Gallery — bài viết dài không lặp ảnh bìa khi đọc. */
  const showCoverInReadView =
    variant === "full" &&
    !mediaPost &&
    Boolean(coverSeed) &&
    postDisplayKind.kind !== "article";
  const coverEl = showCoverInReadView ? <PostCover seed={coverSeed} /> : null;

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

  const actionsRailCompact = (
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
      orientation="horizontal"
    />
  );

  const kickerLabel =
    mainPost?.articleTags[0]?.tieu_de ?? typeLabel;
  const KickerIcon = mainPost?.articleTags[0] ? FileText : TypeIcon;

  const kickerEl =
    isSplit && variant === "full" && !mediaPost && !splitSkip?.kicker ? (
      <span className="post-view-kicker">
        <KickerIcon size={13} strokeWidth={2} aria-hidden />
        {kickerLabel}
      </span>
    ) : null;

  const splitHeroEl =
    isSplit && variant === "full" && !mediaPost ? (
      <>
        {kickerEl}
        <h1 className="title-in title-ro">{heroTitle}</h1>
        {heroSub ? (
          <p className="sub-in sub-ro post-view-dek">{heroSub}</p>
        ) : null}
      </>
    ) : null;

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

  const moveTextToRail = isSplit && shouldMovePostTextToSplitRail(blocks);
  const splitBlockParts = useMemo(() => {
    if (!blocks?.length || !moveTextToRail) {
      return { railBlocks: [] as Block[], mediaBlocks: blocks ?? [] };
    }
    return partitionBlocksForSplitRail(blocks);
  }, [blocks, moveTextToRail]);

  function renderPostBlocks(blockList: ReadonlyArray<Block> | null | undefined) {
    if (!showBlocks || !blockList || blockList.length === 0) return null;
    return <PostBlockRenderer blocks={blockList} />;
  }

  const railContentEl =
    moveTextToRail && showBlocks && mediaPost
      ? renderPostBlocks(splitBlockParts.railBlocks)
      : null;

  const splitContentLeadEl =
    isSplit && variant === "full" && !mediaPost ? (
      <>
        {splitHeroEl}
        {coverEl}
      </>
    ) : null;

  const metaRailEl =
    isSplit && showByline ? (
      <PostMetaRail
        owner={owner}
        milestone={milestone}
        mainPost={mainPost}
        postSlug={postSlug}
        isOwner={isOwner}
        actionsRail={actionsRailCompact}
        contentRail={railContentEl}
        commentsRail={showCommentsPart ? commentsEl : undefined}
        onMilestoneUpdated={onMilestoneUpdated}
      />
    ) : null;

  const renderBlocks =
    variant === "inline" && !mediaPost ? inlineUnfoldBlocks : blocks;

  const blocksEl =
    showBlocks && renderBlocks && renderBlocks.length > 0 ? (
      <PostBlockRenderer blocks={renderBlocks} />
    ) : showBlocks && mainPost?.noiDungHtml ? (
      <div
        className="post-html-fallback article-rich-content"
        dangerouslySetInnerHTML={{ __html: mainPost.noiDungHtml }}
      />
    ) : showBlocks ? (
      <div className="post-empty">Cột mốc này chưa có nội dung chi tiết.</div>
    ) : null;

  const splitContentBlocksEl =
    moveTextToRail && showBlocks
      ? (renderPostBlocks(splitBlockParts.mediaBlocks) ??
        (mainPost?.noiDungHtml ? (
          <div
            className="post-html-fallback article-rich-content"
            dangerouslySetInnerHTML={{ __html: mainPost.noiDungHtml }}
          />
        ) : null))
      : blocksEl;

  if (isSplit) {
    return (
      <Wrapper className={wrapperClass} aria-label="Bài viết">
        <div className="post-view-layout post-view-layout--2col">
          <div
            className={`post-view-content${mediaPost ? " post-view-content--media" : ""}`}
          >
            {splitContentLeadEl}
            <div className="post-view-content-inner">
              {splitContentBlocksEl}
            </div>
          </div>
          {metaRailEl}
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper className={wrapperClass} aria-label="Bài viết">
      {heroEl}
      {coverEl}
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
  variant = "default",
}: {
  contributors: ReadonlyArray<MilestonePostContributor>;
  variant?: "default" | "rail";
}) {
  if (!shouldShowPostContributors(contributors)) return null;

  if (variant === "rail") {
    return (
      <div className="post-rail-blk post-rail-blk--people">
        <div className="post-rail-lbl">
          Đóng góp · {contributors.length.toLocaleString("vi-VN")}
        </div>
          <div className="post-rail-people">
            {contributors.map((c) => {
              const avatarUrl = getAvatarUrl(c.avatarId);
              const initial = (c.tenHienThi || c.slug || "?")
                .charAt(0)
                .toUpperCase();
              const body = (
                <>
                  <span
                    className="post-rail-person-avatar"
                    aria-hidden
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="" />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="post-rail-person-copy">
                    <strong>
                      {c.tenHienThi}
                      {c.laChuSoHuu ? (
                        <span className="post-rail-owner-tag">Chủ</span>
                      ) : null}
                    </strong>
                    <span>{c.vaiTro || "Cộng sự"}</span>
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
                  <span className="post-rail-person">{body}</span>
                </JourneyUserPopover>
              );
            })}
          </div>
        </div>
    );
  }

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
    anhDinhKem?: string[],
  ) => Promise<CommentSubmitResult>;
  pinCompose?: boolean;
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
