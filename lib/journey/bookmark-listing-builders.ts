import type {
  MilestoneBookmarkListing,
  MilestoneBookmarkListingStatusTone,
} from "@/components/journey/milestone-types";
import { stripHtmlToPlainText } from "@/lib/search/helpers";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { STUDIO_JOB_LOAI_HINH_LABEL } from "@/lib/to-chuc/studio-tuyen-dung-types";
import { orgJobPath } from "@/lib/to-chuc/tuyen-dung-href";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

const TRINH_DO_LABEL: Record<string, string> = {
  co_ban: "Cơ bản",
  trung_cap: "Trung cấp",
  nang_cao: "Nâng cao",
  khong_yeu_cau: "Không yêu cầu",
};

function formatHocPhi(hocPhi: unknown): string {
  if (hocPhi == null) return "Liên hệ";
  const n = Number(hocPhi);
  if (Number.isNaN(n)) return "Liên hệ";
  if (n <= 0) return "Miễn phí";
  return `${n.toLocaleString("vi-VN")} đ`;
}

function formatJobSalary(row: Record<string, unknown>): string | null {
  if (row.hien_thi_luong === false) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const tu = row.muc_luong_tu != null ? Number(row.muc_luong_tu) : null;
  const den = row.muc_luong_den != null ? Number(row.muc_luong_den) : null;
  if (tu && den) return `${fmt(tu)} – ${fmt(den)} đ`;
  if (tu) return `Từ ${fmt(tu)} đ`;
  if (den) return `Đến ${fmt(den)} đ`;
  return null;
}

function jobPlace(row: Record<string, unknown>): string {
  if (row.lam_tu_xa) return "Remote";
  const tinh = row.tinh_thanh ? String(row.tinh_thanh).trim() : "";
  return tinh ? tinh.replace(/_/g, " ") : "Linh hoạt";
}

function jobStatusFromRow(row: Record<string, unknown>): {
  label: string;
  tone: MilestoneBookmarkListingStatusTone;
  deadline: string | null;
} {
  const trangThai = row.trang_thai ? String(row.trang_thai) : "";
  const deadline = formatDeadline(row.han_nop);
  if (trangThai === "nhap") {
    return { label: "Bản nháp", tone: "draft", deadline };
  }
  if (trangThai === "da_dong") {
    return { label: "Đã đóng", tone: "closed", deadline };
  }
  if (hanNopExpired(row.han_nop)) {
    return { label: "Hết hạn nộp", tone: "expired", deadline };
  }
  if (trangThai === "dang_mo") {
    return { label: "Đang tuyển", tone: "open", deadline };
  }
  return { label: "Đã đóng", tone: "closed", deadline };
}

function hanNopExpired(hanNop: unknown): boolean {
  if (!hanNop) return false;
  const d = new Date(String(hanNop));
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

function formatDeadline(hanNop: unknown): string | null {
  if (!hanNop) return null;
  const d = new Date(String(hanNop));
  if (Number.isNaN(d.getTime())) return null;
  return `Hạn nộp ${d.toLocaleDateString("vi-VN")}`;
}

type OrgEmbed = {
  slug?: string | null;
  ten?: string | null;
  loai_to_chuc?: string | null;
  avatar_id?: string | null;
  logo_id?: string | null;
};

function pickOrg(raw: OrgEmbed | OrgEmbed[] | null | undefined): OrgEmbed | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function orgAvatarUrl(org: OrgEmbed | null): string | null {
  const id = org?.avatar_id ?? org?.logo_id;
  return id ? resolveTruongImageSrcSync(id, ["public", "avatar"]) : null;
}

export function buildTuyenDungBookmarkListing(
  row: Record<string, unknown>,
): MilestoneBookmarkListing | null {
  const org = pickOrg(row.org_to_chuc as OrgEmbed | OrgEmbed[] | null);
  const orgSlug = org?.slug?.trim();
  if (!org || !orgSlug) return null;

  const loai = String(row.loai_hinh ?? "toan_thoi_gian");
  const loaiHinhLabel =
    STUDIO_JOB_LOAI_HINH_LABEL[
      loai as keyof typeof STUDIO_JOB_LOAI_HINH_LABEL
    ] ?? loai;
  const moTaNgan = row.mo_ta_ngan ? String(row.mo_ta_ngan).trim() : null;
  const snippet =
    moTaNgan ??
    stripHtmlToPlainText(row.mo_ta ? String(row.mo_ta) : null)?.slice(0, 200) ??
    null;
  const linhVucRaw = row.linh_vuc;
  const linhVuc = Array.isArray(linhVucRaw)
    ? (linhVucRaw[0] as { ten?: string } | undefined)
    : (linhVucRaw as { ten?: string } | null);
  const status = jobStatusFromRow(row);

  return {
    kind: "tuyen_dung",
    href: orgJobPath(org.loai_to_chuc, orgSlug, String(row.id)),
    orgTen: org.ten?.trim() || orgSlug,
    orgAvatarUrl: orgAvatarUrl(org),
    snippet,
    salary: formatJobSalary(row) ?? "Thỏa thuận",
    loaiHinhLabel,
    place: jobPlace(row),
    linhVucTen: linhVuc?.ten?.trim() || null,
    statusLabel: status.label,
    statusTone: status.tone,
    deadline: status.deadline,
  };
}

export function buildKhoaHocBookmarkListing(
  row: Record<string, unknown>,
): MilestoneBookmarkListing | null {
  const org = pickOrg(row.org_to_chuc as OrgEmbed | OrgEmbed[] | null);
  const orgSlug = org?.slug?.trim();
  const courseSlug = row.slug ? String(row.slug).trim() : "";
  if (!org || !orgSlug || !courseSlug) return null;

  const trinhDo = row.trinh_do_dau_vao
    ? String(row.trinh_do_dau_vao)
    : null;
  const coverId = row.cover_id ?? row.avatar_id;
  const coverUrl =
    typeof coverId === "string" && coverId.trim()
      ? resolveTruongImageSrcSync(coverId.trim(), ["public", "cover"])
      : null;
  const moTa = row.mo_ta ? String(row.mo_ta).trim() : null;

  return {
    kind: "khoa_hoc",
    href: coSoKhoaHocDetailPath(orgSlug, courseSlug),
    orgTen: org.ten?.trim() || orgSlug,
    orgAvatarUrl: orgAvatarUrl(org),
    snippet: moTa ? moTa.slice(0, 200) : null,
    coverUrl,
    hocPhi: formatHocPhi(row.hoc_phi),
    trinhDoLabel: trinhDo ? TRINH_DO_LABEL[trinhDo] ?? trinhDo : null,
    statusLabel: "Khóa học",
    statusTone: "open",
  };
}
