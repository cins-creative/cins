"use client";

import { Bell, BellPlus, Check, Clock3, UserCheck, UserPlus, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { emitNotificationsChanged } from "@/lib/journey/notifications-client";
import { emitUserFollowChanged } from "@/lib/social/follow-client";
import type { SocialActorProfile } from "@/lib/social/actors-types";
import type { QuanHe } from "@/lib/social/types";
import { useRouter } from "next/navigation";

type Props = {
  actor: SocialActorProfile;
  viewerId: string | null;
};

export function JourneySocialActorActions({ actor, viewerId }: Props) {
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const isAuthenticated = authGate?.isAuthenticated ?? false;
  const [quanHe, setQuanHe] = useState<QuanHe>(actor.quanHe);
  const [ketBanId, setKetBanId] = useState<string | null>(actor.ketBanId);
  const [following, setFollowing] = useState(actor.dangTheoDoi);
  const [pending, startTransition] = useTransition();

  const isSelf = !viewerId || viewerId === actor.idNguoiDung;

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }
      if (authGate) {
        authGate.openAuthModal("Đăng nhập để kết nối với người này trên CINs.");
      } else {
        router.push("/login");
      }
    },
    [authGate, isAuthenticated, router],
  );

  if (isSelf || quanHe === "blocked") {
    return null;
  }

  const sendFriendRequest = () => {
    requireAuth(() => {
      startTransition(async () => {
        const res = await fetch("/api/ket-ban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_nguoi_nhan: actor.idNguoiDung }),
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          ket_ban_id?: string;
        } | null;
        setQuanHe("pending_sent");
        setKetBanId(json?.ket_ban_id ?? ketBanId);
        setFollowing(true);
        emitUserFollowChanged(actor.idNguoiDung, true);
        emitNotificationsChanged();
      });
    });
  };

  const respondIncoming = (action: "accept" | "decline") => {
    if (!ketBanId) return;
    requireAuth(() => {
      startTransition(async () => {
        const res = await fetch(`/api/ket-ban/${ketBanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) return;
        setQuanHe(action === "accept" ? "accepted" : "none");
        if (action === "decline") setKetBanId(null);
        if (action === "accept") {
          setFollowing(true);
          emitUserFollowChanged(actor.idNguoiDung, true);
        }
        emitNotificationsChanged();
      });
    });
  };

  const cancelSent = () => {
    if (!ketBanId) return;
    requireAuth(() => {
      startTransition(async () => {
        const res = await fetch(`/api/ket-ban/${ketBanId}`, { method: "DELETE" });
        if (!res.ok) return;
        setQuanHe("none");
        setKetBanId(null);
        emitNotificationsChanged();
      });
    });
  };

  const toggleFollow = () => {
    requireAuth(() => {
      startTransition(async () => {
        const res = await fetch("/api/follow", {
          method: following ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            id_doi_tuong: actor.idNguoiDung,
            loai_doi_tuong: "user",
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          dang_theo_doi?: boolean;
        } | null;
        if (!res.ok) return;
        setFollowing(Boolean(json?.dang_theo_doi));
        emitUserFollowChanged(actor.idNguoiDung, Boolean(json?.dang_theo_doi));
      });
    });
  };

  const followLabel = following ? "Đang theo dõi" : "Theo dõi";

  return (
    <div className="jsa-actions" onClick={(e) => e.stopPropagation()}>
      {quanHe === "accepted" ? (
        <span className="jsa-act is-friends" title="Bạn bè" aria-label="Bạn bè">
          <UserCheck size={15} strokeWidth={2.2} aria-hidden />
        </span>
      ) : quanHe === "pending_received" ? (
        <>
          <button
            type="button"
            className="jsa-act is-accept"
            title="Chấp nhận kết bạn"
            aria-label="Chấp nhận kết bạn"
            disabled={pending}
            onClick={() => respondIncoming("accept")}
          >
            <Check size={15} strokeWidth={2.4} aria-hidden />
          </button>
          <button
            type="button"
            className="jsa-act is-decline"
            title="Từ chối"
            aria-label="Từ chối lời mời kết bạn"
            disabled={pending}
            onClick={() => respondIncoming("decline")}
          >
            <X size={14} strokeWidth={2.4} aria-hidden />
          </button>
        </>
      ) : quanHe === "pending_sent" ? (
        <button
          type="button"
          className="jsa-act is-pending"
          title="Đã gửi lời mời — bấm để huỷ"
          aria-label="Huỷ lời mời kết bạn"
          disabled={pending}
          onClick={cancelSent}
        >
          <Clock3 size={15} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className="jsa-act is-add-friend"
          title="Kết bạn"
          aria-label="Kết bạn"
          disabled={pending}
          onClick={sendFriendRequest}
        >
          <UserPlus size={15} strokeWidth={2.2} aria-hidden />
        </button>
      )}

      {quanHe !== "accepted" ? (
        <button
          type="button"
          className={`jsa-act is-follow${following ? " is-following" : ""}`}
          title={followLabel}
          aria-label={followLabel}
          aria-pressed={following}
          disabled={pending}
          onClick={toggleFollow}
        >
          {following ? (
            <Bell size={15} strokeWidth={2} aria-hidden />
          ) : (
            <BellPlus size={15} strokeWidth={2} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
