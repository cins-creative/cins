import type { PersonalFilterRef } from "@/lib/filter/types";
import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import { getSystemPersonalFilterIcon } from "@/lib/filter/personal-filter-icons";
import type { MilestoneType } from "@/components/journey/milestone-types";

const TYPE_BADGE_CLASS: Record<MilestoneType, string> = {
  hoc: "j-type-hoc",
  lam: "j-type-lam",
  "du-an": "j-type-du-an",
  "su-kien": "j-type-su-kien",
  "thanh-tuu": "j-type-thanh-tuu",
  "ca-nhan": "j-type-ca-nhan",
  bookmark: "j-type-bookmark",
};

export function personalFilterBadgeClass(slug: string): string {
  if (slug === "cong-dong") return "j-type-cong-dong";
  if (slug in TYPE_BADGE_CLASS) {
    return TYPE_BADGE_CLASS[slug as MilestoneType];
  }
  return "j-type-personal-custom";
}

type MenuIconProps = {
  slug: string;
  mau: string;
  size?: number;
  dotClassName?: string;
};

/** Leading icon trong dropdown timeline (`j-dd-ico` hoặc `j-dd-dot`). */
export function PersonalFilterDropdownLeading({
  slug,
  mau,
  size = 13,
}: MenuIconProps) {
  const Icon = getSystemPersonalFilterIcon(slug);
  if (Icon) {
    return (
      <span className="j-dd-ico" aria-hidden>
        <Icon size={size} strokeWidth={1.7} />
      </span>
    );
  }
  return (
    <span className="j-dd-dot" style={{ background: mau }} aria-hidden />
  );
}

/** Icon menu — nhãn hệ thống dùng Lucide; nhãn tùy chỉnh giữ chấm màu. */
export function PersonalFilterMenuIcon({
  slug,
  mau,
  size = 14,
  dotClassName = "j-dd-dot",
}: MenuIconProps) {
  const Icon = getSystemPersonalFilterIcon(slug);
  if (Icon) {
    return <Icon size={size} strokeWidth={1.7} aria-hidden />;
  }
  return (
    <span className={dotClassName} style={{ background: mau }} aria-hidden />
  );
}

type BadgeProps = {
  filter: PersonalFilterRef;
  iconSize?: number;
};

/** Nội dung chip nhãn riêng trên badge-row — icon + tên. */
export function PersonalFilterBadge({ filter, iconSize = 11 }: BadgeProps) {
  const Icon = getSystemPersonalFilterIcon(filter.slug);
  const mau = filter.mau ?? DEFAULT_FILTER_MAU;
  return (
    <>
      {Icon ? (
        <Icon size={iconSize} strokeWidth={1.8} aria-hidden />
      ) : (
        <span
          className="j-pf-dot"
          style={{ background: mau }}
          aria-hidden
        />
      )}
      {filter.ten}
    </>
  );
}
