import {
  formatAuthorPostsInGroup,
  formatCongDongRelativeTime,
} from "@/lib/cong-dong/feed-display";

type Props = {
  soBaiVietTrongNhom: number;
  activityAt?: string | null;
  className?: string;
};

export function CongDongAuthorMetaLine({
  soBaiVietTrongNhom,
  activityAt,
  className = "cd-v4-jcard-meta-line",
}: Props) {
  return (
    <small className={className}>
      {formatAuthorPostsInGroup(soBaiVietTrongNhom)}
      {activityAt ? (
        <>
          <span className="cd-v4-dot" aria-hidden />
          {formatCongDongRelativeTime(activityAt)}
        </>
      ) : null}
    </small>
  );
}
