import "server-only";

import { getNhomById } from "@/lib/shop/nhom";
import { SHOP_GIOI_THIEU_COOLDOWN_DAYS } from "@/lib/shop/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type GioiThieuCooldownStatus = {
  allowed: boolean;
  cooldownDays: number;
  lastAt: string | null;
  nextAt: string | null;
  remainingMs: number;
};

function cooldownMs(): number {
  return SHOP_GIOI_THIEU_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

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

  const lastAt = data?.tao_luc ?? null;
  if (!lastAt) {
    return {
      allowed: true,
      cooldownDays: SHOP_GIOI_THIEU_COOLDOWN_DAYS,
      lastAt: null,
      nextAt: null,
      remainingMs: 0,
    };
  }

  const lastMs = new Date(lastAt).getTime();
  const nextMs = lastMs + cooldownMs();
  const remainingMs = Math.max(0, nextMs - Date.now());
  return {
    allowed: remainingMs <= 0,
    cooldownDays: SHOP_GIOI_THIEU_COOLDOWN_DAYS,
    lastAt,
    nextAt: new Date(nextMs).toISOString(),
    remainingMs,
  };
}

/**
 * Ghi mốc giới thiệu sau khi đăng bài.
 * Trả COOLDOWN nếu còn trong 3 ngày (atomic — không đè bản ghi mới).
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

  const status = await getGioiThieuCooldown(input.ownerId, input.nhomId);
  if (!status.allowed) {
    throw new Error("COOLDOWN");
  }

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - cooldownMs()).toISOString();

  /* Upsert: chỉ cập nhật khi chưa có hoặc đã hết cooldown. */
  const { data: existing } = await admin
    .from("shop_nhom_gioi_thieu")
    .select("id_nhom, tao_luc")
    .eq("id_nhom", input.nhomId)
    .maybeSingle<{ id_nhom: string; tao_luc: string }>();

  if (!existing) {
    const { error } = await admin.from("shop_nhom_gioi_thieu").insert({
      id_nhom: input.nhomId,
      id_cot_moc: input.cotMocId,
      tao_luc: nowIso,
    });
    if (error) {
      /* Race insert — đọc lại. */
      const again = await getGioiThieuCooldown(input.ownerId, input.nhomId);
      if (!again.allowed) throw new Error("COOLDOWN");
      console.error("[shop] recordGioiThieu insert", error);
      throw new Error("SAVE_FAILED");
    }
  } else {
    const { data: updated, error } = await admin
      .from("shop_nhom_gioi_thieu")
      .update({
        id_cot_moc: input.cotMocId,
        tao_luc: nowIso,
      })
      .eq("id_nhom", input.nhomId)
      .lt("tao_luc", cutoffIso)
      .select("id_nhom")
      .maybeSingle<{ id_nhom: string }>();
    if (error) {
      console.error("[shop] recordGioiThieu update", error);
      throw new Error("SAVE_FAILED");
    }
    if (!updated) {
      throw new Error("COOLDOWN");
    }
  }

  return {
    allowed: false,
    cooldownDays: SHOP_GIOI_THIEU_COOLDOWN_DAYS,
    lastAt: nowIso,
    nextAt: new Date(Date.now() + cooldownMs()).toISOString(),
    remainingMs: cooldownMs(),
  };
}
