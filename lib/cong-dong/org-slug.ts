import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_BASE_LEN = 64;
const MAX_TOTAL_LEN = 72;

export function slugifyOrgName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LEN);
  return cleaned || "cong-dong";
}

/** Slug org: chữ thường, số, gạch ngang — không đầu/cuối gạch. */
export const ORG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateOrgSlug(value: string): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = value.trim().toLowerCase();
  if (!slug) {
    return { ok: false, error: "Đường dẫn không được trống." };
  }
  if (slug.length > MAX_TOTAL_LEN) {
    return { ok: false, error: `Đường dẫn tối đa ${MAX_TOTAL_LEN} ký tự.` };
  }
  if (!ORG_SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: "Đường dẫn chỉ dùng chữ thường, số và dấu gạch ngang (vd. sine-art).",
    };
  }
  return { ok: true, slug };
}

export async function isOrgSlugTaken(slug: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return Boolean(data);
}

export async function uniqueOrgSlug(baseSlug: string): Promise<string> {
  const admin = createServiceRoleClient();
  let candidate = baseSlug.slice(0, MAX_TOTAL_LEN);
  let n = 2;
  while (n < 100) {
    const { data } = await admin
      .from("org_to_chuc")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    const suffix = `-${n}`;
    candidate = baseSlug.slice(0, MAX_TOTAL_LEN - suffix.length) + suffix;
    n += 1;
  }
  return `${baseSlug.slice(0, 56)}-${Date.now().toString(36)}`;
}
