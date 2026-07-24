/** Âm báo tin nhắn đến — tái dùng 1 Audio + cooldown tránh spam. */

const SOUND_SRC = "/assets/sounds/chat-new-message.mp3";
const COOLDOWN_MS = 900;
const VOLUME = 0.55;

let sharedAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;
let unlocked = false;
let unlockBound = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_SRC);
    sharedAudio.preload = "auto";
    sharedAudio.volume = VOLUME;
  }
  return sharedAudio;
}

/** Mở khóa autoplay sau gesture đầu (click/tap/key) — bắt buộc trên Chrome/Safari. */
function unlockIncomingMessageSound(): void {
  if (unlocked) return;
  const audio = getAudio();
  if (!audio) return;
  const prevVolume = audio.volume;
  audio.volume = 0;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prevVolume;
      unlocked = true;
    })
    .catch(() => {
      audio.volume = prevVolume;
    });
}

function bindUnlockListeners(): void {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const onGesture = () => {
    unlockIncomingMessageSound();
  };
  window.addEventListener("pointerdown", onGesture, {
    capture: true,
    passive: true,
  });
  window.addEventListener("keydown", onGesture, {
    capture: true,
    passive: true,
  });
}

if (typeof window !== "undefined") {
  bindUnlockListeners();
}

/** Phát sound effect khi nhận tin từ người khác (bỏ qua nếu muted / cooldown). */
export function playIncomingMessageSound(options?: {
  muted?: boolean;
}): void {
  if (options?.muted) return;
  if (typeof window === "undefined") return;

  bindUnlockListeners();

  const now = Date.now();
  if (now - lastPlayedAt < COOLDOWN_MS) return;
  lastPlayedAt = now;

  const audio = getAudio();
  if (!audio) return;

  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* Chưa unlock autoplay — thử mở khóa rồi phát lại lần sau. */
      unlockIncomingMessageSound();
    });
  } catch {
    /* ignore */
  }
}
