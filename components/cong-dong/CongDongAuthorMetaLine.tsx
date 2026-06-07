import {
  formatAuthorPostsInGroup,
  formatCongDongMilestoneDate,
  formatCongDongRelativeTime,
} from "@/lib/cong-dong/feed-display";

type Props = {
  soBaiVietTrongNhom: number;
  /** Ngày cột mốc — feed card, khớp Journey (`DD-MM-YYYY`). */
  thoiDiem?: string | null;
  /** Hoạt động gần nhất — danh sách thành viên (relative time). */
  activityAt?: string | null;
  className?: string;
};

export function CongDongAuthorMetaLine({
  soBaiVietTrongNhom,
  thoiDiem,
  activityAt,
  className = "cd-v4-jcard-meta-line",
}: Props) {
  const dateTime = thoiDiem ?? activityAt ?? null;
  const dateLabel = thoiDiem
    ? formatCongDongMilestoneDate(thoiDiem)
    : activityAt
      ? formatCongDongRelativeTime(activityAt)
      : null;

  return (
    <small className={className}>
      {formatAuthorPostsInGroup(soBaiVietTrongNhom)}
      {dateLabel && dateTime ? (
        <>
          <span className="cd-v4-dot" aria-hidden />
          <time dateTime={dateTime}>{dateLabel}</time>
        </>
      ) : null}
    </small>
  );
}
