/** Trích ID YouTube từ URL phổ biến */
export function getYoutubeId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  const short = u.match(/youtu\.be\/([^?&]+)/);
  if (short?.[1]) return short[1];
  const watch = u.match(/[?&]v=([^&]+)/);
  if (watch?.[1]) return watch[1];
  const embed = u.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embed?.[1]) return embed[1];
  return null;
}
