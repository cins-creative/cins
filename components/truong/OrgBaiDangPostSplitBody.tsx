"use client";

import { Award, CalendarDays, FileText, GraduationCap, Megaphone, Package, X, type LucideIcon } from "lucide-react";
import { useContext, useMemo, useState } from "react";

import { JourneyArticleTagLink } from "@/components/journey/JourneyArticleTagLink";
import { JourneyCommentLink } from "@/components/journey/JourneyCommentLink";
import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { PostOverlayCloseContext } from "@/components/journey/post-overlay-close";
import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import { PostShareMenu } from "@/components/journey/PostActionsRail";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { OrgBaiDangBookmarkButton } from "@/components/truong/OrgBaiDangBookmarkButton";
import { OrgBaiDangCommentsPanel } from "@/components/truong/OrgBaiDangCommentsPanel";
import { OrgBaiDangLikeButton } from "@/components/truong/OrgBaiDangLikeButton";
import { useOrgBaiDangLoaiConfig } from "@/components/truong/OrgBaiDangLoaiConfigContext";
import type { OrgBaiDangOverlayOwner } from "@/lib/truong/org-bai-dang-from-milestone";
import { orgBaiDangPermalinkPath } from "@/lib/truong/org-bai-dang-permalink";
import { formatBaiDangDate } from "@/lib/truong/bai-dang-timeline";
import { baiDangUsesBlocks } from "@/lib/truong/bai-dang-blocks";
import {
  resolveBaiDangUnfoldTomTat,
  stripHtmlToPlainText,
} from "@/lib/truong/bai-dang-content";
import { loaiOptionLabel } from "@/lib/truong/org-bai-dang-loai-options";
import { resolveSchoolAvatarSrc } from "@/lib/truong/school-avatar";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";
import type { TruongBaiDang } from "@/lib/truong/types";

import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";

const LOAI_ICON_BY_VALUE: Record<string, LucideIcon> = {
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  hoc_bong: Award,
  su_kien: CalendarDays,
  khac: FileText,
  showcase: Package,
};
type Props = {
  post: TruongBaiDang;
  owner?: OrgBaiDangOverlayOwner | null;
  /** Showcase — ẩn like / bookmark / bình luận. */
  contentOnly?: boolean;
};

function resolveOrgPopoverKind(
  owner: OrgBaiDangOverlayOwner | null | undefined,
): "cong_dong" | "truong" | "co_so_dao_tao" | "studio" {
  if (owner?.orgKind === "cong_dong") return "cong_dong";
  if (owner?.orgKind === "studio") return "studio";
  if (owner?.orgKind === "co_so_dao_tao" || owner?.org_loai === "co_so_dao_tao") {
    return "co_so_dao_tao";
  }
  if (owner?.orgKind === "truong") return "truong";
  return "truong";
}

function resolveSharePath(
  owner: OrgBaiDangOverlayOwner | null | undefined,
  postId: string,
): string | null {
  const slug = owner?.slug?.trim();
  if (!slug) return null;
  const kind = resolveOrgPopoverKind(owner);
  if (kind === "co_so_dao_tao") {
    return orgBaiDangPermalinkPath(slug, postId, "co-so");
  }
  if (kind === "studio") {
    return orgBaiDangPermalinkPath(slug, postId, "studio");
  }
  return orgBaiDangPermalinkPath(slug, postId, "truong");
}

/**
 * Popup bài org — layout 2 cột giống `JourneyPostBody` split:
 * trái nội dung, phải author org + actions + bình luận.
 */
