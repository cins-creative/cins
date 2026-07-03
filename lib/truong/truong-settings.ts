import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import {
  isOrgSlugTaken,
  validateOrgSlug,
} from "@/lib/cong-dong/org-slug";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import {
  canChangeCoSoSlug,
  coSoVaiTroLabel,
} from "@/lib/to-chuc/co-so-vai-tro";
import type { CoSoSettingsViewer } from "@/lib/to-chuc/co-so-settings-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  hydrateChiNhanhFromSchool,
  mergeChiNhanhIntoCauHinh,
  mergeFacebookIntoCauHinh,
  normalizeChiNhanhList,
  orgContactFromPrimaryChiNhanh,
  parseChiNhanhFromCauHinh,
  parseFacebookFromCauHinh,
} from "@/lib/truong/chi-nhanh";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";
import { MO_TA_SHORT_MAX } from "@/lib/truong/mo-ta-short";
import {
  mergeKtxDiaChiIntoCauHinh,
  parseKtxDiaChiFromCauHinh,
} from "@/lib/truong/ktx-cau-hinh";
import type { TruongChiNhanh } from "@/lib/truong/types";

export type { CoSoSettingsViewer as TruongSettingsViewer } from "@/lib/to-chuc/co-so-settings-types";

type OrgRow = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  gioi_thieu_truong: string | null;
  dia_chi: string | null;
  dien_thoai: string | null;
  email_lien_he: string | null;
  tinh_thanh: string | null;
  cau_hinh: unknown;
  org_truong_dai_hoc: {
    ma_truong: string | null;
    loai_truong: string | null;
    ten_tieng_anh: string | null;
    website: string | null;
    nam_thanh_lap: number | null;
    hoc_phi_nam_tu: number | null;
    hoc_phi_nam_den: number | null;
    co_ktx: boolean | null;
    ktx_gia_thang: number | null;
  } | null;
};

export type TruongSettingsPayload = {
  orgId: string;
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieuTruong: string | null;
  tenTiengAnh: string | null;
  maTruong: string | null;
  loaiTruong: string | null;
  namThanhLap: number | null;
  website: string | null;
  hocPhiNamTu: number | null;
  hocPhiNamDen: number | null;
  coKtx: boolean;
  ktxGiaThang: number | null;
  ktxDiaChi: string | null;
  chiNhanh: TruongChiNhanh[];
  viewer: CoSoSettingsViewer;
};

const LOAI_TRUONG_SET = new Set(["cong_lap", "dan_lap", "quoc_te"]);

function parseNamThanhLap(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1800 || n > 2100) return "invalid";
  return n;
}

async function loadTruongOrg(orgId: string): Promise<OrgRow | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, gioi_thieu_truong, dia_chi, dien_thoai, email_lien_he, tinh_thanh, cau_hinh, org_truong_dai_hoc(ma_truong, loai_truong, ten_tieng_anh, website, nam_thanh_lap, hoc_phi_nam_tu, hoc_phi_nam_den, co_ktx, ktx_gia_thang)",
    )
    .eq("id", orgId)
    .eq("loai_to_chuc", "truong_dai_hoc")
    .maybeSingle<OrgRow>();

  if (!data?.org_truong_dai_hoc) return null;
  return data;
}

async function buildViewer(
  orgId: string,
  profileId: string,
): Promise<CoSoSettingsViewer> {
  const [vaiTro, isCinsAdmin] = await Promise.all([
    getViewerCoSoVaiTro(profileId, orgId),
    getCurrentUserIsCinsAdmin(),
  ]);

  const vaiTroLabel = isCinsAdmin
    ? "Quản trị CINs"
    : vaiTro
      ? coSoVaiTroLabel(vaiTro)
      : "Quản trị viên";

  return {
    vaiTro,
    vaiTroLabel,
    isCinsAdmin,
    canManageMembers: false,
    canChangeSlug: isCinsAdmin || canChangeCoSoSlug(vaiTro),
  };
}

function buildChiNhanhForSettings(org: OrgRow): TruongChiNhanh[] {
  const ext = org.org_truong_dai_hoc!;
  return hydrateChiNhanhFromSchool({
    chi_nhanh: parseChiNhanhFromCauHinh(org.cau_hinh) ?? undefined,
    dia_chi: org.dia_chi,
    tinh_thanh: org.tinh_thanh,
    dien_thoai: org.dien_thoai,
    email_lien_he: org.email_lien_he,
    website: ext.website,
    facebook: parseFacebookFromCauHinh(org.cau_hinh),
  });
}

