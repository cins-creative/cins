import "server-only";

import type { CongDongJourneyMirror } from "@/lib/cong-dong/types";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type TacPhamRow = {
  id: string;
  slug: string;
  tieu_de: string;
  mo_ta: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
};

export async function loadTacPhamMirrors(
  tacPhamIds: string[],
): Promise<Map<string, CongDongJourneyMirror>> {
  const out = new Map<string, CongDongJourneyMirror>();
  const ids = [...new Set(tacPhamIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, mo_ta, cover_id, noi_dung_blocks")
    .in("id", ids)
    .returns<TacPhamRow[]>();

  for (const row of data ?? []) {
    out.set(row.id, {
      tacPhamId: row.id,
      postSlug: row.slug,
      tieuDe: row.tieu_de,
      moTa: row.mo_ta,
      coverId: row.cover_id,
      noiDungBlocks: parseServerBlocks(row.noi_dung_blocks) ?? [],
    });
  }

  return out;
}
