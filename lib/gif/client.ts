import type { GifPage, GifResult } from "@/lib/gif/types";

export type { GifPage, GifResult };

export class GifClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "GifClientError";
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<GifClientError> {
  const text = await res.text().catch(() => "");
  let json: { error?: string; code?: string } | null = null;
  try {
    json = text ? (JSON.parse(text) as { error?: string; code?: string }) : null;
  } catch {
    json = null;
  }
  const html = /^\s*</.test(text);
  return new GifClientError(
    json?.error?.trim() ||
      (html
        ? "Không tải được GIF trên trang này."
        : `Lỗi GIF (${res.status}).`),
    res.status,
    json?.code,
  );
}

export async function fetchGifSearch(opts: {
  q: string;
  pos?: string | null;
}): Promise<GifPage> {
  const qs = new URLSearchParams();
  if (opts.q.trim()) qs.set("q", opts.q.trim());
  if (opts.pos?.trim()) qs.set("pos", opts.pos.trim());
  const res = await fetch(`/api/gif/search?${qs.toString()}`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as GifPage;
}

export async function fetchGifFeatured(opts?: {
  pos?: string | null;
}): Promise<GifPage> {
  const qs = new URLSearchParams();
  if (opts?.pos?.trim()) qs.set("pos", opts.pos.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/gif/featured${suffix}`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as GifPage;
}

export async function importGifToCloudflare(opts: {
  url: string;
  id?: string;
}): Promise<{ imageId: string; url: string }> {
  const res = await fetch("/api/gif/import", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: opts.url,
      ...(opts.id ? { id: opts.id } : {}),
    }),
  });
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as { imageId: string; url: string };
  return json;
}
