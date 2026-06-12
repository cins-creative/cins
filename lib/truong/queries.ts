import { cache } from "react";
import { unstable_cache } from "next/cache";

import { loadPersonalFiltersForOrgBaiDang } from "@/lib/filter/org-bai-dang-gan";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { formatHocPhiLabel } from "@/lib/truong/display";
import { enrichProgramsWithCoverSrcSync } from "@/lib/truong/program-cover";
import {
  parseChiNhanhFromCauHinh,
  parseFacebookFromCauHinh,
} from "@/lib/truong/chi-nhanh";
import { parseKtxDiaChiFromCauHinh } from "@/lib/truong/ktx-cau-hinh";
import { resolveTruongImageSrc, resolveTruongImageSrcSync } from "@/lib/truong/media-url";

import {
  defaultTruongNganhYear,
  mapChiTieuFromTuyenSinhNam,
  mapDiemChuanFromTuyenSinhNam,
  parseTruongNumericField,
} from "./diem-chuan";
import {
  listCauHinhYearsForOrg,
  prefetchCauHinhMonThiByKey,
} from "./cau-hinh-tinh-diem";
import {
  mergeTuyenSinhIntoPrograms,
  normalizeTuyenSinhNamEmbed,
} from "./merge-programs-tuyen-sinh";
import {
  mergeTruongYearOptions,
  pickDefaultTruongYear,
} from "./year-options";
import {
  emptyOrgContactFields,
  isMissingOrgContactColumnError,
} from "./org-contact-fields";
import type {
  TruongBaiDang,
  TruongDetail,
  TruongHinhAnh,
  TruongJourneyMember,
  TruongListItem,
  TruongNganhProgram,
  TruongPagePayload,
  TruongPhuongThuc,
  TruongStats,
  TruongTuyenSinhNamRow,
} from "./types";

type OrgEmbed = {
  id?: string;
  slug?: string | null;
  ten?: string | null;
  logo_id?: string | null;
  avatar_id?: string | null;
  cover_id?: string | null;
  mo_ta?: string | null;
  gioi_thieu_truong?: string | null;
  tinh_thanh?: string | null;
  dia_chi?: string | null;
  dien_thoai?: string | null;
  email_lien_he?: string | null;
  cau_hinh?: unknown;
};

type OrgDaiHocEmbed = {
  ma_truong?: string | null;
  ten_chinh_thuc?: string | null;
  ten_tieng_anh?: string | null;
  loai_truong?: string | null;
  nam_thanh_lap?: number | null;
  website?: string | null;
  hoc_phi_nam_tu?: number | null;
  hoc_phi_nam_den?: number | null;
  co_ktx?: boolean | null;
  ktx_gia_thang?: number | null;
};

type RawDaiHoc = OrgDaiHocEmbed & {
  org_to_chuc?: OrgEmbed | OrgEmbed[] | null;
};

