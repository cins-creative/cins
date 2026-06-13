"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  dispatchCoAuthorInviteAccepted,
  dispatchCoAuthorInviteDeclined,
  dispatchCoAuthorInviteFailed,
} from "@/lib/journey/coauthor-invite-events";
import { prefetchMilestoneDetail } from "@/lib/journey/milestone-detail-cache";
import { CoAuthorInviteMessage } from "@/components/journey/CoAuthorInviteMessage";
import type { PendingCoAuthorInvite } from "@/lib/social/types";

function coAuthorPostHref(inv: PendingCoAuthorInvite): string | null {
  if (!inv.ownerSlug || !inv.postSlug) return null;
  return `/${encodeURIComponent(inv.ownerSlug)}/p/${encodeURIComponent(inv.postSlug)}`;
}

type Props = {
  invites: ReadonlyArray<PendingCoAuthorInvite>;
  viewerProfileId: string;
  /** Slug Journey đang xem — để sync optimistic với timeline parent. */
  ownerSlug: string;
};

export function JourneyCoAuthorPendingBanner({
  invites,
  viewerProfileId,
  ownerSlug,
}: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [preloaded, setPreloaded] = useState<Map<string, MilestoneItem>>(
    () => new Map(),
  );
  const [itemErrors, setItemErrors] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const preloadInflight = useRef(new Set<string>());

  const visibleInvites = useMemo(
    () => invites.filter((inv) => !dismissedIds.has(inv.tacPhamId)),
    [invites, dismissedIds],
  );

  useEffect(() => {
    for (const inv of invites) {
      if (preloadInflight.current.has(inv.tacPhamId)) continue;
      preloadInflight.current.add(inv.tacPhamId);
      void (async () => {
        try {
          const res = await fetch(
            `/api/tac-pham/${encodeURIComponent(inv.tacPhamId)}/journey-card`,
            { cache: "no-store" },
          );
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.milestone) return;
          const milestone = json.milestone as MilestoneItem;
          setPreloaded((prev) => {
            const next = new Map(prev);
            next.set(inv.tacPhamId, milestone);
            return next;
          });
          if (milestone.postSlug && milestone.postOwnerSlug && milestone.cotMocId) {
            prefetchMilestoneDetail({
              postOwnerSlug: milestone.postOwnerSlug,
              postSlug: milestone.postSlug,
              milestoneId: milestone.cotMocId,
            });
          }
        } finally {
          preloadInflight.current.delete(inv.tacPhamId);
        }
      })();
    }
  }, [invites]);

  const dismissInvite = useCallback((tacPhamId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(tacPhamId);
      return next;
    });
    setItemErrors((prev) => {
      if (!prev.has(tacPhamId)) return prev;
      const next = new Map(prev);
      next.delete(tacPhamId);
      return next;
    });
  }, []);

  const restoreInvite = useCallback((tacPhamId: string) => {
    setDismissedIds((prev) => {
      if (!prev.has(tacPhamId)) return prev;
      const next = new Set(prev);
      next.delete(tacPhamId);
      return next;
    });
  }, []);

  const respondInBackground = useCallback(
    async (
      inv: PendingCoAuthorInvite,
      trangThai: "accepted" | "declined",
      milestone?: MilestoneItem,
    ) => {
      setRespondingId(inv.tacPhamId);
      try {
        const res = await fetch(
          `/api/tac-pham/${inv.tacPhamId}/tac-gia/${viewerProfileId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trang_thai: trangThai }),
          },
        );
        if (res.ok) {
          window.dispatchEvent(new Event("cins:notifications-changed"));
          return;
        }
        const json = await res.json().catch(() => ({}));
        const message =
          typeof json.error === "string"
            ? json.error
            : "Không phản hồi được lời mời.";
        if (message === "Lời mời đã được xử lý.") return;
        restoreInvite(inv.tacPhamId);
        if (trangThai === "accepted" && milestone) {
          dispatchCoAuthorInviteFailed({
            ownerSlug,
            tacPhamId: inv.tacPhamId,
            action: trangThai,
            error: message,
          });
        }
        setItemErrors((prev) => {
          const next = new Map(prev);
          next.set(inv.tacPhamId, message);
          return next;
        });
      } finally {
        setRespondingId((current) =>
          current === inv.tacPhamId ? null : current,
        );
      }
    },
    [ownerSlug, restoreInvite, viewerProfileId],
  );

  const respond = useCallback(
    (inv: PendingCoAuthorInvite, trangThai: "accepted" | "declined") => {
      if (respondingId) return;

      if (trangThai === "declined") {
        dismissInvite(inv.tacPhamId);
        dispatchCoAuthorInviteDeclined({
          ownerSlug,
          tacPhamId: inv.tacPhamId,
        });
        void respondInBackground(inv, trangThai);
        return;
      }

      const milestone = preloaded.get(inv.tacPhamId);
      if (!milestone) {
        setItemErrors((prev) => {
          const next = new Map(prev);
          next.set(inv.tacPhamId, "Đang tải nội dung… thử lại sau giây lát.");
          return next;
        });
        return;
      }

      dismissInvite(inv.tacPhamId);
      dispatchCoAuthorInviteAccepted({
        ownerSlug,
        tacPhamId: inv.tacPhamId,
        milestone: {
          ...milestone,
          canProposeCoAuthor: true,
          createdAt: new Date().toISOString(),
        },
      });
      void respondInBackground(inv, trangThai, milestone);
    },
    [dismissInvite, ownerSlug, preloaded, respondInBackground, respondingId],
  );

  if (visibleInvites.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack" aria-live="polite">
      {visibleInvites.map((inv) => {
        const postHref = coAuthorPostHref(inv);
        const isResponding = respondingId === inv.tacPhamId;
        const error = itemErrors.get(inv.tacPhamId);
        const ready = preloaded.has(inv.tacPhamId);
        return (
          <div key={inv.tacPhamId} className="j-coauthor-pending">
            <div className="j-coauthor-pending-body">
              <CoAuthorInviteMessage
                ownerSlug={inv.ownerSlug}
                ownerName={inv.ownerName}
                ownerAvatarUrl={inv.ownerAvatarUrl}
                postTitle={inv.postTitle}
                vaiTro={inv.vaiTro}
                className="j-coauthor-pending-message"
              />
            </div>
            <div className="j-coauthor-pending-actions">
              {postHref ? (
                <a
                  href={postHref}
                  className="j-coauthor-pending-btn is-view"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Xem nội dung
                </a>
              ) : null}
              <button
                type="button"
                className="j-coauthor-pending-btn is-accept"
                disabled={isResponding || !ready}
                onClick={(e) => {
                  e.stopPropagation();
                  respond(inv, "accepted");
                }}
              >
                Chấp nhận
              </button>
              <button
                type="button"
                className="j-coauthor-pending-btn is-decline"
                disabled={isResponding}
                onClick={(e) => {
                  e.stopPropagation();
                  respond(inv, "declined");
                }}
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
