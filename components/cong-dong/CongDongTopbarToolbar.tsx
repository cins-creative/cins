"use client";

import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Pencil,
  Settings2,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
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

import { useTopbarPageSlot } from "@/components/cins/useTopbarPageSlot";
import { useCongDongAuthGate } from "@/components/cong-dong/useCongDongAuthGate";
import {
  canLeaveCommunity,
  canManageLabels,
  canManageMembers,
  listingRoleLabel,
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
  isCinsAdmin?: boolean;
  /** Ẩn CTA membership cho CINS system owner — vẫn hiện cài đặt trên topbar. */
  hideForOwner: boolean;
  canManage: boolean;
  initialNotifyLevel: OrgNotifyLevel;
  onNotifyLevelChange: (level: OrgNotifyLevel) => void;
  onLeft: () => void;
  onOpenManage: () => void;
};

function roleKeyForTopbar(
  vaiTro: CongDongVaiTro | null,
  isCinsAdmin: boolean,
): "owner" | "admin" | "org" {
  if (vaiTro === "owner") return "owner";
  if (vaiTro === "admin" || isCinsAdmin) return "admin";
  return "org";
}

function RoleIcon({
  vaiTro,
  isCinsAdmin,
}: {
  vaiTro: CongDongVaiTro | null;
  isCinsAdmin: boolean;
}) {
  if (vaiTro === "owner" || isCinsAdmin) {
    return <Shield size={14} strokeWidth={2} aria-hidden />;
  }
  if (vaiTro === "admin" || vaiTro === "quan_ly_noi_dung") {
    return <ShieldCheck size={14} strokeWidth={2} aria-hidden />;
  }
  return <Users size={14} strokeWidth={2} aria-hidden />;
}

/**
 * Vai trò + cài đặt cộng đồng trên `#app-topbar-page-slot`.
 * Đồng bộ pattern `CoSoAdminToolbar` / `TruongAdminToolbar` — màu cam priv.
 */
export function CongDongTopbarToolbar({
  orgId,
  isThanhVien,
  viewerVaiTro,
  isCinsAdmin = false,
  hideForOwner,
  canManage,
  initialNotifyLevel,
  onNotifyLevelChange,
  onLeft,
  onOpenManage,
}: Props) {
  const slot = useTopbarPageSlot();
  const { requireCongDongAuth } = useCongDongAuthGate();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyLevel, setNotifyLevel] = useState(initialNotifyLevel);
  const [leavePending, startLeave] = useTransition();
  const [notifyPending, startNotify] = useTransition();

  const displayVaiTro =
    viewerVaiTro ?? (isThanhVien ? ("thanh_vien" as const) : null);

  const isMember =
    isThanhVien &&
    Boolean(displayVaiTro) &&
    !(hideForOwner && displayVaiTro === "owner");

  /* System owner vẫn thấy badge vai trò trên topbar (CTA join đã ẩn). */
  const showRoleMenu =
    isMember ||
    isCinsAdmin ||
    (hideForOwner && displayVaiTro === "owner");
  const showToolbar = showRoleMenu || canManage;

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
    const menuWidth = Math.max(rect.width, notifyOpen ? 248 : 200);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    setMenuStyle({
      position: "fixed",
      top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap,
      left,
      width: menuWidth,
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

  if (!slot || !showToolbar) return null;

  const roleLabel =
    hideForOwner && displayVaiTro === "owner"
      ? "Chủ sở hữu"
      : isMember
        ? (listingRoleLabel(displayVaiTro) ?? "Thành viên")
        : "CINs";
  const roleKey = roleKeyForTopbar(displayVaiTro, isCinsAdmin);

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
        {isMember || (hideForOwner && displayVaiTro === "owner") ? (
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
                      <span className="cd-v4-role-submenu-label">
                        {opt.label}
                      </span>
                      <span className="cd-v4-role-submenu-desc">
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {canManage &&
        (canManageLabels(displayVaiTro) ||
          canManageMembers(displayVaiTro) ||
          isCinsAdmin) ? (
          <button
            type="button"
            className="cd-v4-role-menu-btn"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setNotifyOpen(false);
              onOpenManage();
            }}
          >
            <Pencil size={15} strokeWidth={2} aria-hidden />
            <span>Quản lý cộng đồng</span>
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

  return createPortal(
    <div
      ref={rootRef}
      className="tb-truong-admin tb-cong-dong-admin"
      role="group"
      aria-label="Vai trò cộng đồng"
    >
      {canManage ? (
        <button
          type="button"
          className="tb-truong-admin-btn tb-truong-admin-btn--icon"
          aria-label="Quản lý cộng đồng"
          title="Quản lý cộng đồng"
          onClick={onOpenManage}
        >
          <Settings2 size={16} strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      {showRoleMenu ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={`tb-truong-admin-btn tb-truong-role-btn tb-truong-role-btn--${roleKey}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            title={`Vai trò: ${roleLabel}`}
            onClick={() => {
              requireCongDongAuth(() => {
                setMenuOpen((v) => !v);
                setNotifyOpen(false);
              });
            }}
            disabled={leavePending}
          >
            <RoleIcon vaiTro={displayVaiTro} isCinsAdmin={isCinsAdmin} />
            <span className="tb-truong-role-name">{roleLabel}</span>
            <ChevronDown size={14} strokeWidth={2} aria-hidden />
          </button>
          {roleMenu ? createPortal(roleMenu, document.body) : null}
        </>
      ) : null}
    </div>,
    slot,
  );
}
