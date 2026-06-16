import "server-only";

import type { EditorInitial } from "@/components/editor/EditorView";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import { normalizeLoaiBaiDang } from "@/lib/truong/bai-dang";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { sanitizePersistableCoverId } from "@/lib/truong/image-ref";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ORG_BAI_DANG_API_SELECT } from "@/lib/truong/bai-dang-api-fields";
import { isOrgBaiDangScheduledDraft } from "@/lib/truong/org-bai-dang-schedule";

export type OrgBaiDangEditInitialResult =
  | { ok: true; postSlug: string; initial: EditorInitial }
  | { ok: false; error: "not_found" | "forbidden" };

function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchOrgBaiDangEditInitial(params: {
  orgId: string;
  baiDangId: string;
  adminId: string;
}): Promise<OrgBaiDangEditInitialResult> {
  if (!(await isTruongOrgAdmin(params.orgId, params.adminId))) {
    return { ok: false, error: "forbidden" };
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("org_bai_dang")
    .select(ORG_BAI_DANG_API_SELECT)
    .eq("id", params.baiDangId)
    .eq("id_to_chuc", params.orgId)
    .maybeSingle<{
      id: string;
      tieu_de: string;
      tom_tat: string | null;
      cover_id: string | null;
      loai_bai_dang: string | null;
      noi_dung_blocks: unknown;
      tao_luc: string | null;
      trang_thai: string | null;
    }>();

  if (error || !data?.id) {
    return { ok: false, error: "not_found" };
  }

  const blocks = (parseBaiDangBlocks(data.noi_dung_blocks) ?? []) as Block[];

  const initial: EditorInitial = {
    tacPhamId: data.id,
    cotMocId: params.orgId,
    tieuDe: data.tieu_de?.trim() ?? "",
    moTa: data.tom_tat?.trim() || null,
    coverSeed: sanitizePersistableCoverId(data.cover_id, blocks),
    tags: [],
    visibility: "public" as Visibility,
    loaiMoc: "ca_nhan" as LoaiMoc,
    thoiDiem: isoToday(),
    blocks,
    orgBaiDangLoai: normalizeLoaiBaiDang(data.loai_bai_dang),
    orgBaiDangSchedulePublishAt: isOrgBaiDangScheduledDraft(
      data.trang_thai,
      data.tao_luc,
    )
      ? data.tao_luc
      : null,
  };

  return { ok: true, postSlug: params.baiDangId, initial };
}
