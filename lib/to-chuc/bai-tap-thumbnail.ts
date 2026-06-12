/** Chuyển blob URL → data URL để lưu sessionStorage sau refresh. */
export async function persistBaiTapThumbnailUrl(
  url: string | null,
): Promise<string | null> {
  if (!url) return null;
  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }
  if (!url.startsWith("blob:")) return null;

  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function isInlineBaiTapThumbnail(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}
