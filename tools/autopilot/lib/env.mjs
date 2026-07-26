import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export function laySupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL");
  return url.replace(/\/$/, "");
}

export function layServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

/** Site origin cho worker — bắt buộc set env; không hardcode URL trong repo. */
export function laySiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) throw new Error("Thiếu NEXT_PUBLIC_SITE_URL");
  return url.replace(/\/$/, "");
}

export function layNoiBoDangBaiSecret() {
  return process.env.CINS_NOI_BO_DANG_BAI_SECRET?.trim() || "";
}
