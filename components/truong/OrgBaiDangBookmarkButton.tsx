"use client";

import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";

type Props = {
  postId: string;
  title: string;
  initialSaved?: boolean;
  initialCount?: number;
};

export function OrgBaiDangBookmarkButton({
  postId,
  title,
  initialSaved = false,
  initialCount = 0,
}: Props) {
  return (
    <JourneyBookmarkButton
      milestoneId={postId}
      title={title}
      initialSaved={initialSaved}
      initialCount={initialCount}
      loaiDoiTuong={SOCIAL_LOAI_ORG_BAI_DANG}
      saveEndpoint={({ visibility, privateNote }) => ({
        url: "/api/luu-bai",
        body: {
          loai_doi_tuong: SOCIAL_LOAI_ORG_BAI_DANG,
          id_doi_tuong: postId,
          visibility,
          ghi_chu_rieng: normalizeBookmarkPrivateNote(privateNote),
        },
      })}
    />
  );
}
