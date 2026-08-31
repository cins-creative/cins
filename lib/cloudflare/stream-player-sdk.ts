/**
 * Cloudflare Stream Player JS SDK (embed) — client-only.
 * Dùng để play/pause/seek khi Reels tắt chrome native (`controls=false`).
 */

export type StreamPlayer = {
  play: () => Promise<void>;
  pause: () => void;
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  loop: boolean;
  volume?: number;
  videoWidth?: number;
  videoHeight?: number;
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
};

type StreamFactory = (el: HTMLIFrameElement) => StreamPlayer;

declare global {
  interface Window {
    Stream?: StreamFactory;
  }
}

let sdkPromise: Promise<StreamFactory> | null = null;

export function loadStreamPlayerSdk(): Promise<StreamFactory> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Stream SDK is client-only"));
  }
  if (window.Stream) return Promise.resolve(window.Stream);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<StreamFactory>((resolve, reject) => {
    const finish = () => {
      if (window.Stream) resolve(window.Stream);
      else reject(new Error("Stream SDK missing after load"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-cins-stream-sdk]",
    );
    if (existing) {
      if (window.Stream) {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Stream SDK load failed")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
    script.async = true;
    script.dataset.cinsStreamSdk = "1";
    script.onload = finish;
    script.onerror = () => reject(new Error("Stream SDK load failed"));
    document.head.appendChild(script);
  }).catch((err) => {
    sdkPromise = null;
    throw err;
  });

  return sdkPromise;
}

/** Bind SDK vào iframe; chờ load nếu iframe chưa sẵn sàng. */
export async function bindStreamPlayer(
  iframe: HTMLIFrameElement,
): Promise<StreamPlayer> {
  const Stream = await loadStreamPlayerSdk();
  return Stream(iframe);
}

function postStreamPlay(iframe: HTMLIFrameElement | null | undefined) {
  try {
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: "play" }), "*");
  } catch {
    /* ignore */
  }
}

function postStreamPause(iframe: HTMLIFrameElement | null | undefined) {
  try {
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: "pause" }), "*");
  } catch {
    /* ignore */
  }
}

/** Mute + pause SDK + postMessage — iframe Stream hay giữ tiếng sau khi chỉ `pause()`. */
export function pauseStream(
  player: { pause: () => void; muted: boolean; volume?: number },
  iframe?: HTMLIFrameElement | null,
) {
  applyStreamAudio(player, true, iframe);
  try {
    player.pause();
  } catch {
    /* ignore */
  }
  postStreamPause(iframe);
}

/** Seek — SDK `currentTime` + postMessage (một số embed chỉ nghe message). */
export function seekStreamPlayer(
  player: { currentTime: number } | null | undefined,
  seconds: number,
  iframe?: HTMLIFrameElement | null,
) {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  if (player) {
    try {
      player.currentTime = seconds;
    } catch {
      /* ignore */
    }
  }
  try {
    iframe?.contentWindow?.postMessage(
      JSON.stringify({ currentTime: seconds }),
      "*",
    );
  } catch {
    /* ignore */
  }
}

/** Unmute cần volume=1 — chỉ `muted=false` trên iframe Stream thường không có tiếng. */
export function applyStreamAudio(
  player: { muted: boolean; volume?: number },
  wantMuted: boolean,
  iframe?: HTMLIFrameElement | null,
) {
  player.muted = wantMuted;
  if (!wantMuted) {
    player.volume = 1;
  }
  try {
    iframe?.contentWindow?.postMessage(
      JSON.stringify({ muted: wantMuted }),
      "*",
    );
  } catch {
    /* ignore */
  }
}

/**
 * Play kèm audio. User đã unmute thì không fallback mute —
 * `play()` trong useEffect sẽ bị browser chặn, catch mute lại = UI bật tiếng nhưng im.
 */
export function playStreamWithAudio(
  player: {
    muted: boolean;
    volume?: number;
    play: () => Promise<void>;
  },
  wantMuted: boolean,
  iframe?: HTMLIFrameElement | null,
): Promise<void> {
  applyStreamAudio(player, wantMuted, iframe);
  return player.play().catch(() => {
    if (wantMuted) {
      applyStreamAudio(player, true, iframe);
      return player.play().catch(() => {
        postStreamPlay(iframe);
      });
    }
    return player.play().catch(() => {
      postStreamPlay(iframe);
    });
  });
}
