import "server-only";

import type { EditorInitial } from "@/components/editor/EditorView";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ORG_BAI_DANG_API_SELECT } from "@/lib/truong/bai-dang-api-fields";

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
      noi_dung_blocks: unknown;
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
    coverSeed: data.cover_id?.trim() || null,
    tags: [],
    visibility: "public" as Visibility,
    loaiMoc: "ca_nhan" as LoaiMoc,
    thoiDiem: isoToday(),
    blocks,
  };

  return { ok: true, postSlug: params.baiDangId, initial };
}
