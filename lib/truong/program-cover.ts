import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongNganhProgram } from "@/lib/truong/types";

/** Resolve URL ảnh bìa bài `nganh_dao_tao` — sync (không gọi CF API từng program). */
export function enrichProgramsWithCoverSrcSync(
  programs: TruongNganhProgram[],
): TruongNganhProgram[] {
  return programs.map((prog) => {
    const cover_id = prog.cover_id?.trim() || null;
    if (!cover_id) return { ...prog, cover_src: null };
    const cover_src = getCfImageUrlWithFallbacks(cover_id, [
      "public",
      "cover",
      "medium",
    ]);
    return { ...prog, cover_src };
  });
}

/** @deprecated Dùng `enrichProgramsWithCoverSrcSync` khi account hash có sẵn. */
export async function enrichProgramsWithCoverSrc(
  programs: TruongNganhProgram[],
): Promise<TruongNganhProgram[]> {
  return enrichProgramsWithCoverSrcSync(programs);
}
