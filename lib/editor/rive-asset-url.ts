export const CINS_RIVE_ASSET_PATH_PREFIX = "/api/rive-asset/";

const RIVE_OBJECT_KEY_RE =
  /^rive\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.riv$/i;

export function isValidRiveObjectKey(key: string): boolean {
  return RIVE_OBJECT_KEY_RE.test(key.trim());
}

function parseRiveAssetObjectKeyFromPathname(pathname: string): string | null {
  if (!pathname.startsWith(CINS_RIVE_ASSET_PATH_PREFIX)) return null;
  const key = pathname
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

export function parseRiveAssetObjectKeyFromUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  /* Path tương đối — lưu DB / upload dev→prod an toàn, fetch cùng origin. */
  if (trimmed.startsWith("/")) {
    const pathname = trimmed.split(/[?#]/)[0] ?? trimmed;
    return parseRiveAssetObjectKeyFromPathname(pathname);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  return parseRiveAssetObjectKeyFromPathname(parsed.pathname);
}

export function isRiveAssetEmbedUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl?.trim()) return false;
  return parseRiveAssetObjectKeyFromUrl(rawUrl) !== null;
}

/** URL lưu block embed — luôn path tương đối, không phụ thuộc host upload. */
export function buildRiveAssetRelativeUrl(objectKey: string): string {
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${CINS_RIVE_ASSET_PATH_PREFIX}${encodedPath}`;
}

export function buildRiveAssetPublicUrl(
  objectKey: string,
  origin: string,
): string {
  return `${origin.replace(/\/$/, "")}${buildRiveAssetRelativeUrl(objectKey)}`;
}
