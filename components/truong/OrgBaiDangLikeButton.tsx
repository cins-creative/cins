"use client";

import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";

type Props = {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
};

/** Like / emoji org bài đăng — cùng picker option 2 với Journey. */
export function OrgBaiDangLikeButton({
  postId,
  initialLiked = false,
  initialCount = 0,
}: Props) {
  return (
    <JourneyLikeButton
      milestoneId={postId}
      loaiDoiTuong={SOCIAL_LOAI_ORG_BAI_DANG}
      initialLiked={initialLiked}
      initialCount={initialCount}
      showCount
    />
  );
}
