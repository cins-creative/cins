import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";
import { defaultThangDiemForHeSo } from "@/lib/truong/calc";
import {
  expandTruongNganhIdsForCalc,
  getCalcConfig,
  getOrgCauHinhFallbackOrgId,
} from "@/lib/truong/cau-hinh-tinh-diem";
import type { TruongCauHinhMon, TruongCauHinhTinhDiem } from "@/lib/truong/types";

type KhoiTemplate = {
  id_to_hop_mon: string | null;
  id_module: string | null;
  quy_ve_thang: number;
  diem_san_xet_tuyen: number | null;
  mo_ta: string | null;
  trang_thai: string | null;
};

function normalizeMon(mon: TruongCauHinhMon[], idx: number): TruongCauHinhMon {
  const m = mon[idx];
  const he_so = typeof m.he_so === "number" && !Number.isNaN(m.he_so) ? m.he_so : 1;
  return {
    id_mon_thi: m.id_mon_thi.trim(),
    ten: m.ten,
    loai: m.loai,
    he_so,
    thang_diem:
      typeof m.thang_diem === "number" && !Number.isNaN(m.thang_diem)
        ? m.thang_diem
        : defaultThangDiemForHeSo(he_so),
    thoi_gian_phut:
      typeof m.thoi_gian_phut === "number" ? m.thoi_gian_phut : null,
    so_thu_tu: idx,
    ghi_chu: m.ghi_chu?.trim() || null,
  };
}

async function findKhoiIdForYear(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  programIds: string[],
  nam: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("org_cau_hinh_khoi")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("nam_ap_dung", nam)
    .in("id_truong_nganh", programIds)
    .order("id", { ascending: true })
    .limit(1);

  if (error || !data?.length) return null;
  return (data[0] as { id?: string }).id?.trim() ?? null;
}

const KHOI_TEMPLATE_SELECT =
  "id_to_hop_mon, id_module, quy_ve_thang, diem_san_xet_tuyen, mo_ta, trang_thai";

async function queryKhoiTemplateRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  opts: {
    programIds?: string[];
    schoolWide?: boolean;
    anyProgram?: boolean;
    namLte: number;
  },
): Promise<KhoiTemplate | null> {
  let q = supabase
    .from("org_cau_hinh_khoi")
    .select(KHOI_TEMPLATE_SELECT)
    .eq("id_to_chuc", orgId)
    .lte("nam_ap_dung", opts.namLte);

  if (opts.schoolWide) {
    q = q.is("id_truong_nganh", null);
  } else if (opts.programIds?.length) {
    q = q.in("id_truong_nganh", opts.programIds);
  } else if (opts.anyProgram) {
    q = q.not("id_truong_nganh", "is", null);
  }

  const { data } = await q
    .order("nam_ap_dung", { ascending: false })
    .limit(1);

  const row = data?.[0] as KhoiTemplate | undefined;
  return row?.id_to_hop_mon ? row : null;
}

/** Metadata khối từ danh mục CINS (H00/H02 + module tính điểm) khi trường chưa từng seed khối. */
async function fetchEduDefaultKhoiTemplate(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<KhoiTemplate | null> {
  const { data: hops } = await supabase
    .from("edu_to_hop_mon")
    .select("id, ma_to_hop")
    .in("ma_to_hop", ["H02", "H00"])
    .limit(5);

  const hopList = (hops ?? []) as { id?: string; ma_to_hop?: string | null }[];
  const hop =
    hopList.find((h) => h.ma_to_hop === "H02") ??
    hopList.find((h) => h.ma_to_hop === "H00") ??
    hopList[0];
  const idToHop = hop?.id?.trim();
  if (!idToHop) return null;

  const { data: modRow } = await supabase
    .from("edu_module_tinh_diem")
    .select("id")
    .limit(1)
    .maybeSingle();

  const idModule = (modRow as { id?: string } | null)?.id?.trim() ?? null;

  return {
    id_to_hop_mon: idToHop,
    id_module: idModule,
    quy_ve_thang: 30,
    diem_san_xet_tuyen: null,
    mo_ta: null,
    trang_thai: null,
  };
}

async function fetchKhoiTemplate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  programIds: string[],
  nam: number,
): Promise<KhoiTemplate | null> {
  const orgsToTry = [orgId];
  const fallbackOrg = getOrgCauHinhFallbackOrgId(orgId);
  if (fallbackOrg && !orgsToTry.includes(fallbackOrg)) orgsToTry.push(fallbackOrg);

  for (const oid of orgsToTry) {
    const perNganh = await queryKhoiTemplateRow(supabase, oid, {
      programIds,
      namLte: nam,
    });
    if (perNganh) return perNganh;

    const schoolWide = await queryKhoiTemplateRow(supabase, oid, {
      schoolWide: true,
      namLte: nam,
    });
    if (schoolWide) return schoolWide;

    const sibling = await queryKhoiTemplateRow(supabase, oid, {
      anyProgram: true,
      namLte: nam,
    });
    if (sibling) return sibling;
  }

  return fetchEduDefaultKhoiTemplate(supabase);
}

