"use client";

import { X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { avatarBg, avatarInitialFromName } from "@/lib/chat/avatar";
import { groupRoleLabel } from "@/lib/chat/group-roles";
import type { ChatGroupMember } from "@/lib/chat/types";

type Props = {
  open: boolean;
  members: ChatGroupMember[];
  onClose: () => void;
};

/** Danh sách thành viên — overlay giữa màn hình, mở từ «N thành viên» trên header chat. */
export function ChatGroupMembersPopover({ open, members, onClose }: Props) {
  const sorted = useMemo(() => {
    const rank: Record<ChatGroupMember["vaiTro"], number> = {
      owner: 0,
      admin: 1,
      thanh_vien: 2,
    };
    return [...members].sort((a, b) => {
      const byRole = rank[a.vaiTro] - rank[b.vaiTro];
      if (byRole !== 0) return byRole;
      return a.tenHienThi.localeCompare(b.tenHienThi, "vi");
    });
  }, [members]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cins-chat-members-root" role="presentation">
      <button
        type="button"
        className="cins-chat-members-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="cins-chat-members-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách thành viên"
      >
        <header className="cins-chat-members-pop-head">
          <strong>Thành viên</strong>
          <span className="cins-chat-members-pop-count">{sorted.length}</span>
          <button
            type="button"
            className="cins-chat-members-pop-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </header>
        {sorted.length === 0 ? (
          <p className="cins-chat-members-pop-empty">Đang tải danh sách…</p>
        ) : (
          <ul className="cins-chat-members-pop-list" role="list">
            {sorted.map((member) => {
              const initial = avatarInitialFromName(member.tenHienThi);
              const hue = member.tenHienThi.length * 17;
              return (
                <li key={member.userId} className="cins-chat-members-pop-row">
                  <span
                    className={`cins-chat-members-pop-avatar${member.avatarUrl ? " has-image" : ""}`}
                    style={{
                      background: member.avatarUrl
                        ? "transparent"
                        : avatarBg(hue),
                    }}
                    aria-hidden
                  >
                    {member.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={member.avatarUrl} alt="" />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="cins-chat-members-pop-meta">
                    <span className="cins-chat-members-pop-name">
                      {member.tenHienThi}
                      {member.isViewer ? " (bạn)" : null}
                    </span>
                    <span className="cins-chat-members-pop-role">
                      {groupRoleLabel(member.vaiTro)}
                      {member.slug ? ` · @${member.slug}` : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
