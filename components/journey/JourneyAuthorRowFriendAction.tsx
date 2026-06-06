"use client";

import { Check, Clock3, UserCheck, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { emitNotificationsChanged } from "@/lib/journey/notifications-client";
import type { QuanHe } from "@/lib/social/types";

type Props = {
  targetUserId?: string;
  viewerProfileId?: string | null;
};

export function JourneyAuthorRowFriendAction({
  targetUserId,
  viewerProfileId,
}: Props) {
  const [quanHe, setQuanHe] = useState<QuanHe>("none");
  const [ketBanId, setKetBanId] = useState<string | null>(null);
  const [mutualCount, setMutualCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    if (!targetUserId || !viewerProfileId || viewerProfileId === targetUserId) {
      setLoaded(true);
      return;
    }
    const qs = new URLSearchParams({ id_nguoi: targetUserId });
    const statusRes = await fetch(`/api/ket-ban/status?${qs.toString()}`);
    if (!statusRes.ok) {
      setLoaded(true);
      return;
    }
    const statusJson = (await statusRes.json()) as {
      trang_thai?: QuanHe;
      ket_ban_id?: string | null;
    };
    const nextQuanHe = statusJson.trang_thai ?? "none";
    setQuanHe(nextQuanHe);
    setKetBanId(statusJson.ket_ban_id ?? null);

    if (nextQuanHe !== "accepted") {
      const mutualRes = await fetch(`/api/ket-ban/chung?${qs.toString()}`);
      if (mutualRes.ok) {
        const mutualJson = (await mutualRes.json()) as { count?: number };
        setMutualCount(mutualJson.count ?? 0);
      } else {
        setMutualCount(0);
      }
    } else {
      setMutualCount(0);
    }
    setLoaded(true);
  }, [targetUserId, viewerProfileId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  if (!targetUserId || !viewerProfileId || viewerProfileId === targetUserId) {
    return null;
  }

  if (!loaded) {
    return (
      <div className="author-row-friend-group">
        <span className="author-row-friend is-loading" aria-hidden />
      </div>
    );
  }

  if (quanHe === "blocked") {
    return null;
  }

  const sendFriendRequest = () => {
    startTransition(async () => {
      const res = await fetch("/api/ket-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_nguoi_nhan: targetUserId }),
      });
      if (!res.ok) return;
      await refresh();
      emitNotificationsChanged();
    });
  };

  const respondIncoming = (action: "accept" | "decline") => {
    if (!ketBanId) return;
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${ketBanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;
      await refresh();
      emitNotificationsChanged();
    });
  };

  const cancelSent = () => {
    if (!ketBanId) return;
    startTransition(async () => {
      const res = await fetch(`/api/ket-ban/${ketBanId}`, { method: "DELETE" });
      if (!res.ok) return;
      await refresh();
      emitNotificationsChanged();
    });
  };

  if (quanHe === "accepted") {
    return (
      <div className="author-row-friend-group">
        <span className="author-row-friend is-friends" title="Bạn bè" aria-label="Bạn bè">
          <UserCheck size={14} strokeWidth={2.2} aria-hidden />
        </span>
      </div>
    );
  }

  return (
    <div className="author-row-friend-group">
      {mutualCount > 0 ? (
        <span
          className="author-row-mutual"
          title={`${mutualCount} bạn chung`}
          aria-label={`${mutualCount} bạn chung`}
        >
          <Users size={13} strokeWidth={2} aria-hidden />
          <span>{mutualCount} bạn chung</span>
        </span>
      ) : null}

      {quanHe === "pending_received" ? (
        <>
          <button
            type="button"
            className="author-row-friend is-accept"
            title="Chấp nhận kết bạn"
            aria-label="Chấp nhận kết bạn"
            disabled={pending}
            onClick={() => respondIncoming("accept")}
          >
            <Check size={14} strokeWidth={2.4} aria-hidden />
          </button>
          <button
            type="button"
            className="author-row-friend is-decline"
            title="Từ chối"
            aria-label="Từ chối lời mời kết bạn"
            disabled={pending}
            onClick={() => respondIncoming("decline")}
          >
            <X size={13} strokeWidth={2.4} aria-hidden />
          </button>
        </>
      ) : quanHe === "pending_sent" ? (
        <button
          type="button"
          className="author-row-friend is-pending"
          title="Đã gửi lời mời — bấm để huỷ"
          aria-label="Đã gửi lời mời kết bạn"
          disabled={pending}
          onClick={cancelSent}
        >
          <Clock3 size={14} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className="author-row-friend is-add"
          title="Kết bạn"
          aria-label="Kết bạn"
          disabled={pending}
          onClick={sendFriendRequest}
        >
          <UserPlus size={14} strokeWidth={2.2} aria-hidden />
        </button>
      )}
    </div>
  );
}
