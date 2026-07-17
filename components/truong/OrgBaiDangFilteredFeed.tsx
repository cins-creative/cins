"use client";

import { OrgBaiDangGridView } from "@/components/truong/OrgBaiDangGridView";
import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug" | "org_loai"
>;

type Props = {
  filtered: TruongBaiDang[];
  yearGroups: Array<{ year: number; posts: TruongBaiDang[] }>;
  view: OrgBaiDangView;
  onOpenPostFromGrid: (postId: string) => void;
  owner?: OrgOwner | null;
  /** Showcase — chỉ render block nội dung (không datebar / actions). */
  contentOnly?: boolean;
  /** Studio — quản lý cộng sự trên card. */
  allowCoAuthorManage?: boolean;
};

export function OrgBaiDangFilteredFeed({
  filtered,
  yearGroups,
  view,
  onOpenPostFromGrid,
  owner = null,
  contentOnly = false,
  allowCoAuthorManage = false,
}: Props) {
  if (filtered.length === 0) {
    return (
      <p className="tdh-placeholder">Không có bài đăng thuộc nhóm lọc này.</p>
    );
  }

  if (view === "grid" || view === "masonry") {
    return (
      <OrgBaiDangGridView
        posts={filtered}
        onOpenPost={onOpenPostFromGrid}
        layout={view === "masonry" ? "masonry" : "card"}
      />
    );
  }

  return (
    <>
      {yearGroups.map(({ year, posts: yearPosts }) => (
        <section key={year} className="j-year-block" data-year={year}>
          {yearPosts.map((post) => (
            <OrgBaiDangJourneyCard
              key={post.id}
              post={post}
              owner={owner}
              contentOnly={contentOnly}
              allowCoAuthorManage={allowCoAuthorManage}
            />
          ))}
        </section>
      ))}
    </>
  );
}
