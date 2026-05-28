"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

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
  const [error, setError] = useState<string | null>(null);

  const respond = useCallback(
    (tacPhamId: string, trangThai: "accepted" | "declined") => {
      setError(null);
      startTransition(async () => {
        const res = await fetch(
          `/api/tac-pham/${tacPhamId}/tac-gia/${viewerProfileId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trang_thai: trangThai }),
          },
        );
        if (res.ok) {
          router.refresh();
          return;
        }
        const json = await res.json().catch(() => ({}));
        setError(
          typeof json.error === "string"
            ? json.error
            : "Không phản hồi được lời mời.",
        );
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
              onClick={(e) => {
                e.stopPropagation();
                respond(inv.tacPhamId, "accepted");
              }}
            >
              Chấp nhận
            </button>
            <button
              type="button"
              className="j-coauthor-pending-btn"
              disabled={pending}
              onClick={(e) => {
                e.stopPropagation();
                respond(inv.tacPhamId, "declined");
              }}
            >
              Từ chối
            </button>
          </div>
          {error ? <p className="j-coauthor-pending-error">{error}</p> : null}
        </div>
      ))}
    </div>
  );
}
