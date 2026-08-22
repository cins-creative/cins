"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { ChatGroupAvatar } from "@/components/cins/ChatGroupAvatar";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { avatarHueFromSeed, avatarInitialFromName } from "@/lib/chat/avatar";
import type { ChatGroupInvitePreview, ChatThread } from "@/lib/chat/types";

type Variant = "page" | "modal";

type Props = {
  maMoi: string;
  initialPreview: ChatGroupInvitePreview;
  isLoggedIn: boolean;
  variant?: Variant;
  onClose?: () => void;
};

function threadFromPreview(preview: ChatGroupInvitePreview): ChatThread {
  return {
    id: preview.roomId,
    roomId: preview.roomId,
    name: preview.tenPhong,
    group: "ban_be",
    kind: "user",
    isGroup: true,
    memberCount: preview.memberCount,
    memberAvatars: preview.friendAvatars ?? [],
    role: `${preview.memberCount} thành viên`,
    avatarInitial: avatarInitialFromName(preview.tenPhong),
    avatarHue: avatarHueFromSeed(preview.roomId),
    avatarUrl: preview.avatarUrl,
    preview: "",
    lastAt: new Date().toISOString(),
    unread: 0,
    messages: [],
  };
}

export function ChatGroupInviteClient({
  maMoi,
  initialPreview,
  isLoggedIn,
  variant = "page",
  onClose,
}: Props) {
  const chat = useCinsChatContext();
  const titleId = useId();
  const [preview, setPreview] = useState(initialPreview);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isModal = variant === "modal";

  useEffect(() => {
    setPreview(initialPreview);
  }, [initialPreview]);

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
    if (!preview.alreadyMember) return;
    onClose?.();
    if (chat) {
      void chat.openChat({
        roomId: preview.roomId,
        tab: "ban_be",
        thread: threadFromPreview(preview),
      });
    }
  }, [chat, onClose, preview]);

  return (
    <div
      className="cins-chat-invite-card"
      role={isModal ? "dialog" : undefined}
      aria-modal={isModal ? true : undefined}
      aria-labelledby={titleId}
    >
      <ChatGroupAvatar
        size={72}
        className="cins-chat-invite-avatar"
        avatarUrl={preview.avatarUrl}
        members={preview.friendAvatars ?? []}
      />
      <h1 id={titleId}>{preview.tenPhong}</h1>
      <p>{preview.memberCount} thành viên · nhóm bạn bè trên CINs</p>

      {error ? <p className="cins-chat-invite-error">{error}</p> : null}
      {preview.reason && !error ? (
        <p className="cins-chat-invite-status">{preview.reason}</p>
      ) : null}

      <div className="cins-chat-invite-actions">
        {!isLoggedIn ? (
          <Link
            href={`/login?next=${encodeURIComponent(`/chat/groups/invite/${maMoi}`)}`}
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
        {isModal ? (
          <button
            type="button"
            className="cins-chat-invite-home"
            onClick={onClose}
          >
            Đóng
          </button>
        ) : (
          <Link href="/" className="cins-chat-invite-home">
            Về trang chủ
          </Link>
        )}
      </div>
    </div>
  );
}

type DialogProps = {
  maMoi: string;
  open: boolean;
  onClose: () => void;
};

export function ChatGroupInviteDialog({ maMoi, open, onClose }: DialogProps) {
  const chat = useCinsChatContext();
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<ChatGroupInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !maMoi) return;
    let cancelled = false;
    setError(null);
    setLoading(true);

    void fetch(`/api/chat/invites/${encodeURIComponent(maMoi)}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as {
          preview?: ChatGroupInvitePreview;
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.preview) {
          setPreview(null);
          setError(json?.error ?? "Không tải được lời mời.");
          return;
        }
        setPreview(json.preview);
      })
      .catch(() => {
        if (cancelled) return;
        setPreview(null);
        setError("Không tải được lời mời.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [maMoi, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="cins-chat-invite-modal-root"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="cins-chat-invite-modal-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      {preview ? (
        <ChatGroupInviteClient
          maMoi={maMoi}
          initialPreview={preview}
          isLoggedIn={Boolean(chat?.viewerProfileId)}
          variant="modal"
          onClose={onClose}
        />
      ) : (
        <div className="cins-chat-invite-card" role="dialog" aria-modal="true">
          {loading ? (
            <Loader2 size={28} className="spin" aria-hidden />
          ) : null}
          <p className={error ? "cins-chat-invite-error" : undefined}>
            {error ?? "Đang tải lời mời…"}
          </p>
          <button
            type="button"
            className="cins-chat-invite-home"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
