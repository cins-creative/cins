import { resolveTruongImageSrc } from "@/lib/truong/media-url";
import type { TruongNganhProgram } from "@/lib/truong/types";

/** Resolve URL ảnh bìa bài `nganh_dao_tao` cho thumb trên trang trường. */
export async function enrichProgramsWithCoverSrc(
  programs: TruongNganhProgram[],
): Promise<TruongNganhProgram[]> {
  return Promise.all(
    programs.map(async (prog) => {
      const cover_id = prog.cover_id?.trim() || null;
      if (!cover_id) return { ...prog, cover_src: null };
      const cover_src = await resolveTruongImageSrc(cover_id, [
        "public",
        "cover",
        "medium",
      ]);
      return { ...prog, cover_src };
    }),
  );
}