async function createKhoiForYear(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  programId: string,
  nam: number,
  template: KhoiTemplate,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("org_cau_hinh_khoi")
    .insert({
      id_to_chuc: orgId,
      id_truong_nganh: programId,
      nam_ap_dung: nam,
      id_to_hop_mon: template.id_to_hop_mon,
      id_module: template.id_module,
      quy_ve_thang: template.quy_ve_thang ?? 30,
      diem_san_xet_tuyen: template.diem_san_xet_tuyen,
      mo_ta: template.mo_ta,
      trang_thai: template.trang_thai,
      cac_mon: [],
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return (data as { id?: string }).id?.trim() ?? null;
}

export type SaveCauHinhMonThiInput = {
  orgId: string;
  programId: string;
  nam: number;
  mon: TruongCauHinhMon[];
};

export type SaveCauHinhMonThiResult =
  | { ok: true; config: TruongCauHinhTinhDiem }
  | { ok: false; error: string; status?: number };

/** Ghi org_cau_hinh_mon (và tạo org_cau_hinh_khoi nếu thiếu) cho ngành + năm. */
export async function saveCauHinhMonThi(
  input: SaveCauHinhMonThiInput,
): Promise<SaveCauHinhMonThiResult> {
  if (!hasServiceRoleEnv()) {
    return {
      ok: false,
      error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.",
      status: 503,
    };
  }

  const orgId = input.orgId.trim();
  const programId = input.programId.trim();
  const nam = input.nam;

  if (!orgId || !programId || nam < 2000 || nam > 2100) {
    return { ok: false, error: "Tham số không hợp lệ.", status: 400 };
  }

  const mon = input.mon
    .map((_, i) => normalizeMon(input.mon, i))
    .filter((m) => m.id_mon_thi);

  if (!mon.length) {
    return { ok: false, error: "Cần ít nhất một môn thi.", status: 400 };
  }

  const seen = new Set<string>();
  for (const m of mon) {
    if (seen.has(m.id_mon_thi)) {
      return { ok: false, error: "Trùng môn thi trong danh sách.", status: 400 };
    }
    seen.add(m.id_mon_thi);
  }

  const supabase = createServiceRoleClient();

  const { data: link, error: linkErr } = await supabase
    .from("org_truong_nganh")
    .select("id")
    .eq("id", programId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();

  if (linkErr) {
    return { ok: false, error: linkErr.message, status: 500 };
  }
  if (!link?.id) {
    return { ok: false, error: "Ngành không thuộc trường này.", status: 400 };
  }

  const programIds = await expandTruongNganhIdsForCalc(
    supabase,
    orgId,
    programId,
  );
  if (!programIds.length) programIds.push(programId);

  let khoiId = await findKhoiIdForYear(supabase, orgId, programIds, nam);

  if (!khoiId) {
    const template = await fetchKhoiTemplate(supabase, orgId, programIds, nam);
    if (!template?.id_to_hop_mon) {
      return {
        ok: false,
        error:
          "Không tạo được khối thi (thiếu tổ hợp môn H00/H02 trong edu_to_hop_mon). Liên hệ admin CINS.",
        status: 400,
      };
    }
    khoiId = await createKhoiForYear(
      supabase,
      orgId,
      programId,
      nam,
      template,
    );
    if (!khoiId) {
      return {
        ok: false,
        error: "Không tạo được org_cau_hinh_khoi (kiểm tra UNIQUE / RLS).",
        status: 500,
      };
    }
  }

  const { error: delErr } = await supabase
    .from("org_cau_hinh_mon")
    .delete()
    .eq("id_cau_hinh_khoi", khoiId);

  if (delErr) {
    return { ok: false, error: delErr.message, status: 500 };
  }

  const { error: insErr } = await supabase.from("org_cau_hinh_mon").insert(
    mon.map((m) => ({
      id_cau_hinh_khoi: khoiId,
      id_mon_thi: m.id_mon_thi,
      he_so: m.he_so,
      thang_diem: m.thang_diem,
      thoi_gian_phut: m.thoi_gian_phut,
      so_thu_tu: m.so_thu_tu,
      ghi_chu: m.ghi_chu,
    })),
  );

  if (insErr) {
    return { ok: false, error: insErr.message, status: 500 };
  }

  const config = await getCalcConfig(orgId, programId, nam);
  if (!config?.mon.length) {
    return {
      ok: false,
      error: "Đã ghi DB nhưng không đọc lại được cấu hình.",
      status: 500,
    };
  }

  return { ok: true, config };
}
