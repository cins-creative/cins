"use client";

import { Bell, BellPlus } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";

type Props = {
  orgId: string;
  compact?: boolean;
};

const AUTH_MESSAGE = "Đăng nhập để theo dõi tổ chức này trên CINs.";

/**
 * Nút theo dõi tổ chức dùng trong module trang chủ (`goi_y_theo_doi`).
 * Tự chứa — chỉ phụ thuộc `useAuthGate`, gọi API `/api/follow` loại `org`.
 */
export function OrgFollowButton({ orgId, compact = false }: Props) {
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    const qs = new URLSearchParams({
      id_doi_tuong: orgId,
      loai_doi_tuong: "org",
    });
    void fetch(`/api/follow?${qs.toString()}`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { dang_theo_doi?: boolean } | null) => {
        if (json) setFollowing(Boolean(json.dang_theo_doi));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const label = following ? "Đang theo dõi" : "Theo dõi";

  function toggle() {
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id_doi_tuong: orgId, loai_doi_tuong: "org" }),
      });
      const json = (await res.json().catch(() => null)) as {
        dang_theo_doi?: boolean;
      } | null;
      if (res.ok) setFollowing(Boolean(json?.dang_theo_doi));
    });
  }

  return (
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
        <Bell size={17} strokeWidth={2} aria-hidden />
      ) : (
        <BellPlus size={17} strokeWidth={2} aria-hidden />
      )}
      {compact ? null : <span className="j-friend-btn-label">{label}</span>}
    </button>
  );
}
