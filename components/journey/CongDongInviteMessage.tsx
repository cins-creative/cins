"use client";

import type { ReactNode } from "react";

import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";

type Props = {
  inviterName: string;
  inviterSlug?: string | null;
  inviterAvatarUrl?: string | null;
  orgTen: string;
  orgSlug: string;
  className?: string;
};

/** Câu mời cộng đồng — banner timeline + dropdown thông báo. */
export function CongDongInviteMessage({
  inviterName,
  inviterSlug = null,
  inviterAvatarUrl = null,
  orgTen,
  orgSlug,
  className = "j-coauthor-pending-message j-cong-dong-invite-message",
}: Props): ReactNode {
  const initial = (inviterName || "?").slice(0, 1).toUpperCase();
  const orgHref = `/cong-dong/${encodeURIComponent(orgSlug)}`;

  const sender = (
    <span className="j-coauthor-invite-sender">
      <span className="j-coauthor-invite-avatar" aria-hidden>
        {inviterAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inviterAvatarUrl} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </span>
      <strong>{inviterName}</strong>
    </span>
  );

  return (
    <p className={className}>
      <JourneyUserPopover
        slug={inviterSlug}
        fallbackName={inviterName}
        fallbackAvatarUrl={inviterAvatarUrl}
      >
        {sender}
      </JourneyUserPopover>{" "}
      mời bạn tham gia cộng đồng{" "}
      <JourneyOrgPopover
        slug={orgSlug}
        orgKind="cong_dong"
        fallbackName={orgTen}
        href={orgHref}
      >
        <span className="j-coso-staff-invite-org-link">{orgTen}</span>
      </JourneyOrgPopover>
      .
    </p>
  );
}
