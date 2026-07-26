import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { BaiTapKhoaData } from "@/lib/to-chuc/khoa-hoc-types";

export type BaiTapQuanLyRow = {
  id: string;
  khoaId: string;
  khoaSlug: string;
  tenKhoa: string;
  tenBaiTap: string;
  moTa: string | null;
  videoYoutubeUrl: string | null;
  thumbnailUrl: string | null;
  giaoTrinhBaiId: string | null;
  visible: boolean;
  thuTu: number;
};

export type BaiTapKhoaOption = {
  id: string;
  slug: string;
  tenKhoaHoc: string;
};

export type BaiTapFormInput = {
  khoaId: string;
  tenBaiTap: string;
  moTa?: string | null;
  videoYoutubeUrl?: string | null;
  thumbnailUrl?: string | null;
  visible?: boolean;
  thuTu?: number | null;
  giaoTrinhBaiId?: string | null;
};

function normalizeThumbnail(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t || t.startsWith("blob:")) return null;
  return t;
}

function isMissingSchema(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("org_bai_tap") ||
    m.includes("does not exist") ||
    m.includes("could not find")
  );
}

/** Danh sách bài tập toàn org — tab Giáo trình (đồng bộ trang khóa công khai). */
export async function listBaiTapQuanLy(orgId: string): Promise<{
  rows: BaiTapQuanLyRow[];
  khoaOptions: BaiTapKhoaOption[];
}> {
  const admin = createServiceRoleClient();
  const { data: khoaRows, error: khoaErr } = await admin
    .from("org_khoa_hoc")
    .select("id, slug, ten_khoa_hoc")
    .eq("id_to_chuc", orgId)
    .order("ten_khoa_hoc", { ascending: true });

  if (khoaErr) throw new Error(khoaErr.message);

  const khoaOptions: BaiTapKhoaOption[] = (khoaRows ?? []).map((k) => ({
    id: k.id as string,
    slug: k.slug as string,
    tenKhoaHoc: k.ten_khoa_hoc as string,
  }));

  if (khoaOptions.length === 0) {
    return { rows: [], khoaOptions };
  }

  const khoaById = new Map(
    khoaOptions.map((k) => [k.id, { slug: k.slug, ten: k.tenKhoaHoc }]),
  );
  const khoaIds = khoaOptions.map((k) => k.id);

  const { data: btRows, error: btErr } = await admin
    .from("org_bai_tap")
    .select(
      "id, id_khoa_hoc, id_giao_trinh, ten_bai_tap, mo_ta, video_youtube_url, thumbnail_url, visible, thu_tu",
    )
    .in("id_khoa_hoc", khoaIds)
    .order("thu_tu", { ascending: true });

  if (btErr) {
    if (isMissingSchema(btErr.message)) return { rows: [], khoaOptions };
    throw new Error(btErr.message);
  }

  const rows: BaiTapQuanLyRow[] = (btRows ?? [])
    .map((row) => {
      const khoaId = row.id_khoa_hoc as string;
      const khoa = khoaById.get(khoaId);
      if (!khoa) return null;
      return {
        id: row.id as string,
        khoaId,
        khoaSlug: khoa.slug,
        tenKhoa: khoa.ten,
        tenBaiTap: row.ten_bai_tap as string,
        moTa: (row.mo_ta as string | null) ?? null,
        videoYoutubeUrl: (row.video_youtube_url as string | null) ?? null,
        thumbnailUrl: normalizeThumbnail(
          (row.thumbnail_url as string | null) ?? null,
        ),
        giaoTrinhBaiId: (row.id_giao_trinh as string | null) ?? null,
        visible: (row.visible as boolean | null) ?? true,
        thuTu: Number(row.thu_tu ?? 0),
      };
    })
    .filter((r): r is BaiTapQuanLyRow => r != null)
    .sort((a, b) => {
      const khoaCmp = a.tenKhoa.localeCompare(b.tenKhoa, "vi");
      if (khoaCmp !== 0) return khoaCmp;
      return a.thuTu - b.thuTu;
    });

  return { rows, khoaOptions };
}

async function assertKhoaInOrg(orgId: string, khoaId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_khoa_hoc")
    .select("id, slug, ten_khoa_hoc")
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  return data;
}

export async function createBaiTapQuanLy(
  orgId: string,
  input: BaiTapFormInput,
): Promise<BaiTapQuanLyRow> {
  const tenBaiTap = input.tenBaiTap.trim();
  if (!tenBaiTap) throw new Error("Thiếu tên bài tập.");

  const khoa = await assertKhoaInOrg(orgId, input.khoaId);
  if (!khoa) throw new Error("Không tìm thấy khóa học.");

  const admin = createServiceRoleClient();
  let thuTu = input.thuTu ?? null;
  if (thuTu == null) {
    const { data: maxRow } = await admin
      .from("org_bai_tap")
      .select("thu_tu")
      .eq("id_khoa_hoc", input.khoaId)
      .order("thu_tu", { ascending: false })
      .limit(1)
      .maybeSingle();
    thuTu = Number(maxRow?.thu_tu ?? 0) + 1;
  }

  const insertRow = {
    id_khoa_hoc: input.khoaId,
    id_giao_trinh: input.giaoTrinhBaiId ?? null,
    ten_bai_tap: tenBaiTap,
    mo_ta: input.moTa?.trim() || null,
    video_youtube_url: input.videoYoutubeUrl?.trim() || null,
    thumbnail_url: normalizeThumbnail(input.thumbnailUrl),
    visible: input.visible ?? true,
    thu_tu: thuTu,
  };

  const { data, error } = await admin
    .from("org_bai_tap")
    .insert(insertRow)
    .select(
      "id, id_khoa_hoc, id_giao_trinh, ten_bai_tap, mo_ta, video_youtube_url, thumbnail_url, visible, thu_tu",
    )
    .single();

  if (error) {
    if (isMissingSchema(error.message)) {
      throw new Error(
        "Chưa cấu hình bảng org_bai_tap. Chạy migration_org_bai_tap.sql.",
      );
    }
    throw new Error(error.message);
  }

  return {
    id: data.id as string,
    khoaId: data.id_khoa_hoc as string,
    khoaSlug: khoa.slug as string,
    tenKhoa: khoa.ten_khoa_hoc as string,
    tenBaiTap: data.ten_bai_tap as string,
    moTa: (data.mo_ta as string | null) ?? null,
    videoYoutubeUrl: (data.video_youtube_url as string | null) ?? null,
    thumbnailUrl: normalizeThumbnail(
      (data.thumbnail_url as string | null) ?? null,
    ),
    giaoTrinhBaiId: (data.id_giao_trinh as string | null) ?? null,
    visible: (data.visible as boolean | null) ?? true,
    thuTu: Number(data.thu_tu ?? thuTu),
  };
}

