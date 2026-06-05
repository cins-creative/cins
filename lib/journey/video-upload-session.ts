import type { Upload } from "tus-js-client";

/** Giữ TUS upload chạy nền sau khi đóng overlay compose. */
const activeUploads = new Map<string, Upload>();

export function registerVideoUpload(videoId: string, upload: Upload): void {
  activeUploads.set(videoId, upload);
}

export function releaseVideoUpload(videoId: string): void {
  activeUploads.delete(videoId);
}

export function hasActiveVideoUpload(videoId: string): boolean {
  return activeUploads.has(videoId);
}
