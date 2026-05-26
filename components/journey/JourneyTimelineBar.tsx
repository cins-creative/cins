"use client";

import {
  Bookmark,
  BookOpen,
  BadgeCheck,
  Briefcase,
  Calendar,
  ChevronDown,
  Circle,
  FolderKanban,
  Globe,
  Lock,
  Trophy,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { updateLoaiMocVisibility } from "@/app/[slug]/journey/actions";
import type { MilestoneType } from "@/components/journey/milestone-types";
import {
  getVisibility,
  type FilterVisibility,
  type LoaiMocFilterKey,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";

export type FilterGroup = "all" | MilestoneType | "verified";

type Option = {
  group: FilterGroup;
  label: string;
  /** Số milestones thuộc nhóm — render bên phải. */
  count: number;
  /** Section: "type" hoặc "status". */
  section: "type" | "status";
  /** CSS modifier riêng cho row (verified/bookmark…). */
  modifier?: "verified" | "bookmark";
  /** Legacy glyph ico — không dùng nữa (giữ optional cho call-site cũ). */
  ico?: string;
};

/** Icon Lucide cho mỗi filter group. Khớp với badge trên milestone card. */
const GROUP_ICON: Record<FilterGroup, LucideIcon> = {
  all: Circle,
  hoc: BookOpen,
  lam: Briefcase,
  "du-an": FolderKanban,
  "su-kien": Calendar,
  "thanh-tuu": Trophy,
  "ca-nhan": UserCircle2,
  bookmark: Bookmark,
  verified: BadgeCheck,
};

type Props = {
  /** Năm hiện tại — scroll-spy sẽ cập nhật ở lượt sau khi có data. */
  year: string;
  /** Tháng hiển thị — VD "Tháng 5". Bỏ trống → ẩn cột. */
  month: string;
  /** Filter group đang chọn. */
  filter: FilterGroup;
  /** Callback đổi filter. */
  onFilterChange: (group: FilterGroup) => void;
  /** Options + counts từ parent (đã pre-compute theo milestones có sẵn). */
  options: ReadonlyArray<Option>;
  /** Có cho phép bấm filter không (false khi không có data nào). */
  enabled?: boolean;
  /** Owner → render nút toggle visibility per row + thấy row private. */
  isOwner?: boolean;
  /** Visibility map (DB → UI keys). Missing key = public. */
  filterVisibility?: LoaiMocVisibilityMap;
};

const GROUP_LABELS: Record<FilterGroup, string> = {
  all: "Tất cả",
  hoc: "Học tập",
  lam: "Công việc",
  "du-an": "Dự án",
  "su-kien": "Sự kiện",
  "thanh-tuu": "Thành tựu",
  "ca-nhan": "Cá nhân",
  bookmark: "Lưu về",
  verified: "Verified",
};

const DOT_COLOR: Record<FilterGroup, string> = {
  all: "var(--cins-blue)",
  hoc: "var(--cins-blue)",
  lam: "var(--cins-blue)",
  "du-an": "var(--cins-blue)",
  "su-kien": "var(--cins-blue)",
  "thanh-tuu": "var(--cins-blue)",
  "ca-nhan": "var(--cins-blue)",
  bookmark: "var(--j-bookmark)",
  verified: "var(--j-verified)",
};

/**
 * Context bar 3 cột: Năm | Tháng | Filter dropdown.
 *
 * - Dropdown menu mở/đóng bằng local state, click ngoài đóng.
 * - Filter group được nâng lên parent (`JourneyTimeline`) để filter milestones.
 * - Scroll-spy cập nhật year/month sẽ wire sau ở `useEffect` listener `scroll`.
 */
export function JourneyTimelineBar({
  year,
  month,
  filter,
  onFilterChange,
  options,
  enabled = true,
  isOwner = false,
  filterVisibility,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Local optimistic copy của visibility map — server-side revalidatePath
     sẽ refresh prop, nhưng UI cần response tức thì khi toggle. */
  const [visState, setVisState] = useState<LoaiMocVisibilityMap>(
    filterVisibility ?? {},
  );
  useEffect(() => {
    setVisState(filterVisibility ?? {});
  }, [filterVisibility]);
  const [, startVisTransition] = useTransition();

  const onToggleVis = (key: LoaiMocFilterKey) => {
    const current = getVisibility(visState, key);
    const next: FilterVisibility = current === "public" ? "private" : "public";
    setVisState((m) => ({ ...m, [key]: next }));
    startVisTransition(async () => {
      const res = await updateLoaiMocVisibility(key, next);
      if (!res.ok) {
        /* Rollback nếu DB từ chối. */
        setVisState((m) => ({ ...m, [key]: current }));
      }
    });
  };

  /* Click ngoài → đóng menu. */
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const current = options.find((o) => o.group === filter);
  const currentLabel = current?.label ?? GROUP_LABELS[filter];
  const currentCount = current?.count ?? 0;

  /* Visitor: ẩn các row đã đánh dấu private. Owner: hiện tất cả + toggle. */
  const isToggleableLoaiMoc = (g: FilterGroup): g is LoaiMocFilterKey =>
    g === "hoc" ||
    g === "lam" ||
    g === "du-an" ||
    g === "su-kien" ||
    g === "thanh-tuu" ||
    g === "ca-nhan";

  const visibleOptions = options.filter((o) => {
    if (!isToggleableLoaiMoc(o.group)) return true;
    if (isOwner) return true;
    return getVisibility(visState, o.group) === "public";
  });

  const typeOptions = visibleOptions.filter((o) => o.section === "type");
  const statusOptions = visibleOptions.filter((o) => o.section === "status");

  return (
    <div className="j-tlb">
      <div className="j-tlb-year">{year}</div>
      <div
        className="j-tlb-month"
        style={{ visibility: month ? "visible" : "hidden" }}
      >
        {month || "—"}
      </div>
      <div
        ref={wrapRef}
        className={"j-tlb-filter" + (open ? " is-open" : "")}
      >
        <button
          type="button"
          className="j-tlb-dd-btn"
          onClick={() => enabled && setOpen((v) => !v)}
          disabled={!enabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span
            className="j-tlb-dd-dot"
            style={{ background: DOT_COLOR[filter] }}
          />
          <span>{currentLabel}</span>
          <span className="j-tlb-dd-count">{currentCount}</span>
          <span className="j-tlb-dd-caret" aria-hidden>
            <ChevronDown size={14} strokeWidth={1.8} />
          </span>
        </button>

        {enabled ? (
          <div className="j-tlb-dd-menu" role="listbox">
            <div className="j-dd-section-label">Theo loại</div>
            {typeOptions.map((opt) => (
              <DropdownItem
                key={opt.group}
                opt={opt}
                active={opt.group === filter}
                onSelect={() => {
                  onFilterChange(opt.group);
                  setOpen(false);
                }}
                isOwner={isOwner}
                visibility={
                  isToggleableLoaiMoc(opt.group)
                    ? getVisibility(visState, opt.group)
                    : null
                }
                onToggleVis={
                  isToggleableLoaiMoc(opt.group)
                    ? () => onToggleVis(opt.group)
                    : undefined
                }
              />
            ))}
            {statusOptions.length > 0 ? (
              <>
                <div className="j-dd-divider" aria-hidden />
                <div className="j-dd-section-label">Theo trạng thái</div>
                {statusOptions.map((opt) => (
                  <DropdownItem
                    key={opt.group}
                    opt={opt}
                    active={opt.group === filter}
                    onSelect={() => {
                      onFilterChange(opt.group);
                      setOpen(false);
                    }}
                    isOwner={isOwner}
                    visibility={null}
                  />
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DropdownItem({
  opt,
  active,
  onSelect,
  isOwner,
  visibility,
  onToggleVis,
}: {
  opt: Option;
  active: boolean;
  onSelect: () => void;
  isOwner: boolean;
  /** `null` → row không có visibility (verified, bookmark, all). */
  visibility: FilterVisibility | null;
  /** Toggle handler — chỉ truyền khi visibility != null && owner. */
  onToggleVis?: () => void;
}) {
  const cls = [
    "j-dd-opt",
    opt.modifier === "verified" && "j-dd-opt--verified",
    opt.modifier === "bookmark" && "j-dd-opt--bookmark",
    active && "is-active",
    visibility === "private" && "is-private",
  ]
    .filter(Boolean)
    .join(" ");
  const Icon = GROUP_ICON[opt.group];
  const showToggle = isOwner && visibility !== null && onToggleVis;
  return (
    <div className={cls + " j-dd-row"}>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className="j-dd-opt-main"
        onClick={onSelect}
      >
        <span className="j-dd-ico" aria-hidden>
          <Icon size={13} strokeWidth={1.7} />
        </span>
        <span className="j-dd-lbl">{opt.label}</span>
        <span className="j-dd-n">{opt.count}</span>
      </button>
      {showToggle ? (
        <button
          type="button"
          className={
            "j-dd-vis" + (visibility === "private" ? " is-private" : "")
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleVis();
          }}
          title={
            visibility === "private"
              ? "Chỉ mình tôi thấy — bấm để công khai"
              : "Công khai — bấm để chỉ mình tôi thấy"
          }
          aria-label={
            visibility === "private" ? "Chuyển sang công khai" : "Chuyển sang chỉ mình tôi"
          }
        >
          {visibility === "private" ? (
            <Lock size={12} strokeWidth={1.8} aria-hidden />
          ) : (
            <Globe size={12} strokeWidth={1.8} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
