"use client";

import { Ban, Check, Clock3, UserCheck, UserMinus, UserPlus, X, Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useT } from "@/lib/i18n/use-t";
import { emitNotificationsChanged } from "@/lib/journey/notifications-client";
import {
  emitUserFollowChanged,
  USER_FOLLOW_CHANGED,
} from "@/lib/social/follow-client";
import type { KetBanStatusSummary, QuanHe } from "@/lib/social/types";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  status: KetBanStatusSummary | null;
  ready: boolean;
  refreshStatus: () => Promise<void>;
  compact?: boolean;
};

export function JourneyFollowButton({
  targetUserId,
  viewerProfileId,
  status,
  ready,
  refreshStatus,
  compact = false,
}: Props) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  const quanHe: QuanHe = status?.trang_thai ?? "none";
  const ketBanId = status?.ket_ban_id ?? null;
  const blockedByMe = status?.chan_boi_toi === true;

  const refreshFollowStatus = useCallback(() => {
    if (!viewerProfileId || viewerProfileId === targetUserId) return;
    const qs = new URLSearchParams({
      id_doi_tuong: targetUserId,
      loai_doi_tuong: "user",
    });
    void fetch(`/api/follow?${qs.toString()}`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { dang_theo_doi?: boolean } | null) => {
        if (json) setFollowing(Boolean(json.dang_theo_doi));
      })
      .catch(() => {});
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    if (quanHe !== "accepted") {
      queueMicrotask(() => setFollowing(null));
      return;
    }
    refreshFollowStatus();
  }, [quanHe, refreshFollowStatus]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ targetUserId?: string; following?: boolean }>)
        .detail;
      if (detail?.targetUserId !== targetUserId) return;
      if (typeof detail.following === "boolean") {
        setFollowing(detail.following);
      }
    };
    window.addEventListener(USER_FOLLOW_CHANGED, handler);
    return () => window.removeEventListener(USER_FOLLOW_CHANGED, handler);
  }, [targetUserId]);

  useEffect(() => {
    if (quanHe !== "pending_received" && quanHe !== "accepted") {
      queueMicrotask(() => setMenuOpen(false));
    }
  }, [quanHe]);

  if (!viewerProfileId || viewerProfileId === targetUserId) {
    return null;
  }

  const unblock = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/friends/${targetUserId}/block`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Không bỏ chặn được.",
        );
        return;
      }
      await refreshStatus();
      emitNotificationsChanged();
    });
  };

  if (quanHe === "blocked") {
    // Bên kia chặn viewer → chỉ hiện chỉ báo tĩnh (không bỏ chặn được).
    if (!blockedByMe) {
      return (
        <span
          className="j-follow-blocked is-icon"
          title="Đã chặn"
          aria-label="Đã chặn"
        >
          <Ban size={17} strokeWidth={2} aria-hidden />
        </span>
      );
    }
    return (
      <div className="j-follow-wrap">
        <button
          type="button"
          className="j-friend-btn is-blocked is-compact"
          title={pending ? "Đang bỏ chặn…" : "Bỏ chặn"}
          aria-label={pending ? "Đang bỏ chặn…" : "Bỏ chặn"}
          disabled={pending || !ready}
          onClick={unblock}
        >
          <Ban size={17} strokeWidth={2} aria-hidden />
        </button>
        {error ? (
          <span className="j-follow-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  const sendFriendRequest = () => {
    setError(null);
    setNotice(null);
    setMenuOpen(false);
    startTransition(async () => {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_nguoi_nhan: targetUserId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Không thực hiện được.",
        );
        return;
      }
      emitUserFollowChanged(targetUserId, true);
      await refreshStatus();
      emitNotificationsChanged();
    });
  };

  const respondIncoming = (action: "accept" | "decline") => {
    if (!ketBanId) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/friends/${ketBanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Không thực hiện được.",
        );
        return;
      }
      if (action === "accept") {
        emitUserFollowChanged(targetUserId, true);
      }
      await refreshStatus();
      emitNotificationsChanged();
    });
  };

  const toggleFollow = () => {
    setError(null);
    startTransition(async () => {
      const isFollowing = following === true;
      const res = await fetch("/api/follow", {
        method: isFollowing ? "DELETE" : "POST",
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
      const next = Boolean(json?.dang_theo_doi);
      setFollowing(next);
      emitUserFollowChanged(targetUserId, next);
    });
  };

  const cancelOrUnfriend = () => {
    if (!ketBanId) return;
    setError(null);
    setNotice(null);
    setUnfriending(true);
    startTransition(async () => {
      const res = await fetch(`/api/friends/${ketBanId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnfriending(false);
        setError(
          typeof json.error === "string" ? json.error : "Không hủy kết bạn được.",
        );
        return;
      }
      await refreshStatus();
      setMenuOpen(false);
      setUnfriending(false);
      setNotice(
        quanHe === "accepted" ? t("social.unfriended") : t("social.inviteCancelled"),
      );
      window.setTimeout(() => setNotice(null), 1800);
      emitNotificationsChanged();
    });
  };

  const buttonState =
    quanHe === "accepted"
      ? "friends"
      : quanHe === "pending_sent" || quanHe === "pending_received"
        ? "pending"
        : "idle";

  const label =
    quanHe === "accepted"
      ? t("social.friends")
      : quanHe === "pending_sent"
        ? t("social.inviteSent")
        : quanHe === "pending_received"
          ? t("social.acceptInvite")
          : t("social.friend");

  const Icon =
    quanHe === "accepted"
      ? UserCheck
      : quanHe === "pending_sent" || quanHe === "pending_received"
        ? Clock3
        : UserPlus;

  return (
    <div className="j-follow-wrap">
      <button
        type="button"
        className={`j-friend-btn is-${buttonState}${compact ? " is-compact" : ""}`}
        title={label}
        aria-label={label}
        aria-haspopup={
          quanHe === "pending_received" || quanHe === "accepted" || quanHe === "pending_sent"
            ? "menu"
            : undefined
        }
        aria-expanded={
          quanHe === "pending_received" || quanHe === "accepted" || quanHe === "pending_sent"
            ? menuOpen
            : undefined
        }
        disabled={(pending && !menuOpen) || !ready}
        onClick={
          quanHe === "pending_received" || quanHe === "accepted" || quanHe === "pending_sent"
            ? () => setMenuOpen((open) => !open)
            : sendFriendRequest
        }
      >
        <Icon size={17} strokeWidth={2} aria-hidden />
        {compact ? null : <span className="j-friend-btn-label">{label}</span>}
      </button>
      {(quanHe === "pending_received" ||
        quanHe === "accepted" ||
        quanHe === "pending_sent") &&
      menuOpen ? (
        <div
          className="j-friend-request-actions"
          role="menu"
          aria-label={
            quanHe === "accepted"
              ? t("social.friendOptions")
              : quanHe === "pending_sent"
                ? t("social.cancelInvite")
                : t("social.respondInvite")
          }
        >
          {quanHe === "accepted" ? (
            <>
              <button
                type="button"
                className="j-friend-action is-follow-toggle"
                disabled={pending || following === null}
                onClick={toggleFollow}
              >
                {following ? (
                  <BellOff size={13} strokeWidth={2} aria-hidden />
                ) : (
                  <Bell size={13} strokeWidth={2} aria-hidden />
                )}
                {following ? t("social.unfollow") : t("social.follow")}
              </button>
              <button
                type="button"
                className="j-friend-action is-unfriend"
                disabled={unfriending}
                onClick={cancelOrUnfriend}
              >
                <UserMinus size={13} strokeWidth={2} aria-hidden />
                {unfriending ? t("social.unfriending") : t("social.unfriend")}
              </button>
            </>
          ) : quanHe === "pending_sent" ? (
            <button
              type="button"
              className="j-friend-action is-decline"
              disabled={pending}
              onClick={cancelOrUnfriend}
            >
              <X size={13} strokeWidth={2} aria-hidden />
              {t("social.cancelInvite")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="j-friend-action is-accept"
                disabled={pending}
                onClick={() => respondIncoming("accept")}
              >
                <Check size={13} strokeWidth={2} aria-hidden />
                {t("social.accept")}
              </button>
              <button
                type="button"
                className="j-friend-action is-decline"
                disabled={pending}
                onClick={() => respondIncoming("decline")}
              >
                <X size={13} strokeWidth={2} aria-hidden />
                {t("social.decline")}
              </button>
            </>
          )}
        </div>
      ) : null}
      {error ? (
        <span className="j-follow-error" role="alert">
          {error}
        </span>
      ) : null}
      {notice ? (
        <span className="j-follow-notice" role="status">
          {notice}
        </span>
      ) : null}
    </div>
  );
}
