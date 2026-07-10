export const CINS_RIVE_ASSET_PATH_PREFIX = "/api/rive-asset/";

const RIVE_OBJECT_KEY_RE =
  /^rive\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.riv$/i;

export function isValidRiveObjectKey(key: string): boolean {
  return RIVE_OBJECT_KEY_RE.test(key.trim());
}

export function parseRiveAssetObjectKeyFromUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!parsed.pathname.startsWith(CINS_RIVE_ASSET_PATH_PREFIX)) return null;
  const key = parsed.pathname
    .slice(CINS_RIVE_ASSET_PATH_PREFIX.length)
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
  return isValidRiveObjectKey(key) ? key : null;
}

export function isRiveAssetEmbedUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl?.trim()) return false;
  return parseRiveAssetObjectKeyFromUrl(rawUrl) !== null;
}

export function buildRiveAssetPublicUrl(
  objectKey: string,
  origin: string,
): string {
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${origin.replace(/\/$/, "")}${CINS_RIVE_ASSET_PATH_PREFIX}${encodedPath}`;
}
