"use client";

import { Camera, Loader2, Users } from "lucide-react";

import { avatarBg } from "@/lib/chat/avatar";
import type { ChatGroupMemberAvatar } from "@/lib/chat/types";

type Props = {
  size?: number;
  avatarUrl?: string | null;
  members?: ChatGroupMemberAvatar[];
  editable?: boolean;
  uploading?: boolean;
  onEditClick?: () => void;
  className?: string;
};

function MosaicCell({
  member,
  showOverflow,
}: {
  member: ChatGroupMemberAvatar;
  showOverflow?: number;
}) {
  return (
    <span
      className="cins-chat-group-avatar-cell"
      style={{
        background: member.avatarUrl ? "transparent" : avatarBg(member.hue),
      }}
    >
      {member.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={member.avatarUrl} alt="" />
      ) : (
        <span aria-hidden>{member.initial}</span>
      )}
      {showOverflow != null && showOverflow > 0 ? (
        <span className="cins-chat-group-avatar-overflow">+{showOverflow}</span>
      ) : null}
    </span>
  );
}

export function ChatGroupAvatar({
  size = 40,
  avatarUrl = null,
  members = [],
  editable = false,
  uploading = false,
  onEditClick,
  className = "",
}: Props) {
  const hasCustom = Boolean(avatarUrl?.trim());
  const mosaicMembers = members.slice(0, 4);
  const overflow =
    members.length > mosaicMembers.length ? members.length - 3 : 0;
  const displayMembers =
    overflow > 0 ? mosaicMembers.slice(0, 3) : mosaicMembers;
  const count = displayMembers.length;

  const rootClass = [
    "cins-chat-group-avatar",
    hasCustom ? "has-custom" : "has-mosaic",
    count <= 1 ? "is-single" : count === 2 ? "is-duo" : count === 3 ? "is-trio" : "is-quad",
    editable ? "is-editable" : "",
    uploading ? "is-uploading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = hasCustom ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="cins-chat-group-avatar-photo" src={avatarUrl!} alt="" />
      <span className="cins-chat-group-avatar-badge" aria-hidden>
        <Users size={Math.max(10, size * 0.28)} strokeWidth={2.2} />
      </span>
    </>
  ) : count === 0 ? (
    <span className="cins-chat-group-avatar-fallback" aria-hidden>
      <Users size={Math.max(14, size * 0.42)} strokeWidth={1.8} />
    </span>
  ) : (
    <span
      className="cins-chat-group-avatar-mosaic"
      data-count={String(Math.min(count, 4))}
      aria-hidden
    >
      {displayMembers.map((member, index) => (
        <MosaicCell
          key={member.userId}
          member={member}
          showOverflow={
            overflow > 0 && index === displayMembers.length - 1
              ? overflow
              : undefined
          }
        />
      ))}
    </span>
  );

  const style = { width: size, height: size, ["--cga-size" as string]: `${size}px` };

  if (editable && onEditClick) {
    return (
      <button
        type="button"
        className={rootClass}
        style={style}
        aria-label="Đổi ảnh nhóm"
        title="Đổi ảnh nhóm"
        onClick={onEditClick}
        disabled={uploading}
      >
        {inner}
        <span className="cins-chat-group-avatar-edit" aria-hidden>
          {uploading ? (
            <Loader2 size={14} className="cins-chat-spin" />
          ) : (
            <Camera size={14} strokeWidth={2} />
          )}
        </span>
      </button>
    );
  }

  return (
    <span className={rootClass} style={style} aria-hidden>
      {inner}
    </span>
  );
}
