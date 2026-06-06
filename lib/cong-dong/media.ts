import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đảm bảo `content_media` tồn tại cho Cloudflare image id. */
export async function ensureContentMediaIds(
  cloudflareIds: string[],
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const mediaUuids: string[] = [];

  for (const raw of cloudflareIds) {
    const cfId = raw.trim();
    if (!CF_UUID_RE.test(cfId)) continue;

    const { data: existing } = await admin
      .from("content_media")
      .select("id")
      .eq("cloudflare_id", cfId)
      .maybeSingle<{ id: string }>();

    if (existing?.id) {
      mediaUuids.push(existing.id);
      continue;
    }

    const { data: inserted, error } = await admin
      .from("content_media")
      .insert({ cloudflare_id: cfId, loai: "anh" })
      .select("id")
      .single<{ id: string }>();

    if (!error && inserted?.id) {
      mediaUuids.push(inserted.id);
    }
  }

  return mediaUuids;
}
