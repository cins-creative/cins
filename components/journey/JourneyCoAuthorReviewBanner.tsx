"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import { dispatchMilestoneCreditsUpdated } from "@/lib/journey/coauthor-credits-events";
import type { CoAuthorReviewProfile, PendingCoAuthorReview } from "@/lib/social/types";

type Props = {
  reviews: ReadonlyArray<PendingCoAuthorReview>;
};

function dispatchNotificationsChanged() {
  window.dispatchEvent(new Event("cins:notifications-changed"));
}

function reviewPostHref(review: PendingCoAuthorReview): string | null {
  if (!review.ownerSlug || !review.postSlug) return null;
  return `/${encodeURIComponent(review.ownerSlug)}/p/${encodeURIComponent(review.postSlug)}`;
}

function ReviewAvatar({ profile }: { profile: CoAuthorReviewProfile }) {
  const initial = (profile.tenHienThi || profile.slug || "?").slice(0, 1).toUpperCase();
  return (
    <span className="j-pending-avatar" aria-hidden>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}

export function JourneyCoAuthorReviewBanner({ reviews }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Map<string, string>>(() => new Map());
  const [pending, startTransition] = useTransition();

  const visibleReviews = useMemo(
    () => reviews.filter((review) => !dismissedIds.has(review.notificationId)),
    [dismissedIds, reviews],
  );

  const respond = useCallback(
    (review: PendingCoAuthorReview, action: "accept" | "decline") => {
      startTransition(async () => {
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(review.notificationId);
          return next;
        });
        const res = await fetch("/api/coauthor/reviews", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notification_id: review.notificationId,
            action,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrors((prev) => {
            const next = new Map(prev);
            next.set(
              review.notificationId,
              typeof json.error === "string" ? json.error : "Không xử lý được.",
            );
            return next;
          });
          return;
        }
        setDismissedIds((prev) => new Set(prev).add(review.notificationId));
        if (
          action === "accept" &&
          typeof json.tacPhamId === "string" &&
          Array.isArray(json.coAuthorCredits)
        ) {
          dispatchMilestoneCreditsUpdated({
            tacPhamId: json.tacPhamId,
            coAuthorCredits: json.coAuthorCredits as CoAuthorCredit[],
          });
        }
        dispatchNotificationsChanged();
      });
    },
    [],
  );

  if (visibleReviews.length === 0) return null;

  return (
    <div className="j-coauthor-pending-stack j-coauthor-review-stack" aria-live="polite">
      {visibleReviews.map((review) => {
        const postHref = reviewPostHref(review);
        const error = errors.get(review.notificationId);
        return (
          <div
            key={review.notificationId}
            className="j-coauthor-pending j-coauthor-review-pending"
          >
            <div className="j-coauthor-pending-body">
              <div className="j-coauthor-review-pending-lead">
                <ReviewAvatar profile={review.proposer} />
                <p className="j-coauthor-pending-message">
                  <strong>{review.proposer.tenHienThi}</strong> đề xuất thêm cộng
                  sự <strong>{review.target.tenHienThi}</strong>
                  {review.vaiTro ? (
                    <>
                      {" "}
                      (<em>{review.vaiTro}</em>)
                    </>
                  ) : null}{" "}
                  vào bài{" "}
                  {postHref ? (
                    <Link href={postHref} className="j-coauthor-review-pending-link">
                      {review.postTitle}
                    </Link>
                  ) : (
                    <strong>{review.postTitle}</strong>
                  )}
                  .
                </p>
              </div>
            </div>
            <div className="j-coauthor-pending-actions">
              {postHref ? (
                <Link href={postHref} className="j-coauthor-pending-btn is-view">
                  Xem bài viết
                </Link>
              ) : null}
              <button
                type="button"
                className="j-coauthor-pending-btn is-accept"
                disabled={pending}
                onClick={() => respond(review, "accept")}
              >
                Duyệt
              </button>
              <button
                type="button"
                className="j-coauthor-pending-btn is-decline"
                disabled={pending}
                onClick={() => respond(review, "decline")}
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
