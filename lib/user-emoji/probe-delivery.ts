/** HEAD delivery URL — phân biệt ảnh mất (404) vs lỗi tạm (không chắc). */
export async function probeCfImageDelivery(
  url: string | null | undefined,
): Promise<"live" | "missing" | "unknown"> {
  if (!url) return "missing";
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(2500),
    });
    if (res.status === 404) return "missing";
    if (res.ok) return "live";
    return "unknown";
  } catch {
    return "unknown";
  }
}
