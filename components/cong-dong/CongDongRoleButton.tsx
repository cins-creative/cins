"use client";

import { Bell, ChevronRight, LogOut, Share2, Tags } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import {
  canLeaveCommunity,
  canManageLabels,
  roleButtonLabel,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import type { OrgNotifyLevel } from "@/lib/social/org-notify";

const NOTIFY_OPTIONS: {
  value: OrgNotifyLevel;
  label: string;
  desc: string;
}[] = [
  {
    value: "tat_ca",
    label: "Tất cả",
    desc: "Nhận thông báo mỗi khi có bài đăng mới.",
  },
  {
    value: "chi_noi_bat",
    label: "Chỉ nổi bật",
    desc: "Chỉ khi admin ghim bài hoặc có cập nhật quan trọng.",
  },
  {
    value: "tat",
    label: "Tắt",
    desc: "Không nhận thông báo từ cộng đồng này.",
  },
];

type Props = {
  orgId: string;
  isThanhVien: boolean;
  viewerVaiTro: CongDongVaiTro | null;
  hideForOwner: boolean;
  initialNotifyLevel: OrgNotifyLevel;
  onJoined: (vaiTro: CongDongVaiTro) => void;
  onLeft: () => void;
  onNotifyLevelChange: (level: OrgNotifyLevel) => void;
  onManageLabels?: () => void;
  onShare: () => void;
};

export function CongDongRoleButton({
  orgId,
  isThanhVien,
  viewerVaiTro,
  hideForOwner,
  initialNotifyLevel,
  onJoined,
  onLeft,
  onNotifyLevelChange,
  onManageLabels,
  onShare,
}: Props) {
  const { requireAuth } = useAuthGate();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyLevel, setNotifyLevel] = useState(initialNotifyLevel);
  const [joinPending, startJoin] = useTransition();
  const [leavePending, startLeave] = useTransition();
  const [notifyPending, startNotify] = useTransition();

  const displayVaiTro =
    viewerVaiTro ?? (isThanhVien ? ("thanh_vien" as const) : null);

  useEffect(() => {
    setNotifyLevel(initialNotifyLevel);
  }, [initialNotifyLevel]);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const menuHeight = menuRef.current?.offsetHeight ?? 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight + gap;
    setMenuStyle({
      position: "fixed",
      top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, notifyOpen ? 248 : 200),
      zIndex: 9200,
    });
  }, [notifyOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    let frame = requestAnimationFrame(() => {
      updateMenuPosition();
      frame = requestAnimationFrame(updateMenuPosition);
    });
    const onReflow = () => updateMenuPosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [menuOpen, notifyOpen, updateMenuPosition]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
      setNotifyOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setNotifyOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const join = useCallback(() => {
    requireAuth(() => {
      startJoin(async () => {
        const res = await fetch(`/api/cong-dong/${orgId}/tham-gia`, {
          method: "POST",
        });
        const json = (await res.json().catch(() => null)) as {
          viewerVaiTro?: CongDongVaiTro | null;
        } | null;
        if (!res.ok) return;
        onJoined(json?.viewerVaiTro ?? "thanh_vien");
      });
    });
  }, [orgId, onJoined, requireAuth]);

  const leave = useCallback(() => {
    if (!canLeaveCommunity(displayVaiTro)) return;
    const ok = window.confirm(
      "Rời cộng đồng? Bạn sẽ không còn đăng bài và tương tác cho đến khi tham gia lại.",
    );
    if (!ok) return;
    startLeave(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/tham-gia`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setMenuOpen(false);
      onLeft();
    });
  }, [displayVaiTro, orgId, onLeft]);

  const setNotify = useCallback(
    (level: OrgNotifyLevel) => {
      startNotify(async () => {
        const res = await fetch(`/api/cong-dong/${orgId}/theo-doi`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ muc_thong_bao: level }),
        });
        const json = (await res.json().catch(() => null)) as {
          muc_thong_bao?: OrgNotifyLevel;
        } | null;
        if (!res.ok) return;
        const next = json?.muc_thong_bao ?? level;
        setNotifyLevel(next);
        onNotifyLevelChange(next);
        setNotifyOpen(false);
      });
    },
    [orgId, onNotifyLevelChange],
  );

  if (hideForOwner && viewerVaiTro === "owner") {
    return (
      <div className="cd-v4-id-actions">
        <button
          type="button"
          className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--icon cd-v4-btn--icon-only"
          aria-label="Chia sẻ"
          onClick={onShare}
        >
          <Share2 size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  const isMember =
    isThanhVien &&
    Boolean(displayVaiTro) &&
    !(hideForOwner && displayVaiTro === "owner");

  const roleMenu =
    menuOpen && typeof document !== "undefined" ? (
      <div
        id={menuId}
        ref={menuRef}
        className="cd-v4-role-menu cd-v4-role-menu--portal"
        style={menuStyle}
        role="menu"
        aria-label="Tuỳ chọn thành viên"
      >
        <div className="cd-v4-role-menu-item cd-v4-role-menu-item--sub">
          <button
            type="button"
            className="cd-v4-role-menu-btn"
            role="menuitem"
            aria-expanded={notifyOpen}
            onClick={() => setNotifyOpen((v) => !v)}
            disabled={notifyPending}
          >
            <Bell size={15} strokeWidth={2} aria-hidden />
            <span>Thông báo</span>
            <ChevronRight
              size={14}
              strokeWidth={2}
              aria-hidden
              className={notifyOpen ? "is-open" : undefined}
            />
          </button>
          {notifyOpen ? (
            <div className="cd-v4-role-submenu" role="group">
              {NOTIFY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`cd-v4-role-submenu-btn${notifyLevel === opt.value ? " is-active" : ""}`}
                  role="menuitemradio"
                  aria-checked={notifyLevel === opt.value}
                  onClick={() => setNotify(opt.value)}
                  disabled={notifyPending}
                >
                  <span className="cd-v4-role-submenu-copy">
                    <span className="cd-v4-role-submenu-label">{opt.label}</span>
                    <span className="cd-v4-role-submenu-desc">{opt.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {canManageLabels(displayVaiTro) ? (
          <button
            type="button"
            className="cd-v4-role-menu-btn"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setNotifyOpen(false);
              onManageLabels?.();
            }}
          >
            <Tags size={15} strokeWidth={2} aria-hidden />
            <span>Quản lý nhãn</span>
          </button>
        ) : null}

        {canLeaveCommunity(displayVaiTro) ? (
          <button
            type="button"
            className="cd-v4-role-menu-btn cd-v4-role-menu-btn--danger"
            role="menuitem"
            onClick={leave}
            disabled={leavePending}
          >
            <LogOut size={15} strokeWidth={2} aria-hidden />
            <span>{leavePending ? "Đang rời…" : "Rời cộng đồng"}</span>
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="cd-v4-id-actions" ref={rootRef}>
      {!isMember ? (
        <button
          type="button"
          className="cd-v4-btn cd-v4-btn--primary cd-v4-btn--grow"
          onClick={join}
          disabled={joinPending}
        >
          {joinPending ? "Đang tham gia…" : roleButtonLabel(null)}
        </button>
      ) : (
        <div className="cd-v4-role-wrap cd-v4-role-wrap--grow">
          <button
            ref={triggerRef}
            type="button"
            className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--grow cd-v4-btn--role"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifyOpen(false);
            }}
            disabled={leavePending}
          >
            {roleButtonLabel(displayVaiTro)}
          </button>
          {roleMenu && createPortal(roleMenu, document.body)}
        </div>
      )}

      <button
        type="button"
        className="cd-v4-btn cd-v4-btn--ghost cd-v4-btn--icon"
        aria-label="Chia sẻ"
        onClick={onShare}
      >
        <Share2 size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