type RawNganhLink = {
  id?: string;
  slug?: string | null;
  ten_chuong_trinh?: string | null;
  id_to_chuc?: string;
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

function pickOrg(embed: OrgEmbed | OrgEmbed[] | null | undefined): OrgEmbed | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function pickDaiHoc(
  embed: OrgDaiHocEmbed | OrgDaiHocEmbed[] | null | undefined,
): OrgDaiHocEmbed | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function pickOne<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function nganhTitle(row: NonNullable<RawNganhLink["article_bai_viet"]>): string {
  return row.tieu_de_viet?.trim() || row.tieu_de?.trim() || "Ngành đào tạo";
}

function mapListFields(
  org: OrgEmbed,
  otd: OrgDaiHocEmbed | null,
  tagSet: Set<string>,
): TruongListItem {
  const id = org.id!.trim();
  return {
    id,
    slug: org.slug!.trim(),
    ten: org.ten!.trim(),
    logo_id: org.logo_id ?? null,
    avatar_id: org.avatar_id ?? org.logo_id ?? null,
    cover_id: org.cover_id ?? null,
    mo_ta: org.mo_ta?.trim() || null,
    gioi_thieu_truong: org.gioi_thieu_truong?.trim() || null,
    tinh_thanh: org.tinh_thanh?.trim() || null,
    dia_chi: org.dia_chi?.trim() || null,
    chi_nhanh: parseChiNhanhFromCauHinh(org.cau_hinh) ?? undefined,
    dien_thoai: org.dien_thoai?.trim() || null,
    email_lien_he: org.email_lien_he?.trim() || null,
    ma_truong: otd?.ma_truong?.trim() || null,
    loai_truong: otd?.loai_truong?.trim() || null,
    website: otd?.website?.trim() || null,
    facebook: parseFacebookFromCauHinh(org.cau_hinh),
    ten_chinh_thuc: otd?.ten_chinh_thuc?.trim() || null,
    ten_tieng_anh: otd?.ten_tieng_anh?.trim() || null,
    nam_thanh_lap:
      typeof otd?.nam_thanh_lap === "number" ? otd.nam_thanh_lap : null,
    hoc_phi_nam_tu:
      typeof otd?.hoc_phi_nam_tu === "number" ? otd.hoc_phi_nam_tu : null,
    hoc_phi_nam_den:
      typeof otd?.hoc_phi_nam_den === "number" ? otd.hoc_phi_nam_den : null,
    co_ktx: otd?.co_ktx ?? null,
    ktx_gia_thang:
      typeof otd?.ktx_gia_thang === "number" ? otd.ktx_gia_thang : null,
    ktx_dia_chi: parseKtxDiaChiFromCauHinh(org.cau_hinh),
    nganhCount: tagSet.size,
    nganhTags: [...tagSet].slice(0, 3),
  };
}

function enrichListItemMediaSync(item: TruongListItem): TruongListItem {
  const avatarImageId = item.avatar_id ?? item.logo_id;
  const avatar_src = avatarImageId
    ? resolveTruongImageSrcSync(avatarImageId, ["public", "avatar"])
    : null;
  const cover_src = item.cover_id
    ? resolveTruongImageSrcSync(item.cover_id, ["public", "cover", "medium"])
    : null;
  return {
    ...item,
    avatar_src: avatar_src ?? item.avatar_src ?? null,
    cover_src: cover_src ?? item.cover_src ?? null,
  };
}

function mapPrograms(rows: RawNganhLink[]): TruongNganhProgram[] {
  const programs: TruongNganhProgram[] = [];
  for (const row of rows) {
    const art = row.article_bai_viet;
    if (!art || String(art.loai_bai_viet) !== "nganh_dao_tao") continue;
    const nganhSlug = art.slug?.trim();
    if (!nganhSlug || !row.id?.trim()) continue;
    const title = nganhTitle(art);
    programs.push({
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
    });
  }
  return programs.sort((a, b) => a.nganhTitle.localeCompare(b.nganhTitle, "vi"));
}

export async function listTruongDaiHoc(): Promise<TruongListItem[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createPublicSupabaseClient();

    const { data: schools, error } = await supabase
      .from("org_truong_dai_hoc")
      .select(
        `
        ma_truong,
        loai_truong,
        website,
        ten_chinh_thuc,
        ten_tieng_anh,
        org_to_chuc!inner (
          id,
          slug,
          ten,
          logo_id,
          avatar_id,
          cover_id,
          tinh_thanh
        )
      `,
      );

    if (error || !schools?.length) return [];

    const { data: links } = await supabase
      .from("org_truong_nganh")
      .select(
        `
        id_to_chuc,
        article_bai_viet!inner (
          slug,
          tieu_de_viet,
          tieu_de,
          loai_bai_viet
        )
      `,
      )
      .eq("trang_thai_chuong_trinh", "dang_tuyen");

    const tagsByOrg = new Map<string, string[]>();
    for (const row of (links ?? []) as RawNganhLink[]) {
      const orgId = row.id_to_chuc?.trim();
      const art = row.article_bai_viet;
      if (!orgId || !art) continue;
      if (String(art.loai_bai_viet) !== "nganh_dao_tao") continue;
      const title = nganhTitle(art);
      const list = tagsByOrg.get(orgId) ?? [];
      if (!list.includes(title)) list.push(title);
      tagsByOrg.set(orgId, list);
    }

    const items: TruongListItem[] = [];
    for (const row of schools as RawDaiHoc[]) {
      const org = pickOrg(row.org_to_chuc);
      const id = org?.id?.trim();
      const slug = org?.slug?.trim();
      const ten = org?.ten?.trim();
      if (!org || !id || !slug || !ten) continue;
      const tagSet = new Set(tagsByOrg.get(id) ?? []);
      items.push(mapListFields(org, row, tagSet));
    }

    const enriched = items.map(enrichListItemMediaSync);
    return enriched.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  } catch {
    return [];
  }
}

