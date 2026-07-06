/** Seed picsum cho ảnh dummy trong editor — prefix `lib-` không persist khi publish. */
export const EDITOR_STOCK_IMAGE_SEEDS = [
  "lib-cins-hoa",
  "lib-cins-la",
  "lib-cins-may",
  "lib-cins-troi",
  "lib-cins-song",
  "lib-cins-nui",
  "lib-cins-rung",
  "lib-cins-bien",
  "lib-cins-co",
  "lib-cins-nang",
] as const;

export function pickEditorStockImageSeed(blockId: string): string {
  let hash = 0;
  for (let i = 0; i < blockId.length; i += 1) {
    hash = (hash * 31 + blockId.charCodeAt(i)) >>> 0;
  }
  return EDITOR_STOCK_IMAGE_SEEDS[hash % EDITOR_STOCK_IMAGE_SEEDS.length]!;
}
