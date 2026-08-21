import type { ChatMessage } from "@/lib/chat/types";

function graphemesOf(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(
      (part) => part.segment,
    );
  }
  return Array.from(text);
}

function isEmojiGrapheme(g: string): boolean {
  if (!g) return false;
  return /\p{Extended_Pictographic}/u.test(g);
}

/** Body chỉ gồm đúng 1 emoji (ZWJ/skin tone = 1 cụm). */
export function isChatSoloEmojiBody(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const parts = graphemesOf(trimmed);
  return parts.length === 1 && isEmojiGrapheme(parts[0]!);
}

export function isChatSoloEmojiMessage(msg: ChatMessage): boolean {
  if (msg.deleted) return false;
  if (msg.kind && msg.kind !== "text") return false;
  if (msg.nguCanh) return false;
  if (msg.imageId || msg.imageUrl || msg.videoKey || msg.videoUrl) return false;
  if (msg.poll) return false;
  return isChatSoloEmojiBody(msg.body);
}
