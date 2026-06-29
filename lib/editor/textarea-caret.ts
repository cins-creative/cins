/**
 * Toạ độ caret (viewport) trong `<textarea>` — kỹ thuật "mirror div".
 *
 * Textarea không expose vị trí pixel của caret, nên ta dựng 1 div ẩn copy
 * đúng style + text tới vị trí caret, chèn 1 span tại caret rồi đo offset của
 * span. Dùng để neo menu gợi ý `@`/`#` ngay tại ký tự vừa gõ.
 */

const COPIED_PROPERTIES = [
  "boxSizing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "whiteSpace",
  "wordWrap",
  "wordBreak",
] as const;

/** Rect (fixed/viewport) của caret tại `index` trong textarea. width=0, height=lineHeight. */
export function getTextareaCaretRect(
  textarea: HTMLTextAreaElement,
  index: number,
): DOMRect {
  const doc = textarea.ownerDocument;
  const computed = window.getComputedStyle(textarea);
  const mirror = doc.createElement("div");
  const style = mirror.style;

  style.position = "absolute";
  style.top = "0";
  style.left = "0";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.overflow = "hidden";
  style.width = `${textarea.clientWidth}px`;
  style.height = "auto";

  for (const prop of COPIED_PROPERTIES) {
    style[prop as unknown as number] = computed[
      prop as unknown as number
    ] as string;
  }

  const value = textarea.value;
  mirror.textContent = value.slice(0, Math.max(0, index));

  const marker = doc.createElement("span");
  // Ký tự còn lại (hoặc "." khi caret ở cuối) để span có chiều cao thật.
  marker.textContent = value.slice(Math.max(0, index)) || ".";
  mirror.appendChild(marker);

  doc.body.appendChild(mirror);

  const taRect = textarea.getBoundingClientRect();
  const lineHeight =
    parseFloat(computed.lineHeight) ||
    parseFloat(computed.fontSize) * 1.3 ||
    18;
  const left = taRect.left + marker.offsetLeft - textarea.scrollLeft;
  const top = taRect.top + marker.offsetTop - textarea.scrollTop;

  doc.body.removeChild(mirror);

  return new DOMRect(left, top, 0, lineHeight);
}
