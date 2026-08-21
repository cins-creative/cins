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
