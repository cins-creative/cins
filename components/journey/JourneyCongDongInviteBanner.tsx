"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import { CongDongInviteMessage } from "@/components/journey/CongDongInviteMessage";
import type { PendingCongDongInviteNotification } from "@/lib/cong-dong/invite";

type Props = {
  invites: ReadonlyArray<PendingCongDongInviteNotification>;
};

function dispatchNotificationsChanged() {
  window.dispatchEvent(new Event("cins:notifications-changed"));
}

export function JourneyCongDongInviteBanner({ invites }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Map<string, string>>(() => new Map());
  const [pending, startTransition] = useTransition();

  const visibleInvites = useMemo(
    () => invites.filter((invite) => !dismissedIds.has(invite.notificationId)),
    [dismissedIds, invites],
  );

  const respond = useCallback(
    (invite: PendingCongDongInviteNotification, action: "accept" | "decline") => {
      startTransition(async () => {
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(invite.notificationId);
          return next;
        });
        const res = await fetch(
          `/api/cong-dong/invites/${encodeURIComponent(invite.notificationId)}/respond`,
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
              invite.notificationId,
              json?.error ?? "Không xử lý được lời mời.",
            );
            return next;
          });
          return;
        }
        setDismissedIds((prev) => new Set(prev).add(invite.notificationId));
        dispatchNotificationsChanged();
      });
    },
    [],
  );

  if (visibleInvites.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack j-cong-dong-invite-stack" aria-live="polite">
      {visibleInvites.map((invite) => {
        const error = errors.get(invite.notificationId);
        const orgHref = `/cong-dong/${encodeURIComponent(invite.orgSlug)}`;
        return (
          <div
            key={invite.notificationId}
            className="j-coauthor-pending j-cong-dong-invite"
          >
            <div className="j-coauthor-pending-body">
              <CongDongInviteMessage
                inviterName={invite.inviterName}
                inviterSlug={invite.inviterSlug}
                inviterAvatarUrl={invite.inviterAvatarUrl}
                orgTen={invite.orgTen}
                orgSlug={invite.orgSlug}
              />
              <p className="j-coso-staff-invite-hint">
                Tham gia để đăng bài và theo dõi hoạt động trong cộng đồng.
              </p>
            </div>
            <div className="j-coauthor-pending-actions">
              <Link href={orgHref} className="j-coauthor-pending-btn is-view">
                Xem cộng đồng
              </Link>
              <button
                type="button"
                className="j-coauthor-pending-btn is-accept"
                disabled={pending}
                onClick={() => respond(invite, "accept")}
              >
                Tham gia
              </button>
              <button
                type="button"
                className="j-coauthor-pending-btn is-decline"
                disabled={pending}
                onClick={() => respond(invite, "decline")}
              >
                Bỏ qua
              </button>
              {error ? <p className="j-coauthor-pending-error">{error}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
