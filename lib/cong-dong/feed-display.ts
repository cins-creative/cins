/** Meta dòng phụ trên feed card / danh sách thành viên cộng đồng. */

/** Ngày cột mốc — `DD-MM-YYYY`, khớp datebar Journey timeline. */
export function formatCongDongMilestoneDate(thoiDiem: string): string {
  const match = thoiDiem.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return formatCongDongRelativeTime(thoiDiem);
}

export function compareCongDongPostsByMilestoneDate(
  a: { thoiDiem: string; taoLuc: string },
  b: { thoiDiem: string; taoLuc: string },
): number {
  const byDate = b.thoiDiem.localeCompare(a.thoiDiem);
  if (byDate !== 0) return byDate;
  return new Date(b.taoLuc).getTime() - new Date(a.taoLuc).getTime();
}

export function congDongPostTimelineParts(thoiDiem: string): {
  year: string;
  month: string;
} {
  const match = thoiDiem.trim().match(/^(\d{4})-(\d{2})/);
  if (match) {
    return { year: match[1], month: String(Number(match[2])) };
  }
  const d = new Date(thoiDiem);
  return {
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1),
  };
}

export function formatCongDongRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  const d = date.getUTCDate();
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();
  const now = new Date();
  if (y === now.getUTCFullYear()) {
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  }
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatAuthorPostsInGroup(count: number): string {
  return `${count} bài trong nhóm`;
}

export function formatCongDongAuthorMetaLine(params: {
  soBaiVietTrongNhom: number;
  thoiDiem?: string | null;
  activityAt?: string | null;
}): string {
  const parts = [formatAuthorPostsInGroup(params.soBaiVietTrongNhom)];
  if (params.thoiDiem) {
    parts.push(formatCongDongMilestoneDate(params.thoiDiem));
  } else if (params.activityAt) {
    parts.push(formatCongDongRelativeTime(params.activityAt));
  }
  return parts.join(" · ");
}
