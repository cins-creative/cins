/** URL YouTube Shorts (`/shorts/…`) hoặc dạng dọc 9:16. */
export function isYoutubeShortUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return /youtube\.com\/shorts\//i.test(url.trim());
}

/** Trích ID YouTube từ URL phổ biến (watch, embed, shorts, live, youtu.be). */
export function getYoutubeId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  const short = u.match(/youtu\.be\/([^?&/]+)/);
  if (short?.[1]) return short[1];
  const watch = u.match(/[?&]v=([^&]+)/);
  if (watch?.[1]) return watch[1];
  const embed = u.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embed?.[1]) return embed[1];
  const shorts = u.match(/youtube\.com\/shorts\/([^?&/]+)/);
  if (shorts?.[1]) return shorts[1];
  const live = u.match(/youtube\.com\/live\/([^?&/]+)/);
  if (live?.[1]) return live[1];
  return null;
}
