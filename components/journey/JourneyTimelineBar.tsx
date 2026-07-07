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
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { updateLoaiMocVisibility } from "@/app/[slug]/journey/visibility-actions";
import { JourneyFilterShareButton } from "@/components/journey/JourneyFilterShareButton";
import { useJourneyFilterShareOptional } from "@/components/journey/JourneyFilterShareContext";
import { JourneyPersonalFilterMenuSection } from "@/components/journey/JourneyPersonalFilterMenuSection";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import {
  JOURNEY_SHARE_OPEN_EVENT,
  PORTFOLIO_ALL_FILTER_SHARE_SPEC,
} from "@/lib/journey/gallery-filter-share";
import type { MilestoneType } from "@/components/journey/milestone-types";
import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import { CONG_DONG_PERSONAL_FILTER_MAU } from "@/lib/filter/cong-dong-personal-filter.shared";
import {
  getVisibility,
  type FilterVisibility,
  type LoaiMocFilterKey,
  type LoaiMocVisibilityMap,
} from "@/lib/journey/filter-visibility";
import { computeFixedMenuPosition } from "@/lib/ui/clamp-fixed-menu-position";

export type FilterGroup = "all" | MilestoneType | "verified" | "cong-dong";

type Option = {
  group: FilterGroup;
  label: string;
  /** Số milestones thuộc nhóm — render bên phải. */
  count: number;
  /** Section: "type" hoặc "status". */
  section: "type" | "status";
  /** CSS modifier riêng cho row (verified/bookmark/cong-dong…). */
  modifier?: "verified" | "bookmark" | "cong-dong";
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
  "cong-dong": Users,
};

type Props = {
  /** Năm hiện tại — scroll-spy cập nhật khi user cuộn timeline. Bỏ khi `embed`. */
  year?: string;
  /** Tháng hiển thị — VD "Tháng 5". Bỏ trống → ẩn cột. */
  month?: string;
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
  /** Chỉ dropdown filter — không bọc `.j-tlb` (gallery ghép nhiều filter). */
  embed?: boolean;
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
  "cong-dong": "Cộng đồng",
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
  "cong-dong": CONG_DONG_PERSONAL_FILTER_MAU,
};

const MENU_MIN_WIDTH = 240;
const MENU_EST_HEIGHT = 400;

function timelineFilterButtonLabel(
  group: FilterGroup,
  personalName: string | null,
): string {
  if (personalName) return personalName;
  if (group === "all") return "Nhãn";
  return GROUP_LABELS[group];
}

function selectTimelineFilter(
  group: FilterGroup,
  hasPersonalFilter: boolean,
  personalFilter: ReturnType<typeof useJourneyPersonalFilterOptional>,
  onFilterChange: (group: FilterGroup) => void,
  close: () => void,
) {
  if (hasPersonalFilter) {
    personalFilter?.setActiveSlug(null);
  }
  onFilterChange(group);
  close();
}

/**
 * Context bar 3 cột: Năm | Tháng | Filter dropdown.
 *
 * - Dropdown menu mở/đóng bằng local state, click ngoài đóng.
 * - Filter group được nâng lên parent (`JourneyTimeline`) để filter milestones.
 * - Scroll-spy cập nhật year/month theo cột mốc gần mép dưới context bar.
 */
