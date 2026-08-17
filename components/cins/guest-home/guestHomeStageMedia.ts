/** URL ảnh stage — để trống = ô placeholder. Gắn CDN khi có file. */
export const guestHomeStageMedia: Record<string, string> = {
  "art-1": "",
  "art-2": "",
  "art-3": "",
  "art-4": "",
  "art-5": "",
  "art-6": "",
  "art-7": "",
};

export const STAGE_TILES = [
  { id: "art-1", aspectRatio: "4 / 5" },
  { id: "art-2", aspectRatio: "1 / 1" },
  { id: "art-3", aspectRatio: "3 / 4" },
  { id: "art-4", aspectRatio: "5 / 6" },
  { id: "art-5", aspectRatio: "4 / 5" },
  { id: "art-6", aspectRatio: "1 / 1" },
  { id: "art-7", aspectRatio: "16 / 10" },
] as const;

export type StageTileId = (typeof STAGE_TILES)[number]["id"];

export function stageMediaSrc(id: StageTileId): string | undefined {
  const value = guestHomeStageMedia[id]?.trim();
  return value || undefined;
}
