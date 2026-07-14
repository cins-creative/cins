import { buildVideoIframeSrc } from "@/lib/journey/video-embed";

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi;

function trimUrlTrailingPunctuation(url: string): string {
  return url.replace(/[),.;!?]+$/g, "");
}

/** URL YouTube / Vimeo / Bunny embed đầu tiên trong đoạn text. */
export function findFirstExternalVideoUrl(text: string): string | null {
  if (!text.trim()) return null;
  const matches = text.match(URL_IN_TEXT_RE);
  if (!matches) return null;
  for (const raw of matches) {
    const candidate = trimUrlTrailingPunctuation(raw);
    if (buildVideoIframeSrc(candidate)) return candidate;
  }
  return null;
}

/** Tách text hiển thị và iframe src cho tin nhắn / comment (mức 1 — không OG). */
export function parseTextWithExternalVideoEmbed(body: string): {
  displayText: string;
  iframeSrc: string | null;
  /** URL gốc (watch/share) — dùng mở tab mới từ chat. */
  videoUrl: string | null;
} {
  const trimmed = body.trim();
  if (!trimmed) {
    return { displayText: "", iframeSrc: null, videoUrl: null };
  }

  const videoUrl = findFirstExternalVideoUrl(body);
  if (!videoUrl) {
    return { displayText: body, iframeSrc: null, videoUrl: null };
  }

  const iframeSrc = buildVideoIframeSrc(videoUrl);
  if (!iframeSrc) {
    return { displayText: body, iframeSrc: null, videoUrl: null };
  }

  const urlTrimmed = videoUrl.trim();
  const isUrlOnly =
    trimmed === urlTrimmed ||
    trimmed === trimUrlTrailingPunctuation(urlTrimmed);

  const displayText = isUrlOnly
    ? ""
    : body
        .replace(videoUrl, "")
        .replace(/\s{2,}/g, " ")
        .trim();

  return { displayText, iframeSrc, videoUrl };
}
