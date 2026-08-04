import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getYoutubeId } from "@/lib/youtube";
import type { BaiTapModuleData } from "@/lib/to-chuc/khoa-hoc-types";

function normalizeThumbnail(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t || t.startsWith("blob:")) return null;
  return t;
}

function normalizeYoutubeUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (!getYoutubeId(t)) {
    throw new Error("Video phải là URL YouTube hợp lệ.");
  }
  return t;
}

export type BaiTapModuleFormInput = {
  tenBaiTap: string;
  moTa?: string | null;
  yeuCau?: string | null;
  videoYoutubeUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type ListBaiTapModuleOpts = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listBaiTapModule(
  orgId: string,
  opts: ListBaiTapModuleOpts = {},
): Promise<{ rows: BaiTapModuleData[]; total: number }> {
  const admin = createServiceRoleClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const q = opts.q?.trim();

  let query = admin
    .from("org_bai_tap")
    .select(
      "id, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url, cap_nhat_luc",
      { count: "exact" },
    )
    .eq("id_to_chuc", orgId)
    .order("cap_nhat_luc", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.ilike("ten_bai_tap", `%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((r) => r.id as string);
  const soBoByBai = new Map<string, number>();
  const boIdsByBai = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: ganRows, error: ganErr } = await admin
      .from("org_giao_trinh_bai")
      .select("id_bai_tap, id_bo")
      .in("id_bai_tap", ids);
    if (ganErr) throw new Error(ganErr.message);
    for (const row of ganRows ?? []) {
      const id = row.id_bai_tap as string;
      const boId = row.id_bo as string;
      soBoByBai.set(id, (soBoByBai.get(id) ?? 0) + 1);
      const list = boIdsByBai.get(id) ?? [];
      if (!list.includes(boId)) list.push(boId);
      boIdsByBai.set(id, list);
    }
  }

  const rows: BaiTapModuleData[] = (data ?? []).map((row) => ({
    id: row.id as string,
    tenBaiTap: row.ten_bai_tap as string,
    moTa: (row.mo_ta as string | null) ?? null,
    yeuCau: (row.yeu_cau as string | null) ?? null,
    videoYoutubeUrl: (row.video_youtube_url as string | null) ?? null,
    thumbnailUrl: normalizeThumbnail(
      (row.thumbnail_url as string | null) ?? null,
    ),
    soBoDangDung: soBoByBai.get(row.id as string) ?? 0,
    boIds: boIdsByBai.get(row.id as string) ?? [],
    capNhatLuc: row.cap_nhat_luc as string,
  }));

  return { rows, total: count ?? rows.length };
}

export async function createBaiTapModule(
  orgId: string,
  input: BaiTapModuleFormInput,
): Promise<BaiTapModuleData> {
  const tenBaiTap = input.tenBaiTap.trim();
  if (!tenBaiTap) throw new Error("Thiếu tên bài tập.");

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_bai_tap")
    .insert({
      id_to_chuc: orgId,
      id_khoa_hoc: null,
      ten_bai_tap: tenBaiTap,
      mo_ta: input.moTa?.trim() || null,
      yeu_cau: input.yeuCau?.trim() || null,
      video_youtube_url: normalizeYoutubeUrl(input.videoYoutubeUrl ?? null),
      thumbnail_url: normalizeThumbnail(input.thumbnailUrl),
      visible: true,
      thu_tu: 0,
    })
    .select(
      "id, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url, cap_nhat_luc",
    )
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id as string,
    tenBaiTap: data.ten_bai_tap as string,
    moTa: (data.mo_ta as string | null) ?? null,
    yeuCau: (data.yeu_cau as string | null) ?? null,
    videoYoutubeUrl: (data.video_youtube_url as string | null) ?? null,
    thumbnailUrl: normalizeThumbnail(
      (data.thumbnail_url as string | null) ?? null,
    ),
    soBoDangDung: 0,
    boIds: [],
    capNhatLuc: data.cap_nhat_luc as string,
  };
}

export async function updateBaiTapModule(
  orgId: string,
  baiId: string,
  input: Partial<BaiTapModuleFormInput>,
): Promise<BaiTapModuleData> {
  const admin = createServiceRoleClient();
  const { data: existing, error: existErr } = await admin
    .from("org_bai_tap")
    .select("id")
    .eq("id", baiId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (existErr) throw new Error(existErr.message);
  if (!existing) throw new Error("Không tìm thấy bài tập.");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.tenBaiTap !== undefined) {
    const t = input.tenBaiTap.trim();
    if (!t) throw new Error("Thiếu tên bài tập.");
    patch.ten_bai_tap = t;
  }
  if (input.moTa !== undefined) patch.mo_ta = input.moTa?.trim() || null;
  if (input.yeuCau !== undefined) patch.yeu_cau = input.yeuCau?.trim() || null;
  if (input.videoYoutubeUrl !== undefined) {
    patch.video_youtube_url = normalizeYoutubeUrl(input.videoYoutubeUrl);
  }
  if (input.thumbnailUrl !== undefined) {
    patch.thumbnail_url = normalizeThumbnail(input.thumbnailUrl);
  }

  const { data, error } = await admin
    .from("org_bai_tap")
    .update(patch)
    .eq("id", baiId)
    .eq("id_to_chuc", orgId)
    .select(
      "id, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url, cap_nhat_luc",
    )
    .single();
  if (error) throw new Error(error.message);

  const { data: ganRows, error: ganErr } = await admin
    .from("org_giao_trinh_bai")
    .select("id_bo")
    .eq("id_bai_tap", baiId);
  if (ganErr) throw new Error(ganErr.message);
  const boIds = [...new Set((ganRows ?? []).map((r) => r.id_bo as string))];

  return {
    id: data.id as string,
    tenBaiTap: data.ten_bai_tap as string,
    moTa: (data.mo_ta as string | null) ?? null,
    yeuCau: (data.yeu_cau as string | null) ?? null,
    videoYoutubeUrl: (data.video_youtube_url as string | null) ?? null,
    thumbnailUrl: normalizeThumbnail(
      (data.thumbnail_url as string | null) ?? null,
    ),
    soBoDangDung: boIds.length,
    boIds,
    capNhatLuc: data.cap_nhat_luc as string,
  };
}

export type BaiTapModuleInUse = {
  boId: string;
  tenBo: string;
};

export async function listBoUsingBaiTap(
  orgId: string,
  baiId: string,
): Promise<BaiTapModuleInUse[]> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("org_bai_tap")
    .select("id")
    .eq("id", baiId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (!existing) throw new Error("Không tìm thấy bài tập.");

  const { data: gan, error } = await admin
    .from("org_giao_trinh_bai")
    .select("id_bo, org_bo_giao_trinh!inner(id, ten_bo, id_to_chuc)")
    .eq("id_bai_tap", baiId);
  if (error) throw new Error(error.message);

  const out: BaiTapModuleInUse[] = [];
  for (const row of gan ?? []) {
    const bo = row.org_bo_giao_trinh as unknown as {
      id: string;
      ten_bo: string;
      id_to_chuc: string;
    } | null;
    if (!bo || bo.id_to_chuc !== orgId) continue;
    out.push({ boId: bo.id, tenBo: bo.ten_bo });
  }
  return out;
}

export async function deleteBaiTapModule(
  orgId: string,
  baiId: string,
  opts: { force?: boolean } = {},
): Promise<{ ok: true } | { ok: false; usedIn: BaiTapModuleInUse[] }> {
  const usedIn = await listBoUsingBaiTap(orgId, baiId);
  if (usedIn.length > 0 && !opts.force) {
    return { ok: false, usedIn };
  }

  const admin = createServiceRoleClient();
  if (usedIn.length > 0) {
    const { error: delGanErr } = await admin
      .from("org_giao_trinh_bai")
      .delete()
      .eq("id_bai_tap", baiId);
    if (delGanErr) throw new Error(delGanErr.message);
  }

  const { error } = await admin
    .from("org_bai_tap")
    .delete()
    .eq("id", baiId)
    .eq("id_to_chuc", orgId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
