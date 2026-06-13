"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import { CoSoStaffInviteMessage } from "@/components/journey/CoSoStaffInviteMessage";
import type { PendingCoSoStaffInviteNotification } from "@/lib/to-chuc/co-so-staff-invite";

type Props = {
  invites: ReadonlyArray<PendingCoSoStaffInviteNotification>;
};

function dispatchNotificationsChanged() {
  window.dispatchEvent(new Event("cins:notifications-changed"));
}

export function JourneyCoSoStaffInviteBanner({ invites }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Map<string, string>>(() => new Map());
  const [pending, startTransition] = useTransition();

  const visibleInvites = useMemo(
    () => invites.filter((invite) => !dismissedIds.has(invite.membershipId)),
    [dismissedIds, invites],
  );

  const respond = useCallback(
    (invite: PendingCoSoStaffInviteNotification, action: "accept" | "decline") => {
      startTransition(async () => {
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(invite.membershipId);
          return next;
        });
        const res = await fetch(
          `/api/co-so/${encodeURIComponent(invite.orgId)}/members/${encodeURIComponent(invite.membershipId)}/respond`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          setErrors((prev) => {
            const next = new Map(prev);
            next.set(
              invite.membershipId,
              json?.error ?? "Không xử lý được lời mời.",
            );
            return next;
          });
          return;
        }
        setDismissedIds((prev) => new Set(prev).add(invite.membershipId));
        dispatchNotificationsChanged();
      });
    },
    [],
  );

  if (visibleInvites.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack j-coso-staff-invite-stack" aria-live="polite">
      {visibleInvites.map((invite) => {
        const error = errors.get(invite.membershipId);
        return (
          <div
            key={invite.membershipId}
            className="j-coauthor-pending j-coso-staff-invite"
          >
            <div className="j-coauthor-pending-body">
              <CoSoStaffInviteMessage
                inviterName={invite.inviterName}
                inviterSlug={invite.inviterSlug}
                inviterAvatarUrl={invite.inviterAvatarUrl}
                orgTen={invite.orgTen}
                orgSlug={invite.orgSlug}
                orgHref={`/co-so/${invite.orgSlug}`}
                vaiTroLabel={invite.vaiTroLabel}
              />
              <p className="j-coso-staff-invite-hint">
                Chấp nhận để quyền có hiệu lực trên trang cơ sở.
              </p>
            </div>
            <div className="j-coauthor-pending-actions">
              <Link
                href={`/co-so/${invite.orgSlug}`}
                className="j-coauthor-pending-btn is-view"
              >
                Xem cơ sở
              </Link>
              <button
                type="button"
                className="j-coauthor-pending-btn is-accept"
                disabled={pending}
                onClick={() => respond(invite, "accept")}
              >
                Chấp nhận
              </button>
              <button
                type="button"
                className="j-coauthor-pending-btn is-decline"
                disabled={pending}
                onClick={() => respond(invite, "decline")}
              >
                Từ chối
              </button>
              {error ? <p className="j-coauthor-pending-error">{error}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
