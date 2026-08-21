/**
 * Gõ `:)` trong ô soạn chat → 🙂 (cùng glyph catalog Cảm xúc).
 * Không đụng `http://` (`:/` sau chữ cái hoặc trước `/` thứ hai).
 */

const EMOTICON_PAIRS: [string, string][] = [
  ["</3", "💔"],
  [">:(", "😠"],
  [">:)", "😈"],
  [":'(", "😢"],
  [":-)", "🙂"],
  [":-(", "🙁"],
  [":-D", "😃"],
  [":-P", "😛"],
  [":-p", "😛"],
  [":-o", "😮"],
  [":-O", "😮"],
  [";-)", "😉"],
  [":-/", "😕"],
  [":-\\", "😕"],
  ["<3", "❤️"],
  [":)", "🙂"],
  [":(", "🙁"],
  [":D", "😃"],
  [":P", "😛"],
  [":p", "😛"],
  [":o", "😮"],
  [":O", "😮"],
  [";)", "😉"],
  [":*", "😘"],
  [":|", "😐"],
  ["xD", "😆"],
  ["XD", "😆"],
  ["B)", "😎"],
  ["=)", "🙂"],
  ["=D", "😃"],
  [":/", "😕"],
  [":\\", "😕"],
];
const EMOTICON_TO_EMOJI = EMOTICON_PAIRS.sort(
  (a, b) => b[0].length - a[0].length,
);

const SCHEME_SLASH = new Set([":/", ":-/", ":\\", ":-\\"]);

function isAsciiLetter(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

function matchEmoticonAt(
  text: string,
  i: number,
): { token: string; emoji: string } | null {
  for (const [token, emoji] of EMOTICON_TO_EMOJI) {
    if (!text.startsWith(token, i)) continue;
    if (SCHEME_SLASH.has(token)) {
      if (isAsciiLetter(text[i - 1])) continue;
      if (text[i + token.length] === "/") continue;
    }
    return { token, emoji };
  }
  return null;
}

export function replaceChatEmoticons(
  text: string,
  caret: number,
): { value: string; caret: number } {
  let out = "";
  let i = 0;
  let nextCaret = caret;

  while (i < text.length) {
    const hit = matchEmoticonAt(text, i);
    if (!hit) {
      out += text[i];
      i += 1;
      continue;
    }
    const tokenEnd = i + hit.token.length;
    out += hit.emoji;
    if (i < caret) {
      if (caret <= tokenEnd) nextCaret = out.length;
      else nextCaret += hit.emoji.length - hit.token.length;
    }
    i = tokenEnd;
  }

  return { value: out, caret: Math.max(0, Math.min(nextCaret, out.length)) };
}
