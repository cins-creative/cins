import "server-only";

import { getNhomById } from "@/lib/shop/nhom";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type GioiThieuCooldownStatus = {
  /** Luôn true — đã bỏ giới hạn lượt giới thiệu (2026-08-11). */
  allowed: boolean;
  cooldownDays: number;
  lastAt: string | null;
  nextAt: string | null;
  remainingMs: number;
};

/** Trạng thái nút giới thiệu — không còn cooldown. */
export async function getGioiThieuCooldown(
  ownerId: string,
  nhomId: string,
): Promise<GioiThieuCooldownStatus> {
  const nhom = await getNhomById(nhomId);
  if (!nhom || nhom.idNguoiDung !== ownerId) {
    throw new Error("FORBIDDEN");
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("shop_nhom_gioi_thieu")
    .select("tao_luc")
    .eq("id_nhom", nhomId)
    .maybeSingle<{ tao_luc: string }>();
  if (error) {
    console.error("[shop] getGioiThieuCooldown", error);
    throw new Error("LOAD_FAILED");
  }

  return {
    allowed: true,
    cooldownDays: 0,
    lastAt: data?.tao_luc ?? null,
    nextAt: null,
    remainingMs: 0,
  };
}

/**
 * Ghi mốc giới thiệu sau khi đăng bài (audit / lần gần nhất).
 * Không chặn — cho phép giới thiệu lại bất kỳ lúc nào.
 */
export async function recordGioiThieu(input: {
  ownerId: string;
  nhomId: string;
  cotMocId: string;
}): Promise<GioiThieuCooldownStatus> {
  const nhom = await getNhomById(input.nhomId);
  if (!nhom || nhom.idNguoiDung !== input.ownerId) {
    throw new Error("FORBIDDEN");
  }

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data: existing } = await admin
    .from("shop_nhom_gioi_thieu")
    .select("id_nhom")
    .eq("id_nhom", input.nhomId)
    .maybeSingle<{ id_nhom: string }>();

  if (!existing) {
    const { error } = await admin.from("shop_nhom_gioi_thieu").insert({
      id_nhom: input.nhomId,
      id_cot_moc: input.cotMocId,
      tao_luc: nowIso,
    });
    if (error) {
      console.error("[shop] recordGioiThieu insert", error);
      throw new Error("SAVE_FAILED");
    }
  } else {
    const { error } = await admin
      .from("shop_nhom_gioi_thieu")
      .update({
        id_cot_moc: input.cotMocId,
        tao_luc: nowIso,
      })
      .eq("id_nhom", input.nhomId);
    if (error) {
      console.error("[shop] recordGioiThieu update", error);
      throw new Error("SAVE_FAILED");
    }
  }

  return {
    allowed: true,
    cooldownDays: 0,
    lastAt: nowIso,
    nextAt: null,
    remainingMs: 0,
  };
}
