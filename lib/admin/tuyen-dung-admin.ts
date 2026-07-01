import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  normalizeGiaiDoanMucTieu,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  mapStudioJobRow,
  STUDIO_JOB_SELECT,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

export type AdminTuyenDungDistributionInput = {
  hienThiCoHoi?: boolean;
  giaiDoanMucTieu?: GiaiDoan[] | null;
};

type MutationResult =
  | { ok: true; job: StudioJob }
  | { ok: false; error: string; status: number };

/** Cập nhật phân phối module Cơ hội — admin nội dung (không cần quyền org). */
export async function adminUpdateTuyenDungDistribution(
  jobId: string,
  input: AdminTuyenDungDistributionInput,
): Promise<MutationResult> {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("org_tuyen_dung")
    .select("id")
    .eq("id", jobId)
    .eq("da_xoa", false)
    .maybeSingle<{ id: string }>();

  if (!existing) {
    return { ok: false, error: "Không tìm thấy tin tuyển dụng.", status: 404 };
  }

  const payload: Record<string, unknown> = {
    cap_nhat_luc: new Date().toISOString(),
  };

  if (input.hienThiCoHoi !== undefined) {
    payload.hien_thi_co_hoi = Boolean(input.hienThiCoHoi);
  }
  if (input.giaiDoanMucTieu !== undefined) {
    const targets = normalizeGiaiDoanMucTieu(input.giaiDoanMucTieu ?? undefined);
    if (targets.length === 0) {
      return { ok: false, error: "Chọn ít nhất một nhóm đối tượng.", status: 400 };
    }
    payload.giai_doan_muc_tieu = targets;
  }

  if (Object.keys(payload).length <= 1) {
    return { ok: false, error: "Không có thay đổi.", status: 400 };
  }

  const { data, error } = await supabase
    .from("org_tuyen_dung")
    .update(payload)
    .eq("id", jobId)
    .select(STUDIO_JOB_SELECT)
    .single();

  if (error || !data) {
    return { ok: false, error: "Không cập nhật được phân phối.", status: 500 };
  }
  return { ok: true, job: mapStudioJobRow(data) };
}
