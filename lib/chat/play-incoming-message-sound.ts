/** Âm báo tin nhắn đến — tái dùng 1 Audio + cooldown tránh spam. */

const SOUND_SRC = "/assets/sounds/chat-new-message.mp3";
const COOLDOWN_MS = 900;
const VOLUME = 0.55;

let sharedAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_SRC);
    sharedAudio.preload = "auto";
    sharedAudio.volume = VOLUME;
  }
  return sharedAudio;
}

/** Phát sound effect khi nhận tin từ người khác (bỏ qua nếu muted / cooldown). */
export function playIncomingMessageSound(options?: {
  muted?: boolean;
}): void {
  if (options?.muted) return;
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastPlayedAt < COOLDOWN_MS) return;
  lastPlayedAt = now;

  const audio = getAudio();
  if (!audio) return;

  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* Autoplay bị chặn trước khi user tương tác — bỏ qua. */
    });
  } catch {
    /* ignore */
  }
}
