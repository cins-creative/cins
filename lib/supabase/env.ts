/**
 * Đọc env Supabase đã trim — tránh lỗi `fetch failed` do khoảng trắng / xuống dòng trong .env.
 */
export function getTrimmedSupabaseUrl(): string | null {
  const u =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  return u || null;
}

export function getTrimmedSupabaseAnonKey(): string | null {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return k || null;
}

export function hasSupabaseEnv(): boolean {
  const u = getTrimmedSupabaseUrl();
  const k = getTrimmedSupabaseAnonKey();
  if (!u || !k) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
