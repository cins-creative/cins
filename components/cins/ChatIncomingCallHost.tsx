"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff, Video } from "lucide-react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { mediaCallLabel, type MediaCallMode } from "@/lib/media/call-mode";
import {
  beginCallTrace,
  callTraceAttachServerTiming,
  callTraceMark,
  callTraceRingSeen,
} from "@/lib/media/call-trace";
import { isCuocGoiJoinTokenFresh } from "@/lib/media/call-signal-types";
import {
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from "@/lib/media/play-incoming-call-ringtone";
import { warmCallMedia } from "@/lib/media/media-warm";
import "@/components/media/incoming-call.css";

const PhongHocMeeting = dynamic(
  () =>
    import("@/components/media/PhongHocMeeting").then((m) => m.PhongHocMeeting),
  { ssr: false },
);

const RING_TIMEOUT_MS = 45_000;
/** Poll dự phòng — Realtime là đường chính (subscribe từ app start). */
const POLL_MS = 5000;

export type IncomingCallOffer = {
  roomId: string;
  callMessageId: string;
  mode: MediaCallMode;
  callerName: string;
  title: string;
  batDau?: string | null;
  ringSource?: "realtime" | "poll";
  joinToken?: string | null;
  joinTokenExp?: string | null;
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
/** Tránh log RING_SEEN trùng (realtime + poll). */
const ringSeenTraceIds = new Set<string>();

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

type ActiveCall = {
  roomId: string;
  token: string;
  mode: MediaCallMode;
  callMessageId: string;
  title: string;
};

export function ChatIncomingCallHost() {
  const { subscribeChatMessages, viewerProfileId, isRoomMuted } = useCinsChat();
  const [offer, setOffer] = useState<IncomingCallOffer | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const offerRef = useRef<IncomingCallOffer | null>(null);
  offerRef.current = offer;

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearOffer = useCallback((stopSound = true) => {
    setOffer(null);
    if (stopSound) stopIncomingCallRingtone();
  }, []);

  const applyIncoming = useCallback(
    (next: IncomingCallOffer) => {
      if (activeCall) return;
      setOffer((prev) => {
        if (prev?.callMessageId === next.callMessageId) return prev;
        return next;
      });
      if (!ringSeenTraceIds.has(next.callMessageId)) {
        ringSeenTraceIds.add(next.callMessageId);
        callTraceRingSeen({
          callMessageId: next.callMessageId,
          batDau: next.batDau,
          source: next.ringSource ?? "realtime",
        });
      }
      startIncomingCallRingtone({ muted: isRoomMuted(next.roomId) });
    },
    [activeCall, isRoomMuted],
  );

  useEffect(() => {
    return subscribeChatMessages((event) => {
      const cg = event.message.cuocGoi;
      if (!cg || !viewerProfileId) return;

      if (cg.trangThai === "dang_goi" && event.senderId !== viewerProfileId) {
        applyIncoming({
          roomId: event.roomId,
          callMessageId: event.message.id,
          mode: cg.mode,
          callerName: cg.tenNguoiGoi,
          title: cg.tenNguoiGoi,
          batDau: cg.batDau,
          ringSource: "realtime",
          joinToken: cg.joinToken,
          joinTokenExp: cg.joinTokenExp,
        });
        void warmCallMedia({ video: cg.mode === "video" });
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
  }, [subscribeChatMessages, viewerProfileId, applyIncoming, clearOffer]);

  /* Poll dự phòng — Realtime đôi khi trễ / không đẩy khi không mở đúng phòng. */
  useEffect(() => {
    if (!viewerProfileId || activeCall) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/chat/calls/incoming", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          calls?: Array<{
            roomId: string;
            callMessageId: string;
            mode: MediaCallMode;
            callerName: string;
            batDau?: string;
            joinToken?: string | null;
            joinTokenExp?: string | null;
          }>;
        };
        const first = json.calls?.[0];
        if (!first || cancelled) return;
        applyIncoming({
          roomId: first.roomId,
          callMessageId: first.callMessageId,
          mode: first.mode,
          callerName: first.callerName,
          title: first.callerName,
          batDau: first.batDau,
          ringSource: "poll",
          joinToken: first.joinToken,
          joinTokenExp: first.joinTokenExp,
        });
        void warmCallMedia({ video: first.mode === "video" });
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [viewerProfileId, activeCall, applyIncoming]);

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
    beginCallTrace("callee", {
      roomId: cur.roomId,
      mode: cur.mode,
      callMessageId: cur.callMessageId,
      via: "incoming-accept",
    });

    const embeddedFresh = isCuocGoiJoinTokenFresh({
      trangThai: "dang_goi",
      joinToken: cur.joinToken,
      joinTokenExp: cur.joinTokenExp,
    });

    /* Mở UI + camera ngay. */
    const shell: PendingPhongHocStart = {
      roomId: cur.roomId,
      token: embeddedFresh ? cur.joinToken! : "",
      mode: cur.mode,
      callMessageId: cur.callMessageId,
      title: cur.title,
    };
    setActiveCall(shell);
    dispatchPendingPhongHoc(shell);
    clearOffer(false);

    try {
      if (embeddedFresh) {
        callTraceMark("T0b", { embeddedToken: true });
        /* Cập nhật trạng thái nền — không chặn vào phòng. */
        void fetch(
          `/api/chat/rooms/${encodeURIComponent(cur.roomId)}/phong-hoc/signal`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callMessageId: cur.callMessageId,
              action: "accept",
            }),
          },
        ).catch(() => {});
        return;
      }

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
      callTraceAttachServerTiming(res.headers.get("Server-Timing"));
      callTraceMark("T0b", { status: res.status, embeddedToken: false });
      const json = (await res.json().catch(() => null)) as {
        token?: string;
        error?: string;
        callMessageId?: string;
      } | null;
      if (!res.ok || !json?.token) {
        setActiveCall(null);
        return;
      }
      const ready: PendingPhongHocStart = {
        ...shell,
        token: json.token,
        callMessageId: json.callMessageId || cur.callMessageId,
      };
      setActiveCall((prev) => (prev ? ready : null));
      dispatchPendingPhongHoc(ready);
    } catch {
      setActiveCall(null);
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  if (activeCall) {
    return createPortal(
      <div className="cins-incoming-call is-in-call" role="dialog" aria-label="Cuộc gọi">
        <div className="cins-incoming-call-stage">
          <PhongHocMeeting
            authToken={activeCall.token}
            mode={activeCall.mode}
            title={activeCall.title}
            roomId={activeCall.roomId}
            callMessageId={activeCall.callMessageId}
            onClose={() => setActiveCall(null)}
          />
        </div>
      </div>,
      document.body,
    );
  }

  if (!offer) return null;

  const label = mediaCallLabel(offer.mode);

  return createPortal(
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
    </div>,
    document.body,
  );
}
