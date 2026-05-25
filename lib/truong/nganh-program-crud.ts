import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mapChiTieuFromTuyenSinhNam,
  mapDiemChuanFromTuyenSinhNam,
} from "@/lib/truong/diem-chuan";
import { normalizeTuyenSinhNamEmbed } from "@/lib/truong/merge-programs-tuyen-sinh";
import type { TruongNganhProgram } from "@/lib/truong/types";

/** Trạng thái ẩn chương trình khỏi trang trường (vẫn giữ dữ liệu DB). */
export const TRUONG_NGANH_STATUS_HIDDEN = "tam_dung" as const;
export const TRUONG_NGANH_STATUS_ACTIVE = "dang_tuyen" as const;

export type NganhCandidate = {
  id: string;
  slug: string;
  title: string;
  ma_nganh: string | null;
};

type RawNganhLink = {
  id?: string;
  slug?: string | null;
  ten_chuong_trinh?: string | null;
  he_dao_tao?: string | null;
  thoi_gian_thang?: number | null;
  org_tuyen_sinh_nam?: {
    nam?: number | string | null;
    diem_chuan?: number | string | null;
    chi_tieu?: number | string | null;
  }[] | null;
  article_bai_viet?: {
    slug?: string | null;
    tieu_de_viet?: string | null;
    tieu_de?: string | null;
    tieu_de_eng?: string | null;
    tom_tat?: string | null;
    cover_id?: string | null;
    loai_bai_viet?: string | null;
    meta?: { ma_nganh?: string | null } | null;
  } | null;
};

const PROGRAM_SELECT = `
  id,
  slug,
  ten_chuong_trinh,
  he_dao_tao,
  thoi_gian_thang,
  org_tuyen_sinh_nam (
    nam,
    diem_chuan,
    chi_tieu
  ),
  article_bai_viet!inner (
    slug,
    tieu_de_viet,
    tieu_de,
    tieu_de_eng,
    tom_tat,
    cover_id,
    loai_bai_viet,
    meta
  )
`;

function slugifyProgramPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function defaultThoiGianThangFromMeta(
  metaText: string | null | undefined,
): number {
  const m = (metaText ?? "").match(/(\d+)\s*năm/i);
  if (m?.[1]) {
    const years = Number(m[1]);
    if (Number.isFinite(years) && years > 0) return years * 12;
  }
  return 48;
}

