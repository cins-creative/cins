/** Meta dòng phụ trên feed card / danh sách thành viên cộng đồng. */

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
  activityAt?: string | null;
}): string {
  const parts = [formatAuthorPostsInGroup(params.soBaiVietTrongNhom)];
  if (params.activityAt) {
    parts.push(formatCongDongRelativeTime(params.activityAt));
  }
  return parts.join(" · ");
}