async function fetchPrograms(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
): Promise<{ programs: TruongNganhProgram[]; tagSet: Set<string> }> {
  const { data: programRows } = await supabase
    .from("org_truong_nganh")
    .select(
      `
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
      `,
    )
    .eq("id_to_chuc", orgId)
    .eq("trang_thai_chuong_trinh", "dang_tuyen");

  const programs = mapPrograms((programRows ?? []) as RawNganhLink[]);
  const tagSet = new Set(programs.map((p) => p.nganhTitle));
  return { programs, tagSet };
}

async function fetchStats(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  year: number,
  hocPhiTu: number | null,
  hocPhiDen: number | null,
  programLinkIds: string[],
): Promise<TruongStats> {
  const linkIds = programLinkIds
    .map((id) => id.trim())
    .filter(Boolean);

  let diemChuanMax: number | null = null;
  let chiTieuTong: number | null = null;

  if (linkIds.length) {
    const { data: tsNam } = await supabase
      .from("org_tuyen_sinh_nam")
      .select("diem_chuan, chi_tieu")
      .in("id_truong_nganh", linkIds)
      .eq("nam", year);

    const diems: number[] = [];
    let chiSum = 0;
    let hasChi = false;
    for (const row of tsNam ?? []) {
      const d = parseTruongNumericField(
        (row as { diem_chuan?: unknown }).diem_chuan as
          | number
          | string
          | null
          | undefined,
      );
      if (d != null) diems.push(d);
      const ct = parseTruongNumericField(
        (row as { chi_tieu?: unknown }).chi_tieu as
          | number
          | string
          | null
          | undefined,
      );
      if (ct != null) {
        chiSum += ct;
        hasChi = true;
      }
    }
    if (diems.length) diemChuanMax = Math.max(...diems);
    if (hasChi) chiTieuTong = chiSum;
  }

  const { count: journeyCount } = await supabase
    .from("user_thanh_vien_to_chuc")
    .select("id", { count: "exact", head: true })
    .eq("id_to_chuc", orgId);

  return {
    year,
    diemChuanMax,
    chiTieuTong,
    hocPhiLabel: formatHocPhiLabel(hocPhiTu, hocPhiDen),
    journeyCount: journeyCount ?? 0,
  };
}

