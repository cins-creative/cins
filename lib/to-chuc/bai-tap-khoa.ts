import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { canViewerManageKhoaHoc } from "./khoa-hoc";
import {
  ensureBoForKhoa,
  syncBoGiaoTrinhBai,
} from "./bo-giao-trinh";
import { createBaiTapModule } from "./bai-tap-module";
import type {
  BaiTapKhoaData,
  BaiTapSectionDisplayMode,
  LoaiBaiGiaoTrinh,
} from "./khoa-hoc-types";
import {
  BAI_TAP_SECTION_DISPLAY_DEFAULT,
  isLoaiBaiGiaoTrinh,
} from "./khoa-hoc-types";

type BaiTapRow = {
  id: string;
  id_giao_trinh: string | null;
  ten_bai_tap: string;
  mo_ta: string | null;
  yeu_cau?: string | null;
  video_youtube_url: string | null;
  thumbnail_url: string | null;
  visible: boolean | null;
  thu_tu: number | null;
};

function isMissingBaiTapSchema(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("org_bai_tap") ||
    m.includes("org_giao_trinh_bai") ||
    m.includes("id_bo_giao_trinh") ||
    m.includes("bai_tap_hien_thi") ||
    m.includes("does not exist") ||
    m.includes("could not find")
  );
}

function normalizeDisplayMode(value: unknown): BaiTapSectionDisplayMode {
  if (value === "an" || value === "mot_phan" || value === "day_du") {
    return value;
  }
  return BAI_TAP_SECTION_DISPLAY_DEFAULT;
}

function normalizeThumbnail(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t || t.startsWith("blob:")) return null;
  return t;
}

async function assertKhoaInOrg(
  orgId: string,
  khoaId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function fetchBaiTapViaBo(
  boId: string,
): Promise<BaiTapKhoaData[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_giao_trinh_bai")
    .select(
      "thuoc_tinh, thu_tu, org_bai_tap!inner(id, id_giao_trinh, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url)",
    )
    .eq("id_bo", boId)
    .order("thu_tu", { ascending: true });

  if (error) {
    if (isMissingBaiTapSchema(error.message)) return [];
    return [];
  }

  return (data ?? []).map((row) => {
    const bt = row.org_bai_tap as unknown as {
      id: string;
      id_giao_trinh: string | null;
      ten_bai_tap: string;
      mo_ta: string | null;
      yeu_cau: string | null;
      video_youtube_url: string | null;
      thumbnail_url: string | null;
    };
    const thuocTinh: LoaiBaiGiaoTrinh = isLoaiBaiGiaoTrinh(row.thuoc_tinh)
      ? row.thuoc_tinh
      : "bai_tap";
    return {
      id: bt.id,
      tenBaiTap: bt.ten_bai_tap,
      moTa: bt.mo_ta,
      yeuCau: bt.yeu_cau,
      videoYoutubeUrl: bt.video_youtube_url,
      thumbnailUrl: normalizeThumbnail(bt.thumbnail_url),
      giaoTrinhBaiId: bt.id_giao_trinh,
      visible: true,
      thuocTinh,
    };
  });
}

async function fetchBaiTapLegacyByKhoa(
  khoaId: string,
): Promise<BaiTapKhoaData[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_bai_tap")
    .select(
      "id, id_giao_trinh, ten_bai_tap, mo_ta, yeu_cau, video_youtube_url, thumbnail_url, visible, thu_tu",
    )
    .eq("id_khoa_hoc", khoaId)
    .eq("visible", true)
    .order("thu_tu", { ascending: true });

  if (error) {
    if (isMissingBaiTapSchema(error.message)) return [];
    return [];
  }

  return ((data ?? []) as BaiTapRow[]).map((row) => ({
    id: row.id,
    tenBaiTap: row.ten_bai_tap,
    moTa: row.mo_ta,
    yeuCau: row.yeu_cau ?? null,
    videoYoutubeUrl: row.video_youtube_url,
    thumbnailUrl: normalizeThumbnail(row.thumbnail_url),
    giaoTrinhBaiId: row.id_giao_trinh,
    visible: row.visible ?? true,
    thuocTinh: "bai_tap" as const,
  }));
}

export async function fetchBaiTapKhoa(
  khoaId: string,
): Promise<BaiTapKhoaData[]> {
  const admin = createServiceRoleClient();
  const { data: khoa, error } = await admin
    .from("org_khoa_hoc")
    .select("id_bo_giao_trinh")
    .eq("id", khoaId)
    .maybeSingle();

  if (error) {
    if (isMissingBaiTapSchema(error.message)) {
      return fetchBaiTapLegacyByKhoa(khoaId);
    }
    return [];
  }

  const boId = khoa?.id_bo_giao_trinh as string | null | undefined;
  if (boId) return fetchBaiTapViaBo(boId);
  return fetchBaiTapLegacyByKhoa(khoaId);
}

export async function fetchBaiTapDisplayMode(
  khoaId: string,
): Promise<BaiTapSectionDisplayMode> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_khoa_hoc")
    .select("bai_tap_hien_thi")
    .eq("id", khoaId)
    .maybeSingle();

  if (error?.message && isMissingBaiTapSchema(error.message)) {
    return BAI_TAP_SECTION_DISPLAY_DEFAULT;
  }

  return normalizeDisplayMode(data?.bai_tap_hien_thi);
}

