import "server-only";

import { cache } from "react";

import { listFollowingOrgIds } from "@/lib/cins/worldJourneyOrgFeed";
import { coSoKhoaHocDetailPath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import { mocDateSortKey } from "@/lib/truong/timeline-moc";
import {
  aggregateTimelineForYear,
  buildTuyenSinhTimelineStepsForCalendarYear,
  getAdmissionTimelineFocus,
  type TuyenSinhTimelineStep,
} from "@/lib/truong/timeline-steps";
import { defaultTruongNganhYear } from "@/lib/truong/diem-chuan";
import { STUDIO_DEFAULT_TAB, studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";
import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

export type FollowedOrgUpcomingItem = {
  id: string;
  kind: "su_kien" | "moc" | "khoa";
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLoai: string;
  href: string;
  label: string;
  dateLabel: string;
  subLabel: string | null;
  status: "active" | "upcoming";
  sortKey: number;
};

type OrgMeta = {
  id: string;
  slug: string;
  ten: string;
  loai_to_chuc: string;
};

function orgPublicHref(org: OrgMeta): string {
  const slug = org.slug.trim();
  if (org.loai_to_chuc === "co_so_dao_tao") return coSoTabPath(slug, "su-kien");
  if (org.loai_to_chuc === "cong_dong") return `/cong-dong/${slug}`;
  if (org.loai_to_chuc === "studio" || org.loai_to_chuc === "doanh_nghiep") {
    return studioTabPath(slug, STUDIO_DEFAULT_TAB);
  }
  return truongTabPath(slug, TRUONG_DEFAULT_TAB);
}

function eventSortKey(batDau: string, ketThuc: string | null): number {
  const t = new Date(batDau).getTime();
  if (!Number.isNaN(t)) return t;
  const end = ketThuc ? new Date(ketThuc).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isNaN(end) ? Number.MAX_SAFE_INTEGER : end;
}

function pushTimelineSteps(
  out: FollowedOrgUpcomingItem[],
  org: OrgMeta,
  steps: TuyenSinhTimelineStep[],
  href: string,
) {
  const focus = getAdmissionTimelineFocus(steps);
  const focusIds = new Set(
    [focus.currentId, focus.nextId].filter(Boolean) as string[],
  );

  steps.forEach((step, index) => {
    if (step.status === "done") return;
    const isFocus = focusIds.has(step.id);
    if (step.status !== "active" && step.status !== "upcoming" && !isFocus) {
      return;
    }
    const statusRank = step.status === "active" ? 0 : 1;
    out.push({
      id: `${org.id}:${step.id}`,
      kind: "moc",
      orgId: org.id,
      orgSlug: org.slug,
      orgName: org.ten,
      orgLoai: org.loai_to_chuc,
      href: step.link?.startsWith("/") ? step.link : href,
      label: step.label,
      dateLabel: step.dateLabel,
      subLabel: null,
      status: step.status === "active" ? "active" : "upcoming",
      sortKey: statusRank * 1e12 + index,
    });
  });
}

function mapTuyenSinhRow(raw: Record<string, unknown>): TruongTuyenSinhNamRow | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const nam = typeof raw.nam === "number" ? raw.nam : Number(raw.nam);
  if (!id || Number.isNaN(nam)) return null;
  const otn = raw.org_truong_nganh as { id?: string; slug?: string | null } | null;
  return {
    id,
    nam,
    chi_tieu: typeof raw.chi_tieu === "number" ? raw.chi_tieu : null,
    diem_chuan: typeof raw.diem_chuan === "number" ? raw.diem_chuan : null,
    tinh_trang: (raw.tinh_trang as string | null) ?? null,
    ngay_mo_ho_so: (raw.ngay_mo_ho_so as string | null) ?? null,
    ngay_dong_ho_so: (raw.ngay_dong_ho_so as string | null) ?? null,
    ngay_thi_tu: (raw.ngay_thi_tu as string | null) ?? null,
    ngay_thi_den: (raw.ngay_thi_den as string | null) ?? null,
    ngay_cong_bo_diem: (raw.ngay_cong_bo_diem as string | null) ?? null,
    ngay_xac_nhan_nhap_hoc_tu: (raw.ngay_xac_nhan_nhap_hoc_tu as string | null) ?? null,
    ngay_xac_nhan_nhap_hoc_den: (raw.ngay_xac_nhan_nhap_hoc_den as string | null) ?? null,
    ghi_chu_timeline: (raw.ghi_chu_timeline as string | null) ?? null,
    link_thong_tin: (raw.link_thong_tin as string | null) ?? null,
    truongNganhId: otn?.id ?? "",
    programSlug: otn?.slug ?? null,
    nganhTitle: null,
    phuongThuc: [],
  };
}

/**
 * Mốc tuyển sinh + sự kiện + khóa sắp khai giảng từ org viewer đang theo dõi.
 * Dùng module sidebar trang chủ — ưu tiên trước gợi ý toàn cục.
 */
export const loadFollowedOrgUpcoming = cache(async function loadFollowedOrgUpcoming(
  viewerId: string,
  loaiSuKienFilter: string[] = [],
): Promise<FollowedOrgUpcomingItem[]> {
  const limit = 6;
  const orgIds = await listFollowingOrgIds(viewerId);
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const calendarYear = defaultTruongNganhYear();

  const { data: orgRows } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, loai_to_chuc")
    .in("id", orgIds)
    .returns<OrgMeta[]>();

  const orgs = (orgRows ?? []).filter(
    (o) => o.slug?.trim() && o.ten?.trim(),
  ) as OrgMeta[];
  if (orgs.length === 0) return [];

  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const truongIds = orgs
    .filter((o) => o.loai_to_chuc === "truong_dai_hoc")
    .map((o) => o.id);
  const coSoIds = orgs
    .filter((o) => o.loai_to_chuc === "co_so_dao_tao")
    .map((o) => o.id);

  let suKienQuery = admin
    .from("org_su_kien")
    .select(
      "id, ten, loai_su_kien, bat_dau, ket_thuc, id_to_chuc",
    )
    .in("id_to_chuc", orgIds)
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: true })
    .limit(limit * 3);

  if (loaiSuKienFilter.length > 0) {
    suKienQuery = suKienQuery.in("loai_su_kien", loaiSuKienFilter);
  }

  const [suKienRes, tuyenSinhRes, khoaRes] = await Promise.all([
    suKienQuery,
    truongIds.length > 0
      ? (async () => {
          const { data: nganhRows } = await admin
            .from("org_truong_nganh")
            .select("id")
            .in("id_to_chuc", truongIds)
            .returns<Array<{ id: string }>>();
          const nganhIds = (nganhRows ?? []).map((r) => r.id);
          if (nganhIds.length === 0) return { data: [] as Record<string, unknown>[] };
          return admin
            .from("org_tuyen_sinh_nam")
            .select(
              `
              id,
              nam,
              ngay_mo_ho_so,
              ngay_dong_ho_so,
              ngay_thi_tu,
              ngay_thi_den,
              ngay_cong_bo_diem,
              ngay_xac_nhan_nhap_hoc_tu,
              ngay_xac_nhan_nhap_hoc_den,
              ghi_chu_timeline,
              link_thong_tin,
              org_truong_nganh!inner ( id, slug, id_to_chuc )
            `,
            )
            .in("id_truong_nganh", nganhIds);
        })()
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    coSoIds.length > 0
      ? admin
          .from("org_khoa_hoc")
          .select(
            "id, slug, ten_khoa_hoc, ngay_khai_giang_gan_nhat, id_to_chuc, trang_thai_khoa_hoc",
          )
          .in("id_to_chuc", coSoIds)
          .in("trang_thai_khoa_hoc", ["sap_khai_giang", "dang_mo_don"])
          .not("ngay_khai_giang_gan_nhat", "is", null)
          .order("ngay_khai_giang_gan_nhat", { ascending: true })
          .limit(limit * 2)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const out: FollowedOrgUpcomingItem[] = [];

  for (const row of suKienRes.data ?? []) {
    const org = orgById.get(row.id_to_chuc as string);
    if (!org) continue;
    const status = getStepStatus(row.bat_dau as string, row.ket_thuc as string | null);
    if (status === "done") continue;
    const startLabel = formatTimelineDate(row.bat_dau as string) ?? "";
    const endLabel = row.ket_thuc
      ? formatTimelineDate(row.ket_thuc as string)
      : null;
    let dateLabel =
      endLabel && endLabel !== startLabel
        ? `${startLabel} – ${endLabel}`
        : startLabel;
    if (status === "active") dateLabel = `${dateLabel} · Đang diễn ra`;
    out.push({
      id: `sk:${row.id}`,
      kind: "su_kien",
      orgId: org.id,
      orgSlug: org.slug,
      orgName: org.ten,
      orgLoai: org.loai_to_chuc,
      href: orgPublicHref(org),
      label: (row.ten as string)?.trim() || "Sự kiện",
      dateLabel,
      subLabel: labelLoaiSuKien(row.loai_su_kien as string),
      status: status === "active" ? "active" : "upcoming",
      sortKey: eventSortKey(row.bat_dau as string, row.ket_thuc as string | null),
    });
  }

  const tuyenSinhByOrg = new Map<string, TruongTuyenSinhNamRow[]>();
  for (const raw of tuyenSinhRes.data ?? []) {
    const row = mapTuyenSinhRow(raw as Record<string, unknown>);
    if (!row) continue;
    const embed = (raw as Record<string, unknown>).org_truong_nganh as
      | { id_to_chuc?: string }
      | { id_to_chuc?: string }[]
      | null;
    const otn = Array.isArray(embed) ? embed[0] : embed;
    const orgId = otn?.id_to_chuc;
    if (!orgId) continue;
    const list = tuyenSinhByOrg.get(orgId) ?? [];
    list.push(row);
    tuyenSinhByOrg.set(orgId, list);
  }

  for (const [orgId, rows] of tuyenSinhByOrg) {
    const org = orgById.get(orgId);
    if (!org) continue;
    const yearRows = rows.filter((r) => r.nam === calendarYear);
    const pool = yearRows.length ? yearRows : rows;
    const aggregated = aggregateTimelineForYear(pool);
    if (!aggregated) continue;
    const steps = buildTuyenSinhTimelineStepsForCalendarYear(
      aggregated,
      calendarYear,
    );
    pushTimelineSteps(out, org, steps, truongTabPath(org.slug, TRUONG_DEFAULT_TAB));
  }

  for (const row of khoaRes.data ?? []) {
    const org = orgById.get(row.id_to_chuc as string);
    const ngay = row.ngay_khai_giang_gan_nhat as string | null;
    if (!org || !ngay?.trim()) continue;
    const status = getStepStatus(ngay, ngay);
    if (status === "done") continue;
    const formatted = formatTimelineDate(ngay);
    out.push({
      id: `khoa:${row.id}`,
      kind: "khoa",
      orgId: org.id,
      orgSlug: org.slug,
      orgName: org.ten,
      orgLoai: org.loai_to_chuc,
      href: coSoKhoaHocDetailPath(org.slug, row.slug as string),
      label: (row.ten_khoa_hoc as string)?.trim() || "Khóa học",
      dateLabel:
        status === "active" && formatted
          ? `${formatted} · Đang diễn ra`
          : formatted ?? "Sắp khai giảng",
      subLabel: org.ten,
      status: status === "active" ? "active" : "upcoming",
      sortKey: mocDateSortKey(ngay, null),
    });
  }

  out.sort((a, b) => {
    const statusOrder =
      (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1);
    if (statusOrder !== 0) return statusOrder;
    return a.sortKey - b.sortKey;
  });

  return out.slice(0, limit);
});