export async function fetchBaiDang(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  limit = 10,
): Promise<TruongBaiDang[]> {
  try {
    const { publishDueOrgBaiDang } = await import(
      "@/lib/truong/publish-due-org-bai-dang"
    );
    await publishDueOrgBaiDang(orgId);
  } catch {
    /* không chặn load trang nếu lazy publish lỗi */
  }

  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("org_bai_dang")
    .select(
      `
      id,
      loai_bai_dang,
      tieu_de,
      tom_tat,
      noi_dung,
      noi_dung_blocks,
      cover_id,
      tao_luc,
      org_bai_dang_tag (
        article_bai_viet ( tieu_de_viet, tieu_de, slug )
      )
    `,
    )
    .eq("id_to_chuc", orgId)
    .eq("trang_thai", "da_dang")
    .lte("tao_luc", nowIso)
    .order("tao_luc", { ascending: false })
    .limit(limit);

  const out: TruongBaiDang[] = [];
  for (const row of data ?? []) {
    const r = row as {
      id?: string;
      loai_bai_dang?: string | null;
      tieu_de?: string;
      tom_tat?: string | null;
      noi_dung?: string | null;
      noi_dung_blocks?: unknown;
      cover_id?: string | null;
      tao_luc?: string | null;
      org_bai_dang_tag?: {
        article_bai_viet?: {
          tieu_de_viet?: string | null;
          tieu_de?: string | null;
          slug?: string | null;
        } | null;
      }[];
    };
    if (!r.id || !r.tieu_de?.trim()) continue;
    const tags: TruongBaiDang["tags"] = [];
    for (const tag of r.org_bai_dang_tag ?? []) {
      const art = pickOne(tag.article_bai_viet);
      const slug = art?.slug?.trim();
      if (!slug) continue;
      const label =
        art?.tieu_de_viet?.trim() || art?.tieu_de?.trim() || slug;
      if (!tags.some((t) => t.slug === slug)) tags.push({ label, slug });
    }
    const cover_id = r.cover_id?.trim() || null;
    out.push({
      id: r.id,
      loai_bai_dang: r.loai_bai_dang ?? null,
      tieu_de: r.tieu_de.trim(),
      tom_tat: r.tom_tat?.trim() || null,
      noi_dung: r.noi_dung?.trim() || null,
      noiDungBlocks: parseBaiDangBlocks(r.noi_dung_blocks),
      cover_id,
      cover_src: null,
      tao_luc: r.tao_luc ?? null,
      trang_thai: "da_dang",
      tags,
    });
  }

  await Promise.all(
    out.map(async (post) => {
      if (!post.cover_id) return;
      post.cover_src = await resolveTruongImageSrc(post.cover_id, [
        "public",
        "cover",
        "medium",
      ]);
    }),
  );

  const filterMap = await loadPersonalFiltersForOrgBaiDang(out.map((p) => p.id));
  for (const post of out) {
    const filters = filterMap.get(post.id) ?? [];
    post.personalFilters = filters;
    post.personalFilterSlugs = filters.map((f) => f.slug);
  }

  return out;
}

export async function fetchHinhAnh(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
): Promise<TruongHinhAnh[]> {
  const { data } = await supabase
    .from("org_hinh_anh")
    .select("id, cloudflare_id, caption, loai, thu_tu")
    .eq("id_to_chuc", orgId)
    .order("thu_tu", { ascending: true });

  const rows = (data ?? [])
    .map((row) => {
      const r = row as {
        id?: string;
        cloudflare_id?: string;
        caption?: string | null;
        loai?: string | null;
        thu_tu?: number | null;
      };
      const cf = r.cloudflare_id?.trim();
      if (!r.id || !cf) return null;
      return {
        id: r.id,
        cloudflare_id: cf,
        caption: r.caption?.trim() || null,
        loai: r.loai ?? null,
        thu_tu: typeof r.thu_tu === "number" ? r.thu_tu : null,
        src: null as string | null,
      };
    })
    .filter(Boolean) as TruongHinhAnh[];

  await Promise.all(
    rows.map(async (photo) => {
      photo.src = await resolveTruongImageSrc(photo.cloudflare_id, [
        "public",
        "cover",
        "medium",
      ]);
    }),
  );

  return rows;
}

