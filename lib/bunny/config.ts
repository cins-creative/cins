import "server-only";

export type BunnyStreamConfig = {
  libraryId: string;
  apiKey: string;
  cdnHostname: string | null;
};

/** Đọc env Bunny Stream — hỗ trợ typo `BUNNY_CND_HOSTNAME` trong `.env.local`. */
export function getBunnyStreamConfig(): BunnyStreamConfig | null {
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  const cdnHostname =
    process.env.BUNNY_CDN_HOSTNAME?.trim() ||
    process.env.BUNNY_CND_HOSTNAME?.trim() ||
    null;

  if (!libraryId || !apiKey) return null;

  return { libraryId, apiKey, cdnHostname };
}
