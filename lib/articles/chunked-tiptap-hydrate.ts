import type { Editor } from "@tiptap/react";

/** Nhường main thread giữa các lần parse Tiptap. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });
}

/** Tách HTML bài nghề thành các khối `<section>` — parse từng phần tránh đơ UI. */
export function splitHtmlForChunkedHydrate(html: string): string[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const bySection = trimmed
    .split(/(?=<section\s)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (bySection.length > 1) return bySection;

  if (trimmed.length > 5000) {
    const chunks: string[] = [];
    const size = 3500;
    for (let i = 0; i < trimmed.length; i += size) {
      chunks.push(trimmed.slice(i, i + size));
    }
    return chunks;
  }

  return [trimmed];
}

export async function hydrateEditorInChunks(
  ed: Editor,
  html: string,
  isStale: () => boolean,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const chunks = splitHtmlForChunkedHydrate(html);
  if (chunks.length === 0) return;

  for (let i = 0; i < chunks.length; i++) {
    if (isStale() || ed.isDestroyed) return;
    onProgress?.(i + 1, chunks.length);
    if (i === 0) {
      ed.commands.setContent(chunks[i]!, { emitUpdate: false });
    } else {
      ed.commands.insertContent(chunks[i]!);
    }
    if (i < chunks.length - 1) {
      await yieldToMain();
    }
  }
}
