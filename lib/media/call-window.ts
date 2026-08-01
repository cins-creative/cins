import { isCompactCallViewport } from "@/lib/media/call-constraints";
import type { MediaCallMode } from "@/lib/media/call-mode";

export type CallWindowSession = {
  sid: string;
  roomId: string;
  token: string;
  mode: MediaCallMode;
  title: string;
  callMessageId: string | null;
  updatedAt: number;
};

const STORAGE_PREFIX = "cins-call:";
const CHANNEL_NAME = "cins-call-window";
const OPEN_WINDOWS = new Map<string, Window>();

function storageKey(sid: string): string {
  return `${STORAGE_PREFIX}${sid}`;
}

function newSid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** localStorage — chia sẻ giữa tab (sessionStorage thì không). */
export function writeCallWindowSession(session: CallWindowSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(session.sid), JSON.stringify(session));
  } catch {
    /* quota / private mode */
  }
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "update", session });
    bc.close();
  } catch {
    /* ignore */
  }
}

const SESSION_TTL_MS = 15 * 60 * 1000;

export function readCallWindowSession(sid: string): CallWindowSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(sid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CallWindowSession;
    if (!parsed?.sid || !parsed.roomId) return null;
    if (
      typeof parsed.updatedAt === "number" &&
      Date.now() - parsed.updatedAt > SESSION_TTL_MS
    ) {
      localStorage.removeItem(storageKey(sid));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCallWindowSession(sid: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(sid));
  } catch {
    /* ignore */
  }
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "clear", sid });
    bc.close();
  } catch {
    /* ignore */
  }
}

export function subscribeCallWindowSession(
  sid: string,
  onUpdate: (session: CallWindowSession) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey(sid) || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as CallWindowSession;
      if (parsed?.sid === sid) onUpdate(parsed);
    } catch {
      /* ignore */
    }
  };

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; session?: CallWindowSession };
      if (data?.type === "update" && data.session?.sid === sid) {
        onUpdate(data.session);
      }
    };
  } catch {
    bc = null;
  }

  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    bc?.close();
  };
}

export type OpenCallWindowInput = {
  roomId: string;
  token?: string;
  mode?: MediaCallMode;
  title: string;
  callMessageId?: string | null;
  /** Reuse sid when updating an already-open tab. */
  sid?: string;
};

export type OpenCallWindowResult =
  | { ok: true; sid: string; via: "window" }
  | { ok: false; sid: string; reason: "blocked" | "compact" };

/** Popup con kiểu Messenger — cửa sổ riêng, căn giữa so với cửa sổ hiện tại. */
function callPopupFeatures(): string {
  const availW = window.screen?.availWidth ?? 1280;
  const availH = window.screen?.availHeight ?? 800;
  const width = Math.min(980, Math.max(640, Math.floor(availW * 0.6)));
  const height = Math.min(720, Math.max(480, Math.floor(availH * 0.7)));
  const baseX = window.screenX ?? 0;
  const baseY = window.screenY ?? 0;
  const outerW = window.outerWidth || availW;
  const outerH = window.outerHeight || availH;
  const left = Math.max(0, Math.round(baseX + (outerW - width) / 2));
  const top = Math.max(0, Math.round(baseY + (outerH - height) / 2));
  return `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes`;
}

/**
 * Desktop: mở popup window `/chat/goi` (kiểu Messenger). Mobile/compact: trả compact để caller dùng fullscreen portal.
 */
export function openCallWindow(input: OpenCallWindowInput): OpenCallWindowResult {
  const sid = input.sid?.trim() || newSid();
  const session: CallWindowSession = {
    sid,
    roomId: input.roomId,
    token: input.token ?? "",
    mode: input.mode ?? "audio",
    title: input.title,
    callMessageId: input.callMessageId ?? null,
    updatedAt: Date.now(),
  };
  writeCallWindowSession(session);

  if (isCompactCallViewport()) {
    return { ok: false, sid, reason: "compact" };
  }

  const url = `/chat/goi?sid=${encodeURIComponent(sid)}`;
  const name = `cins-call-${input.roomId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)}`;
  let win = OPEN_WINDOWS.get(input.roomId);
  if (win && !win.closed) {
    /* Tab đã mở — session + BroadcastChannel cập nhật token, không reload. */
    try {
      win.focus();
    } catch {
      /* ignore */
    }
    return { ok: true, sid, via: "window" };
  }

  win = window.open(url, name, callPopupFeatures());
  if (!win) {
    return { ok: false, sid, reason: "blocked" };
  }
  OPEN_WINDOWS.set(input.roomId, win);
  try {
    win.focus();
  } catch {
    /* ignore */
  }
  return { ok: true, sid, via: "window" };
}

export function updateCallWindowSession(
  sid: string,
  patch: Partial<Omit<CallWindowSession, "sid">>,
): CallWindowSession | null {
  const prev = readCallWindowSession(sid);
  if (!prev) return null;
  const next: CallWindowSession = {
    ...prev,
    ...patch,
    sid,
    updatedAt: Date.now(),
  };
  writeCallWindowSession(next);
  return next;
}

/** Prefer desktop tab; compact viewport → false (use in-page fullscreen). */
export function shouldUseCallWindow(): boolean {
  return !isCompactCallViewport();
}

export type PresentCallResult =
  | { presentation: "window"; sid: string }
  | {
      presentation: "fullscreen";
      sid: string;
      reason: "compact" | "blocked";
    };

/** Desktop → tab; mobile/popup-block → fullscreen cùng tab. */
export function presentCallUi(input: OpenCallWindowInput): PresentCallResult {
  if (!shouldUseCallWindow()) {
    const sid = input.sid?.trim() || newSid();
    return { presentation: "fullscreen", sid, reason: "compact" };
  }
  const opened = openCallWindow(input);
  if (opened.ok) {
    return { presentation: "window", sid: opened.sid };
  }
  return {
    presentation: "fullscreen",
    sid: opened.sid,
    reason: opened.reason === "blocked" ? "blocked" : "compact",
  };
}
