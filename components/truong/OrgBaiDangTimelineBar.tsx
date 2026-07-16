"use client";

import {
  Award,
  CalendarDays,
  ChevronDown,
  Circle,
  FileText,
  GraduationCap,
  Megaphone,
  Package,
  Tag,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { OrgNotifyFabHost } from "@/components/org/OrgNotifyFab";
import { OrgBaiDangCustomFilterMenuSection } from "@/components/truong/OrgBaiDangCustomFilterMenuSection";
import { OrgBaiDangViewToggle } from "@/components/truong/OrgBaiDangViewToggle";
import { useOrgBaiDangFilterOptional } from "@/components/truong/OrgBaiDangFilterContext";
import { useOrgBaiDangLoaiConfig } from "@/components/truong/OrgBaiDangLoaiConfigContext";
import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";
import {
  type BaiDangTimelineFilter,
  type OrgBaiDangTimelineFilterKey,
} from "@/lib/truong/bai-dang-timeline";
import { orgBaiDangNhanSlugFromKey } from "@/lib/truong/org-bai-dang-filters.shared";
import { JOURNEY_SHARE_OPEN_EVENT } from "@/lib/journey/gallery-filter-share";
import { computeFixedMenuPosition } from "@/lib/ui/clamp-fixed-menu-position";

type Props = {
  year: number | null;
  monthLabel: string | null;
  filterKey: OrgBaiDangTimelineFilterKey;
  onFilterKeyChange: (key: OrgBaiDangTimelineFilterKey) => void;
  loaiCounts: Record<string, number>;
  nhanCounts: Record<string, number>;
  enabled?: boolean;
  view?: OrgBaiDangView;
  onViewChange?: (view: OrgBaiDangView) => void;
  /** Ẩn năm/tháng (vd. tab Showcase studio). */
  hideDate?: boolean;
};

const MENU_MIN_WIDTH = 240;
const MENU_EST_HEIGHT = 400;

const LOAI_ICON_BY_VALUE: Record<string, LucideIcon> = {
  all: Circle,
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  hoc_bong: Award,
  su_kien: CalendarDays,
  khac: FileText,
  showcase: Package,
};

function loaiIcon(value: string): LucideIcon {
  return LOAI_ICON_BY_VALUE[value] ?? Megaphone;
}

export function OrgBaiDangTimelineBar({
  year,
  monthLabel,
  filterKey,
  onFilterKeyChange,
  loaiCounts,
  nhanCounts,
  enabled = true,
  view = "timeline",
  onViewChange,
  hideDate = false,
}: Props) {
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
  const filterCtx = useOrgBaiDangFilterOptional();
  const loaiConfig = useOrgBaiDangLoaiConfig();
  const filterOptions = useMemo(
    () => [
      { value: "all" as const, label: "Tất cả" },
      ...loaiConfig.options.map((o) => ({
        value: o.value as BaiDangTimelineFilter | string,
        label: o.label,
      })),
    ],
    [loaiConfig.options],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpen(false);
    window.addEventListener(JOURNEY_SHARE_OPEN_EVENT, closeMenu);
    return () =>
      window.removeEventListener(JOURNEY_SHARE_OPEN_EVENT, closeMenu);
  }, []);

  const nhanSlug = orgBaiDangNhanSlugFromKey(filterKey);
  const activeNhan = nhanSlug
    ? filterCtx?.filters.find((f) => f.slug === nhanSlug)
    : null;
  const activeLabel = activeNhan?.ten
    ?? (filterOptions.find((o) => o.value === filterKey)?.label ?? "Tất cả");
  const isDefaultFilter = !nhanSlug && filterKey === "all";
  const buttonLabel = isDefaultFilter ? "Bộ lọc" : activeLabel;
  const dotColor = activeNhan?.mau ?? DEFAULT_FILTER_MAU;

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

  const menu =
    open && enabled && menuStyle ? (
      <div
        ref={menuRef}
        className="j-tlb-dd-menu is-portal"
        role="menu"
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
        <OrgBaiDangCustomFilterMenuSection
          filterKey={filterKey}
          onFilterKeyChange={onFilterKeyChange}
          nhanCounts={nhanCounts}
          onItemSelect={() => setOpen(false)}
        />
        <div className="j-dd-section-label">Loại bài đăng</div>
        {filterOptions.map((opt) => {
          const Icon = loaiIcon(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              className={
                "j-dd-opt j-dd-opt-main" +
                (filterKey === opt.value ? " is-active" : "")
              }
              onClick={() => {
                onFilterKeyChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="j-dd-ico" aria-hidden>
                <Icon size={13} strokeWidth={1.7} />
              </span>
              <span className="j-dd-lbl">{opt.label}</span>
              <span className="j-dd-n">{loaiCounts[opt.value] ?? 0}</span>
            </button>
          );
        })}
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
        className={`j-tlb-dd-btn${isDefaultFilter ? " is-icon" : ""}`}
        disabled={!enabled}
        aria-label={buttonLabel}
        title={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (!enabled) return;
          ignoreOutsideClickRef.current = true;
          setOpen((v) => !v);
        }}
      >
        {isDefaultFilter ? (
          <span className="j-tlb-dd-ico" aria-hidden>
            <Tag size={14} strokeWidth={1.8} />
          </span>
        ) : (
          <>
            <span
              className="j-tlb-dd-dot"
              style={{ background: dotColor }}
            />
            <span>{activeLabel}</span>
          </>
        )}
        <span className="j-tlb-dd-caret" aria-hidden>
          <ChevronDown size={14} strokeWidth={1.8} />
        </span>
      </button>
    </div>
  );

  const filterCluster = (
    <div className="j-tlb-filters org-baidang-tlb-actions">
      {filterControl}
      {onViewChange ? (
        <OrgBaiDangViewToggle view={view} onViewChange={onViewChange} />
      ) : null}
      <OrgNotifyFabHost />
    </div>
  );

  return (
    <div
      className={`j-tlb org-baidang-tlb${hideDate ? " org-baidang-tlb--no-date" : ""}`}
    >
      <span className="j-tlb-streak-slow" aria-hidden="true" />
      {!hideDate ? (
        <>
          <div className="j-tlb-year">{year ?? "—"}</div>
          <div
            className="j-tlb-month"
            style={{ visibility: monthLabel ? "visible" : "hidden" }}
          >
            {monthLabel || "—"}
          </div>
        </>
      ) : null}
      {filterCluster}
      {portalReady && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
