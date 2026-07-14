"use client";

import type { ChatGroupMember } from "@/lib/chat/types";

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
  const q = query.trim().toLowerCase();
  const filtered = members.filter((m) => {
    if (m.isViewer) return false;
    if (!q) return true;
    const name = m.tenHienThi.toLowerCase();
    const slug = m.slug.toLowerCase();
    return name.includes(q) || slug.includes(q);
  });

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
        return (
          <button
            key={member.userId}
            type="button"
            role="option"
            aria-selected={active}
            className={`cins-chat-at-menu-item${active ? " is-active" : ""}`}
            onMouseEnter={() => onHoverIndex(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(member);
            }}
          >
            <span className="cins-chat-at-menu-avatar" aria-hidden>
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatarUrl} alt="" />
              ) : (
                <span>{(member.tenHienThi || member.slug).charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className="cins-chat-at-menu-meta">
              <strong>{member.tenHienThi || member.slug}</strong>
              <em>@{member.slug}</em>
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
  return members.filter((m) => {
    if (m.isViewer) return false;
    if (!q) return true;
    return (
      m.tenHienThi.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q)
    );
  });
}