function mapSettings(org: OrgRow, viewer: CoSoSettingsViewer): TruongSettingsPayload {
  const ext = org.org_truong_dai_hoc!;
  return {
    orgId: org.id,
    slug: org.slug,
    ten: org.ten,
    moTa: org.mo_ta,
    gioiThieuTruong: org.gioi_thieu_truong,
    tenTiengAnh: ext.ten_tieng_anh,
    maTruong: ext.ma_truong,
    loaiTruong: ext.loai_truong,
    namThanhLap: ext.nam_thanh_lap,
    website: ext.website,
    hocPhiNamTu: ext.hoc_phi_nam_tu,
    hocPhiNamDen: ext.hoc_phi_nam_den,
    coKtx: Boolean(ext.co_ktx),
    ktxGiaThang: ext.ktx_gia_thang,
    ktxDiaChi: parseKtxDiaChiFromCauHinh(org.cau_hinh),
    chiNhanh: buildChiNhanhForSettings(org),
    viewer,
  };
}

export async function getTruongSettings(
  orgId: string,
  profileId: string,
): Promise<
  { ok: true; settings: TruongSettingsPayload } | { ok: false; error: string }
> {
  if (!(await isTruongOrgAdmin(orgId, profileId))) {
    return { ok: false, error: "Bạn không có quyền quản trị trường này." };
  }

  const org = await loadTruongOrg(orgId);
  if (!org) return { ok: false, error: "Không tìm thấy trường." };

  const viewer = await buildViewer(orgId, profileId);
  return { ok: true, settings: mapSettings(org, viewer) };
}

export type UpdateTruongSettingsInput = {
  ten?: string;
  slug?: string;
  moTa?: string | null;
  gioiThieuTruong?: string | null;
  tenTiengAnh?: string | null;
  maTruong?: string | null;
  loaiTruong?: string | null;
  namThanhLap?: number | null;
  hocPhiNamTu?: number | null;
  hocPhiNamDen?: number | null;
  coKtx?: boolean;
  ktxGiaThang?: number | null;
  ktxDiaChi?: string | null;
  chiNhanh?: TruongChiNhanh[];
};

export async function updateTruongSettings(
  orgId: string,
  profileId: string,
  input: UpdateTruongSettingsInput,
): Promise<
  { ok: true; settings: TruongSettingsPayload } | { ok: false; error: string }