/**
 * @deprecated Prefer module library + syncBoGiaoTrinhBai.
 * Compat: tạo module thiếu + gán vào bộ của khóa (đảm bảo bộ tồn tại).
 */
export async function syncBaiTapKhoa(
  orgId: string,
  khoaId: string,
  actorId: string,
  list: BaiTapKhoaData[],
): Promise<{ ok: true; baiTap: BaiTapKhoaData[] } | { ok: false; error: string }> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền sửa bài tập." };
  }
  if (!(await assertKhoaInOrg(orgId, khoaId))) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  try {
    const boId = await ensureBoForKhoa(orgId, khoaId);
    const admin = createServiceRoleClient();

    const existing = await fetchBaiTapKhoa(khoaId);
    const existingIds = new Set(existing.map((b) => b.id));

    for (const item of list) {
      if (existingIds.has(item.id)) {
        await admin
          .from("org_bai_tap")
          .update({
            ten_bai_tap: item.tenBaiTap.trim(),
            mo_ta: item.moTa?.trim() || null,
            yeu_cau: item.yeuCau?.trim() || null,
            video_youtube_url: item.videoYoutubeUrl?.trim() || null,
            thumbnail_url: normalizeThumbnail(item.thumbnailUrl),
            cap_nhat_luc: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("id_to_chuc", orgId);
      } else {
        const created = await createBaiTapModule(orgId, {
          tenBaiTap: item.tenBaiTap,
          moTa: item.moTa,
          yeuCau: item.yeuCau,
          videoYoutubeUrl: item.videoYoutubeUrl,
          thumbnailUrl: item.thumbnailUrl,
        });
        item.id = created.id;
      }
    }

    await syncBoGiaoTrinhBai(
      orgId,
      boId,
      list.map((item, index) => ({
        baiTapId: item.id,
        thuocTinh: isLoaiBaiGiaoTrinh(item.thuocTinh)
          ? item.thuocTinh
          : "bai_tap",
        thuTu: index + 1,
      })),
    );

    return { ok: true, baiTap: await fetchBaiTapKhoa(khoaId) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không lưu được bài tập.",
    };
  }
}

export async function setBaiTapDisplayMode(
  orgId: string,
  khoaId: string,
  actorId: string,
  mode: BaiTapSectionDisplayMode,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền sửa bài tập." };
  }
  if (!(await assertKhoaInOrg(orgId, khoaId))) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("org_khoa_hoc")
    .update({ bai_tap_hien_thi: mode })
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId);

  if (error) {
    if (isMissingBaiTapSchema(error.message)) {
      return {
        ok: false,
        error:
          "Chưa cấu hình cột bai_tap_hien_thi. Chạy migration_org_bai_tap.sql.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
