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

  if (hoursLeft < 1) return "Còn dưới 1 giờ";

  const days = Math.floor(hoursLeft / 24);
  const hours = Math.floor(hoursLeft % 24);

  if (days >= 1) {
    if (hours > 0) return `Còn ${days} ngày ${hours} giờ`;
    return `Còn ${days} ngày`;
  }

  return `Còn ${Math.ceil(hoursLeft)} giờ`;
}
