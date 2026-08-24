import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { PushNenTang, UserWebPushRow } from "@/lib/push/types";

export type DangKyFcmInput = {
  userId: string;
  token: string;
  nenTang: Extract<PushNenTang, "ios" | "android">;
  userAgent?: string | null;
};

/**
 * Upsert thiết bị FCM (ios/android) vào SoT `user_web_push`.
 * Unique theo `token` (partial index). Gỡ cờ mất hiệu lực nếu token cũ sống lại.
 */
export async function dangKyFcmThietBi(
  input: DangKyFcmInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const token = input.token.trim();
  if (!token) return { ok: false, error: "Thiếu token FCM." };
  if (input.nenTang !== "ios" && input.nenTang !== "android") {
    return { ok: false, error: "nen_tang phải là ios hoặc android." };
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: existing, error: findErr } = await admin
    .from("user_web_push")
    .select("id")
    .eq("token", token)
    .maybeSingle<{ id: string }>();

  if (findErr) {
    return { ok: false, error: findErr.message };
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from("user_web_push")
      .update({
        id_nguoi_dung: input.userId,
        nen_tang: input.nenTang,
        user_agent: input.userAgent ?? null,
        mat_hieu_luc_luc: null,
        cap_nhat_luc: now,
      })
      .eq("id", existing.id)
      .select("id")
      .single<{ id: string }>();

    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Không cập nhật được thiết bị." };
    }
    return { ok: true, id: data.id };
  }

  const { data, error } = await admin
    .from("user_web_push")
    .insert({
      id_nguoi_dung: input.userId,
      nen_tang: input.nenTang,
      token,
      endpoint: null,
      p256dh: null,
      auth: null,
      user_agent: input.userAgent ?? null,
      mat_hieu_luc_luc: null,
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? "Không đăng ký được thiết bị." };
  }
  return { ok: true, id: data.id };
}

/** Liệt kê thiết bị FCM còn hiệu lực của user (A1 — chưa gửi web push). */
export async function listFcmThietBiActive(
  userId: string,
): Promise<UserWebPushRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_web_push")
    .select(
      "id, id_nguoi_dung, nen_tang, endpoint, p256dh, auth, token, user_agent, tao_luc, cap_nhat_luc, mat_hieu_luc_luc",
    )
    .eq("id_nguoi_dung", userId)
    .in("nen_tang", ["ios", "android"])
    .is("mat_hieu_luc_luc", null)
    .not("token", "is", null);

  if (error) {
    console.error("[push/dang-ky] listFcmThietBiActive", error.message);
    return [];
  }
  return (data ?? []) as UserWebPushRow[];
}
