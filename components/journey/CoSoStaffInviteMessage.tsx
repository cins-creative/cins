"use client";

import type { ReactNode } from "react";

import { JourneyOrgPopover } from "@/components/journey/JourneyOrgPopover";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { CO_SO_DEFAULT_TAB, coSoTabPath } from "@/lib/to-chuc/co-so-routes";

type Props = {
  inviterName: string;
  inviterSlug?: string | null;
  inviterAvatarUrl?: string | null;
  orgTen: string;
  orgSlug: string;
  orgHref?: string;
  vaiTroLabel: string;
  className?: string;
};

/** Câu mời quản trị cơ sở — banner timeline + dropdown thông báo. */
export function CoSoStaffInviteMessage({
  inviterName,
  inviterSlug = null,
  inviterAvatarUrl = null,
  orgTen,
  orgSlug,
  orgHref,
  vaiTroLabel,
  className = "j-coauthor-pending-message j-coso-staff-invite-message",
}: Props): ReactNode {
  const initial = (inviterName || "?").slice(0, 1).toUpperCase();
  const href = orgHref ?? coSoTabPath(orgSlug, CO_SO_DEFAULT_TAB);
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
      mời bạn tham gia quản trị cơ sở{" "}
      <JourneyOrgPopover
        slug={orgSlug}
        orgKind="co_so_dao_tao"
        fallbackName={orgTen}
        href={href}
      >
        <span className="j-coso-staff-invite-org-link">{orgTen}</span>
      </JourneyOrgPopover>{" "}
      với vai trò <strong>{vaiTroLabel}</strong>.
    </p>
  );
}
