import type { Upload } from "tus-js-client";

/** Phản hồi /api/post-video/prepare — Cloudflare Stream (client-safe type). */
export type VideoPrepareResponse = {
  provider?: "stream";
  videoId?: string;
  embedUrl?: string;
  /** Location TUS đã tạo (?direct_user=true) — client PATCH, không POST create. */
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

/** Tạo tus Upload PATCH tới Location Stream (slot đã tạo trên server). */
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
    uploadUrl: prep.uploadURL,
    /* Stream: tối thiểu 5MB, khuyến nghị 50MB, tối đa 200MB. */
    chunkSize: 50 * 1024 * 1024,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    metadata: { name: file.name, filetype: file.type || "video/mp4" },
    storeFingerprintForResuming: false,
    removeFingerprintOnSuccess: true,
    onProgress: handlers.onProgress,
    onError: handlers.onError,
    onSuccess: handlers.onSuccess,
  });
}
