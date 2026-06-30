"use client";

import { Check, Rss } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  compact?: boolean;
};

const AUTH_MESSAGE = "Đăng nhập để theo dõi người này trên CINs.";

export function JourneyUserFollowButton({
  targetUserId,
  viewerProfileId,
  compact = false,
}: Props) {
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isSelf = viewerProfileId === targetUserId;

  const refresh = useCallback(() => {
    if (!viewerProfileId || isSelf) {
      setLoaded(true);
      return;
    }

    const qs = new URLSearchParams({
      id_doi_tuong: targetUserId,
      loai_doi_tuong: "user",
    });
    void fetch(`/api/follow?${qs.toString()}`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { dang_theo_doi?: boolean } | null) => {
        if (json) setFollowing(Boolean(json.dang_theo_doi));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isSelf, targetUserId, viewerProfileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!viewerProfileId || isSelf) return null;

  const label = following ? "Đang theo dõi" : "Theo dõi";

  function toggle() {
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id_doi_tuong: targetUserId,
          loai_doi_tuong: "user",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        dang_theo_doi?: boolean;
        error?: string;
      } | null;

      if (!res.ok) {
        setError(json?.error ?? "Không cập nhật được theo dõi.");
        return;
      }

      setFollowing(Boolean(json?.dang_theo_doi));
    });
  }

  return (
    <div className="j-follow-wrap">
      <button
        type="button"
        className={`j-friend-btn j-user-follow-btn${following ? " is-friends" : " is-idle"}${compact ? " is-compact" : ""}`}
        aria-pressed={following}
        aria-label={label}
        title={label}
        disabled={!loaded || pending}
        onClick={toggle}
      >
        {following ? (
          <Check size={17} strokeWidth={2} aria-hidden />
        ) : (
          <Rss size={17} strokeWidth={2} aria-hidden />
        )}
        {compact ? null : <span className="j-friend-btn-label">{label}</span>}
      </button>
      {error ? (
        <span className="j-follow-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
