/** Client — chuẩn bị & upload video chat lên R2 qua /api/chat-video/upload. */

/** Trần thời lượng clip chat (giây). */
export const CHAT_VIDEO_MAX_DURATION_S = 60;
/** Trần dung lượng client trước khi upload (chưa có nén ffmpeg.wasm). */
export const CHAT_VIDEO_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const CHAT_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const ALLOWED_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export type ChatVideoMeta = {
  durationS: number | null;
  width: number | null;
  height: number | null;
};

export type ChatVideoUploadResult =
  | {
      ok: true;
      mediaId: string;
      url: string | null;
      width: number | null;
      height: number | null;
      durationS: number | null;
    }
  | { ok: false; error: string };

/** Đọc thời lượng + kích thước bằng <video> ẩn (không phát). */
export function probeVideoMetadata(file: File): Promise<ChatVideoMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const done = (meta: ChatVideoMeta) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(meta);
    };

    video.onloadedmetadata = () => {
      done({
        durationS: Number.isFinite(video.duration)
          ? Math.round(video.duration)
          : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
    };
    video.onerror = () => done({ durationS: null, width: null, height: null });
    video.src = url;
  });
}

/** Ảnh poster (frame ~0.1s) làm preview optimistic — trả blob URL hoặc null. */
export function captureVideoPoster(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.1, video.duration || 0.1);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          resolve(blob ? URL.createObjectURL(blob) : null);
        }, "image/jpeg", 0.7);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

/** Validate + upload. Không nén (client) — vượt trần thì từ chối kèm gợi ý. */
export async function uploadChatVideo(
  file: File,
): Promise<ChatVideoUploadResult> {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Chỉ hỗ trợ video MP4, WebM hoặc MOV." };
  }
  if (file.size > CHAT_VIDEO_MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "Video quá nặng (tối đa 50MB) — hãy quay ngắn hoặc nén lại.",
    };
  }

  const meta = await probeVideoMetadata(file);
  if (meta.durationS != null && meta.durationS > CHAT_VIDEO_MAX_DURATION_S) {
    return {
      ok: false,
      error: `Video quá dài (tối đa ${CHAT_VIDEO_MAX_DURATION_S}s).`,
    };
  }

  const form = new FormData();
  form.append("file", file);
  if (meta.width != null) form.append("width", String(meta.width));
  if (meta.height != null) form.append("height", String(meta.height));
  if (meta.durationS != null) form.append("duration_s", String(meta.durationS));

  let res: Response;
  try {
    res = await fetch("/api/chat-video/upload", {
      method: "POST",
      body: form,
    });
  } catch {
    return { ok: false, error: "Lỗi mạng khi tải video." };
  }

  const json = (await res.json().catch(() => null)) as
    | { mediaId?: string; url?: string | null; width?: number | null; height?: number | null; durationS?: number | null; error?: string }
    | null;

  if (!res.ok || !json?.mediaId) {
    return { ok: false, error: json?.error || "Không tải được video." };
  }

  return {
    ok: true,
    mediaId: json.mediaId,
    url: json.url ?? null,
    width: json.width ?? meta.width,
    height: json.height ?? meta.height,
    durationS: json.durationS ?? meta.durationS,
  };
}
