"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  FilePenLine,
  Flag,
  MessageSquareText,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { AdminInboxStats } from "@/lib/admin/admin-inbox-stats-types";
import { EMPTY_ADMIN_INBOX_STATS } from "@/lib/admin/admin-inbox-stats-types";

type Props = {
  initialStats: AdminInboxStats;
};

type InboxRow = {
  key: keyof Omit<AdminInboxStats, "total">;
  label: string;
  hint?: string;
  href: string;
  icon: typeof Flag;
};

const ROWS: InboxRow[] = [
  {
    key: "baoCao",
    label: "Báo cáo mới",
    href: "/admin/bao-cao",
    icon: Flag,
  },
  {
    key: "gopY",
    label: "Góp ý mới",
    href: "/admin/gop-y",
    icon: MessageSquareText,
  },
  {
    key: "dongGop",
    label: "Đóng góp chờ duyệt",
    href: "/admin/bai-viet?tab=dong-gop",
    icon: FilePenLine,
  },
  {
    key: "noiDungChoXacThuc",
    label: "Nội dung chờ xác thực",
    hint: "Theo dõi · duyệt tại trang tổ chức",
    href: "/admin/noi-dung-dang?view=pendingVerify",
    icon: BadgeCheck,
  },
];

function formatBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function parseStatsPayload(json: unknown): AdminInboxStats | null {
  if (!json || typeof json !== "object") return null;
  const stats = (json as { stats?: unknown }).stats;
  if (!stats || typeof stats !== "object") return null;
  const s = stats as Record<string, unknown>;
  const baoCao = typeof s.baoCao === "number" ? s.baoCao : null;
  const gopY = typeof s.gopY === "number" ? s.gopY : null;
  const dongGop = typeof s.dongGop === "number" ? s.dongGop : null;
  const noiDungChoXacThuc =
    typeof s.noiDungChoXacThuc === "number" ? s.noiDungChoXacThuc : null;
  const total = typeof s.total === "number" ? s.total : null;
  if (
    baoCao == null ||
    gopY == null ||
    dongGop == null ||
    noiDungChoXacThuc == null ||
    total == null
  ) {
    return null;
  }
  return { baoCao, gopY, dongGop, noiDungChoXacThuc, total };
}

export function AdminInboxButton({ initialStats }: Props) {
  const [stats, setStats] = useState<AdminInboxStats>(
    initialStats ?? EMPTY_ADMIN_INBOX_STATS,
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; right: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inbox-stats", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json().catch(() => null)) as unknown;
      const next = parseStatsPayload(json);
      if (next) setStats(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 10,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let removeListeners: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function isInside(target: EventTarget | null): boolean {
        if (!(target instanceof Node)) return false;
        if (triggerRef.current?.contains(target)) return true;
        if (menuRef.current?.contains(target)) return true;
        return false;
      }
      function onDocPointerDown(event: PointerEvent) {
        if (isInside(event.target)) return;
        setOpen(false);
      }
      function onKey(event: KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
      }
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKey);
      removeListeners = () => {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKey);
      };
    }, 0);
    return () => {
      window.clearTimeout(timer);
      removeListeners?.();
    };
  }, [open]);

  const total = stats.total;
  const ariaLabel =
    total > 0
      ? `Việc cần xử lý admin, ${total} mục chưa xử lý`
      : "Việc cần xử lý admin";

  const menuPanel =
    open && menuStyle ? (
      <div
        ref={menuRef}
        className="admin-inbox-menu is-portal"
        style={{ top: menuStyle.top, right: menuStyle.right }}
        role="dialog"
        aria-label="Bảng việc cần xử lý admin"
      >
        <div className="admin-inbox-menu-head">
          <strong>Việc cần xử lý</strong>
          <span>{loading ? "Đang cập nhật…" : "Từ bảng điều khiển admin"}</span>
        </div>

        {total === 0 ? (
          <p className="admin-inbox-empty">Không có việc cần xử lý.</p>
        ) : (
          <ul className="admin-inbox-list">
            {ROWS.map((row) => {
              const count = stats[row.key];
              const Icon = row.icon;
              return (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className={`admin-inbox-item${count > 0 ? " has-count" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="admin-inbox-item-ico" aria-hidden>
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                    <span className="admin-inbox-item-body">
                      <span className="admin-inbox-item-label">{row.label}</span>
                      {row.hint ? (
                        <span className="admin-inbox-item-hint">{row.hint}</span>
                      ) : null}
                    </span>
                    {count > 0 ? (
                      <span className="admin-inbox-item-badge">
                        {formatBadge(count)}
                      </span>
                    ) : (
                      <span className="admin-inbox-item-zero">0</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    ) : null;

  return (
    <div className="admin-inbox">
      <button
        ref={triggerRef}
        type="button"
        className={`admin-inbox-trigger${total > 0 ? " has-unread" : ""}`}
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <Briefcase size={16} strokeWidth={1.9} aria-hidden />
        {total > 0 ? (
          <span className="admin-inbox-count">{formatBadge(total)}</span>
        ) : null}
      </button>

      {portalReady && menuPanel
        ? createPortal(menuPanel, document.body)
        : null}
    </div>
  );
}
