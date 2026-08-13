"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type RealtimeKitClient from "@cloudflare/realtimekit";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
} from "@cloudflare/realtimekit-react";
import { RtkParticipantsAudio } from "@cloudflare/realtimekit-react-ui";
import {
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

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

/** Phòng trống liên tục bấy nhiêu ms sau khi đã connected → tự kết thúc. */
const PEER_GONE_GRACE_MS = 6000;

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
  onPeerGone,
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
  onPeerGone: () => void;
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [screenOn, setScreenOn] = useState(mode === "screen");
  const [elapsed, setElapsed] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remoteIsScreen, setRemoteIsScreen] = useState(false);
  const [toggleErr, setToggleErr] = useState<string | null>(null);
  const [compactViewport, setCompactViewport] = useState(() =>
    isCompactCallViewport(),
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteReadySent = useRef(false);
  const onPeerGoneRef = useRef(onPeerGone);
  onPeerGoneRef.current = onPeerGone;

  const showVideoStage =
    camOn || screenOn || hasRemoteVideo || Boolean(localPreviewStream);

  useEffect(() => {
    setCompactViewport(isCompactCallViewport());
    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setCompactViewport(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

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
    if (!showVideoStage) return;
    const screenTrack =
      screenOn && meeting?.self?.screenShareTracks?.video
        ? meeting.self.screenShareTracks.video
        : null;
    const selfTrack = meeting?.self?.videoTrack ?? null;
    const previewTrack = localPreviewStream?.getVideoTracks()?.[0] ?? null;
    bindTrackToVideo(
      localVideoRef.current,
      screenTrack || (camOn ? selfTrack || previewTrack : null),
    );
  }, [
    showVideoStage,
    camOn,
    screenOn,
    meeting,
    meeting?.self?.videoEnabled,
    meeting?.self?.videoTrack,
    meeting?.self?.screenShareEnabled,
    meeting?.self?.screenShareTracks,
    localPreviewStream,
  ]);

  useEffect(() => {
    if (!meeting) return;

    const refreshRemote = () => {
      let track: MediaStreamTrack | null = null;
      let isScreen = false;
      meeting.participants.joined.forEach((p) => {
        if (p.screenShareEnabled && p.screenShareTracks?.video) {
          track = p.screenShareTracks.video;
          isScreen = true;
        }
      });
      if (!track) {
        meeting.participants.joined.forEach((p) => {
          if (!track && p.videoEnabled && p.videoTrack) {
            track = p.videoTrack;
            isScreen = false;
          }
        });
      }
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
      setRemoteIsScreen(isScreen);
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

    const markPeerAudio = () => {
      if (remoteReadySent.current) return;
      if (meeting.participants.joined.size < 1) return;
      callTraceMarkOnce("T4", { kind: "remote-peer-joined" });
      callTraceMarkOnce("T7", { kind: "remote-peer-audio-path" });
      callTraceFlush("T7-remote-peer-audio");
      remoteReadySent.current = true;
      onRemoteReady();
    };

    // Đã connected mà phòng trống quá grace (đối phương cúp máy / rớt hẳn)
    // → tự kết thúc thay vì để đồng hồ chạy trong phòng trống.
    let peerGoneTimer: number | null = null;
    const checkPeerGone = () => {
      if (meeting.participants.joined.size >= 1) {
        if (peerGoneTimer != null) {
          window.clearTimeout(peerGoneTimer);
          peerGoneTimer = null;
        }
        return;
      }
      if (!remoteReadySent.current || peerGoneTimer != null) return;
      peerGoneTimer = window.setTimeout(() => {
        peerGoneTimer = null;
        if (meeting.participants.joined.size < 1) onPeerGoneRef.current();
      }, PEER_GONE_GRACE_MS);
    };

    const onJoin = (p: Parameters<typeof wirePeer>[0]) => {
      wirePeer(p);
      markPeerAudio();
      refreshRemote();
      checkPeerGone();
    };
    const onLeft = () => {
      refreshRemote();
      checkPeerGone();
    };

    meeting.participants.joined.on("participantJoined", onJoin);
    meeting.participants.joined.on("participantLeft", onLeft);

    markPeerAudio();

    // Roster có thể được đồng bộ sau khi join xong mà không phát lại
    // "participantJoined" cho peer đã ở trong phòng trước đó.
    const rosterPoll = window.setInterval(() => {
      if (remoteReadySent.current) {
        window.clearInterval(rosterPoll);
        return;
      }
      markPeerAudio();
      refreshRemote();
    }, 1000);

    return () => {
      window.clearInterval(rosterPoll);
      if (peerGoneTimer != null) window.clearTimeout(peerGoneTimer);
      meeting.participants.joined.removeListener("participantJoined", onJoin);
      meeting.participants.joined.removeListener("participantLeft", onLeft);
      for (const u of peerUnsubs) u();
    };
  }, [meeting, onRemoteReady]);

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
    if (!meeting) return;
    try {
      if (camOn) {
        await meeting.self.disableVideo();
        setCamOn(false);
      } else {
        if (screenOn) {
          try {
            await meeting.self.disableScreenShare();
          } catch {
            /* ignore */
          }
          setScreenOn(false);
        }
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

  async function toggleScreen() {
    if (!meeting || compactViewport) return;
    try {
      if (screenOn) {
        await meeting.self.disableScreenShare();
        setScreenOn(false);
      } else {
        if (camOn) {
          try {
            await meeting.self.disableVideo();
          } catch {
            /* ignore */
          }
          setCamOn(false);
        }
        await meeting.self.enableScreenShare();
        setScreenOn(true);
      }
      setToggleErr(null);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Không chia sẻ được màn hình.";
      console.warn("[phong-hoc] toggleScreen", msg);
      setToggleErr(msg);
    }
  }

  const statusLine =
    phase === "error"
      ? err || "Không kết nối được"
      : phase === "connecting"
        ? meeting
          ? "Đang vào phòng…"
          : "Đang kết nối…"
        : phase === "joined"
          ? `Đang chờ ${title} kết nối…`
          : screenOn
            ? "Đang chia sẻ màn hình"
            : camOn || hasRemoteVideo
              ? "Đang gọi video"
              : "Cuộc gọi thoại";

  const bannerErr = mediaErr || toggleErr;
  const localVisible = camOn || screenOn || Boolean(localPreviewStream);

  return (
    <div
      className={`cins-phong-hoc${showVideoStage ? " is-video" : ""}`}
      role="region"
      aria-label={title}
    >
      <div
        className={`cins-phong-hoc-stage${
          showVideoStage ? " is-video-stage" : ""
        }`}
      >
        {showVideoStage ? (
          <>
            <video
              ref={remoteVideoRef}
              className={`cins-phong-hoc-remote${
                hasRemoteVideo ? " is-on" : ""
              }${remoteIsScreen ? " is-screen" : ""}`}
              playsInline
              autoPlay
              muted={false}
            />
            <video
              ref={localVideoRef}
              className={`cins-phong-hoc-local${
                hasRemoteVideo ? " is-pip" : " is-full"
              }${localVisible ? "" : " is-off"}${
                screenOn ? " is-screen" : " is-camera"
              }`}
              playsInline
              autoPlay
              muted
            />
            {!localVisible && !hasRemoteVideo ? (
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

        <button
          type="button"
          className={`cins-phong-hoc-ctrl${camOn ? "" : " is-off"}`}
          aria-label={camOn ? "Tắt camera" : "Bật camera"}
          disabled={phase === "error" || !meeting}
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

        {!compactViewport ? (
          <button
            type="button"
            className={`cins-phong-hoc-ctrl${screenOn ? "" : " is-off"}`}
            aria-label={
              screenOn ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"
            }
            disabled={phase === "error" || !meeting}
            onClick={() => void toggleScreen()}
          >
            <span className="cins-phong-hoc-ctrl-icon">
              <MonitorUp size={20} strokeWidth={1.9} />
            </span>
            <span>{screenOn ? "Đang share" : "Màn hình"}</span>
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
        `/api/chat/rooms/${encodeURIComponent(roomId)}/classroom/signal`,
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

  const handleRemoteReady = useCallback(() => {
    setPhase((p) => (p === "error" ? p : "connected"));
  }, []);

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
        onRemoteReady={handleRemoteReady}
        onPeerGone={() => void hangUp()}
      />
    </RealtimeKitProvider>
  );
}