export function JourneyTimelineBar({
  year = "",
  month = "",
  filter,
  onFilterChange,
  options,
  enabled = true,
  isOwner = false,
  filterVisibility,
  embed = false,
}: Props) {
  const personalFilter = useJourneyPersonalFilterOptional();
  const activePersonalFilter = personalFilter?.activeSlug
    ? personalFilter.filters.find((f) => f.slug === personalFilter.activeSlug)
    : null;
  const hasPersonalFilter = Boolean(activePersonalFilter);

  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideClickRef = useRef(false);

  /* Local optimistic copy của visibility map — server-side revalidatePath
     sẽ refresh prop, nhưng UI cần response tức thì khi toggle. */
  const [visState, setVisState] = useState<LoaiMocVisibilityMap>(
    filterVisibility ?? {},
  );
  useEffect(() => {
    setVisState(filterVisibility ?? {});
  }, [filterVisibility]);
  const [, startVisTransition] = useTransition();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpen(false);
    window.addEventListener(JOURNEY_SHARE_OPEN_EVENT, closeMenu);
    return () => window.removeEventListener(JOURNEY_SHARE_OPEN_EVENT, closeMenu);
  }, []);

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

  const updateMenuPosition = () => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth =
      menuEl?.offsetWidth ||
      Math.min(240, Math.max(MENU_MIN_WIDTH, window.innerWidth - 16));
    const menuHeight = menuEl?.offsetHeight || MENU_EST_HEIGHT;
    setMenuStyle(
      computeFixedMenuPosition(rect, { width: menuWidth, height: menuHeight }),
    );
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    const rafId = window.requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  /* Click ngoài → đóng menu (portal ra body; bỏ qua click mở menu). */
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ignoreOutsideClickRef.current) {
        ignoreOutsideClickRef.current = false;
        return;
      }
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    const timerId = window.setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 0);
    document.addEventListener("keydown", onEsc);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const currentLabel = timelineFilterButtonLabel(
    filter,
    activePersonalFilter?.ten ?? null,
  );
  const dotColor = activePersonalFilter
    ? (activePersonalFilter.mau ?? DEFAULT_FILTER_MAU)
    : DOT_COLOR[filter];

  /* Visitor: ẩn dòng filter loại cột mốc trong dropdown (không ẩn nội dung). */
  const isToggleableLoaiMoc = (g: FilterGroup): g is LoaiMocFilterKey =>
    g === "hoc" ||
    g === "lam" ||
    g === "du-an" ||
    g === "ca-nhan";

  const visibleOptions = options.filter((o) => {
    if (!isToggleableLoaiMoc(o.group)) return true;
    if (isOwner) return true;
    return getVisibility(visState, o.group) === "public";
  });

  const typeOptions = visibleOptions.filter((o) => o.section === "type");
  const statusOptions = visibleOptions.filter((o) => o.section === "status");

  const menu =
    open && enabled && menuStyle ? (
      <div
        ref={menuRef}
        className="j-tlb-dd-menu is-portal"
        role="listbox"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: "max-content",
          minWidth: MENU_MIN_WIDTH,
          maxWidth: "min(280px, calc(100vw - 16px))",
          display: "block",
        }}
      >
        <JourneyPersonalFilterMenuSection
          onItemSelect={() => setOpen(false)}
          onActivate={() => onFilterChange("all")}
        />
        <div className="j-dd-section-label">Loại cột mốc</div>
        {typeOptions.map((opt) => (
          <DropdownItem
            key={opt.group}
            opt={opt}
            active={!hasPersonalFilter && opt.group === filter}
            onSelect={() =>
              selectTimelineFilter(
                opt.group,
                hasPersonalFilter,
                personalFilter,
                onFilterChange,
                () => setOpen(false),
              )
            }
            isOwner={isOwner}
            visibility={
              isToggleableLoaiMoc(opt.group)
                ? getVisibility(visState, opt.group)
                : null
            }
            onToggleVis={
              isToggleableLoaiMoc(opt.group)
                ? () => onToggleVis(opt.group as LoaiMocFilterKey)
                : undefined
            }
            onShareMenuClose={() => setOpen(false)}
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
                active={!hasPersonalFilter && opt.group === filter}
                onSelect={() =>
                  selectTimelineFilter(
                    opt.group,
                    hasPersonalFilter,
                    personalFilter,
                    onFilterChange,
                    () => setOpen(false),
                  )
                }
                isOwner={isOwner}
                visibility={null}
                onShareMenuClose={() => setOpen(false)}
              />
            ))}
          </>
        ) : null}
      </div>
    ) : null;

  const filterControl = (
    <div
      ref={wrapRef}
      className={"j-tlb-filter" + (open ? " is-open" : "")}
    >
      <button
        ref={btnRef}
        type="button"
        className="j-tlb-dd-btn"
        onClick={(e) => {
          e.stopPropagation();
          if (!enabled) return;
          ignoreOutsideClickRef.current = true;
          setOpen((v) => !v);
        }}
        disabled={!enabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="j-tlb-dd-dot"
          style={{ background: dotColor }}
        />
        <span>{currentLabel}</span>
        <span className="j-tlb-dd-caret" aria-hidden>
          <ChevronDown size={14} strokeWidth={1.8} />
        </span>
      </button>
    </div>
  );

  if (embed) {
    return (
      <>
        {filterControl}
        {portalReady && menu ? createPortal(menu, document.body) : null}
      </>
    );
  }

  return (
    <div className="j-tlb">
      <div className="j-tlb-year">{year}</div>
      <div
        className="j-tlb-month"
        style={{ visibility: month ? "visible" : "hidden" }}
      >
        {month || "—"}
      </div>
      {filterControl}
      {portalReady && menu ? createPortal(menu, document.body) : null}
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
  onShareMenuClose,
}: {
  opt: Option;
  active: boolean;
  onSelect: () => void;
  isOwner: boolean;
  /** `null` → row không có visibility (verified, bookmark, all). */
  visibility: FilterVisibility | null;
  /** Toggle handler — chỉ truyền khi visibility != null && owner. */
  onToggleVis?: () => void;
  onShareMenuClose?: () => void;
}) {
  const filterShare = useJourneyFilterShareOptional();
  const cls = [
    "j-dd-opt",
    opt.modifier === "verified" && "j-dd-opt--verified",
    opt.modifier === "bookmark" && "j-dd-opt--bookmark",
    opt.modifier === "cong-dong" && "j-dd-opt--cong-dong",
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
      </button>
      <JourneyFilterShareButton
        label={opt.label}
        onShare={
          filterShare
            ? () => {
                filterShare.openGalleryFilterShare(
                  opt.group === "all"
                    ? PORTFOLIO_ALL_FILTER_SHARE_SPEC
                    : {
                        kind: "group",
                        group: opt.group,
                        label: opt.label,
                      },
                );
                onShareMenuClose?.();
              }
            : undefined
        }
      />
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
              ? "Ẩn dòng lọc này khỏi dropdown khách — bấm để hiện lại"
              : "Hiện dòng lọc này trong dropdown khách — bấm để ẩn"
          }
          aria-label={
            visibility === "private"
              ? "Hiện dòng lọc cho khách"
              : "Ẩn dòng lọc khỏi khách"
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
