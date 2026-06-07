"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/journey/action-result";
import {
  uiKeyToDbEnum,
  type LoaiMocFilterKey,
} from "@/lib/journey/filter-visibility";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ALLOWED_FILTER_KEYS = new Set<string>([
  "hoc",
  "lam",
  "du-an",
  "su-kien",
  "thanh-tuu",
  "ca-nhan",
]);

/** Toggle Journey filter visibility (public ↔ private) per loai_moc group. */
export async function updateLoaiMocVisibility(
  uiKey: string,
  visibility: "public" | "private",
): Promise<ActionResult<null>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!ALLOWED_FILTER_KEYS.has(uiKey)) {
    return { ok: false, error: "Filter key không hợp lệ." };
  }
  if (visibility !== "public" && visibility !== "private") {
    return { ok: false, error: "Giá trị visibility không hợp lệ." };
  }

  const dbEnum = uiKeyToDbEnum(uiKey as LoaiMocFilterKey);
  if (!dbEnum) {
    return { ok: false, error: "Filter key không map sang loai_moc_enum." };
  }

  const admin = createServiceRoleClient();

  const { data: row, error: readErr } = await admin
    .from("user_nguoi_dung")
    .select("journey_loai_moc_visibility")
    .eq("id", session.profile.id)
    .maybeSingle<{ journey_loai_moc_visibility: Record<string, unknown> | null }>();
  if (readErr) {
    console.error("[updateLoaiMocVisibility] read err:", readErr);
    return { ok: false, error: "Không đọc được hồ sơ." };
  }
  const current = (row?.journey_loai_moc_visibility ?? {}) as Record<
    string,
    unknown
  >;
  const next = { ...current, [dbEnum]: visibility };

  const { error: writeErr } = await admin
    .from("user_nguoi_dung")
    .update({ journey_loai_moc_visibility: next })
    .eq("id", session.profile.id);
  if (writeErr) {
    console.error("[updateLoaiMocVisibility] write err:", writeErr);
    return { ok: false, error: "Không lưu được tuỳ chọn." };
  }

  revalidatePath(`/${session.profile.slug}`);
  return { ok: true, data: null };
}
