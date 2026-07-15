import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import type { TruongBaiDang } from "@/lib/truong/types";

/** Cột org_bai_dang trả về từ API inline bài đăng. */
export const ORG_BAI_DANG_API_SELECT =
  "id, loai_bai_dang, tieu_de, tom_tat, noi_dung, noi_dung_blocks, cover_id, tao_luc, trang_thai, ghim";

type BaiDangDbRow = {
  id?: string;
  loai_bai_dang?: string | null;
  tieu_de?: string;
  tom_tat?: string | null;
  noi_dung?: string | null;
  noi_dung_blocks?: unknown;
  /** Đã map sẵn (vd. client gọi lại sau khi API trả `TruongBaiDang`). */
  noiDungBlocks?: unknown;
  cover_id?: string | null;
  cover_src?: string | null;
  tao_luc?: string | null;
  trang_thai?: string | null;
  ghim?: boolean | null;
  tags?: TruongBaiDang["tags"];
};

/**
 * Chuẩn hóa row Supabase → `TruongBaiDang` (camelCase + parse blocks).
 * Idempotent: nhận cả snake_case DB và object đã map sẵn từ API.
 */
export function mapOrgBaiDangApiRow(
  row: BaiDangDbRow,
  extras?: Partial<Pick<TruongBaiDang, "cover_src" | "tags">>,
): TruongBaiDang {
  const blocks =
    parseBaiDangBlocks(row.noi_dung_blocks) ??
    parseBaiDangBlocks(row.noiDungBlocks);

  return {
    id: row.id ?? "",
    loai_bai_dang: row.loai_bai_dang ?? null,
    tieu_de: row.tieu_de?.trim() ?? "",
    tom_tat: row.tom_tat?.trim() || null,
    noi_dung: row.noi_dung?.trim() || null,
    noiDungBlocks: blocks,
    cover_id: row.cover_id?.trim() || null,
    tao_luc: row.tao_luc ?? null,
    trang_thai: row.trang_thai ?? null,
    ghim: row.ghim ?? false,
    tags: extras?.tags ?? row.tags ?? [],
    cover_src: extras?.cover_src ?? row.cover_src ?? null,
  };
}
