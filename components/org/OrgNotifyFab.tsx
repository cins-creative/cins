"use client";

import { CalendarDays, X, type LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Mobile — bật FAB + drawer; desktop trả children nguyên vị trí cột. */
  enabled: boolean;
  /** Số mốc sắp tới / đang diễn ra (badge đỏ; ẩn khi 0). */
  count: number;
  label?: string;
  /**
   * Slot khớp `OrgNotifyFabHost slot` — khi có nhiều nút trên cùng trang.
   * Bỏ trống = host mặc định (cộng đồng / org).
   */
  slot?: string;
  /** Icon nút — mặc định lịch. */
  icon?: LucideIcon;
  children: ReactNode;
};

const HOST_ATTR = "data-org-notify-fab-host";

function findHost(slot?: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[${HOST_ATTR}]`);
  for (const el of nodes) {
    if (el.closest("[hidden]")) continue;
    const value = el.getAttribute(HOST_ATTR) ?? "";
    if (slot) {
      if (value === slot) return el;
    } else if (!value) {
      return el;
    }
  }
  /* Legacy: trang một host — lấy host visible đầu tiên. */
  if (!slot) {
    for (const el of nodes) {
      if (!el.closest("[hidden]")) return el;
    }
  }
  return null;
}

/** Slot trong thanh filter — nút portal vào đây (position: relative). */
export function OrgNotifyFabHost({
  className,
  slot = "",
}: {
  className?: string;
  slot?: string;
}) {
  return (
    <span
      className={["org-notify-fab-host", className].filter(Boolean).join(" ")}
      data-org-notify-fab-host={slot}
      aria-hidden
    />
  );
}

/**
 * Mobile: nút (relative trong filter bar) + drawer.
 * Desktop (`enabled=false`): trả `{children}` — sidebar nằm nguyên trong grid.
 * Children luôn mount để badge cập nhật real-time dù drawer đang đóng.
 */
export function OrgNotifyFab({
  enabled,
  count,
  label = "Thông báo",
  slot,
  icon: Icon = CalendarDays,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const titleId = useId();
  const drawerId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || !enabled) return;
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
  }, [open, enabled, close]);

  /* Theo dõi slot trong thanh filter (đổi tab mount/unmount host). */
  useEffect(() => {
    if (!enabled || !mounted) {
      setHost(null);
      return;
    }

    function sync() {
      setHost(findHost(slot));
    }

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class", HOST_ATTR],
    });
    return () => mo.disconnect();
  }, [enabled, mounted, slot]);

  if (!enabled) {
    return <>{children}</>;
  }

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const countLabel = count > 99 ? "99+" : String(count);

  const button = (
    <button
      type="button"
      className={`org-notify-fab${open ? " is-open" : ""}${host ? " is-relative" : ""}`}
      aria-label={count > 0 ? `${label} — ${countLabel}` : label}
      aria-expanded={open}
      aria-controls={drawerId}
      onClick={() => setOpen((v) => !v)}
    >
      <Icon size={host ? 18 : 22} strokeWidth={1.9} aria-hidden />
      {count > 0 ? (
        <span className="org-notify-fab-badge" aria-hidden>
          {countLabel}
        </span>
      ) : null}
    </button>
  );

  const overlayAndDrawer = (
    <>
      <button
        type="button"
        className={`org-notify-fab-overlay${open ? " is-on" : ""}`}
        aria-label={`Đóng ${label}`}
        tabIndex={open ? 0 : -1}
        onClick={close}
      />
      <aside
        id={drawerId}
        className={`org-notify-fab-drawer${open ? " is-on" : ""}`}
        role="dialog"
        aria-modal={open}
        aria-labelledby={titleId}
        aria-hidden={!open}
      >
        <div className="org-notify-fab-drawer-head">
          <h2 id={titleId} className="org-notify-fab-drawer-title">
            {label}
          </h2>
          <button
            type="button"
            className="org-notify-fab-drawer-close"
            aria-label="Đóng"
            onClick={close}
          >
            <X size={18} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
        <div className="org-notify-fab-drawer-body">{children}</div>
      </aside>
    </>
  );

  return (
    <>
      {host ? createPortal(button, host) : null}
      {createPortal(
        <div className="org-notify-fab-layer" data-open={open ? "1" : "0"}>
          {overlayAndDrawer}
        </div>,
        document.body,
      )}
    </>
  );
}
