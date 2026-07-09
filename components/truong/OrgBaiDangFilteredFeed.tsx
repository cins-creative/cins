"use client";

import { OrgBaiDangGridView } from "@/components/truong/OrgBaiDangGridView";
import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten"
>;

type Props = {
  filtered: TruongBaiDang[];
  yearGroups: Array<{ year: number; posts: TruongBaiDang[] }>;
  view: OrgBaiDangView;
  onOpenPostFromGrid: (postId: string) => void;
  owner?: OrgOwner | null;
};

export function OrgBaiDangFilteredFeed({
  filtered,
  yearGroups,
  view,
  onOpenPostFromGrid,
  owner = null,
}: Props) {
  if (filtered.length === 0) {
    return (
      <p className="tdh-placeholder">Không có bài đăng thuộc nhóm lọc này.</p>
    );
  }

  if (view === "grid") {
    return (
      <OrgBaiDangGridView posts={filtered} onOpenPost={onOpenPostFromGrid} />
    );
  }

  return (
    <>
      {yearGroups.map(({ year, posts: yearPosts }) => (
        <section key={year} className="j-year-block" data-year={year}>
          {yearPosts.map((post) => (
            <OrgBaiDangJourneyCard key={post.id} post={post} owner={owner} />
          ))}
        </section>
      ))}
    </>
  );
}