async function fetchTuyenSinh(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
): Promise<TruongTuyenSinhNamRow[]> {
  const { data: linkRows } = await supabase
    .from("org_truong_nganh")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("trang_thai_chuong_trinh", "dang_tuyen");

  const linkIds = (linkRows ?? [])
    .map((r) => (r as { id?: string }).id?.trim())
    .filter(Boolean) as string[];
  if (!linkIds.length) return [];

  const { data } = await supabase
    .from("org_tuyen_sinh_nam")
    .select(
      `
      id,
      id_truong_nganh,
      nam,
      chi_tieu,
      diem_chuan,
      tinh_trang,
      ngay_mo_ho_so,
      ngay_dong_ho_so,
      ngay_thi_tu,
      ngay_thi_den,
      ngay_cong_bo_diem,
      ngay_xac_nhan_nhap_hoc_tu,
      ngay_xac_nhan_nhap_hoc_den,
      ghi_chu_timeline,
      link_thong_tin,
      org_phuong_thuc_xet_tuyen (
        id,
        ten_phuong_thuc,
        chi_tieu_phuong_thuc,
        ap_dung_tat_ca_nganh,
        id_nganh_ap_dung,
        id_cau_hinh_khoi,
        tieu_chi
      ),
      org_truong_nganh (
        id,
        slug,
        article_bai_viet ( tieu_de_viet, tieu_de )
      )
    `,
    )
    .in("id_truong_nganh", linkIds);

  const out: TruongTuyenSinhNamRow[] = [];
  for (const row of data ?? []) {
    const r = row as {
      id?: string;
      nam?: number | string;
      chi_tieu?: number | string | null;
      diem_chuan?: number | string | null;
      tinh_trang?: string | null;
      ngay_mo_ho_so?: string | null;
      ngay_dong_ho_so?: string | null;
      ngay_thi_tu?: string | null;
      ngay_thi_den?: string | null;
      ngay_cong_bo_diem?: string | null;
      ngay_xac_nhan_nhap_hoc_tu?: string | null;
      ngay_xac_nhan_nhap_hoc_den?: string | null;
      ghi_chu_timeline?: string | null;
      link_thong_tin?: string | null;
      org_phuong_thuc_xet_tuyen?: TruongPhuongThuc[] | TruongPhuongThuc | null;
      org_truong_nganh?: {
        id?: string;
        slug?: string | null;
        article_bai_viet?: {
          tieu_de_viet?: string | null;
          tieu_de?: string | null;
        } | null;
      } | null;
    };
    if (!r.id) continue;
    const otn = pickOne(r.org_truong_nganh);
    if (!otn?.id) continue;
    const nam =
      typeof r.nam === "number" ? r.nam : Number(String(r.nam ?? "").trim());
    if (Number.isNaN(nam)) continue;
    const art = pickOne(otn.article_bai_viet);
    const ptRaw = r.org_phuong_thuc_xet_tuyen;
    const ptList = Array.isArray(ptRaw) ? ptRaw : ptRaw ? [ptRaw] : [];

    out.push({
      id: r.id,
      nam,
      chi_tieu: parseTruongNumericField(r.chi_tieu),
      diem_chuan: parseTruongNumericField(r.diem_chuan),
      tinh_trang: r.tinh_trang ?? null,
      ngay_mo_ho_so: r.ngay_mo_ho_so ?? null,
      ngay_dong_ho_so: r.ngay_dong_ho_so ?? null,
      ngay_thi_tu: r.ngay_thi_tu ?? null,
      ngay_thi_den: r.ngay_thi_den ?? null,
      ngay_cong_bo_diem: r.ngay_cong_bo_diem ?? null,
      ngay_xac_nhan_nhap_hoc_tu: r.ngay_xac_nhan_nhap_hoc_tu ?? null,
      ngay_xac_nhan_nhap_hoc_den: r.ngay_xac_nhan_nhap_hoc_den ?? null,
      ghi_chu_timeline: r.ghi_chu_timeline ?? null,
      link_thong_tin: r.link_thong_tin?.trim() || null,
      truongNganhId: otn.id,
      programSlug: otn.slug?.trim() || null,
      nganhTitle: art
        ? art.tieu_de_viet?.trim() || art.tieu_de?.trim() || null
        : null,
      phuongThuc: ptList.map((p) => ({
        id: String((p as { id?: string }).id ?? ""),
        ten_phuong_thuc:
          (p as { ten_phuong_thuc?: string }).ten_phuong_thuc ?? null,
        chi_tieu_phuong_thuc:
          typeof (p as { chi_tieu_phuong_thuc?: number }).chi_tieu_phuong_thuc ===
          "number"
            ? (p as { chi_tieu_phuong_thuc: number }).chi_tieu_phuong_thuc
            : null,
        ap_dung_tat_ca_nganh:
          (p as { ap_dung_tat_ca_nganh?: boolean }).ap_dung_tat_ca_nganh ?? null,
        id_nganh_ap_dung: Array.isArray(
          (p as { id_nganh_ap_dung?: string[] }).id_nganh_ap_dung,
        )
          ? (p as { id_nganh_ap_dung: string[] }).id_nganh_ap_dung
          : null,
        id_cau_hinh_khoi:
          (p as { id_cau_hinh_khoi?: string }).id_cau_hinh_khoi ?? null,
        tieu_chi: (p as { tieu_chi?: unknown }).tieu_chi,
      })),
    });
  }
  return out;
}

