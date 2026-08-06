import type { Upload } from "tus-js-client";

/** Phản hồi /api/post-video/prepare — Cloudflare Stream (client-safe type). */
export type VideoPrepareResponse = {
  provider?: "stream";
  videoId?: string;
  embedUrl?: string;
  /** Stream direct-creator tus URL. */
  uploadURL?: string;
  error?: string;
};

export type VideoTusHandlers = {
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  onError?: (err: unknown) => void;
  onSuccess?: () => void;
};

export function prepareResponseIsStream(prep: VideoPrepareResponse): boolean {
  return prep.provider === "stream" || Boolean(prep.uploadURL);
}

/** true nếu prepare trả về đủ dữ liệu để bắt đầu tus upload. */
export function prepareResponseIsValid(prep: VideoPrepareResponse): boolean {
  if (!prep.videoId || !prep.embedUrl) return false;
  return Boolean(prep.uploadURL);
}

/** Tạo tus Upload tới Cloudflare Stream (uploadURL từ direct-creator). */
export async function createVideoTusUpload(
  file: File,
  prep: VideoPrepareResponse,
  handlers: VideoTusHandlers,
): Promise<Upload> {
  const { Upload } = await import("tus-js-client");
  if (!prep.uploadURL) {
    throw new Error("Thiếu uploadURL Cloudflare Stream.");
  }
  return new Upload(file, {
    retryDelays: [0, 1000, 3000, 5000, 10000],
    metadata: { filetype: file.type, title: file.name },
    onProgress: handlers.onProgress,
    onError: handlers.onError,
    onSuccess: handlers.onSuccess,
    uploadUrl: prep.uploadURL,
  });
}
