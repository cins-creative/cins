import "server-only";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  mapStudioJobRow,
  STUDIO_JOB_SELECT,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

/**
 * Tin tuyển dụng của một tổ chức (studio/doanh nghiệp) cho tab Tuyển dụng.
 * `includeHidden` = true khi viewer là admin org → thấy cả nháp/đã đóng.
 * Bảng `org_tuyen_dung` có thể chưa tồn tại (migration chưa chạy) → trả rỗng.
 */
export async function fetchStudioJobs(
  orgId: string,
  includeHidden = false,
): Promise<StudioJob[]> {
  try {
    const supabase = createPublicSupabaseClient();
    let query = supabase
      .from("org_tuyen_dung")
      .select(STUDIO_JOB_SELECT)
      .eq("id_to_chuc", orgId)
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false });

    if (!includeHidden) {
      query = query.eq("trang_thai", "dang_mo");
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => mapStudioJobRow(row));
  } catch {
    return [];
  }
}
