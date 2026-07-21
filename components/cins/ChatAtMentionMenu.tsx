"use client";

import { Users } from "lucide-react";

import {
  chatMentionAllQueryMatches,
  isChatMentionAllSlug,
} from "@/lib/chat/mentions";
import type { ChatGroupMember } from "@/lib/chat/types";

/** Sentinel trong menu @ — chọn sẽ chèn `@all `. */
export const CHAT_AT_MENTION_ALL: ChatGroupMember = {
  membershipId: "__all__",
  userId: "__all__",
  slug: "all",
  tenHienThi: "Mọi người",
  avatarId: null,
  avatarUrl: null,
  vaiTro: "thanh_vien",
  isViewer: false,
};

export function isChatAtMentionAll(member: ChatGroupMember): boolean {
  return member.userId === CHAT_AT_MENTION_ALL.userId || isChatMentionAllSlug(member.slug);
}

type Props = {
  members: ChatGroupMember[];
  query: string;
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (member: ChatGroupMember) => void;
};

export function ChatAtMentionMenu({
  members,
  query,
  activeIndex,
  onHoverIndex,
  onSelect,
}: Props) {
  const filtered = filterChatAtMembers(members, query);

  if (filtered.length === 0) {
    return (
      <div className="cins-chat-at-menu" role="listbox" aria-label="Gợi ý @nhắc">
        <p className="cins-chat-at-menu-empty">Không tìm thấy thành viên</p>
      </div>
    );
  }

  return (
    <div className="cins-chat-at-menu" role="listbox" aria-label="Gợi ý @nhắc">
      {filtered.map((member, index) => {
        const active = index === activeIndex;
        const isAll = isChatAtMentionAll(member);
        return (
          <button
            key={member.userId}
            type="button"
            role="option"
            aria-selected={active}
            className={`cins-chat-at-menu-item${active ? " is-active" : ""}${isAll ? " is-all" : ""}`}
            onMouseEnter={() => onHoverIndex(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(member);
            }}
          >
            <span className="cins-chat-at-menu-avatar" aria-hidden>
              {isAll ? (
                <Users size={16} strokeWidth={2} />
              ) : member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt="" />
              ) : (
                <span>
                  {(member.tenHienThi || member.slug).charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="cins-chat-at-menu-meta">
              <strong>{isAll ? "Mọi người" : member.tenHienThi || member.slug}</strong>
              <em>{isAll ? "@all · nhắc cả nhóm" : `@${member.slug}`}</em>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function filterChatAtMembers(
  members: ChatGroupMember[],
  query: string,
): ChatGroupMember[] {
  const q = query.trim().toLowerCase();
  const people = members.filter((m) => {
    if (m.isViewer) return false;
    if (isChatAtMentionAll(m)) return false;
    if (!q) return true;
    return (
      m.tenHienThi.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q)
    );
  });

  if (chatMentionAllQueryMatches(query)) {
    return [CHAT_AT_MENTION_ALL, ...people];
  }
  return people;
}
