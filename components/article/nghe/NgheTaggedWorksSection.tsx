import Image from "next/image";

import { EntityLightTimeline } from "@/components/tag/EntityLightTimeline";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { getAvatarUrl, getNameInitials } from "@/lib/journey/profile";
import type { TagAggSort, TagAggUser } from "@/lib/tag/aggregation-types";

const FACEPILE_MAX = 4;

type Props = {
  users: TagAggUser[];
  milestones: ReadonlyArray<MilestoneItem>;
  sort: TagAggSort;
  viewerProfileId: string | null;
  /** Ẩn H2 khi nằm trong tab «Thảo luận». */
  showSectionHeading?: boolean;
};

/** Tác phẩm gắn tag nghề — timeline / lưới giống trang entity keyword. */
export function NgheTaggedWorksSection({
  users,
  milestones,
  sort,
  viewerProfileId,
  showSectionHeading = true,
}: Props) {
  const pile = users.slice(0, FACEPILE_MAX);

  return (
    <div className="nghe-tagged-works">
      {showSectionHeading ? (
        <h2 className="section-h" id="nghe-sec-community">
          <span className="num">06</span>
          Tác phẩm liên quan
          <em>— từ cộng đồng CINs</em>
        </h2>
      ) : (
        <div id="nghe-sec-community" className="nghe-tagged-works-anchor" />
      )}

      {users.length > 0 ? (
        <div className="entity-light-users nghe-tagged-users">
          <div className="entity-light-pile" aria-hidden>
            {pile.map((u) => {
              const avatarUrl = getAvatarUrl(u.avatarId);
              return avatarUrl ? (
                <Image
                  key={u.id}
                  src={avatarUrl}
                  alt=""
                  width={30}
                  height={30}
                  className="entity-light-pile-avatar"
                  unoptimized
                />
              ) : (
                <span
                  key={u.id}
                  className="entity-light-pile-avatar entity-light-pile-fallback"
                >
                  {getNameInitials(u.tenHienThi, u.slug)}
                </span>
              );
            })}
          </div>
          <p className="entity-light-users-meta">
            <strong>{users.length} người</strong> dùng tag này
          </p>
        </div>
      ) : null}

      <EntityLightTimeline
        milestones={milestones}
        sort={sort}
        viewerProfileId={viewerProfileId}
      />
    </div>
  );
}