async function uniqueProgramSlug(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgSlug: string,
  nganhSlug: string,
): Promise<string> {
  const base = slugifyProgramPart(`${orgSlug}-${nganhSlug}`) || "chuong-trinh";
  let candidate = base.slice(0, 96);
  let n = 2;
  while (n < 50) {
    const { data } = await supabase
      .from("org_truong_nganh")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base.slice(0, 88)}-${n}`;
    n += 1;
  }
  return `${base.slice(0, 80)}-${Date.now()}`;
}

function nganhTitle(row: NonNullable<RawNganhLink["article_bai_viet"]>): string {
  return row.tieu_de_viet?.trim() || row.tieu_de?.trim() || "Ngành đào tạo";
}

export function mapProgramRow(row: RawNganhLink): TruongNganhProgram | null {
  const art = row.article_bai_viet;
  if (!art || String(art.loai_bai_viet) !== "nganh_dao_tao") return null;
  const nganhSlug = art.slug?.trim();
  if (!nganhSlug || !row.id?.trim()) return null;
  const title = nganhTitle(art);
  return {
    id: row.id.trim(),
    programSlug: row.slug?.trim() || null,
    nganhSlug,
    nganhTitle: title,
    ma_nganh:
      typeof art.meta === "object" && art.meta && "ma_nganh" in art.meta
        ? String((art.meta as { ma_nganh?: string }).ma_nganh ?? "").trim() ||
          null
        : null,
    ten_chuong_trinh: row.ten_chuong_trinh?.trim() || null,
    he_dao_tao: row.he_dao_tao?.trim() || null,
    thoi_gian_thang:
      typeof row.thoi_gian_thang === "number" ? row.thoi_gian_thang : null,
    cover_id: art.cover_id?.trim() || null,
    tom_tat: art.tom_tat?.trim() || null,
    tieu_de_eng: art.tieu_de_eng?.trim() || null,
    diemChuanByYear: mapDiemChuanFromTuyenSinhNam(
      normalizeTuyenSinhNamEmbed(row.org_tuyen_sinh_nam),
    ),
    chiTieuByYear: mapChiTieuFromTuyenSinhNam(
      normalizeTuyenSinhNamEmbed(row.org_tuyen_sinh_nam),
    ),
  };
}

export async function listNganhCandidatesForOrg(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
): Promise<NganhCandidate[]> {
  const { data: linked } = await supabase
    .from("org_truong_nganh")
    .select("id_nganh")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai_chuong_trinh", TRUONG_NGANH_STATUS_ACTIVE);

  const linkedIds = new Set(
    (linked ?? [])
      .map((r) => (r as { id_nganh?: string }).id_nganh?.trim())
      .filter(Boolean) as string[],
  );

  const { data: articles, error } = await supabase
    .from("article_bai_viet")
    .select("id, slug, tieu_de_viet, tieu_de, meta")
    .eq("loai_bai_viet", "nganh_dao_tao")
    .order("tieu_de_viet", { ascending: true });

  if (error || !articles?.length) return [];

  const out: NganhCandidate[] = [];
  for (const row of articles) {
    const id = (row as { id?: string }).id?.trim();
    const slug = (row as { slug?: string }).slug?.trim();
    if (!id || !slug || linkedIds.has(id)) continue;
    const title =
      (row as { tieu_de_viet?: string }).tieu_de_viet?.trim() ||
      (row as { tieu_de?: string }).tieu_de?.trim() ||
      "Ngành đào tạo";
    const meta = (row as { meta?: { ma_nganh?: string } }).meta;
    out.push({
      id,
      slug,
      title,
      ma_nganh:
        typeof meta === "object" && meta && "ma_nganh" in meta
          ? String(meta.ma_nganh ?? "").trim() || null
          : null,
    });
  }
  return out;
}

export async function linkNganhToOrg(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  orgSlug: string,
  nganhArticleId: string,
): Promise<
  | { ok: true; program: TruongNganhProgram }
  | { ok: false; error: string; status: number }
> {
  const pid = nganhArticleId.trim();
  if (!pid) {
    return { ok: false, error: "Thiếu id ngành.", status: 400 };
  }

  const { data: nganh, error: nganhErr } = await supabase
    .from("article_bai_viet")
    .select("id, slug, tieu_de_viet, tieu_de, meta, loai_bai_viet")
    .eq("id", pid)
    .maybeSingle();

  if (nganhErr) {
    return { ok: false, error: nganhErr.message, status: 500 };
  }
  if (!nganh?.id || nganh.loai_bai_viet !== "nganh_dao_tao") {
    return { ok: false, error: "Không tìm thấy bài ngành đào tạo.", status: 404 };
  }

  const nganhTitleStr = String(
    nganh.tieu_de_viet ?? nganh.tieu_de ?? "Ngành",
  ).trim();
  const meta = nganh.meta as { ma_nganh?: string; thoi_gian_dao_tao?: string } | null;

  const { data: existing } = await supabase
    .from("org_truong_nganh")
    .select("id")
    .eq("id_nganh", pid)
    .eq("id_to_chuc", orgId)
    .maybeSingle();

  let programId: string;

  if (existing?.id) {
    programId = existing.id.trim();
    const { error: upErr } = await supabase
      .from("org_truong_nganh")
      .update({ trang_thai_chuong_trinh: "dang_tuyen" })
      .eq("id", programId);
    if (upErr) {
      return { ok: false, error: upErr.message, status: 500 };
    }
  } else {
    const programSlug = await uniqueProgramSlug(
      supabase,
      orgSlug,
      String(nganh.slug ?? "nganh"),
    );
    const { data: inserted, error: insErr } = await supabase
      .from("org_truong_nganh")
      .insert({
        id_nganh: pid,
        id_to_chuc: orgId,
        trang_thai_chuong_trinh: TRUONG_NGANH_STATUS_ACTIVE,
        ten_chuong_trinh: nganhTitleStr,
        he_dao_tao: "dai_hoc",
        thoi_gian_thang: defaultThoiGianThangFromMeta(meta?.thoi_gian_dao_tao),
        slug: programSlug,
      })
      .select("id")
      .single();

    if (insErr || !inserted?.id) {
      return {
        ok: false,
        error: insErr?.message ?? "Không tạo được org_truong_nganh.",
        status: 500,
      };
    }
    programId = inserted.id.trim();
  }

  const { data: row, error: fetchErr } = await supabase
    .from("org_truong_nganh")
    .select(PROGRAM_SELECT)
    .eq("id", programId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, status: 500 };
  }

  const program = mapProgramRow((row ?? {}) as RawNganhLink);
  if (!program) {
    return { ok: false, error: "Không đọc lại được chương trình.", status: 500 };
  }

  return { ok: true, program };
}

export async function hideNganhProgramFromOrg(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgId: string,
  programId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const pid = programId.trim();
  const oid = orgId.trim();
  if (!pid || !oid) {
    return { ok: false, error: "Missing id", status: 400 };
  }

  const { data: link, error: linkErr } = await supabase
    .from("org_truong_nganh")
    .select("id, trang_thai_chuong_trinh")
    .eq("id", pid)
    .eq("id_to_chuc", oid)
    .maybeSingle();

  if (linkErr) {
    return { ok: false, error: linkErr.message, status: 500 };
  }
  if (!link?.id) {
    return { ok: false, error: "Not found", status: 404 };
  }
  if (link.trang_thai_chuong_trinh === TRUONG_NGANH_STATUS_HIDDEN) {
    return { ok: true };
  }

  const { error: upErr } = await supabase
    .from("org_truong_nganh")
    .update({ trang_thai_chuong_trinh: TRUONG_NGANH_STATUS_HIDDEN })
    .eq("id", pid)
    .eq("id_to_chuc", oid);

  if (upErr) {
    return { ok: false, error: upErr.message, status: 500 };
  }

  return { ok: true };
}