async function fetchJourneyMembers(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
): Promise<TruongJourneyMember[]> {
  const { data } = await supabase
    .from("user_thanh_vien_to_chuc")
    .select(
      `
      id,
      vai_tro,
      nam_bat_dau,
      user_nguoi_dung ( ho_ten, ten_hien_thi ),
      article_bai_viet ( tieu_de_viet, tieu_de )
    `,
    )
    .eq("id_to_chuc", orgId)
    .limit(24);

  return (data ?? [])
    .map((row) => {
      const r = row as {
        id?: string;
        vai_tro?: string | null;
        nam_bat_dau?: number | null;
        user_nguoi_dung?: {
          ho_ten?: string | null;
          ten_hien_thi?: string | null;
        } | null;
        article_bai_viet?: {
          tieu_de_viet?: string | null;
          tieu_de?: string | null;
        } | null;
      };
      if (!r.id) return null;
      const user = pickOne(r.user_nguoi_dung);
      const displayName =
        user?.ten_hien_thi?.trim() ||
        user?.ho_ten?.trim() ||
        "Thành viên CINs";
      const art = pickOne(r.article_bai_viet);
      return {
        id: r.id,
        vai_tro: r.vai_tro ?? null,
        nam_bat_dau:
          typeof r.nam_bat_dau === "number" ? r.nam_bat_dau : null,
        displayName,
        nganhLabel: art
          ? art.tieu_de_viet?.trim() || art.tieu_de?.trim() || null
          : null,
      };
    })
    .filter(Boolean) as TruongJourneyMember[];
}

export async function getTruongBySlug(slug: string): Promise<TruongDetail | null> {
  const payload = await getTruongPagePayload(slug);
  return payload?.school ?? null;
}

const ORG_TRUONG_DAI_HOC_EMBED = `
  org_truong_dai_hoc (
    ma_truong,
    ten_chinh_thuc,
    ten_tieng_anh,
    loai_truong,
    nam_thanh_lap,
    website,
    hoc_phi_nam_tu,
    hoc_phi_nam_den,
    co_ktx,
    ktx_gia_thang
  )
`;

const ORG_DETAIL_SELECT_WITH_CONTACT = `
  id,
  slug,
  ten,
  mo_ta,
  gioi_thieu_truong,
  tinh_thanh,
  dia_chi,
  dien_thoai,
  email_lien_he,
  cau_hinh,
  logo_id,
  avatar_id,
  cover_id,
  ${ORG_TRUONG_DAI_HOC_EMBED}
`;

const ORG_DETAIL_SELECT_BASE = `
  id,
  slug,
  ten,
  mo_ta,
  gioi_thieu_truong,
  tinh_thanh,
  logo_id,
  avatar_id,
  cover_id,
  ${ORG_TRUONG_DAI_HOC_EMBED}
`;

async function fetchOrgToChucBySlug(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  slug: string,
): Promise<(OrgEmbed & { org_truong_dai_hoc?: OrgDaiHocEmbed | OrgDaiHocEmbed[] | null }) | null> {
  const full = await supabase
    .from("org_to_chuc")
    .select(ORG_DETAIL_SELECT_WITH_CONTACT)
    .eq("slug", slug)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as OrgEmbed & {
      org_truong_dai_hoc?: OrgDaiHocEmbed | OrgDaiHocEmbed[] | null;
    };
  }

  if (
    full.error &&
    isMissingOrgContactColumnError(full.error.message)
  ) {
    const base = await supabase
      .from("org_to_chuc")
      .select(ORG_DETAIL_SELECT_BASE)
      .eq("slug", slug)
      .maybeSingle();
    if (base.error || !base.data) return null;
    return {
      ...(base.data as OrgEmbed & {
        org_truong_dai_hoc?: OrgDaiHocEmbed | OrgDaiHocEmbed[] | null;
      }),
      ...emptyOrgContactFields(),
    };
  }

  return null;
}

