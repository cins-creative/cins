"use client";

import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import type { ChatGroupInvitePreview } from "@/lib/chat/types";

type Props = {
  maMoi: string;
  initialPreview: ChatGroupInvitePreview;
  isLoggedIn: boolean;
};

export function ChatGroupInviteClient({
  maMoi,
  initialPreview,
  isLoggedIn,
}: Props) {
  const chat = useCinsChatContext();
  const [preview, setPreview] = useState(initialPreview);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requestJoin = useCallback(() => {
    if (!isLoggedIn || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/invites/${encodeURIComponent(maMoi)}`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as {
        preview?: ChatGroupInvitePreview;
        error?: string;
      } | null;
      if (!res.ok || !json?.preview) {
        setError(json?.error ?? "Không gửi được yêu cầu.");
        return;
      }
      setPreview(json.preview);
    });
  }, [isLoggedIn, maMoi, pending]);

  const openRoom = useCallback(() => {
    if (!chat || !preview.alreadyMember) return;
    void chat.openChat({ roomId: preview.roomId, tab: "ban_be" });
  }, [chat, preview.alreadyMember, preview.roomId]);

  return (
    <div className="cins-chat-invite-card">
      <span className="cins-chat-invite-icon" aria-hidden>
        {preview.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview.avatarUrl} alt="" />
        ) : (
          <Users size={28} strokeWidth={1.7} />
        )}
      </span>
      <h1>{preview.tenPhong}</h1>
      <p>{preview.memberCount} thành viên · nhóm bạn bè trên CINs</p>

      {error ? <p className="cins-chat-invite-error">{error}</p> : null}
      {preview.reason && !error ? (
        <p className="cins-chat-invite-status">{preview.reason}</p>
      ) : null}

      <div className="cins-chat-invite-actions">
        {!isLoggedIn ? (
          <Link
            href={`/login?next=${encodeURIComponent(`/chat/nhom/moi/${maMoi}`)}`}
            className="cins-chat-invite-primary"
          >
            Đăng nhập để xin gia nhập
          </Link>
        ) : preview.alreadyMember ? (
          <button
            type="button"
            className="cins-chat-invite-primary"
            onClick={openRoom}
          >
            Mở nhóm chat
          </button>
        ) : preview.canRequest ? (
          <button
            type="button"
            className="cins-chat-invite-primary"
            disabled={pending}
            onClick={requestJoin}
          >
            {pending ? <Loader2 size={16} className="spin" /> : null}
            Xin gia nhập
          </button>
        ) : null}
        <Link href="/" className="cins-chat-invite-home">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
