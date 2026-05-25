import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";

export function assertTruongInlineApi(request: Request): Response | null {
  if (!isInlineArticleEditEnabled()) {
    return Response.json(
      { error: "Inline edit disabled on this environment." },
      { status: 403 },
    );
  }

  const token = process.env.ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Missing ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!bearer || bearer !== token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

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
    headers,
  });
}
