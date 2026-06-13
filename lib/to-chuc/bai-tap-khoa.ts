import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { canViewerManageKhoaHoc } from "./khoa-hoc";
import type {
  BaiTapKhoaData,
  BaiTapSectionDisplayMode,
} from "./khoa-hoc-types";
import { BAI_TAP_SECTION_DISPLAY_DEFAULT } from "./khoa-hoc-types";

type BaiTapRow = {
  id: string;
  id_giao_trinh: string | null;
  ten_bai_tap: string;
  mo_ta: string | null;
  video_youtube_url: string | null;
  thumbnail_url: string | null;
  visible: boolean | null;
  thu_tu: number | null;
};

function isMissingBaiTapSchema(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("org_bai_tap") ||
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

function rowToData(row: BaiTapRow): BaiTapKhoaData {
  return {
    id: row.id,
    tenBaiTap: row.ten_bai_tap,
    moTa: row.mo_ta,
    videoYoutubeUrl: row.video_youtube_url,
    thumbnailUrl: normalizeThumbnail(row.thumbnail_url),
    giaoTrinhBaiId: row.id_giao_trinh,
    visible: row.visible ?? true,
  };
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

export async function fetchBaiTapKhoa(
  khoaId: string,
): Promise<BaiTapKhoaData[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_bai_tap")
    .select(
      "id, id_giao_trinh, ten_bai_tap, mo_ta, video_youtube_url, thumbnail_url, visible, thu_tu",
    )
    .eq("id_khoa_hoc", khoaId)
    .order("thu_tu", { ascending: true });

  if (error) {
    if (isMissingBaiTapSchema(error.message)) return [];
    return [];
  }

  return ((data ?? []) as BaiTapRow[]).map(rowToData);
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

  const admin = createServiceRoleClient();
  const { error: delError } = await admin
    .from("org_bai_tap")
    .delete()
    .eq("id_khoa_hoc", khoaId);

  if (delError) {
    if (isMissingBaiTapSchema(delError.message)) {
      return {
        ok: false,
        error:
          "Chưa cấu hình bảng org_bai_tap trên Supabase. Chạy migration_org_bai_tap.sql.",
      };
    }
    return { ok: false, error: delError.message };
  }

  if (list.length === 0) {
    return { ok: true, baiTap: [] };
  }

  const rows = list.map((item, index) => ({
    id: item.id,
    id_khoa_hoc: khoaId,
    id_giao_trinh: item.giaoTrinhBaiId,
    ten_bai_tap: item.tenBaiTap.trim(),
    mo_ta: item.moTa?.trim() || null,
    video_youtube_url: item.videoYoutubeUrl?.trim() || null,
    thumbnail_url: normalizeThumbnail(item.thumbnailUrl),
    visible: item.visible ?? true,
    thu_tu: index + 1,
  }));

  const { error: insError } = await admin.from("org_bai_tap").insert(rows);
  if (insError) {
    if (isMissingBaiTapSchema(insError.message)) {
      return {
        ok: false,
        error:
          "Chưa cấu hình bảng org_bai_tap trên Supabase. Chạy migration_org_bai_tap.sql.",
      };
    }
    return { ok: false, error: insError.message };
  }

  return { ok: true, baiTap: await fetchBaiTapKhoa(khoaId) };
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
