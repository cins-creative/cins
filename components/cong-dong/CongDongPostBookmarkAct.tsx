"use client";

import { useCongDongAuthGate } from "@/components/cong-dong/useCongDongAuthGate";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";

type Props = {
  orgId: string;
  postId: string;
  title: string;
  canInteract: boolean;
  initialSaved?: boolean;
  milestoneId?: string | null;
  previewAuthorName?: string | null;
  previewAuthorAvatarUrl?: string | null;
  previewCoverSrc?: string | null;
};

export function CongDongPostBookmarkAct({
  orgId,
  postId,
  title,
  canInteract,
  initialSaved = false,
  milestoneId,
  previewAuthorName,
  previewAuthorAvatarUrl,
  previewCoverSrc,
}: Props) {
  const { requireCongDongAuth } = useCongDongAuthGate();

  return (
    <JourneyBookmarkButton
      milestoneId={milestoneId ?? ""}
      title={title}
      initialSaved={initialSaved}
      showCount
      modalZIndex={10800}
      previewAuthorName={previewAuthorName}
      previewAuthorAvatarUrl={previewAuthorAvatarUrl}
      previewCoverSrc={previewCoverSrc}
      onRequireAuth={requireCongDongAuth}
      resolveOpenBlock={() => {
        if (!canInteract) {
          return "Chỉ thành viên cộng đồng mới lưu được bài.";
        }
        if (!milestoneId) {
          return "Bài này chưa gắn Journey — không thể lưu về.";
        }
        return null;
      }}
      saveEndpoint={({ visibility, privateNote }) => ({
        url: `/api/community/${orgId}/posts/${postId}/save`,
        body: { visibility, ghi_chu_rieng: normalizeBookmarkPrivateNote(privateNote) },
      })}
    />
  );
}
