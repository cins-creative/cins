/** Nguồn mốc chat — client-safe. */

export type ChatMocNguon = "thu_cong" | "lich_lop";

export function normalizeMocNguon(raw: unknown): ChatMocNguon {
  return raw === "lich_lop" ? "lich_lop" : "thu_cong";
}