async function loadTruongPagePayloadUncached(
  slugNorm: string,
): Promise<TruongPagePayload | null> {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = createPublicSupabaseClient();
    const year = defaultTruongNganhYear();

    const org = await fetchOrgToChucBySlug(supabase, slugNorm);
    if (!org) return null;

    const id = org.id?.trim();
    const ten = org.ten?.trim();
    const orgSlug = org.slug?.trim();
    if (!id || !ten || !orgSlug) return null;

    const otd = pickDaiHoc(org.org_truong_dai_hoc);
    const { programs: programsFetched, tagSet } = await fetchPrograms(
      supabase,
      id,
    );
    const programsRaw = enrichProgramsWithCoverSrcSync(programsFetched);
    const programIds = programsRaw.map((p) => p.id);

    const baseSchool = mapListFields(org, otd, tagSet);
    const avatarImageId = baseSchool.avatar_id ?? baseSchool.logo_id;
    const avatar_src = avatarImageId
      ? resolveTruongImageSrcSync(avatarImageId, ["public", "avatar"])
      : null;
    const cover_src = baseSchool.cover_id
      ? resolveTruongImageSrcSync(baseSchool.cover_id, [
          "public",
          "cover",
          "medium",
        ])
      : null;

    const [cauHinhYears, stats, baidang, hinhanh, tuyenSinh, journeyMembers] =
      await Promise.all([
      listCauHinhYearsForOrg(id),
      fetchStats(
        supabase,
        id,
        year,
        baseSchool.hoc_phi_nam_tu,
        baseSchool.hoc_phi_nam_den,
        programIds,
      ),
      fetchBaiDang(supabase, id),
      fetchHinhAnh(supabase, id),
      fetchTuyenSinh(supabase, id),
      fetchJourneyMembers(supabase, id),
    ]);

    const programs = mergeTuyenSinhIntoPrograms(programsRaw, tuyenSinh);
    const school: TruongDetail = {
      ...baseSchool,
      avatar_src,
      cover_src,
      programs,
    };

    const yearOptions = mergeTruongYearOptions(programs, tuyenSinh, cauHinhYears);
    const prefetchYear = pickDefaultTruongYear(yearOptions, cauHinhYears);
    const prefetchYears = [
      ...new Set([prefetchYear, ...cauHinhYears, ...yearOptions]),
    ].sort((a, b) => b - a);
    const cauHinhMonThiByKey = await prefetchCauHinhMonThiByKey(
      id,
      programIds,
      prefetchYears,
    );

    return {
      school,
      stats,
      baidang,
      hinhanh,
      tuyenSinh,
      journeyMembers,
      cauHinhYears,
      cauHinhMonThiByKey,
    };
  } catch {
    return null;
  }
}

/** Dedupe trong 1 request (metadata + page). */
const getTruongPagePayloadCached = cache(loadTruongPagePayloadUncached);

export async function getTruongPagePayload(
  slug: string,
): Promise<TruongPagePayload | null> {
  const slugNorm = slug.trim();
  if (!slugNorm) return null;

  return unstable_cache(
    () => getTruongPagePayloadCached(slugNorm),
    ["truong-page-payload", slugNorm],
    { revalidate: 60, tags: [`truong:${slugNorm}`] },
  )();
}

export {
  getCalcConfig,
  getCauHinhTinhDiemForTruongNganh,
  getCauHinhTinhDiemForNganh,
  getCauHinhTinhDiemByKhoiId,
  getCauHinhTinhDiem,
  getCauHinhTinhDiemSchoolWide,
  listCauHinhKhoiForOrg,
  listCauHinhYearsForOrg,
  prefetchCauHinhMonThiByKey,
  cauHinhMonThiCacheKey,
  resolveCauHinhTinhDiemApi,
  type TruongCauHinhKhoiListItem,
} from "@/lib/truong/cau-hinh-tinh-diem";
