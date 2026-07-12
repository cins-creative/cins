import "server-only";

import type { CongDongListingFacet, CongDongOrg } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function countByIds(
  communities: CongDongOrg[],
  pick: (org: CongDongOrg) => string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const org of communities) {
    for (const id of pick(org)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Facet lĩnh vực + ngành xuất hiện trên các cộng đồng discoverable. */
export async function loadCongDongListingFacets(
  communities: CongDongOrg[],
): Promise<{ linhVucs: CongDongListingFacet[]; nganhs: CongDongListingFacet[] }> {
  const linhCounts = countByIds(communities, (o) => o.linhVucIds);
  const nganhCounts = countByIds(communities, (o) => o.nganhIds);

  const linhIds = [...linhCounts.keys()];
  const nganhIds = [...nganhCounts.keys()];
  if (!linhIds.length && !nganhIds.length) {
    return { linhVucs: [], nganhs: [] };
  }

  const admin = createServiceRoleClient();
  const [linhResult, nganhResult] = await Promise.all([
    linhIds.length
      ? admin.from("linh_vuc").select("id, slug, ten, trang_thai").in("id", linhIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            slug: string | null;
            ten: string | null;
            trang_thai: string | null;
          }[],
        }),
    nganhIds.length
      ? admin
          .from("article_bai_viet")
          .select("id, slug, tieu_de")
          .in("id", nganhIds)
          .eq("loai_bai_viet", "nganh_dao_tao")
          .eq("trang_thai_noi_dung", "published")
      : Promise.resolve({
          data: [] as { id: string; slug: string; tieu_de: string }[],
        }),
  ]);

  const linhVucs: CongDongListingFacet[] = [];
  for (const row of linhResult.data ?? []) {
    const id = row.id;
    if (!id) continue;
    if (row.trang_thai && row.trang_thai !== "active") continue;
    const ten = row.ten?.trim();
    if (!ten) continue;
    linhVucs.push({
      id,
      slug: row.slug?.trim() || id,
      ten,
      count: linhCounts.get(id) ?? 0,
    });
  }
  linhVucs.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

  const nganhs: CongDongListingFacet[] = [];
  for (const row of nganhResult.data ?? []) {
    const id = row.id;
    const ten = row.tieu_de?.trim();
    if (!ten) continue;
    nganhs.push({
      id,
      slug: row.slug?.trim() || id,
      ten,
      count: nganhCounts.get(id) ?? 0,
    });
  }
  nganhs.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

  return { linhVucs, nganhs };
}
