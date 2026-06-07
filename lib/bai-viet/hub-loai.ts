/**
 * Loại bài trên hub `/bai-viet`.
 * Không gồm `nghe` / `nganh_dao_tao` — đã có tại /nghe-nghiep và /nganh-hoc.
 */
/** v7: keyword/phan_mem không nằm hub «Bài viết» — chỉ tới qua tag trên Journey. */
export const BAI_VIET_HUB_LOAI = [
  { id: "mon_hoc", label: "Môn học", dotClass: "bv-hub-loai-dot--mon_hoc" },
] as const;

/** URL `?loai=` cũ — bỏ qua lọc (nội dung không nằm trong hub bài viết). */
export const BAI_VIET_HUB_LOAI_LEGACY_IDS = ["nghe", "nganh_dao_tao"] as const;

export type BaiVietHubLoaiId = (typeof BAI_VIET_HUB_LOAI)[number]["id"];

export const BAI_VIET_HUB_LOAI_IDS: BaiVietHubLoaiId[] = BAI_VIET_HUB_LOAI.map(
  (x) => x.id,
);

export function isHubLoaiLegacyId(
  raw: string | null | undefined,
): boolean {
  const id = raw?.trim() ?? "";
  return (BAI_VIET_HUB_LOAI_LEGACY_IDS as readonly string[]).includes(id);
}

export function isHubLoaiId(raw: string | null | undefined): raw is BaiVietHubLoaiId {
  const id = raw?.trim() ?? "";
  if (!id || isHubLoaiLegacyId(id)) return false;
  return BAI_VIET_HUB_LOAI_IDS.includes(id as BaiVietHubLoaiId);
}

export function hubLoaiLabel(loai: string | null | undefined): string {
  const hit = BAI_VIET_HUB_LOAI.find((x) => x.id === loai);
  return hit?.label ?? "Bài viết";
}

/** Theme `data-dept` trên `.hn-role-card` (dùng chung CSS hub nghề nghiệp). */
export function hubLoaiDeptTheme(loai: string | null | undefined): string {
  switch (loai) {
    case "nghe":
      return "strategy";
    case "nganh_dao_tao":
      return "creative";
    case "mon_hoc":
      return "research";
    case "keyword":
      return "digital";
    case "phan_mem":
      return "production";
    default:
      return "digital";
  }
}

export function hubLoaiBadgeClass(loai: string | null | undefined): string {
  const id = loai?.trim() ?? "";
  if (!id || !isHubLoaiId(id)) return "bv-hub-type-badge";
  return `bv-hub-type-badge bv-hub-type-badge--${id}`;
}

export function buildBaiVietHubUrl(params: {
  loai?: string;
  cap_do?: string;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.loai && isHubLoaiId(params.loai)) sp.set("loai", params.loai);
  if (params.cap_do) sp.set("cap_do", params.cap_do);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/bai-viet?${qs}` : "/bai-viet";
}
