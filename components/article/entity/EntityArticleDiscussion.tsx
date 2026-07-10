import { NgheTaggedWorksSection } from "@/components/article/nghe/NgheTaggedWorksSection";
import { TacPhamSection } from "@/components/article/TacPhamSection";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { TacPhamGalleryItem } from "@/lib/articles/types";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";

type Props = {
  users?: TagAggUser[];
  milestones?: ReadonlyArray<MilestoneItem>;
  sort?: TagAggSort;
  viewerProfileId?: string | null;
  tacPham?: TacPhamGalleryItem[];
};

/** Tab «Thảo luận» — ưu tiên timeline tag, fallback gallery tác phẩm. */
export function EntityArticleDiscussion({
  users = [],
  milestones = [],
  sort = "moi_nhat",
  viewerProfileId = null,
  tacPham = [],
}: Props) {
  const hasTimeline = users.length > 0 || milestones.length > 0;

  if (hasTimeline) {
    return (
      <NgheTaggedWorksSection
        users={users}
        milestones={milestones}
        sort={sort}
        viewerProfileId={viewerProfileId}
        showSectionHeading={false}
      />
    );
  }

  if (tacPham.length > 0) {
    return (
      <div className="ent-discussion ent-discussion-gallery">
        <TacPhamSection items={tacPham} showCommunityFallback={false} />
      </div>
    );
  }

  return (
    <div className="ent-discussion ent-discussion-empty">
      <p className="ent-discussion-empty-title">
        Chưa có tác phẩm hay thảo luận nào gắn với chủ đề này.
      </p>
      <p className="ent-discussion-empty-hint">
        Hãy đăng tác phẩm trên Journey và gắn tag để xuất hiện tại đây.
      </p>
    </div>
  );
}
