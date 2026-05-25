"use client";

import { useBaiVietHubStaticTooltip } from "@/components/bai-viet/BaiVietHubCardLink";

type Props = {
  groupLabel: string | null;
  title: string;
  titleVi: string | null;
  tooltip: string | null;
};

export function BaiVietHubCardLabels({
  groupLabel,
  title,
  titleVi,
  tooltip,
}: Props) {
  const showStatic = useBaiVietHubStaticTooltip();
  const tip = tooltip?.trim() || null;

  return (
    <span className="career-hub-card-text">
      {groupLabel ? (
        <span className="hn-role-lv-badge">{groupLabel}</span>
      ) : null}
      <span className="career-hub-card-title">{title}</span>
      {titleVi ? (
        <span className="career-hub-card-title-vi">{titleVi}</span>
      ) : null}
      {tip && showStatic ? (
        <span
          className="career-hub-card-tooltip career-hub-card-tooltip--static"
          role="tooltip"
        >
          {tip}
        </span>
      ) : null}
    </span>
  );
}
