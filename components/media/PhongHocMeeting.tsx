"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type RealtimeKitClient from "@cloudflare/realtimekit";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
} from "@cloudflare/realtimekit-react";
import { RtkParticipantsAudio } from "@cloudflare/realtimekit-react-ui";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

import {
  CALL_MEDIA_CONSTRAINTS_FAST,
  isCompactCallViewport,
} from "@/lib/media/call-constraints";
import {
  callTraceFlush,
  callTraceMark,
  callTraceMarkOnce,
} from "@/lib/media/call-trace";
import {
  mediaCallLabel,
  type MediaCallMode,
} from "@/lib/media/call-mode";
import { takeWarmCallMedia } from "@/lib/media/media-warm";
import "@/components/media/phong-hoc.css";

type MeetingClient = RealtimeKitClient;

type Props = {
  /** Rỗng = chỉ preview local; SDK init khi có token. */
  authToken: string;
  mode: MediaCallMode;
  title?: string;
  roomId?: string;
  callMessageId?: string | null;
  onClose: () => void;
};

/** connecting → joined (mình vào phòng) → connected (có media đối phương). */
type CallPhase = "connecting" | "joined" | "connected" | "error";

/** Chống leave/join đua Strict Mode. */
let phongHocMountGen = 0;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function bindTrackToVideo(
  el: HTMLVideoElement | null,
  track: MediaStreamTrack | null | undefined,
) {
  if (!el) return;
  if (!track || track.readyState === "ended") {
    el.srcObject = null;
    return;
  }
  const stream = new MediaStream([track]);
  el.srcObject = stream;
  void el.play().catch(() => {});
}

