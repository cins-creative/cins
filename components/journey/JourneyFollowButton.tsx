"use client";

import { Check, Clock3, UserCheck, UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type FollowStatus = {
  dang_theo_doi: boolean;
  theo_doi_lai: boolean;
  duoc_theo_doi: boolean;
};

type Props = {
  targetUserId: string;
  /** Viewer profile id — null khi guest (nút ẩn / disabled). */
  viewerProfileId: string | null;
};

export function JourneyFollowButton({
  targetUserId,
  viewerProfileId,
}: Props) {
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!viewerProfileId) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      id_doi_tuong: targetUserId,
      loai_doi_tuong: "user",
    });

    void fetch(`/api/follow/status?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: FollowStatus | null) => {
        if (!cancelled && json) setStatus(json);
      });

    return () => {
      cancelled = true;
    };
  }, [targetUserId, viewerProfileId]);

  if (!viewerProfileId || viewerProfileId === targetUserId) {
    return null;
  }

  const following = status?.dang_theo_doi ?? false;
  const incoming = status?.duoc_theo_doi ?? false;
  const mutual = following && incoming;
  const outgoingPending = following && !incoming;
  const incomingPending = !following && incoming;

  useEffect(() => {
    if (!incomingPending) setMenuOpen(false);
  }, [incomingPending]);

  const sendFriendRequest = () => {
    setError(null);
    setMenuOpen(false);
    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_doi_tuong: targetUserId,
          loai_doi_tuong: "user",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Không thực hiện được.",
        );
        return;
      }
      setStatus(json as FollowStatus);
    });
  };

  const respondIncoming = (action: "accept" | "decline") => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/follow/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_nguoi_dung: targetUserId,
          action,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Không thực hiện được.",
        );
        return;
      }
      setStatus(
        action === "accept"
          ? { dang_theo_doi: true, theo_doi_lai: true, duoc_theo_doi: true }
          : { dang_theo_doi: false, theo_doi_lai: false, duoc_theo_doi: false },
      );
    });
  };

  const buttonState = mutual
    ? "friends"
    : outgoingPending || incomingPending
      ? "pending"
      : "idle";
  const label = mutual
    ? "Bạn bè"
    : outgoingPending
      ? "Chờ chấp nhận"
      : incomingPending
        ? "Chờ kết bạn"
        : "Kết bạn";
  const Icon = mutual
    ? UserCheck
    : outgoingPending || incomingPending
      ? Clock3
      : UserPlus;

  return (
    <div className="j-follow-wrap">
      <button
        type="button"
        className={`j-friend-btn is-${buttonState}`}
        title={label}
        aria-label={label}
        aria-haspopup={incomingPending ? "menu" : undefined}
        aria-expanded={incomingPending ? menuOpen : undefined}
        disabled={pending || status === null}
        onClick={
          incomingPending
            ? () => setMenuOpen((open) => !open)
            : mutual || outgoingPending
              ? undefined
              : sendFriendRequest
        }
      >
        <Icon size={15} strokeWidth={2} aria-hidden />
        {mutual ? null : <span>{label}</span>}
      </button>
      {incomingPending && menuOpen ? (
        <div
          className="j-friend-request-actions"
          role="menu"
          aria-label="Phản hồi lời mời kết bạn"
        >
          <button
            type="button"
            className="j-friend-action is-accept"
            disabled={pending}
            onClick={() => respondIncoming("accept")}
          >
            <Check size={13} strokeWidth={2} aria-hidden />
            Chấp nhận
          </button>
          <button
            type="button"
            className="j-friend-action is-decline"
            disabled={pending}
            onClick={() => respondIncoming("decline")}
          >
            <X size={13} strokeWidth={2} aria-hidden />
            Từ chối
          </button>
        </div>
      ) : null}
      {error ? (
        <span className="j-follow-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
