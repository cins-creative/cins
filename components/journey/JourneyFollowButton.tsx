"use client";

import { Check, Clock3, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { emitNotificationsChanged } from "@/lib/journey/notifications-client";
import type { KetBanStatusSummary, QuanHe } from "@/lib/social/types";

type Props = {
  targetUserId: string;
  viewerProfileId: string | null;
  status: KetBanStatusSummary | null;
  ready: boolean;
  refreshStatus: () => Promise<void>;
};

export function JourneyFollowButton({
  targetUserId,
  viewerProfileId,
  status,
  ready,
  refreshStatus,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [pending, startTransition] = useTransition();

  const quanHe: QuanHe = status?.trang_thai ?? "none";
  const ketBanId = status?.ket_ban_id ?? null;

  useEffect(() => {
    if (quanHe !== "pending_received" && quanHe !== "accepted") {
      queueMicrotask(() => setMenuOpen(false));
    }
  }, [quanHe]);

  if (!viewerProfileId || viewerProfileId === targetUserId) {
    return null;
  }

  if (quanHe === "blocked") {
    return (
      <span className="j-follow-blocked" aria-label="Đã chặn">
        Đã chặn
      </span>
    );
  }

  const sendFriendRequest = () => {
    setError(null);
    setNotice(null);
    setMenuOpen(false);
    startTransition(async () => {
      const res = await fetch("/api/ket-ban", {
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
      await refreshStatus();
      emitNotificationsChanged();
    });
  };

  const respondIncoming = (action: "accept" | "decline") => {
    if (!ketBanId) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${ketBanId}`, {
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
      await refreshStatus();
      emitNotificationsChanged();
    });
  };

  const cancelOrUnfriend = () => {
    if (!ketBanId) return;
    setError(null);
    setNotice(null);
    setUnfriending(true);
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${ketBanId}`, { method: "DELETE" });
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
      setNotice(quanHe === "accepted" ? "Đã hủy kết bạn" : "Đã huỷ lời mời");
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
      ? "Bạn bè"
      : quanHe === "pending_sent"
        ? "Đã gửi lời mời"
        : quanHe === "pending_received"
          ? "Chấp nhận lời mời"
          : "Kết bạn";

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
        className={`j-friend-btn is-${buttonState}`}
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
        <Icon size={15} strokeWidth={2} aria-hidden />
        <span className="j-friend-btn-label">{label}</span>
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
              ? "Tuỳ chọn bạn bè"
              : quanHe === "pending_sent"
                ? "Huỷ lời mời"
                : "Phản hồi lời mời kết bạn"
          }
        >
          {quanHe === "accepted" ? (
            <button
              type="button"
              className="j-friend-action is-unfriend"
              disabled={unfriending}
              onClick={cancelOrUnfriend}
            >
              <UserMinus size={13} strokeWidth={2} aria-hidden />
              {unfriending ? "Đang hủy..." : "Hủy kết bạn"}
            </button>
          ) : quanHe === "pending_sent" ? (
            <button
              type="button"
              className="j-friend-action is-decline"
              disabled={pending}
              onClick={cancelOrUnfriend}
            >
              <X size={13} strokeWidth={2} aria-hidden />
              Huỷ lời mời
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
