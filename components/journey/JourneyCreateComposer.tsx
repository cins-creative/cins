"use client";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";

type Props = {
  ownerSlug: string;
  ownerName?: string | null;
  avatarUrl?: string | null;
};

/**
 * Composer tạo nội dung trên Journey — thanh wj-composer + cột mốc riêng.
 * Mở overlay lazy-load (không chuyển route). Route `/p/new*` vẫn là deep-link fallback.
 */
export function JourneyCreateComposer({
  ownerSlug,
  ownerName,
  avatarUrl,
}: Props) {
  return (
    <CinsFeedComposer
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      avatarUrl={avatarUrl}
      layout="journey"
      showMilestone
    />
  );
}