export async function updateBaiTapQuanLy(
  orgId: string,
  baiId: string,
  input: Partial<BaiTapFormInput>,
): Promise<BaiTapQuanLyRow> {
  const admin = createServiceRoleClient();
  const { data: existing, error: existErr } = await admin
    .from("org_bai_tap")
    .select("id, id_khoa_hoc")
    .eq("id", baiId)
    .maybeSingle();

  if (existErr) throw new Error(existErr.message);
  if (!existing) throw new Error("Không tìm thấy bài tập.");

  const khoaId = (input.khoaId ?? existing.id_khoa_hoc) as string;
  const khoa = await assertKhoaInOrg(orgId, khoaId);
  if (!khoa) throw new Error("Không tìm thấy khóa học.");

  const patch: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };
  if (input.khoaId) patch.id_khoa_hoc = input.khoaId;
  if (input.tenBaiTap !== undefined) {
    const t = input.tenBaiTap.trim();
    if (!t) throw new Error("Thiếu tên bài tập.");
    patch.ten_bai_tap = t;
  }
  if (input.moTa !== undefined) patch.mo_ta = input.moTa?.trim() || null;
  if (input.videoYoutubeUrl !== undefined) {
    patch.video_youtube_url = input.videoYoutubeUrl?.trim() || null;
  }
  if (input.thumbnailUrl !== undefined) {
    patch.thumbnail_url = normalizeThumbnail(input.thumbnailUrl);
  }
  if (input.visible !== undefined) patch.visible = input.visible;
  if (input.thuTu !== undefined && input.thuTu != null) {
    patch.thu_tu = input.thuTu;
  }
  if (input.giaoTrinhBaiId !== undefined) {
    patch.id_giao_trinh = input.giaoTrinhBaiId;
  }

  const { data, error } = await admin
    .from("org_bai_tap")
    .update(patch)
    .eq("id", baiId)
    .select(
      "id, id_khoa_hoc, id_giao_trinh, ten_bai_tap, mo_ta, video_youtube_url, thumbnail_url, visible, thu_tu",
    )
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id as string,
    khoaId: data.id_khoa_hoc as string,
    khoaSlug: khoa.slug as string,
    tenKhoa: khoa.ten_khoa_hoc as string,
    tenBaiTap: data.ten_bai_tap as string,
    moTa: (data.mo_ta as string | null) ?? null,
    videoYoutubeUrl: (data.video_youtube_url as string | null) ?? null,
    thumbnailUrl: normalizeThumbnail(
      (data.thumbnail_url as string | null) ?? null,
    ),
    giaoTrinhBaiId: (data.id_giao_trinh as string | null) ?? null,
    visible: (data.visible as boolean | null) ?? true,
    thuTu: Number(data.thu_tu ?? 0),
  };
}

/** Soft delete — `visible = false` (vẫn giữ row; trang khóa ẩn với khách). */
export async function softDeleteBaiTapQuanLy(
  orgId: string,
  baiId: string,
): Promise<void> {
  await updateBaiTapQuanLy(orgId, baiId, { visible: false });
}

/** Xóa hẳn bài tập khỏi `org_bai_tap`. */
export async function hardDeleteBaiTapQuanLy(
  orgId: string,
  baiId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing, error: existErr } = await admin
    .from("org_bai_tap")
    .select("id, id_khoa_hoc")
    .eq("id", baiId)
    .maybeSingle();

  if (existErr) throw new Error(existErr.message);
  if (!existing) throw new Error("Không tìm thấy bài tập.");

  const khoa = await assertKhoaInOrg(orgId, existing.id_khoa_hoc as string);
  if (!khoa) throw new Error("Không tìm thấy khóa học.");

  const { error } = await admin.from("org_bai_tap").delete().eq("id", baiId);
  if (error) throw new Error(error.message);
}

export function toBaiTapKhoaData(row: BaiTapQuanLyRow): BaiTapKhoaData {
  return {
    id: row.id,
    tenBaiTap: row.tenBaiTap,
    moTa: row.moTa,
    videoYoutubeUrl: row.videoYoutubeUrl,
    thumbnailUrl: row.thumbnailUrl,
    giaoTrinhBaiId: row.giaoTrinhBaiId,
    visible: row.visible,
  };
}
