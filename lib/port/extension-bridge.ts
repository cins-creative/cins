/**
 * Bridge trang CINs ↔ extension "Trợ lý CINs" (postMessage) cho luồng kéo port.
 * Chỉ dùng ở client component.
 */

const PAGE_SOURCE = "cins-port-page";
const EXT_SOURCE = "cins-port-ext";

export const CINS_TRO_LY_EXT_ZIP_HREF = "/downloads/cins-tro-ly.zip";
export const CINS_PORT_MAX_WORKS = 48;

export type PortPlatform = "behance";

export type PortWorkListItem = {
  projectId: string;
  url: string;
  title: string | null;
  coverUrl: string | null;
};

export type PortWorkListResult = {
  items: PortWorkListItem[];
  truncated: boolean;
};

export type PortWorkContent = {
  url: string;
  html: string;
  title: string | null;
  coverUrl: string | null;
};

type ExtMessage =
  | { source: typeof EXT_SOURCE; type: "PONG" | "READY"; version?: string }
  | {
      source: typeof EXT_SOURCE;
      type: "LIST_PROFILE_WORKS_RESULT";
      requestId: string;
      ok: boolean;
      data?: PortWorkListResult | null;
      error?: string | null;
    }
  | {
      source: typeof EXT_SOURCE;
      type: "FETCH_WORK_RESULT";
      requestId: string;
      ok: boolean;
      data?: PortWorkContent | null;
      error?: string | null;
    };

function isExtMessage(v: unknown): v is ExtMessage {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.source === EXT_SOURCE && typeof o.type === "string";
}

function newRequestId(): string {
  return `port-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ping extension — true nếu content script "Trợ lý CINs" đang chạy trên trang. */
export function pingPortExtension(timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      resolve(ok);
    };
    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type === "PONG" || event.data.type === "READY") finish(true);
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ source: PAGE_SOURCE, type: "PING" }, "*");
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/** Quét danh sách project trên hồ sơ (cần Trợ lý CINs). */
export function listProfileWorksViaExtension(
  platform: PortPlatform,
  username: string,
  maxItems = CINS_PORT_MAX_WORKS,
  timeoutMs = 120000,
): Promise<PortWorkListResult> {
  const requestId = newRequestId();
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      fn();
    };
    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type !== "LIST_PROFILE_WORKS_RESULT") return;
      if (event.data.requestId !== requestId) return;
      if (event.data.ok && event.data.data) {
        finish(() => resolve(event.data.data as PortWorkListResult));
      } else {
        finish(() =>
          reject(new Error(event.data.error || "Không quét được hồ sơ.")),
        );
      }
    };
    window.addEventListener("message", onMsg);
    window.postMessage(
      { source: PAGE_SOURCE, type: "LIST_PROFILE_WORKS", requestId, platform, username, maxItems },
      "*",
    );
    const timer = setTimeout(
      () => finish(() => reject(new Error("Hết thời gian quét hồ sơ. Thử lại sau."))),
      timeoutMs,
    );
  });
}

/** Lấy HTML nội dung 1 project (cần Trợ lý CINs). */
export function fetchWorkViaExtension(
  platform: PortPlatform,
  url: string,
  timeoutMs = 60000,
): Promise<PortWorkContent> {
  const requestId = newRequestId();
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      fn();
    };
    const onMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtMessage(event.data)) return;
      if (event.data.type !== "FETCH_WORK_RESULT") return;
      if (event.data.requestId !== requestId) return;
      if (event.data.ok && event.data.data) {
        finish(() => resolve(event.data.data as PortWorkContent));
      } else {
        finish(() =>
          reject(new Error(event.data.error || "Không lấy được nội dung project.")),
        );
      }
    };
    window.addEventListener("message", onMsg);
    window.postMessage(
      { source: PAGE_SOURCE, type: "FETCH_WORK", requestId, platform, url },
      "*",
    );
    const timer = setTimeout(
      () => finish(() => reject(new Error("Hết thời gian lấy project. Thử lại sau."))),
      timeoutMs,
    );
  });
}
