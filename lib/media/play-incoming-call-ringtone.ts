/** Chuông reo cuộc gọi đến — Web Audio, loop đến khi stop. */

let ctx: AudioContext | null = null;
let loopTimer: number | null = null;
let unlocked = false;
let unlockBound = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function unlock(): void {
  const c = getCtx();
  if (!c || unlocked) return;
  void c.resume().then(() => {
    unlocked = true;
  });
}

function bindUnlock(): void {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const onGesture = () => unlock();
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
  bindUnlock();
}

/** Một nhịp «ring-ring» kiểu điện thoại. */
function playBurst(c: AudioContext): void {
  const now = c.currentTime;
  for (let i = 0; i < 2; i += 1) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 0 ? 880 : 988;
    gain.gain.setValueAtTime(0.0001, now);
    const t0 = now + i * 0.22;
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  }
}

export function startIncomingCallRingtone(options?: { muted?: boolean }): void {
  if (options?.muted) return;
  if (typeof window === "undefined") return;
  bindUnlock();
  unlock();
  stopIncomingCallRingtone();

  const c = getCtx();
  if (!c) return;

  const tick = () => {
    if (c.state === "suspended") void c.resume();
    try {
      playBurst(c);
    } catch {
      /* ignore */
    }
  };

  tick();
  loopTimer = window.setInterval(tick, 2200);
}

export function stopIncomingCallRingtone(): void {
  if (loopTimer != null) {
    window.clearInterval(loopTimer);
    loopTimer = null;
  }
}
