"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type RealtimeKitClient from "@cloudflare/realtimekit";
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
} from "@cloudflare/realtimekit-react";
import {
  RtkParticipantsAudio,
  RtkSimpleGrid,
} from "@cloudflare/realtimekit-react-ui";
import {
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

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

type CallStatus = "connecting" | "connected" | "error";

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

function CallShell({
  mode,
  title,
  status,
  err,
  meeting,
  onHangUp,
}: {
  mode: MediaCallMode;
  title: string;
  status: CallStatus;
  err: string | null;
  meeting: MeetingClient | undefined;
  onHangUp: () => void;
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "connected") return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const statusLine =
    status === "connecting"
      ? "Đang gọi…"
      : status === "error"
        ? err || "Không kết nối được"
        : mode === "screen"
          ? "Đang chia sẻ màn hình"
          : mode === "video"
            ? "Cuộc gọi video"
            : "Cuộc gọi thoại";

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
      /* quyền mic */
    }
  }

  async function toggleCam() {
    if (!meeting || mode === "audio") return;
    try {
      if (camOn) {
        await meeting.self.disableVideo();
        setCamOn(false);
      } else {
        await meeting.self.enableVideo();
        setCamOn(true);
      }
    } catch {
      /* quyền cam */
    }
  }

  const showGrid =
    Boolean(meeting) &&
    status === "connected" &&
    (mode === "video" || mode === "screen");

  return (
    <div className="cins-phong-hoc" role="region" aria-label={title}>
      <div className="cins-phong-hoc-stage">
        {showGrid && meeting ? (
          <div className="cins-phong-hoc-grid">
            <RtkSimpleGrid meeting={meeting} />
          </div>
        ) : (
          <div
            className={`cins-phong-hoc-hero${
              status === "connecting" ? " is-ringing" : ""
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
                status === "error" ? " is-err" : ""
              }`}
            >
              {status === "connected" ? formatElapsed(elapsed) : statusLine}
            </p>
            {status === "connected" ? (
              <p className="cins-phong-hoc-status-sub">{statusLine}</p>
            ) : null}
            {mode === "screen" && status !== "error" ? (
              <p className="cins-phong-hoc-mode-chip">
                <MonitorUp size={14} strokeWidth={2} />
                Chia sẻ màn hình
              </p>
            ) : null}
          </div>
        )}
      </div>

      <footer className="cins-phong-hoc-controls">
        <button
          type="button"
          className={`cins-phong-hoc-ctrl${micOn ? "" : " is-off"}`}
          aria-label={micOn ? "Tắt mic" : "Bật mic"}
          disabled={!meeting || status === "error"}
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

        {mode !== "audio" ? (
          <button
            type="button"
            className={`cins-phong-hoc-ctrl${camOn ? "" : " is-off"}`}
            aria-label={camOn ? "Tắt camera" : "Bật camera"}
            disabled={!meeting || status === "error"}
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
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [err, setErr] = useState<string | null>(null);
  const meetingRef = useRef<MeetingClient | undefined>(undefined);
  const unmountGen = useRef(0);
  const endedRef = useRef(false);

  meetingRef.current = meeting;

  const heading = title?.trim() || mediaCallLabel(mode);

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

  // Init SDK (hook may no-op if a concurrent init is in flight — meeting still arrives via state).
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: mode === "video",
          },
        });
      } catch (e) {
        if (!alive) return;
        setErr(
          e instanceof Error ? e.message : "Không khởi tạo được cuộc gọi.",
        );
        setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [authToken, initMeeting, mode]);

  // Join when client is ready — public API is join()/leave(), not joinRoom().
  useEffect(() => {
    if (!meeting) return;
    let alive = true;

    void (async () => {
      try {
        if (!meeting.self.roomJoined) {
          await meeting.join();
        }
        if (!alive) return;

        try {
          await meeting.self.enableAudio();
        } catch {
          /* user từ chối mic */
        }

        if (mode === "video") {
          try {
            await meeting.self.enableVideo();
          } catch {
            /* user từ chối cam */
          }
        }

        if (mode === "screen") {
          try {
            await meeting.self.enableScreenShare();
          } catch (e) {
            if (alive) {
              setErr(
                e instanceof Error
                  ? e.message
                  : "Không chia sẻ được màn hình (cần cho phép trong trình duyệt).",
              );
            }
          }
        }

        if (alive) setStatus("connected");
      } catch (e) {
        if (!alive) return;
        setErr(
          e instanceof Error ? e.message : "Không vào được cuộc gọi.",
        );
        setStatus("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [meeting, mode]);

  // Leave on real unmount; skip Strict Mode effect re-run (remount bumps gen).
  useEffect(() => {
    const gen = ++unmountGen.current;
    return () => {
      window.setTimeout(() => {
        if (unmountGen.current !== gen) return;
        void meetingRef.current?.leave();
        void signalEnd();
      }, 0);
    };
  }, [meeting, signalEnd]);

  async function hangUp() {
    try {
      await meetingRef.current?.leave();
    } catch {
      /* ignore */
    }
    await signalEnd();
    onClose();
  }

  return (
    <RealtimeKitProvider
      value={meeting}
      fallback={
        <CallShell
          mode={mode}
          title={heading}
          status="connecting"
          err={null}
          meeting={undefined}
          onHangUp={() => void hangUp()}
        />
      }
    >
      <CallShell
        mode={mode}
        title={heading}
        status={status}
        err={err}
        meeting={meeting}
        onHangUp={() => void hangUp()}
      />
    </RealtimeKitProvider>
  );
}
