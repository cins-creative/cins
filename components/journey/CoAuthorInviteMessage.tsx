"use client";

import type { ReactNode } from "react";

import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";

type InviteCopy = {
  ownerSlug?: string | null;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  postTitle: string;
  vaiTro?: string | null;
};

type Props = InviteCopy & {
  className?: string;
};

/** Một câu mời đồng tác giả — dùng banner timeline + dropdown thông báo. */
export function CoAuthorInviteMessage({
  ownerSlug,
  ownerName,
  ownerAvatarUrl = null,
  postTitle,
  vaiTro,
  className = "j-coauthor-invite-message",
}: Props): ReactNode {
  const role = vaiTro?.trim();
  const initial = (ownerName || "?").slice(0, 1).toUpperCase();
  const sender = (
    <span className="j-coauthor-invite-sender">
      <span className="j-coauthor-invite-avatar" aria-hidden>
        {ownerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ownerAvatarUrl} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </span>
      <strong>{ownerName}</strong>
    </span>
  );

  return (
    <p className={className}>
      <JourneyUserPopover
        slug={ownerSlug}
        fallbackName={ownerName}
        fallbackAvatarUrl={ownerAvatarUrl}
      >
        {sender}
      </JourneyUserPopover>{" "}
      mời bạn làm đồng tác giả cho tác phẩm{" "}
      <cite className="j-coauthor-invite-work">&ldquo;{postTitle}&rdquo;</cite>
      {role ? (
        <>
          {" "}
          với vai trò <em>{role}</em>
        </>
      ) : null}
      .
    </p>
  );
}
