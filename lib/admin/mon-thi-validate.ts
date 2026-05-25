import { MON_THI_LOAI_LABELS } from "@/lib/truong/mon-thi-catalog";
import { defaultPlaceholderThumbnailId } from "@/lib/truong/mon-thi-thumbnail";

export const ADMIN_MON_THI_LOAI_VALUES = Object.keys(
  MON_THI_LOAI_LABELS,
) as (keyof typeof MON_THI_LOAI_LABELS)[];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminMonThiFormFields = {
  ten: string;
  ma: string | null;
  loai: string;
  trang_thai: string;
  thumbnail_id: string;
  id_bai_viet: string | null;
};

export function formatMonThiDbError(message: string): string {
  if (/edu_mon_thi_loai_check|loai.*check constraint/i.test(message)) {
    return "Loại môn phải là Năng khiếu, Văn hóa hoặc Ngoại ngữ (không để trống).";
  }
  if (/null value in column "loai"/i.test(message)) {
    return "Loại môn là bắt buộc — chọn Năng khiếu, Văn hóa hoặc Ngoại ngữ.";
  }
  if (/invalid input syntax for type uuid/i.test(message)) {
    return "ID bài viết phải là UUID hợp lệ (hoặc để trống).";
  }
  if (/edu_mon_thi_id_bai_viet_fkey|id_bai_viet.*foreign key/i.test(message)) {
    return "ID bài viết không tồn tại trong bảng article_bai_viet.";
  }
  if (/duplicate key.*\bma\b|edu_mon_thi_ma/i.test(message)) {
    return "Mã môn (ma) đã được dùng bởi môn khác.";
  }
  return message;
}

export function parseAdminMonThiForm(
  input: Record<string, FormDataEntryValue | null | undefined>,
): { ok: true; fields: AdminMonThiFormFields } | { ok: false; message: string } {
  const ten = String(input.ten ?? "").trim();
  if (!ten) return { ok: false, message: "Tên môn thi không được trống." };

  const loai = String(input.loai ?? "").trim().toLowerCase();
  if (!loai || !ADMIN_MON_THI_LOAI_VALUES.includes(loai as (typeof ADMIN_MON_THI_LOAI_VALUES)[number])) {
    return {
      ok: false,
      message: "Chọn loại môn: Năng khiếu, Văn hóa hoặc Ngoại ngữ.",
    };
  }

  const trang_thai = String(input.trang_thai ?? "").trim() || "active";

  const rawThumb = String(input.thumbnail_id ?? "").trim();
  const thumbnail_id = rawThumb || defaultPlaceholderThumbnailId(loai);

  const rawBai = String(input.id_bai_viet ?? "").trim();
  let id_bai_viet: string | null = null;
  if (rawBai) {
    if (!UUID_RE.test(rawBai)) {
      return {
        ok: false,
        message: "ID bài viết phải là UUID đầy đủ (vd. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).",
      };
    }
    id_bai_viet = rawBai;
  }

  return {
    ok: true,
    fields: {
      ten,
      ma: String(input.ma ?? "").trim() || null,
      loai,
      trang_thai,
      thumbnail_id,
      id_bai_viet,
    },
  };
}
