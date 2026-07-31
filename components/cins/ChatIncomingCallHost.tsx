"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { mediaCallLabel, type MediaCallMode } from "@/lib/media/call-mode";
import {
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from "@/lib/media/play-incoming-call-ringtone";
import "@/components/media/incoming-call.css";

const RING_TIMEOUT_MS = 45_000;

export type IncomingCallOffer = {
  roomId: string;
  callMessageId: string;
  mode: MediaCallMode;
  callerName: string;
  title: string;
};

export type PendingPhongHocStart = {
  roomId: string;
  token: string;
  mode: MediaCallMode;
  callMessageId: string;
  title: string;
};

const PENDING_EVENT = "cins:phong-hoc-pending";

let pendingJoin: PendingPhongHocStart | null = null;

export function dispatchPendingPhongHoc(detail: PendingPhongHocStart): void {
  pendingJoin = detail;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PENDING_EVENT, { detail }));
}

export function takePendingPhongHoc(
  roomId: string,
): PendingPhongHocStart | null {
  if (!pendingJoin || pendingJoin.roomId !== roomId) return null;
  const next = pendingJoin;
  pendingJoin = null;
  return next;
}

export function subscribePendingPhongHoc(
  handler: (detail: PendingPhongHocStart) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const onEvent = (ev: Event) => {
    const detail = (ev as CustomEvent<PendingPhongHocStart>).detail;
    if (detail?.token && detail.roomId) handler(detail);
  };
  window.addEventListener(PENDING_EVENT, onEvent);
  return () => window.removeEventListener(PENDING_EVENT, onEvent);
}

export function ChatIncomingCallHost() {
  const { subscribeChatMessages, viewerProfileId, openChat, isRoomMuted } =
    useCinsChat();
  const [offer, setOffer] = useState<IncomingCallOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const offerRef = useRef<IncomingCallOffer | null>(null);
  offerRef.current = offer;

  const clearOffer = useCallback((stopSound = true) => {
    setOffer(null);
    if (stopSound) stopIncomingCallRingtone();
  }, []);

  useEffect(() => {
    return subscribeChatMessages((event) => {
      const cg = event.message.cuocGoi;
      if (!cg || !viewerProfileId) return;

      if (cg.trangThai === "dang_goi" && event.senderId !== viewerProfileId) {
        const next: IncomingCallOffer = {
          roomId: event.roomId,
          callMessageId: event.message.id,
          mode: cg.mode,
          callerName: cg.tenNguoiGoi,
          title: cg.tenNguoiGoi,
        };
        setOffer(next);
        startIncomingCallRingtone({ muted: isRoomMuted(event.roomId) });
        return;
      }

      const current = offerRef.current;
      if (
        current &&
        current.callMessageId === event.message.id &&
        cg.trangThai !== "dang_goi"
      ) {
        clearOffer(true);
      }
    });
  }, [subscribeChatMessages, viewerProfileId, isRoomMuted, clearOffer]);

  useEffect(() => {
    if (!offer) return;
    const id = window.setTimeout(() => {
      const cur = offerRef.current;
      if (!cur) return;
      void fetch(
        `/api/chat/rooms/${encodeURIComponent(cur.roomId)}/phong-hoc/signal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callMessageId: cur.callMessageId,
            action: "miss",
          }),
        },
      ).catch(() => {});
      clearOffer(true);
    }, RING_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [offer, clearOffer]);

  useEffect(() => {
    return () => stopIncomingCallRingtone();
  }, []);

  async function decline() {
    const cur = offerRef.current;
    if (!cur || busy) return;
    setBusy(true);
    try {
      await fetch(
        `/api/chat/rooms/${encodeURIComponent(cur.roomId)}/phong-hoc/signal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callMessageId: cur.callMessageId,
            action: "decline",
          }),
        },
      );
    } catch {
      /* ignore */
    } finally {
      clearOffer(true);
      setBusy(false);
    }
  }

  async function accept() {
    const cur = offerRef.current;
    if (!cur || busy) return;
    setBusy(true);
    stopIncomingCallRingtone();
    try {
      const res = await fetch(
        `/api/chat/rooms/${encodeURIComponent(cur.roomId)}/phong-hoc/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: cur.mode,
            action: "join",
            callMessageId: cur.callMessageId,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        token?: string;
        error?: string;
        callMessageId?: string;
      } | null;
      if (!res.ok || !json?.token) {
        clearOffer(true);
        return;
      }
      const pending: PendingPhongHocStart = {
        roomId: cur.roomId,
        token: json.token,
        mode: cur.mode,
        callMessageId: json.callMessageId || cur.callMessageId,
        title: cur.title,
      };
      dispatchPendingPhongHoc(pending);
      clearOffer(false);
      await openChat({ roomId: cur.roomId });
      // Overlay có thể hydrate sau — phát lại nếu chưa nhận.
      window.setTimeout(() => {
        dispatchPendingPhongHoc(pending);
      }, 150);
    } catch {
      clearOffer(true);
    } finally {
      setBusy(false);
    }
  }

  if (!offer) return null;

  const label = mediaCallLabel(offer.mode);

  return (
    <div className="cins-incoming-call" role="dialog" aria-label="Cuộc gọi đến">
      <div className="cins-incoming-call-card">
        <div className="cins-incoming-call-pulse" aria-hidden />
        <p className="cins-incoming-call-eyebrow">{label} đến</p>
        <p className="cins-incoming-call-name">{offer.callerName}</p>
        <div className="cins-incoming-call-actions">
          <button
            type="button"
            className="cins-incoming-call-btn is-decline"
            disabled={busy}
            onClick={() => void decline()}
          >
            <PhoneOff size={20} strokeWidth={1.9} />
            <span>Từ chối</span>
          </button>
          <button
            type="button"
            className="cins-incoming-call-btn is-accept"
            disabled={busy}
            onClick={() => void accept()}
          >
            {offer.mode === "video" ? (
              <Video size={20} strokeWidth={1.9} />
            ) : (
              <Phone size={20} strokeWidth={1.9} />
            )}
            <span>Trả lời</span>
          </button>
        </div>
      </div>
    </div>
  );
}
