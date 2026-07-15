"use client";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";

type Props = {
  view: OrgBaiDangView;
  onViewChange: (view: OrgBaiDangView) => void;
};

/** Toggle timeline · dạng thẻ · masonry — cùng class Journey `.j-surface-view-toggle`. */
export function OrgBaiDangViewToggle({ view, onViewChange }: Props) {
  return (
    <ContentSurfaceViewToggle view={view} onViewChange={onViewChange} />
  );
}
