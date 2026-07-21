import {
  CongDongFilterIcon,
  hasCongDongFilterLucideIcon,
} from "@/components/cong-dong/CongDongFilterIcon";
import type { CongDongFilter } from "@/lib/cong-dong/types";
import type { CSSProperties } from "react";

/** Toolbar: bỏ emoji đầu chuỗi — đã có lucide icon, tránh nhãn dài khó đọc. */
export function filterToolbarLabel(ten: string): string {
  const stripped = ten.replace(/^[\p{Extended_Pictographic}\uFE0F]+\s*/u, "").trim();
  return stripped || ten;
}

type Props = {
  filter: CongDongFilter;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "toolbar";
  /** Không nền/viền — màu nhãn trộn với ink theo theme. */
  plain?: boolean;
};

export function CongDongFilterChip({
  filter,
  active = false,
  onClick,
  size = "md",
  plain = false,
}: Props) {
  const className = [
    "cd-filter-chip",
    size === "sm" ? "cd-filter-chip--sm" : "",
    size === "toolbar" ? "cd-v4-chip" : "",
    plain ? "cd-filter-chip--plain" : "",
    active ? "is-active" : "",
    onClick ? "is-clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isToolbar = size === "toolbar";
  const style: CSSProperties = plain
    ? { ["--cd-filter-mau" as string]: filter.mau }
    : isToolbar
      ? active
        ? {
            borderColor: filter.mau,
            color: "#fff",
            backgroundColor: filter.mau,
          }
        : {
            borderColor: filter.mau,
            color: "var(--ink-display, #1b2333)",
            backgroundColor: "var(--bg-surface, #fff)",
          }
      : {
          borderColor: filter.mau,
          color: active ? "#fff" : filter.mau,
          backgroundColor: active ? filter.mau : `${filter.mau}18`,
        };

  const hasLucideIcon = hasCongDongFilterLucideIcon(filter.icon);
  const displayTen =
    isToolbar || hasLucideIcon ? filterToolbarLabel(filter.ten) : filter.ten;

  const label = (
    <>
      <CongDongFilterIcon
        name={filter.icon}
        size={size === "sm" ? 13 : isToolbar ? 16 : 15}
        color={isToolbar && !active ? filter.mau : undefined}
      />
      <span className={isToolbar ? "cd-filter-chip-label" : undefined}>
        {displayTen}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} style={style} onClick={onClick}>
        {label}
      </button>
    );
  }

  return (
    <span className={`${className} cd-filter-chip--static`} style={style}>
      {label}
    </span>
  );
}
