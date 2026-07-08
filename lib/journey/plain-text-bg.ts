import type { Block } from "@/lib/editor/types";

/** Nền card «chỉ chữ» — lưu trong `config.chiChuNen` của block `body` đầu tiên. */
export const CHI_CHU_NEN_COUNT = 6;

export const CHI_CHU_NEN_IDS = [0, 1, 2, 3, 4, 5] as const;

export type ChiChuNenId = (typeof CHI_CHU_NEN_IDS)[number];

export const CHI_CHU_NEN_LABELS: Record<ChiChuNenId, string> = {
  0: "Xanh CINs",
  1: "Mint",
  2: "Tím",
  3: "Cam",
  4: "Vàng",
  5: "Xanh đậm",
};

const LEGACY_CONFIG_KEY = "textPanelTone";

export function isChiChuNenId(value: unknown): value is ChiChuNenId {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < CHI_CHU_NEN_COUNT
  );
}

export function defaultChiChuNen(seed: string): ChiChuNenId {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % CHI_CHU_NEN_COUNT) as ChiChuNenId;
}

function readChiChuNenFromBlock(block: Block): ChiChuNenId | null {
  const tone = block.config?.chiChuNen ?? block.config?.[LEGACY_CONFIG_KEY];
  return isChiChuNenId(tone) ? tone : null;
}

export function readChiChuNenFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): ChiChuNenId | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "body") continue;
    return readChiChuNenFromBlock(block);
  }
  return null;
}

export function resolveChiChuNen(
  blocks: ReadonlyArray<Block> | null | undefined,
  seed: string,
): ChiChuNenId {
  return readChiChuNenFromBlocks(blocks) ?? defaultChiChuNen(seed);
}

export function chiChuNenClass(nen: ChiChuNenId): string {
  return `jcard-chi-chu--nen-${nen}`;
}

export function chiChuUsesLightInk(nen: ChiChuNenId): boolean {
  return nen === 4;
}

/** Tách đoạn card chỉ chữ (blank line giữa các đoạn). */
export function splitChiChuParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Một đoạn → căn giữa; từ hai đoạn trở lên → căn trái. */
export function chiChuUsesCenterAlign(paragraphCount: number): boolean {
  return paragraphCount <= 1;
}

const CHI_CHU_COLLAPSE_CHARS = 260;
const CHI_CHU_COLLAPSE_PARAS = 3;

/** Nội dung dài — mặc định thu gọn, bấm «Xem đầy đủ» mới xổ hết. */
export function chiChuNeedsCollapse(
  text: string,
  paragraphCount: number,
): boolean {
  if (paragraphCount >= CHI_CHU_COLLAPSE_PARAS) return true;
  return text.length > CHI_CHU_COLLAPSE_CHARS;
}

export function applyChiChuNenToBlocks(
  blocks: ReadonlyArray<Block>,
  nen: ChiChuNenId,
): Block[] | null {
  let touched = false;
  const next = blocks.map((block) => {
    if (block.loai !== "body" || touched) return block;
    touched = true;
    const config = { ...(block.config ?? {}) };
    config.chiChuNen = nen;
    delete config[LEGACY_CONFIG_KEY];
    return {
      ...block,
      config,
    };
  });
  return touched ? next : null;
}
