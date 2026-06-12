"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

type Props = {
  orgId: string;
  /** Quản trị viên cơ sở — hiện nút nhưng không bật theo dõi chính mình. */
  disabled?: boolean;
};

const AUTH_MESSAGE =
  "Đăng nhập hoặc tạo tài khoản CINs để theo dõi cơ sở đào tạo này.";

export function CoSoOrgFollowButton({ orgId, disabled = false }: Props) {
  const ctx = useTruongInlineEdit();
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
    if (disabled) {
      setLoaded(true);
      return;
    }
    refresh();
  }, [disabled, refresh]);

  function toggle() {
    if (disabled) return;
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id_doi_tuong: orgId,
          loai_doi_tuong: "org",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        dang_theo_doi?: boolean;
        error?: string;
      } | null;

      if (!res.ok) {
        ctx?.showToast(json?.error ?? "Không cập nhật được theo dõi.");
        return;
      }

      setFollowing(Boolean(json?.dang_theo_doi));
      ctx?.showToast(
        json?.dang_theo_doi ? "Đã theo dõi cơ sở" : "Đã bỏ theo dõi",
      );
    });
  }

  return (
    <button
      type="button"
      className={`cso-ss-btn-follow${following ? " is-following" : ""}`}
      aria-pressed={following}
      disabled={disabled || !loaded || pending}
      title={disabled ? "Bạn đang quản trị cơ sở này" : undefined}
      onClick={toggle}
    >
      {following ? (
        <UserCheck size={17} strokeWidth={2.2} aria-hidden />
      ) : (
        <UserPlus size={17} strokeWidth={2.2} aria-hidden />
      )}
      {following ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}