function CallStage({
  mode,
  title,
  phase,
  err,
  mediaErr,
  meeting,
  localPreviewStream,
  onHangUp,
  onRemoteReady,
}: {
  mode: MediaCallMode;
  title: string;
  phase: CallPhase;
  err: string | null;
  mediaErr: string | null;
  meeting: MeetingClient | undefined;
  localPreviewStream: MediaStream | null;
  onHangUp: () => void;
  onRemoteReady: () => void;
}) {
  const isVideo = mode === "video" || mode === "screen";
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(isVideo && mode === "video");
  const [elapsed, setElapsed] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [toggleErr, setToggleErr] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteReadySent = useRef(false);

  useEffect(() => {
    if (phase !== "connected") {
      setElapsed(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!isVideo) return;
    const selfTrack = meeting?.self?.videoTrack ?? null;
    const previewTrack = localPreviewStream?.getVideoTracks()?.[0] ?? null;
    bindTrackToVideo(localVideoRef.current, selfTrack || previewTrack);
  }, [
    isVideo,
    meeting,
    meeting?.self?.videoEnabled,
    meeting?.self?.videoTrack,
    localPreviewStream,
  ]);

  useEffect(() => {
    if (!meeting || !isVideo) return;

    const refreshRemote = () => {
      let track: MediaStreamTrack | null = null;
      meeting.participants.joined.forEach((p) => {
        if (p.videoEnabled && p.videoTrack) {
          track = p.videoTrack;
        }
        if (
          !track &&
          p.screenShareEnabled &&
          p.screenShareTracks?.video
        ) {
          track = p.screenShareTracks.video;
        }
      });
      if (track) {
        callTraceMarkOnce("T4", { kind: "remote-video-track" });
        callTraceMarkOnce("T7", { kind: "remote-video-visible" });
        callTraceFlush("T7-remote-video");
        if (!remoteReadySent.current) {
          remoteReadySent.current = true;
          onRemoteReady();
        }
      }
      setHasRemoteVideo(Boolean(track));
      bindTrackToVideo(remoteVideoRef.current, track);
    };

    refreshRemote();

    const peerUnsubs: Array<() => void> = [];
    const wirePeer = (p: {
      on: (event: "videoUpdate" | "screenShareUpdate", cb: () => void) => void;
      off: (event: "videoUpdate" | "screenShareUpdate", cb: () => void) => void;
    }) => {
      const h = () => refreshRemote();
      p.on("videoUpdate", h);
      p.on("screenShareUpdate", h);
      peerUnsubs.push(() => {
        p.off("videoUpdate", h);
        p.off("screenShareUpdate", h);
      });
    };

    meeting.participants.joined.forEach((p) => wirePeer(p));

    const onJoin = (p: Parameters<typeof wirePeer>[0]) => {
      wirePeer(p);
      refreshRemote();
    };
    const onLeft = () => refreshRemote();

    meeting.participants.joined.on("participantJoined", onJoin);
    meeting.participants.joined.on("participantLeft", onLeft);

    return () => {
      meeting.participants.joined.removeListener("participantJoined", onJoin);
      meeting.participants.joined.removeListener("participantLeft", onLeft);
      for (const u of peerUnsubs) u();
    };
  }, [meeting, isVideo, onRemoteReady]);

  useEffect(() => {
    if (!meeting || isVideo) return;
    const markPeer = () => {
      if (meeting.participants.joined.size < 1) return;
      callTraceMarkOnce("T4", { kind: "remote-peer-joined" });
      callTraceMarkOnce("T7", { kind: "remote-peer-audio-path" });
      callTraceFlush("T7-remote-peer-audio");
      if (!remoteReadySent.current) {
        remoteReadySent.current = true;
        onRemoteReady();
      }
    };
    markPeer();
    const onJoin = () => markPeer();
    meeting.participants.joined.on("participantJoined", onJoin);
    return () => {
      meeting.participants.joined.removeListener("participantJoined", onJoin);
    };
  }, [meeting, isVideo, onRemoteReady]);

  async function toggleMic() {
    if (!meeting) return;
    try {
      if (micOn) {
        await meeting.self.disableAudio();
        setMicOn(false);
      } else {
        await meeting.self.enableAudio();
        setMicOn(true);
      }
      setToggleErr(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không đổi được mic.";
      console.warn("[phong-hoc] toggleMic", msg);
      setToggleErr(msg);
    }
  }

  async function toggleCam() {
    if (!meeting || mode !== "video") return;
    try {
      if (camOn) {
        await meeting.self.disableVideo();
        setCamOn(false);
      } else {
        await meeting.self.enableVideo();
        setCamOn(true);
      }
      setToggleErr(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không bật được camera.";
      console.warn("[phong-hoc] toggleCam", msg);
      setToggleErr(msg);
    }
  }

  const statusLine =
    phase === "error"
      ? err || "Không kết nối được"
      : phase === "connecting"
        ? meeting
          ? "Đang vào phòng…"
          : "Đang mở camera…"
        : phase === "joined"
          ? `Đang chờ ${title} kết nối…`
          : isVideo
            ? "Đang gọi video"
            : "Cuộc gọi thoại";

  const bannerErr = mediaErr || toggleErr;

  return (
    <div
      className={`cins-phong-hoc${isVideo ? " is-video" : ""}`}
      role="region"
      aria-label={title}
    >
      <div className={`cins-phong-hoc-stage${isVideo ? " is-video-stage" : ""}`}>
        {isVideo ? (
          <>
            <video
              ref={remoteVideoRef}
              className={`cins-phong-hoc-remote${hasRemoteVideo ? " is-on" : ""}`}
              playsInline
              autoPlay
              muted={false}
            />
            <video
              ref={localVideoRef}
              className={`cins-phong-hoc-local${
                hasRemoteVideo ? " is-pip" : " is-full"
              }${camOn || localPreviewStream ? "" : " is-off"}`}
              playsInline
              autoPlay
              muted
            />
            {!camOn && !localPreviewStream ? (
              <div className="cins-phong-hoc-hero is-over-video">
                <div className="cins-phong-hoc-avatar" aria-hidden>
                  <span>{initials(title)}</span>
                </div>
              </div>
            ) : null}
            <div className="cins-phong-hoc-hud">
              <span className="cins-phong-hoc-hud-name">{title}</span>
              <span
                className={`cins-phong-hoc-hud-status${
                  phase === "error" ? " is-err" : ""
                }`}
              >
                {phase === "connected" ? formatElapsed(elapsed) : statusLine}
              </span>
            </div>
          </>
        ) : (
          <div
            className={`cins-phong-hoc-hero${
              phase === "connecting" || phase === "joined" ? " is-ringing" : ""
            }`}
          >
            <div className="cins-phong-hoc-rings" aria-hidden>
              <span />
              <span />
            </div>
            <div className="cins-phong-hoc-avatar" aria-hidden>
              <span>{initials(title)}</span>
            </div>
            <h2 className="cins-phong-hoc-peer">{title}</h2>
            <p
              className={`cins-phong-hoc-status${
                phase === "error" ? " is-err" : ""
              }`}
            >
              {phase === "connected" ? formatElapsed(elapsed) : statusLine}
            </p>
            {phase === "connected" ? (
              <p className="cins-phong-hoc-status-sub">Cuộc gọi thoại</p>
            ) : null}
          </div>
        )}
      </div>

      {bannerErr ? (
        <p className="cins-phong-hoc-status is-err" style={{ textAlign: "center", padding: "0 12px 8px" }}>
          {bannerErr}
        </p>
      ) : null}

      <footer className="cins-phong-hoc-controls">
        <button
          type="button"
          className={`cins-phong-hoc-ctrl${micOn ? "" : " is-off"}`}
          aria-label={micOn ? "Tắt mic" : "Bật mic"}
          disabled={phase === "error"}
          onClick={() => void toggleMic()}
        >
          <span className="cins-phong-hoc-ctrl-icon">
            {micOn ? (
              <Mic size={20} strokeWidth={1.9} />
            ) : (
              <MicOff size={20} strokeWidth={1.9} />
            )}
          </span>
          <span>{micOn ? "Mic" : "Mic tắt"}</span>
        </button>

        {mode === "video" ? (
          <button
            type="button"
            className={`cins-phong-hoc-ctrl${camOn ? "" : " is-off"}`}
            aria-label={camOn ? "Tắt camera" : "Bật camera"}
            disabled={phase === "error"}
            onClick={() => void toggleCam()}
          >
            <span className="cins-phong-hoc-ctrl-icon">
              {camOn ? (
                <Video size={20} strokeWidth={1.9} />
              ) : (
                <VideoOff size={20} strokeWidth={1.9} />
              )}
            </span>
            <span>{camOn ? "Camera" : "Cam tắt"}</span>
          </button>
        ) : null}

        <button
          type="button"
          className="cins-phong-hoc-ctrl is-hangup"
          aria-label="Kết thúc cuộc gọi"
          onClick={onHangUp}
        >
          <span className="cins-phong-hoc-ctrl-icon">
            <PhoneOff size={20} strokeWidth={1.9} />
          </span>
          <span>Kết thúc</span>
        </button>
      </footer>

      {meeting ? <RtkParticipantsAudio meeting={meeting} /> : null}
    </div>
  );
}

export function PhongHocMeeting({
  authToken,
  mode,
  title,
  roomId,
  callMessageId,
  onClose,
}: Props) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [err, setErr] = useState<string | null>(null);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<MediaStream | null>(null);
  const meetingRef = useRef<MeetingClient | undefined>(undefined);
  const localPreviewRef = useRef<MediaStream | null>(null);
  const mediaHandlerRef = useRef<Awaited<
    ReturnType<typeof import("@cloudflare/realtimekit").default.initMedia>
  > | null>(null);
  const endedRef = useRef(false);
  const joinStartedRef = useRef(false);
  const fromWarmRef = useRef(false);

  meetingRef.current = meeting;
  const effectiveMode: MediaCallMode =
    mode === "screen" && isCompactCallViewport() ? "video" : mode;
  const heading = title?.trim() || mediaCallLabel(effectiveMode);
  const wantVideo = effectiveMode === "video";
  const wantScreen = effectiveMode === "screen";

  useEffect(() => {
    callTraceMarkOnce("T0c", { mode: effectiveMode, roomId: roomId ?? null });
  }, [effectiveMode, roomId]);

  const stopLocalPreview = useCallback(() => {
    if (fromWarmRef.current) {
      /* Track đã giao SDK / warm — không stop nếu đã release. */
      localPreviewRef.current = null;
      setLocalPreview(null);
      return;
    }
    localPreviewRef.current?.getTracks().forEach((t) => t.stop());
    localPreviewRef.current = null;
    setLocalPreview(null);
  }, []);

  const releasePreviewOwnership = useCallback(() => {
    localPreviewRef.current = null;
    setLocalPreview(null);
  }, []);

  const signalEnd = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (!roomId || !callMessageId) return;
    try {
      await fetch(
        `/api/chat/rooms/${encodeURIComponent(roomId)}/phong-hoc/signal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callMessageId, action: "end" }),
        },
      );
    } catch {
      /* ignore */
    }
  }, [roomId, callMessageId]);

  // Preview: ưu tiên warm (Bước 2), fallback getUserMedia.
  useEffect(() => {
    if (!wantVideo) return;
    let cancelled = false;

    const warmed = takeWarmCallMedia(true);
    if (warmed) {
      fromWarmRef.current = true;
      mediaHandlerRef.current = warmed.mediaHandler;
      localPreviewRef.current = warmed.previewStream;
      setLocalPreview(warmed.previewStream);
      callTraceMarkOnce("T1", { source: "warm", tracks: warmed.previewStream.getTracks().length });
      return;
    }

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          CALL_MEDIA_CONSTRAINTS_FAST,
        );
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        callTraceMarkOnce("T1", { source: "getUserMedia", tracks: stream.getTracks().length });
        localPreviewRef.current = stream;
        setLocalPreview(stream);
      } catch {
        callTraceMarkOnce("T1", { error: "getUserMedia-denied-or-fail" });
        setMediaErr("Không mở được camera — kiểm tra quyền trình duyệt.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantVideo]);

  // Warm audio-only (không preview video).
  useEffect(() => {
    if (wantVideo) return;
    const warmed = takeWarmCallMedia(false);
    if (warmed) {
      fromWarmRef.current = true;
      mediaHandlerRef.current = warmed.mediaHandler;
      callTraceMarkOnce("T1", { source: "warm-audio" });
    }
  }, [wantVideo]);

  useEffect(() => {
    const token = authToken.trim();
    if (!token) return;
    let alive = true;
    void (async () => {
      try {
        await initMeeting({
          authToken: token,
          defaults: {
            audio: true,
            video: wantVideo,
            ...(mediaHandlerRef.current
              ? { mediaHandler: mediaHandlerRef.current }
              : {}),
            mediaConfiguration: wantVideo
              ? {
                  video: {
                    width: { ideal: 640 },
                    height: { ideal: 360 },
                    frameRate: { ideal: 24 },
                  },
                }
              : undefined,
          },
        });
        if (!alive) return;
        callTraceMarkOnce("T2", {
          defaultsVideo: wantVideo,
          reusedWarm: Boolean(mediaHandlerRef.current),
        });
      } catch (e) {
        if (!alive) return;
        callTraceMark("T2_error", {
          message: e instanceof Error ? e.message : "init-fail",
        });
        setErr(
          e instanceof Error ? e.message : "Không khởi tạo được cuộc gọi.",
        );
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [authToken, initMeeting, wantVideo]);

  useEffect(() => {
    if (!meeting || joinStartedRef.current) return;
    joinStartedRef.current = true;
    let alive = true;

    void (async () => {
      try {
        if (!meeting.self.roomJoined) {
          await meeting.join();
        }
        if (!alive) return;
        callTraceMarkOnce("T3");

        if (wantVideo) {
          const previewTrack =
            localPreviewRef.current?.getVideoTracks()?.[0] ?? null;
          if (previewTrack && previewTrack.readyState === "live") {
            void meeting.self
              .enableVideo(previewTrack)
              .then(() => {
                releasePreviewOwnership();
                callTraceMarkOnce("T3b_video", { reusedPreview: true });
              })
              .catch((e) => {
                const msg =
                  e instanceof Error ? e.message : "enableVideo-fail";
                console.warn("[phong-hoc] enableVideo", msg);
                callTraceMarkOnce("T3b_video", { error: msg });
                setMediaErr("Không đẩy được camera lên cuộc gọi.");
              });
          } else {
            callTraceMarkOnce("T3b_skipped", { reason: "defaults-on-join" });
          }
        } else {
          callTraceMarkOnce("T3b_skipped", { reason: "audio-or-defaults" });
        }

        if (wantScreen) {
          try {
            await meeting.self.enableScreenShare();
          } catch (e) {
            if (alive) {
              setErr(
                e instanceof Error
                  ? e.message
                  : "Không chia sẻ được màn hình.",
              );
            }
          }
        }

        if (!alive) return;
        setPhase("joined");
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Không vào được cuộc gọi.";
        if (/0002|join room/i.test(msg)) {
          try {
            await new Promise((r) => setTimeout(r, 400));
            if (!alive) return;
            if (!meeting.self.roomJoined) await meeting.join();
            callTraceMarkOnce("T3", { retry: true });
            if (wantVideo) {
              const t = localPreviewRef.current?.getVideoTracks()?.[0];
              if (t?.readyState === "live") {
                void meeting.self
                  .enableVideo(t)
                  .then(() => releasePreviewOwnership())
                  .catch((err) => {
                    console.warn("[phong-hoc] enableVideo retry", err);
                  });
              }
            }
            if (!alive) return;
            setPhase("joined");
            return;
          } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : msg);
            setPhase("error");
            return;
          }
        }
        setErr(msg);
        setPhase("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [meeting, wantVideo, wantScreen, releasePreviewOwnership]);

  useEffect(() => {
    const gen = ++phongHocMountGen;
    return () => {
      window.setTimeout(() => {
        if (phongHocMountGen !== gen) return;
        void meetingRef.current?.leave();
        void signalEnd();
        stopLocalPreview();
      }, 500);
    };
  }, [meeting, signalEnd, stopLocalPreview]);

  async function hangUp() {
    phongHocMountGen += 1;
    try {
      await meetingRef.current?.leave();
    } catch (e) {
      console.warn("[phong-hoc] leave", e);
    }
    stopLocalPreview();
    await signalEnd();
    onClose();
  }

  return (
    <RealtimeKitProvider value={meeting}>
      <CallStage
        mode={effectiveMode}
        title={heading}
        phase={phase}
        err={err}
        mediaErr={mediaErr}
        meeting={meeting}
        localPreviewStream={localPreview}
        onHangUp={() => void hangUp()}
        onRemoteReady={() => setPhase((p) => (p === "error" ? p : "connected"))}
      />
    </RealtimeKitProvider>
  );
}
