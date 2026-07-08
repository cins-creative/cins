import "server-only";

/** Xóa ảnh khỏi Cloudflare Images (best-effort — không throw). */
export async function deleteCloudflareImage(
  imageId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = imageId.trim();
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim();
  if (!id || !cfAccount || !cfToken) {
    return { ok: false, error: "Thiếu cấu hình Cloudflare Images." };
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/images/v1/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cfToken}` },
      },
    );

    if (res.ok) return { ok: true };

    const json = (await res.json().catch(() => null)) as {
      errors?: Array<{ code?: number; message?: string }>;
    } | null;
    const notFound = json?.errors?.some((e) => e.code === 10003);
    if (res.status === 404 || notFound) return { ok: true };

    return {
      ok: false,
      error: json?.errors?.[0]?.message ?? `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không xóa được ảnh.",
    };
  }
}
