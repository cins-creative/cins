/** Nhãn a11y cho thẻ hub `/bai-viet` (dùng trên server + client). */
export function baiVietHubCardAriaLabel(
  title: string,
  titleVi: string | null,
  tooltip: string | null,
): string {
  const parts = [title];
  if (titleVi) parts.push(titleVi);
  const tip = tooltip?.trim();
  if (tip) parts.push(tip);
  return parts.join(" — ");
}
