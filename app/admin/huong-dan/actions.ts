"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import {
  createHuongDanNhom,
  saveHuongDanPhien,
  softDeleteHuongDanNhom,
  softDeleteHuongDanPhien,
  updateHuongDanNhomMeta,
  type CreateHuongDanNhomInput,
  type SaveHuongDanPhienInput,
} from "@/lib/huong-dan/huong-dan";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

async function requireHuongDanAdmin(): Promise<
  | { ok: true; editorId: string | null }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return { ok: false, message: "Chỉ admin / super_admin được quản lý hướng dẫn." };
  }
  const session = await getCurrentSessionAndProfile();
  return { ok: true, editorId: session?.profile?.id ?? null };
}

function revalidateHuongDan() {
  revalidatePath("/admin/huong-dan");
  revalidatePath("/ho-tro");
  revalidatePath("/ho-tro/huong-dan");
}

export async function adminCreateHuongDanNhom(
  input: CreateHuongDanNhomInput,
): Promise<{ ok: true; nhomSlug: string } | { ok: false; message: string }> {
  const gate = await requireHuongDanAdmin();
  if (!gate.ok) return gate;
  const result = await createHuongDanNhom(input, gate.editorId);
  if (!result.ok) return { ok: false, message: result.error };
  revalidateHuongDan();
  return { ok: true, nhomSlug: result.nhomSlug };
}

export async function adminUpdateHuongDanNhomMeta(input: {
  nhomSlug: string;
  nhomTen?: string;
  nhomThuTu?: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireHuongDanAdmin();
  if (!gate.ok) return gate;
  const result = await updateHuongDanNhomMeta({
    ...input,
    editorId: gate.editorId,
  });
  if (!result.ok) return { ok: false, message: result.error };
  revalidateHuongDan();
  return { ok: true };
}

export async function adminSaveHuongDanPhien(
  input: SaveHuongDanPhienInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await requireHuongDanAdmin();
  if (!gate.ok) return gate;
  const result = await saveHuongDanPhien(input, gate.editorId);
  if (!result.ok) return { ok: false, message: result.error };
  revalidateHuongDan();
  return { ok: true, id: result.id };
}

export async function adminDeleteHuongDanPhien(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireHuongDanAdmin();
  if (!gate.ok) return gate;
  const result = await softDeleteHuongDanPhien(id, gate.editorId);
  if (!result.ok) return { ok: false, message: result.error };
  revalidateHuongDan();
  return { ok: true };
}

export async function adminDeleteHuongDanNhom(
  nhomSlug: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireHuongDanAdmin();
  if (!gate.ok) return gate;
  const result = await softDeleteHuongDanNhom(nhomSlug, gate.editorId);
  if (!result.ok) return { ok: false, message: result.error };
  revalidateHuongDan();
  return { ok: true };
}
