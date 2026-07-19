/**
 * Trần upload ảnh hosted lên Cloudflare Images.
 * Docs CF: max 10 MB — không nâng cao hơn trừ khi đổi pipeline.
 */
export const MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_CLOUDFLARE_IMAGE_UPLOAD_MB =
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES / (1024 * 1024);

export function cloudflareImageTooLargeError(): string {
  return `Ảnh quá lớn (giới hạn ${MAX_CLOUDFLARE_IMAGE_UPLOAD_MB}MB).`;
}
