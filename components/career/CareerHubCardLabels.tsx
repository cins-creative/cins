import { linhVucLabelForHubItem } from "@/lib/career/articleNhomHub";
import type { NgheNghiepHubItem } from "@/lib/career/types";

function primaryTitle(n: NgheNghiepHubItem): string {
  return (n.title_eng ?? n.title_vietnam ?? n.slug).trim();
}

function vietSubtitle(n: NgheNghiepHubItem, eng: string): string | null {
  const vi = (n.title_vietnam ?? "").trim();
  if (!vi) return null;
  if (vi.toLowerCase() === eng.toLowerCase()) return null;
  return vi;
}

/** Mô tả đầy đủ cho tooltip hub (không rút gọn). */
export function careerHubTooltipText(
  raw: string | null | undefined,
): string | null {
  const t = raw?.trim();
  return t || null;
}

type Props = {
  career: NgheNghiepHubItem;
  /** Tooltip cố định trên thẻ (mobile / touch); desktop dùng cursor portal */
  showStaticTooltip?: boolean;
  /** Tên lĩnh vực (tìm kiếm trùng tiêu đề nhiều domain). */
  showLinhVuc?: boolean;
};

/** Tiêu đề EN + tên VI (hiện khi hover thẻ). */
export function CareerHubCardLabels({
  career,
  showStaticTooltip = false,
  showLinhVuc = false,
}: Props) {
  const eng = primaryTitle(career);
  const vi = vietSubtitle(career, eng);
  const lvLabel = showLinhVuc ? linhVucLabelForHubItem(career) : null;
  const tooltip = showStaticTooltip
    ? careerHubTooltipText(career.short_description)
    : null;

  return (
    <span className="career-hub-card-text">
      {lvLabel ? (
        <span className="hn-role-lv-badge">{lvLabel}</span>
      ) : null}
      <span className="career-hub-card-title">{eng}</span>
      {vi ? <span className="career-hub-card-title-vi">{vi}</span> : null}
      {tooltip ? (
        <span className="career-hub-card-tooltip career-hub-card-tooltip--static" role="tooltip">
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}

export function careerHubCardAriaLabel(career: NgheNghiepHubItem): string {
  const eng = primaryTitle(career);
  const vi = vietSubtitle(career, eng);
  const desc = career.short_description?.trim();
  const parts = [eng];
  if (vi) parts.push(vi);
  if (desc) parts.push(desc);
  return parts.join(" — ");
}
