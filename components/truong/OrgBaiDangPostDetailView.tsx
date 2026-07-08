"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { JourneyUnfoldArticleContent } from "@/components/journey/JourneyUnfoldArticleContent";
import { PostBlockRenderer } from "@/components/journey/PostBlockRenderer";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { OrgBaiDangLoaiBadge } from "@/components/truong/OrgBaiDangLoaiBadge";
import { OrgBaiDangPublishedDate } from "@/components/truong/OrgBaiDangPublishedDate";
import { TruongOrgAvatar } from "@/components/truong/TruongOrgAvatar";
import { baiDangUsesBlocks } from "@/lib/truong/bai-dang-blocks";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
  school: Pick<TruongListItem, "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug">;
  orgSlug: string;
  backHref?: string;
};

export function OrgBaiDangPostDetailView({
  post,
  school,
  orgSlug,
  backHref,
}: Props) {
  const router = useRouter();
  const usesBlocks = baiDangUsesBlocks(post);
  const blocks = post.noiDungBlocks ?? [];
  const cardKind = useMemo(
    () => (usesBlocks ? milestoneCardContentKind(blocks, false, post.tom_tat) : "article"),
    [usesBlocks, blocks, post.tom_tat],
  );
  const isArticle = cardKind === "article";
  const listHref = backHref ?? coSoTabPath(orgSlug, "bai-dang");

  return (
    <article className="org-baidang-post-page" aria-labelledby="org-baidang-post-title">
      <header className="org-baidang-post-page-head">
        <button
          type="button"
          className="org-baidang-post-page-back"
          onClick={() => router.push(listHref)}
        >
          <ArrowLeft size={18} strokeWidth={2.2} aria-hidden />
          Bài đăng
        </button>
        <div className="org-baidang-post-page-org">
          <TruongOrgAvatar school={school} size="sm" className="org-chip-avatar" />
          <div className="org-baidang-post-page-org-copy">
            <Link href={coSoTabPath(orgSlug, "bai-dang")} className="org-baidang-post-page-org-name">
              {school.ten}
            </Link>
            <OrgBaiDangPublishedDate post={post} />
          </div>
          <OrgBaiDangLoaiBadge post={post} />
        </div>
      </header>

      <div className="org-baidang-post-page-body cins-editor-page cins-post-view">
        <h1 id="org-baidang-post-title" className="org-baidang-post-page-title">
          {post.tieu_de}
        </h1>
        {post.tom_tat?.trim() ? (
          <p className="org-baidang-post-page-lead">{post.tom_tat.trim()}</p>
        ) : null}

        {usesBlocks && blocks.length > 0 ? (
          isArticle ? (
            <JourneyUnfoldArticleContent
              blocksOnly
              title={post.tieu_de}
              tomTat={post.tom_tat}
              noiDungHtml={post.noi_dung}
              coverId={post.cover_id}
              blocks={blocks}
            />
          ) : (
            <PostBlockRenderer blocks={blocks} />
          )
        ) : post.noi_dung?.trim() ? (
          <div
            className="article-rich-content article-content-html"
            dangerouslySetInnerHTML={{ __html: post.noi_dung }}
          />
        ) : null}
      </div>
    </article>
  );
}
