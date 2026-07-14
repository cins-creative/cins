"use client";

import {
  ArrowUpToLine,
  Ban,
  Bell,
  BellOff,
  EyeOff,
  FolderKanban,
  LogOut,
  MoreVertical,
  Pencil,
  Settings2,
  Trash2,
  User,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export type ChatThreadMenuAction = {
  id: string;
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  onSelect: () => void;
};

const LONG_PRESS_MS = 500;

export function useThreadLongPress(
  onLongPress: () => void,
  disabled = false,
) {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const touchHandlers = {
    onTouchStart: () => {
      if (disabled) return;
      firedRef.current = false;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onTouchEnd: () => {
      clearTimer();
    },
    onTouchMove: () => {
      clearTimer();
    },
    onTouchCancel: () => {
      clearTimer();
    },
  };

  const consumeLongPress = useCallback(() => {
    if (!firedRef.current) return false;
    firedRef.current = false;
    return true;
  }, []);

  return { touchHandlers, consumeLongPress };
}

type ChatThreadRowMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ChatThreadMenuAction[];
};

export function ChatThreadRowMenu({
  open,
  onOpenChange,
  actions,
}: ChatThreadRowMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (actions.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={`cins-chat-thread-menu${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="cins-chat-thread-menu-trigger"
        aria-label="Tùy chọn hội thoại"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <MoreVertical size={14} strokeWidth={2.2} aria-hidden />
      </button>
      {open ? (
        <div className="cins-chat-thread-menu-panel" role="menu">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className={`cins-chat-thread-menu-item${action.destructive ? " is-destructive" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenChange(false);
                action.onSelect();
              }}
            >
              <span className="cins-chat-thread-menu-item-icon" aria-hidden>
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function buildThreadMenuActions(options: {
  isListPinned: boolean;
  isMuted: boolean;
  isGroup: boolean;
  isGroupAdmin: boolean;
  isGroupOwner?: boolean;
  /** DM cá nhân có slug Journey — hiện «Xem người dùng». */
  canViewProfile?: boolean;
  onViewProfile?: () => void;
  /** DM cá nhân đã biết id người dùng — hiện «Chặn người dùng này». */
  canBlock?: boolean;
  onBlockUser?: () => void;
  onToggleListPin: () => void;
  onToggleMute: () => void;
  onManageGroup?: () => void;
  /** Owner/admin — đổi tên nhóm/project nhanh (không mở full quản lý). */
  canRenameGroup?: boolean;
  onRenameGroup?: () => void;
  /** Owner/admin nhóm gốc — tạo project con nhanh. */
  canCreateProject?: boolean;
  onCreateProject?: () => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onHideThread: () => void;
  /** true khi là project con (đổi nhãn menu). */
  isProjectChild?: boolean;
}): ChatThreadMenuAction[] {
  const actions: ChatThreadMenuAction[] = [];

  if (options.canViewProfile && options.onViewProfile) {
    actions.push({
      id: "view-profile",
      label: "Xem người dùng",
      icon: <User size={15} strokeWidth={2.1} />,
      onSelect: options.onViewProfile,
    });
  }

  actions.push(
    {
      id: "list-pin",
      label: options.isListPinned ? "Bỏ ghim lên đầu" : "Ghim lên đầu danh sách",
      icon: <ArrowUpToLine size={15} strokeWidth={2.1} />,
      onSelect: options.onToggleListPin,
    },
    {
      id: "mute",
      label: options.isMuted ? "Bật thông báo" : "Tắt thông báo",
      icon: options.isMuted ? (
        <Bell size={15} strokeWidth={2.1} />
      ) : (
        <BellOff size={15} strokeWidth={2.1} />
      ),
      onSelect: options.onToggleMute,
    },
  );

  if (options.isGroup) {
    if (options.canRenameGroup && options.onRenameGroup) {
      actions.push({
        id: "rename-group",
        label: options.isProjectChild ? "Đổi tên project" : "Đổi tên nhóm",
        icon: <Pencil size={15} strokeWidth={2.1} />,
        onSelect: options.onRenameGroup,
      });
    }
    if (options.canCreateProject && options.onCreateProject) {
      actions.push({
        id: "create-project",
        label: "Tạo project",
        icon: <FolderKanban size={15} strokeWidth={2.1} />,
        onSelect: options.onCreateProject,
      });
    }
    if (options.onManageGroup) {
      actions.push({
        id: "manage-group",
        label: "Quản lý nhóm",
        icon: <Settings2 size={15} strokeWidth={2.1} />,
        onSelect: options.onManageGroup,
      });
    }
    actions.push({
      id: "leave-group",
      label: "Rời nhóm",
      icon: <LogOut size={15} strokeWidth={2.1} />,
      onSelect: options.onLeaveGroup,
    });
    if (options.isGroupOwner) {
      actions.push({
        id: "delete-group",
        label: "Xóa nhóm chat",
        icon: <Trash2 size={15} strokeWidth={2.1} />,
        destructive: true,
        onSelect: options.onDeleteGroup,
      });
    }
  } else {
    actions.push({
      id: "hide",
      label: "Ẩn hội thoại",
      icon: <EyeOff size={15} strokeWidth={2.1} />,
      onSelect: options.onHideThread,
    });
    if (options.canBlock && options.onBlockUser) {
      actions.push({
        id: "block",
        label: "Chặn người dùng này",
        icon: <Ban size={15} strokeWidth={2.1} />,
        destructive: true,
        onSelect: options.onBlockUser,
      });
    }
  }

  return actions;
}
