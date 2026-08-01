/** Nhãn đếm ngược (ngày + giờ) cho sự kiện sidebar. */
export function formatEventCountdownLabel(
  batDauIso: string,
  ketThucIso: string | null,
  status: "active" | "upcoming",
  nowMs = Date.now(),
): string | null {
  const targetIso =
    status === "active" && ketThucIso?.trim() ? ketThucIso : batDauIso;
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) return null;

  const hoursLeft = (targetMs - nowMs) / (1000 * 60 * 60);

  if (status === "active" && !ketThucIso?.trim()) {
    return "Đang diễn ra";
  }

  if (hoursLeft <= 0) {
    return status === "active" ? null : "Sắp bắt đầu";
  }

  // Đang diễn ra (có kết thúc): nêu rõ trạng thái + thời gian còn lại tới lúc kết thúc.
  const prefix = status === "active" ? "Đang diễn ra · còn" : "Còn";

  if (hoursLeft < 1) {
    return status === "active" ? "Đang diễn ra · sắp kết thúc" : "Còn dưới 1 giờ";
  }

  const days = Math.floor(hoursLeft / 24);
  const hours = Math.floor(hoursLeft % 24);

  if (days >= 1) {
    if (hours > 0) return `${prefix} ${days} ngày ${hours} giờ`;
    return `${prefix} ${days} ngày`;
  }

  return `${prefix} ${Math.ceil(hoursLeft)} giờ`;
}