export function OrgBaiDangPostSplitBody({
  post,
  owner = null,
  contentOnly = false,
}: Props) {
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [viewerCommented, setViewerCommented] = useState(false);
  const onClose = useContext(PostOverlayCloseContext);

  const usesBlocks = baiDangUsesBlocks(post);
  const blocks = post.noiDungBlocks ?? null;
  const dateLabel = formatBaiDangDate(post.tao_luc);
  const sharePath = useMemo(
    () => resolveSharePath(owner, post.id),
    [owner, post.id],
  );
  const orgKind = resolveOrgPopoverKind(owner);
  const avatarUrl = owner ? resolveSchoolAvatarSrc(owner) : null;
  const ownerInitial = (owner?.ten?.trim().charAt(0) || "?").toUpperCase();
  const articleTags = post.articleTags ?? [];
  const coAuthors = (post.coAuthorCredits ?? []).filter(
    (c) => c.trangThai !== "pending",
  );

  const tomTat =
    resolveBaiDangUnfoldTomTat(post) ??
    post.tom_tat?.trim() ??
    null;
  const legacyPlain =
    !usesBlocks && post.noi_dung?.trim()
      ? stripHtmlToPlainText(post.noi_dung)
      : null;

  const contentEl = usesBlocks && blocks?.length ? (
    <JourneyUnfoldArticleContent
      title={post.tieu_de}
      tomTat={tomTat}
      noiDungHtml={post.noi_dung}
      coverId={post.cover_id}
      blocks={blocks}
    />
  ) : post.noi_dung?.trim() ? (
    <>
      <h1 className="title-in title-ro">{post.tieu_de}</h1>
      {tomTat ? (
        <p className="sub-in sub-ro">{tomTat}</p>
      ) : null}
      <div
        className="post-html-fallback article-rich-content"
        dangerouslySetInnerHTML={{ __html: post.noi_dung }}
      />
    </>
  ) : (
    <>
      <h1 className="title-in title-ro">{post.tieu_de}</h1>
      {tomTat || legacyPlain ? (
        <p className="sub-in sub-ro">{tomTat || legacyPlain}</p>
      ) : (
        <div className="post-empty">Bài đăng chưa có nội dung chi tiết.</div>
      )}
      {blocks?.length ? <PostBlockRenderer blocks={blocks} showAllImages /> : null}
    </>
  );

  const loaiConfig = useOrgBaiDangLoaiConfig();
  const loaiValue = loaiConfig.resolveValue(post.loai_bai_dang);
  const loaiLabel = loaiOptionLabel(loaiConfig, loaiValue);
  const LoaiIcon = LOAI_ICON_BY_VALUE[loaiValue] ?? Megaphone;

  const authorBody = (
    <>
      <span className="post-rail-avatar" aria-hidden>
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="" />
        ) : (
          ownerInitial
        )}
      </span>
      <span className="post-rail-author-copy">
        <span className="post-rail-author-top">
          <strong>{owner?.ten?.trim() || "Tổ chức"}</strong>
          <span className="post-rail-author-sub">
            {dateLabel && post.tao_luc ? (
              <time className="post-rail-date" dateTime={post.tao_luc}>
                {dateLabel}
              </time>
            ) : null}
            <span className="post-rail-meta-icons" aria-label={loaiLabel}>
              <span className="post-rail-meta-ico" title={loaiLabel}>
                <LoaiIcon size={12} strokeWidth={2} aria-hidden />
              </span>
            </span>
          </span>
        </span>
      </span>
    </>
  );

  const actionsRail = contentOnly ? null : (
    <div className="jcard-actions post-rail-actions">
      <OrgBaiDangLikeButton postId={post.id} />
      <JourneyCommentLink
        commentCount={commentCount}
        viewerCommented={viewerCommented}
        idDoiTuong={post.id}
        loaiDoiTuong={SOCIAL_LOAI_ORG_BAI_DANG}
        disableActorsReveal
        onOpenComments={() => {
          document
            .getElementById(`org-post-comments-${post.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }}
      />
      <OrgBaiDangBookmarkButton
        postId={post.id}
        title={post.tieu_de}
        initialSaved={post.viewerBookmarked}
        initialCount={post.bookmarkCount}
      />
      <span className="action-spacer" />
      {sharePath ? (
        <PostShareMenu
          sharePath={sharePath}
          shareTitle={post.tieu_de}
          className="jcard-share"
          buttonClassName="share-btn"
        />
      ) : null}
    </div>
  );

  const commentsRail = contentOnly ? null : (
    <div id={`org-post-comments-${post.id}`}>
      <OrgBaiDangCommentsPanel
        postId={post.id}
        onCountChange={(count, commented) => {
          setCommentCount(count);
          setViewerCommented(commented);
        }}
      />
    </div>
  );

  return (
    <main
      className="cins-editor-page cins-post-view editor-canvas post-canvas post-canvas--split org-baidang-post-split"
      aria-label="Bài đăng tổ chức"
    >
      <div className="post-view-layout post-view-layout--2col">
        <div className="post-view-content">
          <div className="post-view-content-inner">{contentEl}</div>
        </div>

        <aside className="post-view-rail" aria-label="Thông tin bài viết">
          <div className="post-rail-scroll">
            <div className="post-rail-blk post-rail-blk--author">
              <div className="post-rail-author">
                {owner?.slug?.trim() ? (
                  <JourneyOrgPopover
                    slug={owner.slug.trim()}
                    orgKind={orgKind}
                    fallbackName={owner.ten}
                    fallbackAvatarUrl={avatarUrl}
                  >
                    <span className="post-rail-author-link">{authorBody}</span>
                  </JourneyOrgPopover>
                ) : (
                  <span className="post-rail-author-link">{authorBody}</span>
                )}
                {onClose ? (
                  <div className="post-rail-author-tools">
                    <button
                      type="button"
                      className="post-rail-close"
                      aria-label="Đóng"
                      onClick={onClose}
                    >
                      <X size={18} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {articleTags.length > 0 ? (
              <div className="post-rail-blk post-rail-blk--tags">
                <div
                  className="tags jcard-tags post-rail-tags"
                  aria-label="Thẻ bài viết"
                >
                  {articleTags.map((t) => (
                    <JourneyArticleTagLink key={t.id} tag={t} />
                  ))}
                </div>
              </div>
            ) : null}

            {coAuthors.length > 0 ? (
              <div className="post-rail-blk post-rail-blk--people">
                <div className="post-rail-lbl">
                  Đóng góp · {coAuthors.length.toLocaleString("vi-VN")}
                </div>
                <div className="post-rail-people">
                  {coAuthors.map((c) => {
                    const initial = (c.name || c.slug || "?")
                      .charAt(0)
                      .toUpperCase();
                    return (
                      <span
                        key={`${c.slug ?? c.name}-${c.idNguoiDung ?? ""}`}
                        className="post-rail-person"
                      >
                        <span className="post-rail-person-avatar" aria-hidden>
                          {c.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={c.avatarUrl} alt="" />
                          ) : (
                            initial
                          )}
                        </span>
                        <span className="post-rail-person-copy">
                          <strong>{c.name}</strong>
                          {c.role ? <span>{c.role}</span> : null}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {actionsRail ? (
              <div className="post-rail-blk post-rail-blk--actions">
                {actionsRail}
              </div>
            ) : null}

            {commentsRail ? (
              <div className="post-rail-blk post-rail-blk--comments">
                {commentsRail}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
