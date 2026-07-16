"use client";

import { ListFilter, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

/** Khớp `.hn-main` breakpoint — rail drawer dưới 961px. */
export const HUB_RAIL_DRAWER_MQ = "(max-width: 960px)";

type Props = {
  tab: "nghe" | "nganh-hoc";
  selectionLabel: string;
  groupLabel?: string | null;
  children: ReactNode;
};

export function CareerHubMobileRail({
  tab,
  selectionLabel,
  groupLabel = null,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();
  const drawerId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const onDrawerNavigate = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("a")) close();
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const drawerTitle =
    tab === "nganh-hoc" ? "Danh mục ngành học" : "Danh mục lĩnh vực";
  const filterLabel =
    tab === "nganh-hoc" ? "Lọc ngành học" : "Lọc lĩnh vực";

  return (
    <div className={`hn-rail-shell${open ? " is-open" : ""}`}>
      <div className="hn-rail-bar">
        <button
          type="button"
          className="hn-rail-bar-filter"
          aria-label={filterLabel}
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={() => setOpen((v) => !v)}
        >
          <ListFilter size={18} strokeWidth={1.9} aria-hidden />
          <span className="hn-rail-bar-filter-text">Lọc</span>
        </button>
        <div className="hn-rail-bar-copy">
          {groupLabel ? (
            <span className="hn-rail-bar-group">{groupLabel}</span>
          ) : null}
          <span className="hn-rail-bar-selection">{selectionLabel}</span>
        </div>
      </div>

      <div
        className="hn-rail-drawer-layer"
        aria-hidden={!open}
        data-open={open ? "1" : "0"}
      >
        <button
          type="button"
          className="hn-rail-overlay"
          aria-label={`Đóng ${drawerTitle}`}
          tabIndex={open ? 0 : -1}
          onClick={close}
        />
        <aside
          id={drawerId}
          className="hn-rail-drawer"
          role="dialog"
          aria-modal={open}
          aria-labelledby={titleId}
          aria-hidden={!open}
        >
          <div className="hn-rail-drawer-head">
            <h2 id={titleId} className="hn-rail-drawer-title">
              {drawerTitle}
            </h2>
            <button
              type="button"
              className="hn-rail-drawer-close"
              aria-label="Đóng"
              onClick={close}
            >
              <X size={18} strokeWidth={1.9} aria-hidden />
            </button>
          </div>
          <div
            className="hn-rail-drawer-body"
            onClick={onDrawerNavigate}
          >
            {children}
          </div>
        </aside>
      </div>
    </div>
  );
}
