import { isBunnyVideoUrl } from "@/lib/bunny/embed";

function isLegacyExternalVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.includes("youtube.com/") ||
    u.includes("youtu.be/") ||
    u.includes("vimeo.com/")
  );
}

/** URL embed hợp lệ khi đăng bài video Journey (Bunny hoặc link ngoài cũ). */
export function isValidMediaVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return isBunnyVideoUrl(trimmed) || isLegacyExternalVideoUrl(trimmed);
}
