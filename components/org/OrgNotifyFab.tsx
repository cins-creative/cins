"use client";

import { CalendarDays, X } from "lucide-react";
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
  children: ReactNode;
};

const HOST_SELECTOR = "[data-org-notify-fab-host]";

/** Slot trong thanh filter — nút thông báo portal vào đây (position: relative). */
export function OrgNotifyFabHost({ className }: { className?: string }) {
  return (
    <span
      className={["org-notify-fab-host", className].filter(Boolean).join(" ")}
      data-org-notify-fab-host=""
      aria-hidden
    />
  );
}

/**
 * Mobile: nút chuông (relative trong `.org-baidang-tlb`) + drawer thông báo.
 * Desktop (`enabled=false`): trả `{children}` — sidebar nằm nguyên trong grid.
 * Children luôn mount để badge cập nhật real-time dù drawer đang đóng.
 */
export function OrgNotifyFab({
  enabled,
  count,
  label = "Thông báo",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const titleId = useId();

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

    function findHost(): HTMLElement | null {
      const nodes = document.querySelectorAll<HTMLElement>(HOST_SELECTOR);
      for (const el of nodes) {
        if (el.closest("[hidden]")) continue;
        return el;
      }
      return null;
    }

    function sync() {
      setHost(findHost());
    }

    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "class"],
    });
    return () => mo.disconnect();
  }, [enabled, mounted]);

  if (!enabled) {
    return <>{children}</>;
  }

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const badgeLabel =
    count > 0
      ? `${count > 99 ? "99+" : count} thông báo sắp tới`
      : undefined;

  const button = (
    <button
      type="button"
      className={`org-notify-fab${open ? " is-open" : ""}${host ? " is-relative" : ""}`}
      aria-label={count > 0 ? `${label} — ${badgeLabel}` : label}
      aria-expanded={open}
      aria-controls="org-notify-fab-drawer"
      onClick={() => setOpen((v) => !v)}
    >
      <CalendarDays size={host ? 18 : 22} strokeWidth={1.9} aria-hidden />
      {count > 0 ? (
        <span className="org-notify-fab-badge" aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );

  const overlayAndDrawer = (
    <>
      <button
        type="button"
        className={`org-notify-fab-overlay${open ? " is-on" : ""}`}
        aria-label="Đóng thông báo"
        tabIndex={open ? 0 : -1}
        onClick={close}
      />
      <aside
        id="org-notify-fab-drawer"
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
      {host
        ? createPortal(button, host)
        : createPortal(
            <div className="org-notify-fab-root" data-open={open ? "1" : "0"}>
              {button}
            </div>,
            document.body,
          )}
      {createPortal(
        <div
          className="org-notify-fab-layer"
          data-open={open ? "1" : "0"}
        >
          {overlayAndDrawer}
        </div>,
        document.body,
      )}
    </>
  );
}
