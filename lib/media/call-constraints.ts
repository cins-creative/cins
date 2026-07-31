/** Viewport gọn (mobile/tablet web) — tắt chia sẻ màn hình. */
export function isCompactCallViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(max-width: 1024px)").matches;
  } catch {
    return false;
  }
}

/** Constraint ưu tiên tốc độ (lớp thấp) — 360p @ ~24fps. */
export const CALL_MEDIA_CONSTRAINTS_FAST: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
  video: {
    width: { ideal: 640, max: 854 },
    height: { ideal: 360, max: 480 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: "user",
  },
};

export const CALL_AUDIO_ONLY_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
  video: false,
};
