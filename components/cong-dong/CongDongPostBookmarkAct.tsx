"use client";

import { useCongDongAuthGate } from "@/components/cong-dong/useCongDongAuthGate";
import { JourneyBookmarkButton } from "@/components/journey/JourneyBookmarkButton";

type Props = {
  orgId: string;
  postId: string;
  title: string;
  canInteract: boolean;
  initialSaved?: boolean;
  milestoneId?: string | null;
};

export function CongDongPostBookmarkAct({
  orgId,
  postId,
  title,
  canInteract,
  initialSaved = false,
  milestoneId,
}: Props) {
  const { requireCongDongAuth } = useCongDongAuthGate();

  return (
    <JourneyBookmarkButton
      milestoneId={milestoneId ?? ""}
      title={title}
      initialSaved={initialSaved}
      buttonClassName="cd-v4-jcard-act"
      iconSize={18}
      iconStrokeWidth={2}
      modalZIndex={10400}
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
      saveEndpoint={(visibility) => ({
        url: `/api/cong-dong/${orgId}/posts/${postId}/bookmark`,
        body: { visibility },
      })}
    />
  );
}
