import { CongDongFilterIcon } from "@/components/cong-dong/CongDongFilterIcon";
import type { CongDongFilter } from "@/lib/cong-dong/types";

type Props = {
  filter: CongDongFilter;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
};

export function CongDongFilterChip({
  filter,
  active = false,
  onClick,
  size = "md",
}: Props) {
  const className = [
    "cd-filter-chip",
    size === "sm" ? "cd-filter-chip--sm" : "",
    active ? "is-active" : "",
    onClick ? "is-clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    borderColor: filter.mau,
    color: active ? "#fff" : filter.mau,
    backgroundColor: active ? filter.mau : `${filter.mau}18`,
    gap: "6px",
  };

  const label = (
    <>
      <CongDongFilterIcon name={filter.icon} size={size === "sm" ? 13 : 15} />
      {filter.ten}
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
