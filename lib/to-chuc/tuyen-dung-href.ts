import { coSoJobPath } from "@/lib/to-chuc/co-so-routes";
import { studioJobPath } from "@/lib/to-chuc/studio-routes";

/**
 * URL sâu tới một tin tuyển dụng, chọn đúng trang org theo `loai_to_chuc`.
 * - `co_so_dao_tao` → `/academy/:slug/jobs/:jobId`
 * - studio / doanh nghiệp (mặc định) → `/studio/:slug/jobs/:jobId`
 */
export function orgJobPath(
  loaiToChuc: string | null | undefined,
  orgSlug: string,
  jobId: string,
): string {
  if (loaiToChuc === "co_so_dao_tao") {
    return coSoJobPath(orgSlug, jobId);
  }
  return studioJobPath(orgSlug, jobId);
}
