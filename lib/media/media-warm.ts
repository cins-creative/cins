"use client";

import RealtimeKitClient from "@cloudflare/realtimekit";

import { CALL_MEDIA_CONSTRAINTS_FAST } from "@/lib/media/call-constraints";

const IDLE_STOP_MS = 30_000;

type WarmMediaHandler = Awaited<ReturnType<typeof RealtimeKitClient.initMedia>>;

type WarmSlot = {
  mediaHandler: WarmMediaHandler;
  previewStream: MediaStream;
  wantVideo: boolean;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

let slot: WarmSlot | null = null;
let warming: Promise<WarmSlot | null> | null = null;

function buildPreviewStream(handler: WarmMediaHandler): MediaStream {
  const tracks: MediaStreamTrack[] = [];
  try {
    const v = handler.videoTrack;
    if (v && v.readyState === "live") tracks.push(v);
  } catch {
    /* */
  }
  try {
    const a = handler.audioTrack;
    if (a && a.readyState === "live") tracks.push(a);
  } catch {
    /* */
  }
  return new MediaStream(tracks);
}

function clearIdleTimer() {
  if (slot?.idleTimer) {
    clearTimeout(slot.idleTimer);
    slot.idleTimer = null;
  }
}

/** Dừng warm — tắt track, tránh đèn cam sáng vô cớ. */
export function stopWarmCallMedia(): void {
  clearIdleTimer();
  if (!slot) {
    warming = null;
    return;
  }
  try {
    slot.previewStream.getTracks().forEach((t) => t.stop());
  } catch {
    /* */
  }
  try {
    slot.mediaHandler.videoTrack?.stop();
  } catch {
    /* */
  }
  try {
    slot.mediaHandler.audioTrack?.stop();
  } catch {
    /* */
  }
  slot = null;
  warming = null;
}

function armIdleStop() {
  clearIdleTimer();
  if (!slot) return;
  slot.idleTimer = setTimeout(() => {
    stopWarmCallMedia();
  }, IDLE_STOP_MS);
}

/**
 * Warm media trước khi bấm gọi (hover nút gọi).
 * Tái dùng SelfMedia qua defaults.mediaHandler lúc initMeeting.
 */
export async function warmCallMedia(input: {
  video: boolean;
}): Promise<WarmSlot | null> {
  if (typeof window === "undefined") return null;

  if (slot && slot.wantVideo === input.video) {
    armIdleStop();
    return slot;
  }

  if (slot && slot.wantVideo !== input.video) {
    stopWarmCallMedia();
  }

  if (warming) return warming;

  warming = (async () => {
    try {
      const mediaHandler = await RealtimeKitClient.initMedia({
        audio: true,
        video: input.video,
        constraints: {
          audio: { echoCancellation: true, noiseSuppression: true },
          video: input.video
            ? {
                width: { ideal: 640 },
                height: { ideal: 360 },
                frameRate: { ideal: 24 },
              }
            : undefined,
        },
      });
      let previewStream = buildPreviewStream(mediaHandler);
      if (input.video && previewStream.getVideoTracks().length === 0) {
        /* Fallback getUserMedia nếu initMedia không cấp video track. */
        try {
          const stream = await navigator.mediaDevices.getUserMedia(
            CALL_MEDIA_CONSTRAINTS_FAST,
          );
          previewStream = stream;
        } catch {
          /* */
        }
      }
      slot = {
        mediaHandler,
        previewStream,
        wantVideo: input.video,
        idleTimer: null,
      };
      armIdleStop();
      return slot;
    } catch {
      warming = null;
      return null;
    } finally {
      warming = null;
    }
  })();

  return warming;
}

/** Lấy warm hiện có (không stop) — dùng khi mount cuộc gọi. */
export function peekWarmCallMedia(wantVideo: boolean): WarmSlot | null {
  if (!slot || slot.wantVideo !== wantVideo) return null;
  clearIdleTimer();
  return slot;
}

/**
 * Consumed bởi PhongHocMeeting — chuyển ownership, không stop track.
 * Caller chịu trách nhiệm release sau khi SDK nhận.
 */
export function takeWarmCallMedia(wantVideo: boolean): WarmSlot | null {
  const cur = peekWarmCallMedia(wantVideo);
  if (!cur) return null;
  slot = null;
  warming = null;
  return cur;
}
