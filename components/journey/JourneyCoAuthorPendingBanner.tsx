"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  buildAcceptedTaggedMilestone,
  dispatchJourneyTimelineRefresh,
} from "@/lib/journey/coauthor-accept-optimistic";
import {
  dispatchCoAuthorInviteAccepted,
  dispatchCoAuthorInviteDeclined,
  dispatchCoAuthorInviteFailed,
} from "@/lib/journey/coauthor-invite-events";
import { prefetchMilestoneDetail } from "@/lib/journey/milestone-detail-cache";
import { CoAuthorInviteMessage } from "@/components/journey/CoAuthorInviteMessage";
import { CoAuthorPositionPicker } from "@/components/journey/CoAuthorPositionPicker";
import { loadCoAuthorNgheRoleOptions } from "@/lib/editor/coauthor-role-action";
import type { CoAuthorNgheRoleOption } from "@/lib/editor/coauthor-role-types";
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
  viewerName: string;
  viewerAvatarUrl?: string | null;
};

export function JourneyCoAuthorPendingBanner({
  invites,
  viewerProfileId,
  ownerSlug,
  viewerName,
  viewerAvatarUrl = null,
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
  /** Invite đang ở bước chọn vị trí công việc trước khi accept. */
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickedPositions, setPickedPositions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<CoAuthorNgheRoleOption[]>([]);

  const visibleInvites = useMemo(
    () => invites.filter((inv) => !dismissedIds.has(inv.tacPhamId)),
    [invites, dismissedIds],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCoAuthorNgheRoleOptions()
      .then((rows) => {
        if (!cancelled) setRoleOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setRoleOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      positions?: string[],
    ) => {
      setRespondingId(inv.tacPhamId);
      try {
        const res = await fetch(
          `/api/tac-pham/${inv.tacPhamId}/tac-gia/${viewerProfileId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trang_thai: trangThai,
              ...(trangThai === "accepted" ? { vai_tro: positions ?? [] } : {}),
            }),
          },
        );
        if (res.ok) {
          window.dispatchEvent(new Event("cins:notifications-changed"));
          dispatchJourneyTimelineRefresh(ownerSlug);
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

  const decline = useCallback(
    (inv: PendingCoAuthorInvite) => {
      if (respondingId) return;
      if (pickingId === inv.tacPhamId) setPickingId(null);
      dismissInvite(inv.tacPhamId);
      dispatchCoAuthorInviteDeclined({ ownerSlug, tacPhamId: inv.tacPhamId });
      void respondInBackground(inv, "declined");
    },
    [dismissInvite, ownerSlug, pickingId, respondInBackground, respondingId],
  );

  const startPicking = useCallback((inv: PendingCoAuthorInvite) => {
    setPickedPositions([]);
    setPickingId(inv.tacPhamId);
    setItemErrors((prev) => {
      if (!prev.has(inv.tacPhamId)) return prev;
      const next = new Map(prev);
      next.delete(inv.tacPhamId);
      return next;
    });
  }, []);

  const confirmAccept = useCallback(
    (inv: PendingCoAuthorInvite, positions: string[]) => {
      if (respondingId) return;

      const base = preloaded.get(inv.tacPhamId);
      if (!base) {
        setItemErrors((prev) => {
          const next = new Map(prev);
          next.set(inv.tacPhamId, "Đang tải nội dung… thử lại sau giây lát.");
          return next;
        });
        return;
      }

      const milestone = buildAcceptedTaggedMilestone(
        base,
        {
          id: viewerProfileId,
          name: viewerName,
          slug: ownerSlug,
          avatarUrl: viewerAvatarUrl,
        },
        positions,
      );

      setPickingId(null);
      dismissInvite(inv.tacPhamId);
      dispatchCoAuthorInviteAccepted({
        ownerSlug,
        tacPhamId: inv.tacPhamId,
        milestone: {
          ...milestone,
          canProposeCoAuthor: true,
        },
      });
      void respondInBackground(inv, "accepted", milestone, positions);
    },
    [dismissInvite, ownerSlug, preloaded, respondInBackground, respondingId, viewerAvatarUrl, viewerName, viewerProfileId],
  );

  if (visibleInvites.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack" aria-live="polite">
      {visibleInvites.map((inv) => {
        const postHref = coAuthorPostHref(inv);
        const isResponding = respondingId === inv.tacPhamId;
        const error = itemErrors.get(inv.tacPhamId);
        const ready = preloaded.has(inv.tacPhamId);
        const isPicking = pickingId === inv.tacPhamId;
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
            {isPicking ? (
              <div className="j-coauthor-pending-pick">
                <p className="j-coauthor-pending-pick-label">
                  Chọn vị trí công việc của bạn trong dự án (tối đa 2):
                </p>
                <CoAuthorPositionPicker
                  value={pickedPositions}
                  onChange={setPickedPositions}
                  options={roleOptions}
                />
                <div className="j-coauthor-pending-actions">
                  <button
                    type="button"
                    className="j-coauthor-pending-btn is-accept"
                    disabled={
                      isResponding || !ready || pickedPositions.length === 0
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmAccept(inv, pickedPositions);
                    }}
                  >
                    Xác nhận tham gia
                  </button>
                  <button
                    type="button"
                    className="j-coauthor-pending-btn is-decline"
                    disabled={isResponding}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPickingId(null);
                    }}
                  >
                    Huỷ
                  </button>
                  {error ? (
                    <p className="j-coauthor-pending-error">{error}</p>
                  ) : null}
                </div>
              </div>
            ) : (
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
                    startPicking(inv);
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
                    decline(inv);
                  }}
                >
                  Từ chối
                </button>
                {error ? (
                  <p className="j-coauthor-pending-error">{error}</p>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