> {
  if (!(await isTruongOrgAdmin(orgId, profileId))) {
    return { ok: false, error: "Bạn không có quyền quản trị trường này." };
  }

  const org = await loadTruongOrg(orgId);
  if (!org) return { ok: false, error: "Không tìm thấy trường." };

  const viewer = await buildViewer(orgId, profileId);

  const orgPatch: Record<string, unknown> = {};
  const extPatch: Record<string, unknown> = {};
  let cauHinhBase: unknown = org.cau_hinh;

  if (input.chiNhanh !== undefined) {
    const normalized = normalizeChiNhanhList(input.chiNhanh);
    if (!normalized.length) {
      return {
        ok: false,
        error: "Cần ít nhất một chi nhánh có tên và địa chỉ.",
      };
    }
    orgPatch.cau_hinh = mergeChiNhanhIntoCauHinh(cauHinhBase, normalized);
    cauHinhBase = orgPatch.cau_hinh;
    const orgContact = orgContactFromPrimaryChiNhanh(normalized);
    orgPatch.dia_chi = orgContact.dia_chi;
    orgPatch.tinh_thanh = normalizeTinhThanhForDb(orgContact.tinh_thanh);
    orgPatch.dien_thoai = orgContact.dien_thoai;
    orgPatch.email_lien_he = orgContact.email_lien_he;
    orgPatch.cau_hinh = mergeFacebookIntoCauHinh(
      orgPatch.cau_hinh,
      orgContact.facebook,
    );
    cauHinhBase = orgPatch.cau_hinh;
    extPatch.website = orgContact.website;
  }

  if (input.ten !== undefined) {
    const ten = input.ten.trim();
    if (!ten) return { ok: false, error: "Tên hiển thị không được trống." };
    if (ten.length > 120) {
      return { ok: false, error: "Tên hiển thị tối đa 120 ký tự." };
    }
    orgPatch.ten = ten;
  }

  if (input.slug !== undefined) {
    if (!viewer.canChangeSlug) {
      return { ok: false, error: "Chỉ quản trị viên mới đổi được đường dẫn." };
    }
    const validation = validateOrgSlug(input.slug);
    if (!validation.ok) return { ok: false, error: validation.error };
    if (validation.slug !== org.slug && (await isOrgSlugTaken(validation.slug))) {
      return { ok: false, error: "Đường dẫn này đã có người dùng." };
    }
    orgPatch.slug = validation.slug;
  }

  if (input.moTa !== undefined) {
    const moTa = input.moTa?.trim() || null;
    if (moTa && moTa.length > MO_TA_SHORT_MAX) {
      return {
        ok: false,
        error: `Mô tả ngắn tối đa ${MO_TA_SHORT_MAX} ký tự.`,
      };
    }
    orgPatch.mo_ta = moTa;
  }

  if (input.gioiThieuTruong !== undefined) {
    orgPatch.gioi_thieu_truong = input.gioiThieuTruong?.trim() || null;
  }

  if (input.tenTiengAnh !== undefined) {
    extPatch.ten_tieng_anh = input.tenTiengAnh?.trim() || null;
  }

  if (input.maTruong !== undefined) {
    extPatch.ma_truong = input.maTruong?.trim() || null;
  }

  if (input.loaiTruong !== undefined) {
    const loai = input.loaiTruong?.trim() || null;
    if (loai && !LOAI_TRUONG_SET.has(loai)) {
      return { ok: false, error: "Loại trường không hợp lệ." };
    }
    extPatch.loai_truong = loai;
  }

  if (input.namThanhLap !== undefined) {
    if (input.namThanhLap === null) {
      extPatch.nam_thanh_lap = null;
    } else {
      const parsed = parseNamThanhLap(input.namThanhLap);
      if (parsed === "invalid") {
        return { ok: false, error: "Năm thành lập không hợp lệ (1800–2100)." };
      }
      extPatch.nam_thanh_lap = parsed;
    }
  }

  if (input.hocPhiNamTu !== undefined) {
    extPatch.hoc_phi_nam_tu =
      input.hocPhiNamTu === null ? null : Number(input.hocPhiNamTu);
  }

  if (input.hocPhiNamDen !== undefined) {
    extPatch.hoc_phi_nam_den =
      input.hocPhiNamDen === null ? null : Number(input.hocPhiNamDen);
  }

  if (input.coKtx !== undefined) {
    extPatch.co_ktx = input.coKtx;
    if (!input.coKtx) {
      extPatch.ktx_gia_thang = null;
      if (input.ktxDiaChi === undefined) {
        orgPatch.cau_hinh = mergeKtxDiaChiIntoCauHinh(cauHinhBase, null);
        cauHinhBase = orgPatch.cau_hinh;
      }
    }
  }

  if (input.ktxGiaThang !== undefined) {
    extPatch.ktx_gia_thang =
      input.ktxGiaThang === null ? null : Number(input.ktxGiaThang);
  }

  if (input.ktxDiaChi !== undefined) {
    orgPatch.cau_hinh = mergeKtxDiaChiIntoCauHinh(cauHinhBase, input.ktxDiaChi);
    cauHinhBase = orgPatch.cau_hinh;
  }

  if (Object.keys(orgPatch).length === 0 && Object.keys(extPatch).length === 0) {
    return { ok: false, error: "Không có thay đổi." };
  }

  const admin = createServiceRoleClient();

  if (Object.keys(orgPatch).length > 0) {
    const { error } = await admin.from("org_to_chuc").update(orgPatch).eq("id", orgId);
    if (error) return { ok: false, error: error.message };
  }

  if (Object.keys(extPatch).length > 0) {
    const { error } = await admin
      .from("org_truong_dai_hoc")
      .update(extPatch)
      .eq("id_to_chuc", orgId);
    if (error) return { ok: false, error: error.message };
  }

  const refreshed = await loadTruongOrg(orgId);
  if (!refreshed) return { ok: false, error: "Không tải lại được trường." };

  return {
    ok: true,
    settings: mapSettings(refreshed, viewer),
  };
}
