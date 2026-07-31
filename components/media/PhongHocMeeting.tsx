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
  mediaCallLabel,
  type MediaCallMode,
} from "@/lib/media/call-mode";
import "@/components/media/phong-hoc.css";

type MeetingClient = RealtimeKitClient;

type Props = {
  authToken: string;
  mode: MediaCallMode;
  title?: string;
  roomId?: string;
  callMessageId?: string | null;
  onClose: () => void;
};

/** connecting = chưa vào phòng; live = đã join thật; error */
type CallPhase = "connecting" | "live" | "error";

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
  meeting,
  localPreviewStream,
  onHangUp,
}: {
  mode: MediaCallMode;
  title: string;
  phase: CallPhase;
  err: string | null;
  meeting: MeetingClient | undefined;
  localPreviewStream: MediaStream | null;
  onHangUp: () => void;
}) {
  const isVideo = mode === "video" || mode === "screen";
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(isVideo && mode === "video");
  const [elapsed, setElapsed] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Timer chỉ khi đã live thật.
  useEffect(() => {
    if (phase !== "live") {
      setElapsed(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Local preview / self video
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

  // Remote video — peeks joined participants
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
      setHasRemoteVideo(Boolean(track));
      bindTrackToVideo(remoteVideoRef.current, track);
    };

    refreshRemote();

    const peerUnsubs: Array<() => void> = [];
    const wirePeer = (p: {
      on: (e: string, h: () => void) => void;
      removeListener: (e: string, h: () => void) => void;
    }) => {
      const h = () => refreshRemote();
      p.on("videoUpdate", h);
      p.on("screenShareUpdate", h);
      peerUnsubs.push(() => {
        p.removeListener("videoUpdate", h);
        p.removeListener("screenShareUpdate", h);
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
  }, [meeting, isVideo]);

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
    } catch {
      /* */
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
    } catch {
      /* */
    }
  }

  const statusLine =
    phase === "connecting"
      ? "Đang kết nối…"
      : phase === "error"
        ? err || "Không kết nối được"
        : isVideo
          ? "Đang gọi video"
          : "Cuộc gọi thoại";

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
                {phase === "live" ? formatElapsed(elapsed) : statusLine}
              </span>
            </div>
          </>
        ) : (
          <div
            className={`cins-phong-hoc-hero${
              phase === "connecting" ? " is-ringing" : ""
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
              {phase === "live" ? formatElapsed(elapsed) : statusLine}
            </p>
            {phase === "live" ? (
              <p className="cins-phong-hoc-status-sub">Cuộc gọi thoại</p>
            ) : null}
          </div>
        )}
      </div>

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
  const [localPreview, setLocalPreview] = useState<MediaStream | null>(null);
  const meetingRef = useRef<MeetingClient | undefined>(undefined);
  const localPreviewRef = useRef<MediaStream | null>(null);
  const endedRef = useRef(false);
  const joinStartedRef = useRef(false);

  meetingRef.current = meeting;
  /** Mobile/tablet: không cho chia sẻ màn — ép về video. */
  const effectiveMode: MediaCallMode =
    mode === "screen" && isCompactCallViewport() ? "video" : mode;
  const heading = title?.trim() || mediaCallLabel(effectiveMode);
  const wantVideo = effectiveMode === "video";
  const wantScreen = effectiveMode === "screen";

  const stopLocalPreview = useCallback(() => {
    localPreviewRef.current?.getTracks().forEach((t) => t.stop());
    localPreviewRef.current = null;
    setLocalPreview(null);
  }, []);

  /** Track đã trao cho SDK — chỉ bỏ ref, không stop. */
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

  // Preview camera ngay (lớp thấp) — trước cả khi SFU xong.
  useEffect(() => {
    if (!wantVideo) return;
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          CALL_MEDIA_CONSTRAINTS_FAST,
        );
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localPreviewRef.current = stream;
        setLocalPreview(stream);
      } catch {
        /* user từ chối cam — vẫn gọi */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantVideo]);

  // Init SDK — không bật video mặc định (tránh getUserMedia HD chậm trùng preview).
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: false,
          },
        });
      } catch (e) {
        if (!alive) return;
        setErr(
          e instanceof Error ? e.message : "Không khởi tạo được cuộc gọi.",
        );
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [authToken, initMeeting]);

  // Join một lần — không dùng RtkMeeting (tránh join kép ERR0002 + 2 control bar).
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

        // Media nhanh: audio + (video track preview nếu có).
        try {
          await meeting.self.enableAudio();
        } catch {
          /* */
        }

        if (wantVideo) {
          const previewTrack =
            localPreviewRef.current?.getVideoTracks()?.[0] ?? null;
          try {
            if (previewTrack && previewTrack.readyState === "live") {
              await meeting.self.enableVideo(previewTrack);
              releasePreviewOwnership();
            } else {
              await meeting.self.enableVideo();
            }
          } catch {
            /* */
          }
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
        setPhase("live");
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Không vào được cuộc gọi.";
        // Retry một lần nếu join bị race leave (Strict Mode / remount).
        if (/0002|join room/i.test(msg)) {
          try {
            await new Promise((r) => setTimeout(r, 400));
            if (!alive) return;
            if (!meeting.self.roomJoined) await meeting.join();
            void meeting.self.enableAudio().catch(() => {});
            if (wantVideo) {
              const t = localPreviewRef.current?.getVideoTracks()?.[0];
              if (t?.readyState === "live") {
                void meeting.self
                  .enableVideo(t)
                  .then(() => releasePreviewOwnership())
                  .catch(() => {});
              } else {
                void meeting.self.enableVideo().catch(() => {});
              }
            }
            if (!alive) return;
            setPhase("live");
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

  // Leave chỉ khi unmount thật (debounce Strict Mode).
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
    phongHocMountGen += 1; // hủy leave debounce trùng
    try {
      await meetingRef.current?.leave();
    } catch {
      /* */
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
        meeting={meeting}
        localPreviewStream={localPreview}
        onHangUp={() => void hangUp()}
      />
    </RealtimeKitProvider>
  );
}
