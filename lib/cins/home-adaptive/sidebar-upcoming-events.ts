import "server-only";

import { cache } from "react";

import type { FollowedOrgUpcomingItem } from "@/lib/cins/home-adaptive/followed-org-upcoming";
import { listFollowingOrgIds } from "@/lib/cins/worldJourneyOrgFeed";
import { coSoKhoaHocDetailPath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import {
  mapCoSoLopTimelinePinRows,
  resolveCoSoLopTimelineLabel,
} from "@/lib/to-chuc/co-so-timeline-lop";
import {
  formatKhaiGiangCard,
  isKhoaHocMuted,
  LICH_KHAI_GIANG_LIEN_TUC_DEFAULT,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type { LoaiMoHinhKhoa, TrangThaiKhoaHoc } from "@/lib/to-chuc/khoa-hoc-types";
import {
  loadUserSuKienPhanHoiMap,
  type LoaiPhanHoiSuKien,
} from "@/lib/to-chuc/su-kien-dang-ky";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { currentCalendarYear } from "@/lib/truong/diem-chuan";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { formatTimelineDate, getStepStatus } from "@/lib/truong/timeline";
import { mocDateSortKey } from "@/lib/truong/timeline-moc";
import {
  aggregateTimelineForYear,
  buildTuyenSinhTimelineStepsForCalendarYear,
  getAdmissionTimelineFocus,
  type TuyenSinhTimelineStep,
} from "@/lib/truong/timeline-steps";
import { STUDIO_DEFAULT_TAB, studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";
import type { TruongTuyenSinhNamRow } from "@/lib/truong/types";

export type SidebarUpcomingEventsBundle = {
  items: SidebarUpcomingEvent[];
  /** Số sự kiện sắp diễn ra mà viewer quan tâm hoặc sẽ tham gia. */
  myEventsTotal: number;
};

export function sidebarSuKienId(item: SidebarUpcomingEvent): string {
  return item.id.replace(/^sk:/, "");
}

export function sidebarEventHref(item: SidebarUpcomingEvent): string {
  if (item.phanHoi) {
    return `/su-kien?tab=cua-ban&suKien=${encodeURIComponent(sidebarSuKienId(item))}`;
  }
  return item.href;
}

export type SidebarUpcomingEvent = FollowedOrgUpcomingItem & {
  kind: "su_kien" | "moc";
  phanHoi: LoaiPhanHoiSuKien | null;
  coverSrc: string | null;
  orgAvatarUrl: string | null;
  batDauIso: string;
  ketThucIso: string | null;
};

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type SuKienRow = {
  id: string;
  ten: string;
  loai_su_kien: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  cover_id: string | null;
  id_to_chuc: string;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

function pickOrg(org: SuKienRow["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

function orgSuKienHref(loai: string, slug: string): string {
  if (loai === "co_so_dao_tao") return coSoTabPath(slug, "su-kien");
  if (loai === "cong_dong") return `/cong-dong/${slug}`;
  if (loai === "studio" || loai === "doanh_nghiep") {
    return studioTabPath(slug, STUDIO_DEFAULT_TAB);
  }
  return truongTabPath(slug, TRUONG_DEFAULT_TAB);
}

function eventSortKey(batDau: string): number {
  const t = new Date(batDau).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function priorityRank(
  phanHoi: LoaiPhanHoiSuKien | null,
  fromFollowedOrg: boolean,
): number {
  if (phanHoi === "se_tham_gia") return 0;
  if (phanHoi === "quan_tam") return 1;
  if (fromFollowedOrg) return 2;
  return 3;
}

function mapSuKienRow(
  row: SuKienRow,
  phanHoi: LoaiPhanHoiSuKien | null,
): SidebarUpcomingEvent | null {
  const org = pickOrg(row.org_to_chuc);
  if (!org?.slug?.trim() || !org.ten?.trim()) return null;

  const status = getStepStatus(row.bat_dau, row.ket_thuc);
  if (status === "done") return null;

  const startLabel = formatTimelineDate(row.bat_dau) ?? "";
  const endLabel = row.ket_thuc ? formatTimelineDate(row.ket_thuc) : null;
  let dateLabel =
    endLabel && endLabel !== startLabel
      ? `${startLabel} – ${endLabel}`
      : startLabel;
  if (status === "active") dateLabel = `${dateLabel} · Đang diễn ra`;

  const orgLoai = org.loai_to_chuc?.trim() ?? "co_so_dao_tao";
  const orgSlug = org.slug.trim();
  const orgAvatarId = org.avatar_id ?? org.logo_id;

  return {
    id: `sk:${row.id}`,
    kind: "su_kien",
    orgId: row.id_to_chuc,
    orgSlug,
    orgName: org.ten.trim(),
    orgLoai,
    href: orgSuKienHref(orgLoai, orgSlug),
    label: row.ten?.trim() || "Sự kiện",
    dateLabel,
    subLabel: labelLoaiSuKien(row.loai_su_kien),
    status: status === "active" ? "active" : "upcoming",
    sortKey: eventSortKey(row.bat_dau),
    phanHoi,
    coverSrc: row.cover_id
      ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
      : null,
    orgAvatarUrl: orgAvatarId
      ? resolveTruongImageSrcSync(orgAvatarId, ["public", "avatar"])
      : null,
    batDauIso: row.bat_dau,
    ketThucIso: row.ket_thuc,
  };
}

async function fetchUpcomingSuKienRows(
  options: {
    suKienIds?: string[];
    orgIds?: string[];
    loaiFilter: string[];
    limit: number;
    excludeIds: Set<string>;
  },
): Promise<SuKienRow[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  let query = admin
    .from("org_su_kien")
    .select(
      "id, ten, loai_su_kien, bat_dau, ket_thuc, cover_id, id_to_chuc, org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )",
    )
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: true })
    .limit(options.limit + options.excludeIds.size + 6);

  if (options.suKienIds?.length) {
    query = query.in("id", options.suKienIds);
  } else if (options.orgIds?.length) {
    query = query.in("id_to_chuc", options.orgIds);
  }

  if (options.loaiFilter.length > 0) {
    query = query.in("loai_su_kien", options.loaiFilter);
  }

  const { data } = await query.returns<SuKienRow[]>();
  const out: SuKienRow[] = [];
  for (const row of data ?? []) {
    if (options.excludeIds.has(row.id)) continue;
    out.push(row);
    if (out.length >= options.limit) break;
  }
  return out;
}

function sortSidebarEvents(
  pool: SidebarUpcomingEvent[],
  followedSet: Set<string>,
): SidebarUpcomingEvent[] {
  return [...pool].sort((a, b) => {
    const rankA = priorityRank(a.phanHoi, followedSet.has(a.orgId));
    const rankB = priorityRank(b.phanHoi, followedSet.has(b.orgId));
    if (rankA !== rankB) return rankA - rankB;
    const liveOrder =
      (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1);
    if (liveOrder !== 0) return liveOrder;
    return a.sortKey - b.sortKey;
  });
}

/* ────────────────────────────────────────────────────────────────
 * Mốc thông báo tuyển sinh — từ trường viewer đang theo dõi.
 * Map sang cùng shape `SidebarUpcomingEvent` để hiển thị chung với sự kiện.
 * ──────────────────────────────────────────────────────────────── */

type TruongOrgEmbed = {
  id: string;
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

function mapTuyenSinhTimelineRow(
  raw: Record<string, unknown>,
): TruongTuyenSinhNamRow | null {
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
    truongNganhId: (otn?.id as string) ?? "",
    programSlug: otn?.slug ?? null,
    nganhTitle: null,
    phuongThuc: [],
  };
}

/** Chuyển nhãn ngày `dd/mm/yyyy` (hoặc khoảng `dd/mm – dd/mm`) sang ISO cho đếm ngược. */
function timelineDateLabelToIso(label: string): {
  startIso: string;
  endIso: string | null;
  startSort: number;
} {
  const matches = [...label.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
  const toIso = (m: RegExpMatchArray) =>
    `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00`;
  const startIso = matches[0] ? toIso(matches[0]) : new Date().toISOString();
  const endIso = matches[1] ? toIso(matches[1]) : null;
  const startSort = new Date(startIso).getTime();
  return {
    startIso,
    endIso,
    startSort: Number.isNaN(startSort) ? Number.MAX_SAFE_INTEGER : startSort,
  };
}

function mapMocStep(
  org: TruongOrgEmbed,
  step: TuyenSinhTimelineStep,
): SidebarUpcomingEvent | null {
  const orgSlug = org.slug?.trim();
  const orgName = org.ten?.trim();
  if (!orgSlug || !orgName) return null;

  const { startIso, endIso, startSort } = timelineDateLabelToIso(step.dateLabel);
  const orgLoai = org.loai_to_chuc?.trim() || "truong_dai_hoc";
  const orgAvatarId = org.avatar_id ?? org.logo_id;
  const isActive = step.status === "active";
  const href =
    step.link && step.link.startsWith("/")
      ? step.link
      : truongTabPath(orgSlug, TRUONG_DEFAULT_TAB);

  return {
    id: `moc:${org.id}:${step.id}`,
    kind: "moc",
    orgId: org.id,
    orgSlug,
    orgName,
    orgLoai,
    href,
    label: step.label,
    dateLabel: step.dateLabel,
    subLabel: "Thông báo tuyển sinh",
    status: isActive ? "active" : "upcoming",
    sortKey: (isActive ? 0 : 1e12) + startSort,
    phanHoi: null,
    coverSrc: null,
    orgAvatarUrl: orgAvatarId
      ? resolveTruongImageSrcSync(orgAvatarId, ["public", "avatar"])
      : null,
    batDauIso: startIso,
    ketThucIso: endIso,
  };
}

/** Mốc tuyển sinh sắp tới / đang diễn ra của các trường viewer đang theo dõi. */
async function fetchFollowedAdmissionMilestones(
  followedOrgIds: string[],
): Promise<SidebarUpcomingEvent[]> {
  if (followedOrgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const calendarYear = currentCalendarYear();

  const { data: orgRows } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, loai_to_chuc, avatar_id, logo_id")
    .in("id", followedOrgIds)
    .eq("loai_to_chuc", "truong_dai_hoc")
    .returns<TruongOrgEmbed[]>();

  const truongs = (orgRows ?? []).filter((o) => o.slug?.trim() && o.ten?.trim());
  if (truongs.length === 0) return [];

  const truongIds = truongs.map((o) => o.id);
  const orgById = new Map(truongs.map((o) => [o.id, o]));

  const { data: nganhRows } = await admin
    .from("org_truong_nganh")
    .select("id")
    .in("id_to_chuc", truongIds)
    .returns<Array<{ id: string }>>();
  const nganhIds = (nganhRows ?? []).map((r) => r.id);
  if (nganhIds.length === 0) return [];

  const { data: tsRows } = await admin
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
    .in("id_truong_nganh", nganhIds)
    .returns<Record<string, unknown>[]>();

  const rowsByOrg = new Map<string, TruongTuyenSinhNamRow[]>();
  for (const raw of tsRows ?? []) {
    const row = mapTuyenSinhTimelineRow(raw);
    if (!row) continue;
    const embed = raw.org_truong_nganh as
      | { id_to_chuc?: string }
      | { id_to_chuc?: string }[]
      | null;
    const otn = Array.isArray(embed) ? embed[0] : embed;
    const orgId = otn?.id_to_chuc;
    if (!orgId) continue;
    const list = rowsByOrg.get(orgId) ?? [];
    list.push(row);
    rowsByOrg.set(orgId, list);
  }

  const out: SidebarUpcomingEvent[] = [];
  for (const [orgId, rows] of rowsByOrg) {
    const org = orgById.get(orgId);
    if (!org) continue;
    const yearRows = rows.filter((r) => r.nam === calendarYear);
    const aggregated = aggregateTimelineForYear(yearRows.length ? yearRows : rows);
    if (!aggregated) continue;
    const steps = buildTuyenSinhTimelineStepsForCalendarYear(
      aggregated,
      calendarYear,
    );
    const focus = getAdmissionTimelineFocus(steps);
    const focusIds = new Set(
      [focus.currentId, focus.nextId].filter(Boolean) as string[],
    );
    for (const step of steps) {
      if (step.status === "done") continue;
      const isFocus = focusIds.has(step.id);
      if (step.status !== "active" && step.status !== "upcoming" && !isFocus) {
        continue;
      }
      const item = mapMocStep(org, step);
      if (item) out.push(item);
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * Mốc khai giảng cơ sở — khóa + lớp từ org viewer đang theo dõi.
 * Đồng bộ với timeline admin `CoSoUpcomingSidebar`.
 * ──────────────────────────────────────────────────────────────── */

type CoSoOrgEmbed = TruongOrgEmbed;

type KhoaTimelineRow = {
  id: string;
  slug: string;
  ten_khoa_hoc: string;
  loai_mo_hinh: LoaiMoHinhKhoa;
  trang_thai_khoa_hoc: TrangThaiKhoaHoc;
  ngay_khai_giang_gan_nhat: string | null;
  id_to_chuc: string;
};

function coSoMocSidebarBase(org: CoSoOrgEmbed): Pick<
  SidebarUpcomingEvent,
  "kind" | "orgId" | "orgSlug" | "orgName" | "orgLoai" | "phanHoi" | "coverSrc" | "orgAvatarUrl"
> {
  const orgAvatarId = org.avatar_id ?? org.logo_id;
  return {
    kind: "moc",
    orgId: org.id,
    orgSlug: org.slug!.trim(),
    orgName: org.ten!.trim(),
    orgLoai: "co_so_dao_tao",
    phanHoi: null,
    coverSrc: null,
    orgAvatarUrl: orgAvatarId
      ? resolveTruongImageSrcSync(orgAvatarId, ["public", "avatar"])
      : null,
  };
}

function mapCoSoKhoaTimelineRow(
  org: CoSoOrgEmbed,
  row: KhoaTimelineRow,
): SidebarUpcomingEvent | null {
  if (isKhoaHocMuted(row.trang_thai_khoa_hoc)) return null;

  const href = coSoKhoaHocDetailPath(org.slug!.trim(), row.slug);
  const tenKhoa = row.ten_khoa_hoc?.trim() || "Khóa học";

  if (row.loai_mo_hinh === "lien_tuc_theo_thang") {
    const nowIso = new Date().toISOString();
    return {
      ...coSoMocSidebarBase(org),
      id: `khoa:${row.id}`,
      href,
      label: tenKhoa,
      dateLabel: LICH_KHAI_GIANG_LIEN_TUC_DEFAULT,
      subLabel: "Khai giảng liên tục",
      status: "active",
      sortKey: Number.MAX_SAFE_INTEGER,
      batDauIso: nowIso,
      ketThucIso: null,
    };
  }

  const ngay = row.ngay_khai_giang_gan_nhat?.trim();
  if (!ngay) return null;

  const status = getStepStatus(ngay, ngay);
  if (status === "done") return null;

  const formatted = formatTimelineDate(ngay);
  let dateLabel = formatKhaiGiangCard(row.loai_mo_hinh, ngay);
  if (status === "active" && formatted) {
    dateLabel = `${formatted} · Đang diễn ra`;
  } else if (formatted) {
    dateLabel = formatted;
  }

  return {
    ...coSoMocSidebarBase(org),
    id: `khoa:${row.id}`,
    href,
    label: tenKhoa,
    dateLabel,
    subLabel: "Khai giảng khóa",
    status: status === "active" ? "active" : "upcoming",
    sortKey: mocDateSortKey(ngay, null),
    batDauIso: `${ngay}T00:00:00`,
    ketThucIso: null,
  };
}

function mapCoSoLopTimelinePin(
  org: CoSoOrgEmbed,
  pin: ReturnType<typeof mapCoSoLopTimelinePinRows>[number],
): SidebarUpcomingEvent | null {
  const ngay = pin.ngayKhaiGiang.trim();
  if (!ngay) return null;

  const status = getStepStatus(ngay, ngay);
  if (status === "done") return null;

  const formatted = formatTimelineDate(ngay);
  let dateLabel = formatted ?? ngay;
  if (status === "active" && formatted) {
    dateLabel = `${formatted} · Đang diễn ra`;
  }

  const lopLabel = resolveCoSoLopTimelineLabel(pin);
  const href = coSoKhoaHocDetailPath(org.slug!.trim(), pin.khoaSlug);

  return {
    ...coSoMocSidebarBase(org),
    id: `lop:${pin.lopId}`,
    href,
    label: `Khai giảng lớp · ${lopLabel}`,
    dateLabel,
    subLabel: `Khóa ${pin.tenKhoaHoc}`,
    status: status === "active" ? "active" : "upcoming",
    sortKey: mocDateSortKey(ngay, null),
    batDauIso: `${ngay}T00:00:00`,
    ketThucIso: null,
  };
}

/** Mốc khai giảng khóa / lớp từ cơ sở viewer đang theo dõi. */
async function fetchFollowedCoSoTimelineMilestones(
  followedOrgIds: string[],
): Promise<SidebarUpcomingEvent[]> {
  if (followedOrgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data: orgRows } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, loai_to_chuc, avatar_id, logo_id")
    .in("id", followedOrgIds)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .returns<CoSoOrgEmbed[]>();

  const coSos = (orgRows ?? []).filter((o) => o.slug?.trim() && o.ten?.trim());
  if (coSos.length === 0) return [];

  const coSoIds = coSos.map((o) => o.id);
  const orgById = new Map(coSos.map((o) => [o.id, o]));

  const [lopRes, khoaRes] = await Promise.all([
    (async () => {
      const primary = await admin
        .from("org_lop_hoc")
        .select(
          "id, ma_lop, ngay_khai_giang, lich_hoc, org_khoa_hoc!inner ( id, slug, ten_khoa_hoc, loai_mo_hinh, trang_thai_khoa_hoc, id_to_chuc )",
        )
        .in("org_khoa_hoc.id_to_chuc", coSoIds)
        .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
        .order("ngay_khai_giang", { ascending: true })
        .limit(40);
      if (!primary.error) return primary;
      if (!primary.error.message.includes("lich_hoc")) return primary;
      return admin
        .from("org_lop_hoc")
        .select(
          "id, ma_lop, ngay_khai_giang, org_khoa_hoc!inner ( id, slug, ten_khoa_hoc, loai_mo_hinh, trang_thai_khoa_hoc, id_to_chuc )",
        )
        .in("org_khoa_hoc.id_to_chuc", coSoIds)
        .in("trang_thai", ["sap_khai_giang", "dang_hoc"])
        .order("ngay_khai_giang", { ascending: true })
        .limit(40);
    })(),
    admin
      .from("org_khoa_hoc")
      .select(
        "id, slug, ten_khoa_hoc, loai_mo_hinh, trang_thai_khoa_hoc, ngay_khai_giang_gan_nhat, id_to_chuc",
      )
      .in("id_to_chuc", coSoIds)
      .in("trang_thai_khoa_hoc", ["sap_khai_giang", "dang_mo_don"])
      .limit(40),
  ]);

  const out: SidebarUpcomingEvent[] = [];
  const seenKhoaWithLop = new Set<string>();

  for (const rawRow of lopRes.data ?? []) {
    const embed = (rawRow as { org_khoa_hoc?: { id_to_chuc?: string } | { id_to_chuc?: string }[] })
      .org_khoa_hoc;
    const khoaEmbed = Array.isArray(embed) ? embed[0] : embed;
    const orgId = khoaEmbed?.id_to_chuc;
    if (!orgId) continue;
    const org = orgById.get(orgId);
    if (!org) continue;

    const pins = mapCoSoLopTimelinePinRows([rawRow as Parameters<typeof mapCoSoLopTimelinePinRows>[0][number]]);
    for (const pin of pins) {
      seenKhoaWithLop.add(pin.khoaId);
      const item = mapCoSoLopTimelinePin(org, pin);
      if (item) out.push(item);
    }
  }

  for (const row of (khoaRes.data ?? []) as KhoaTimelineRow[]) {
    const org = orgById.get(row.id_to_chuc);
    if (!org) continue;
    if (row.loai_mo_hinh !== "lien_tuc_theo_thang" && seenKhoaWithLop.has(row.id)) {
      continue;
    }
    const item = mapCoSoKhoaTimelineRow(org, row);
    if (item) out.push(item);
  }

  return out;
}

/**
 * Sidebar trang chủ — tối đa `limit` mục (mặc định 3).
 * Ưu tiên sự kiện viewer quan tâm / sẽ tham gia; sau đó mốc tuyển sinh + khai giảng
 * cơ sở + sự kiện từ org theo dõi; cuối cùng là gợi ý toàn cục.
 */
export const loadSidebarUpcomingEvents = cache(
  async function loadSidebarUpcomingEvents(
    viewerId: string,
    loaiSuKienFilter: string[] = [],
    limit = 3,
  ): Promise<SidebarUpcomingEventsBundle> {
    const [followedOrgIds, phanHoiBySuKien] = await Promise.all([
      listFollowingOrgIds(viewerId),
      loadUserSuKienPhanHoiMap(viewerId),
    ]);

    const followedSet = new Set(followedOrgIds);
    const [admissionMilestones, coSoMilestones] = await Promise.all([
      fetchFollowedAdmissionMilestones(followedOrgIds),
      fetchFollowedCoSoTimelineMilestones(followedOrgIds),
    ]);
    const milestones = [...admissionMilestones, ...coSoMilestones];
    const registeredIds = [...phanHoiBySuKien.keys()];
    const seenIds = new Set<string>();
    const myPool: SidebarUpcomingEvent[] = [];

    if (registeredIds.length > 0) {
      const registeredRows = await fetchUpcomingSuKienRows({
        suKienIds: registeredIds,
        loaiFilter: [],
        limit: registeredIds.length,
        excludeIds: seenIds,
      });
      for (const row of registeredRows) {
        seenIds.add(row.id);
        const item = mapSuKienRow(row, phanHoiBySuKien.get(row.id) ?? null);
        if (item?.phanHoi) myPool.push(item);
      }
    }

    const myEventsTotal = myPool.length;
    if (myEventsTotal > 0) {
      return {
        items: sortSidebarEvents([...myPool, ...milestones], followedSet).slice(
          0,
          limit,
        ),
        myEventsTotal,
      };
    }

    const pool: SidebarUpcomingEvent[] = [...milestones];
    const followedOnlyIds = followedOrgIds.filter((id) => id);
    if (followedOnlyIds.length > 0) {
      const followedRows = await fetchUpcomingSuKienRows({
        orgIds: followedOnlyIds,
        loaiFilter: loaiSuKienFilter,
        limit: 8,
        excludeIds: seenIds,
      });
      for (const row of followedRows) {
        seenIds.add(row.id);
        const item = mapSuKienRow(row, phanHoiBySuKien.get(row.id) ?? null);
        if (item) pool.push(item);
      }
    }

    const globalRows = await fetchUpcomingSuKienRows({
      loaiFilter: loaiSuKienFilter,
      limit: 12,
      excludeIds: seenIds,
    });
    for (const row of globalRows) {
      seenIds.add(row.id);
      const item = mapSuKienRow(row, phanHoiBySuKien.get(row.id) ?? null);
      if (item) pool.push(item);
    }

    return {
      items: sortSidebarEvents(pool, followedSet).slice(0, limit),
      myEventsTotal: 0,
    };
  },
);
