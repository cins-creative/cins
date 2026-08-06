import { isStreamVideoUrl } from "@/lib/cloudflare/stream-embed";

function isLegacyExternalVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.includes("youtube.com/") ||
    u.includes("youtu.be/") ||
    u.includes("vimeo.com/")
  );
}

/** URL embed hợp lệ khi đăng bài video Journey (Stream hoặc link ngoài). */
export function isValidMediaVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return isStreamVideoUrl(trimmed) || isLegacyExternalVideoUrl(trimmed);
}
