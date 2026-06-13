import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  mapCoSoLopTimelinePinRows,
  type CoSoLopTimelinePin,
} from "./co-so-timeline-lop";

export type { CoSoLopTimelinePin };

export async function listCoSoLopTimelinePins(
  orgId: string,
): Promise<CoSoLopTimelinePin[]> {
  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from("org_lop_hoc")
    .select(
      "id, ma_lop, ngay_khai_giang, lich_hoc, org_khoa_hoc!inner ( id, slug, ten_khoa_hoc, loai_mo_hinh, trang_thai_khoa_hoc, id_to_chuc )",
    )
    .eq("org_khoa_hoc.id_to_chuc", orgId)
    .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
    .order("ngay_khai_giang", { ascending: true });

  if (error) {
    if (error.message.includes("lich_hoc")) {
      const fallback = await admin
        .from("org_lop_hoc")
        .select(
          "id, ma_lop, ngay_khai_giang, org_khoa_hoc!inner ( id, slug, ten_khoa_hoc, loai_mo_hinh, trang_thai_khoa_hoc, id_to_chuc )",
        )
        .eq("org_khoa_hoc.id_to_chuc", orgId)
        .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
        .order("ngay_khai_giang", { ascending: true });
      return mapCoSoLopTimelinePinRows(fallback.data ?? []);
    }
    return [];
  }

  return mapCoSoLopTimelinePinRows(rows ?? []);
}
