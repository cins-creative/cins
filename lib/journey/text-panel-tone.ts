import type { Block } from "@/lib/editor/types";

/** Lưu trong `config.textPanelTone` của block `body` đầu tiên. */
export const TEXT_PANEL_TONE_COUNT = 6;

export const TEXT_PANEL_TONE_IDS = [0, 1, 2, 3, 4, 5] as const;

export type TextPanelToneId = (typeof TEXT_PANEL_TONE_IDS)[number];

export const TEXT_PANEL_TONE_LABELS: Record<TextPanelToneId, string> = {
  0: "Xanh CINs",
  1: "Mint",
  2: "Tím",
  3: "Cam",
  4: "Vàng",
  5: "Xanh đậm",
};

export function isTextPanelToneId(value: unknown): value is TextPanelToneId {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < TEXT_PANEL_TONE_COUNT
  );
}

export function defaultTextPanelTone(seed: string): TextPanelToneId {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % TEXT_PANEL_TONE_COUNT) as TextPanelToneId;
}

export function readTextPanelToneFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): TextPanelToneId | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "body") continue;
    const tone = block.config?.textPanelTone;
    if (isTextPanelToneId(tone)) return tone;
    break;
  }
  return null;
}

export function resolveTextPanelTone(
  blocks: ReadonlyArray<Block> | null | undefined,
  seed: string,
): TextPanelToneId {
  return readTextPanelToneFromBlocks(blocks) ?? defaultTextPanelTone(seed);
}

export function textPanelToneClass(tone: TextPanelToneId): string {
  return `jcard-text-panel--tone-${tone}`;
}

export function textPanelUsesLightInk(tone: TextPanelToneId): boolean {
  return tone === 4;
}

/** Tách đoạn văn panel chữ (blank line giữa các đoạn). */
export function splitTextPanelParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Một đoạn → căn giữa; từ hai đoạn trở lên → căn trái. */
export function textPanelUsesCenterAlign(paragraphCount: number): boolean {
  return paragraphCount <= 1;
}

const TEXT_PANEL_COLLAPSE_CHARS = 260;
const TEXT_PANEL_COLLAPSE_PARAS = 3;

/** Nội dung dài — mặc định thu gọn, bấm «Xem thêm» mới xổ hết. */
export function textPanelNeedsCollapse(
  text: string,
  paragraphCount: number,
): boolean {
  if (paragraphCount >= TEXT_PANEL_COLLAPSE_PARAS) return true;
  return text.length > TEXT_PANEL_COLLAPSE_CHARS;
}

export function applyTextPanelToneToBlocks(
  blocks: ReadonlyArray<Block>,
  tone: TextPanelToneId,
): Block[] | null {
  let touched = false;
  const next = blocks.map((block) => {
    if (block.loai !== "body" || touched) return block;
    touched = true;
    return {
      ...block,
      config: {
        ...(block.config ?? {}),
        textPanelTone: tone,
      },
    };
  });
  return touched ? next : null;
}
