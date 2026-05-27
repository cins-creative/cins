"use client";

import { Plus, UserCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type FollowStatus = {
  dang_theo_doi: boolean;
  theo_doi_lai: boolean;
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
  const mutual = status?.theo_doi_lai ?? false;

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: following ? "DELETE" : "POST",
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

  return (
    <div className="j-follow-wrap">
      <button
        type="button"
        className={`j-btn-icon${following ? " is-following" : ""}`}
        title={following ? "Bỏ theo dõi" : "Theo dõi"}
        aria-label={following ? "Bỏ theo dõi" : "Theo dõi"}
        disabled={pending || status === null}
        onClick={toggle}
      >
        {following ? (
          <UserCheck size={16} strokeWidth={2} aria-hidden />
        ) : (
          <Plus size={16} strokeWidth={2} aria-hidden />
        )}
      </button>
      {mutual ? (
        <span className="j-follow-mutual">Theo dõi lẫn nhau</span>
      ) : null}
      {error ? (
        <span className="j-follow-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
