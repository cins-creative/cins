export const CINS_LOTTIE_ASSET_PATH_PREFIX = "/api/lottie-asset/";

const LOTTIE_OBJECT_KEY_RE =
  /^lottie\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(lottie|json)$/i;

export function isValidLottieObjectKey(key: string): boolean {
  return LOTTIE_OBJECT_KEY_RE.test(key.trim());
}

function parseLottieAssetObjectKeyFromPathname(pathname: string): string | null {
  if (!pathname.startsWith(CINS_LOTTIE_ASSET_PATH_PREFIX)) return null;
  const key = pathname
    .slice(CINS_LOTTIE_ASSET_PATH_PREFIX.length)
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
  return isValidLottieObjectKey(key) ? key : null;
}

export function parseLottieAssetObjectKeyFromUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    const pathname = trimmed.split(/[?#]/)[0] ?? trimmed;
    return parseLottieAssetObjectKeyFromPathname(pathname);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  return parseLottieAssetObjectKeyFromPathname(parsed.pathname);
}

export function isLottieAssetEmbedUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl?.trim()) return false;
  return parseLottieAssetObjectKeyFromUrl(rawUrl) !== null;
}

/** URL lưu block embed — luôn path tương đối, không phụ thuộc host upload. */
export function buildLottieAssetRelativeUrl(objectKey: string): string {
  const encodedPath = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${CINS_LOTTIE_ASSET_PATH_PREFIX}${encodedPath}`;
}

export function buildLottieAssetPublicUrl(
  objectKey: string,
  origin: string,
): string {
  return `${origin.replace(/\/$/, "")}${buildLottieAssetRelativeUrl(objectKey)}`;
}
