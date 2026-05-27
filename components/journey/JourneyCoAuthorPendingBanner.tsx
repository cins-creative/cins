"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import type { PendingCoAuthorInvite } from "@/lib/social/types";

type Props = {
  invites: ReadonlyArray<PendingCoAuthorInvite>;
  viewerProfileId: string;
};

export function JourneyCoAuthorPendingBanner({
  invites,
  viewerProfileId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const respond = useCallback(
    (tacPhamId: string, trangThai: "accepted" | "declined") => {
      startTransition(async () => {
        const res = await fetch(
          `/api/tac-pham/${tacPhamId}/tac-gia/${viewerProfileId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trang_thai: trangThai }),
          },
        );
        if (res.ok) router.refresh();
      });
    },
    [router, viewerProfileId],
  );

  if (invites.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack" aria-live="polite">
      {invites.map((inv) => (
        <div key={inv.tacPhamId} className="j-coauthor-pending">
          <p className="j-coauthor-pending-text">
            <strong>{inv.ownerName}</strong> mời bạn đồng tác giả
            {inv.vaiTro ? (
              <>
                {" "}
                · <em>{inv.vaiTro}</em>
              </>
            ) : null}{" "}
            — &ldquo;{inv.postTitle}&rdquo;
          </p>
          <div className="j-coauthor-pending-actions">
            <button
              type="button"
              className="j-coauthor-pending-btn is-accept"
              disabled={pending}
              onClick={() => respond(inv.tacPhamId, "accepted")}
            >
              Chấp nhận
            </button>
            <button
              type="button"
              className="j-coauthor-pending-btn"
              disabled={pending}
              onClick={() => respond(inv.tacPhamId, "declined")}
            >
              Từ chối
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
