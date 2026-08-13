import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_BASE_LEN = 72;
const MAX_TOTAL_LEN = 80;

/** Slug URL `/events/{slug}` — kebab ASCII, bỏ dấu. */
export function slugifySuKienTen(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LEN);
  return cleaned || "su-kien";
}

export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

/** Slug unique toàn cục trên `org_su_kien`. */
export async function uniqueSuKienSlug(params: {
  baseSlug: string;
  excludeId?: string | null;
}): Promise<string> {
  const admin = createServiceRoleClient();
  const base = slugifySuKienTen(params.baseSlug).slice(0, MAX_TOTAL_LEN);
  let candidate = base;
  let n = 2;
  while (n < 100) {
    let q = admin.from("org_su_kien").select("id").eq("slug", candidate).limit(1);
    if (params.excludeId) {
      q = q.neq("id", params.excludeId);
    }
    const { data, error } = await q.returns<Array<{ id: string }>>();
    if (error) {
      console.error("[su-kien] uniqueSuKienSlug", error);
      return `${base}-${Date.now().toString(36)}`.slice(0, MAX_TOTAL_LEN);
    }
    if (!data?.length) return candidate;
    candidate = `${base}-${n}`.slice(0, MAX_TOTAL_LEN);
    n += 1;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, MAX_TOTAL_LEN);
}
