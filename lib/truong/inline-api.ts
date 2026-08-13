export function getTruongInlineUploadTokenClient(): string | null {
  if (typeof window === "undefined") return null;
  return process.env.NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN?.trim() || null;
}

export async function readTruongInlineError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string };
    if (json.error?.trim()) return json.error.trim();
  } catch {
    /* ignore */
  }
  return res.statusText || "Yêu cầu thất bại";
}

/**
 * Fetch API inline org. Auth = cookie phiên (`credentials: same-origin`).
 * Không gắn Bearer token upload — secret đó chỉ cho `/upload` / ảnh; gắn
 * lên mọi request làm `getCurrentSessionAndProfile` nuốt cookie.
 */
export async function truongInlineFetch(
  orgId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`/api/university/${encodeURIComponent(orgId)}${path}`, {
    ...init,
    credentials: "same-origin",
    headers,
  });
}
