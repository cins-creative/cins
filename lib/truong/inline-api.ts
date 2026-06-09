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

export async function truongInlineFetch(
  orgId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getTruongInlineUploadTokenClient();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`/api/truong/${encodeURIComponent(orgId)}${path}`, {
    ...init,
    credentials: "same-origin",
    headers,
  });
}
