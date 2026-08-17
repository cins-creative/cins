/** Loại bài có thể gắn tag lên tác phẩm / milestone. */
export const PICKABLE_TAG_LOAI = [
  "keyword",
  "phan_mem",
  "mon_hoc",
  "nganh_dao_tao",
  "nghe",
  "fandom",
] as const;

export type PickableTagLoai = (typeof PICKABLE_TAG_LOAI)[number];

export type TagLoaiFilter = PickableTagLoai | "all";

/**
 * Compose / gắn thẻ bài: keyword + fandom.
 * `phan_mem` legacy (đã gộp) vẫn hiện nếu còn trên cache index.
 * Môn / ngành / nghề tạo từ UI trường · CSĐT — không mix vào editor.
 */
export const COMPOSE_VISIBLE_TAG_LOAI = [
  "keyword",
  "fandom",
  "phan_mem",
] as const;

export const COMPOSE_VISIBLE_TAG_LOAI_SET: ReadonlySet<string> = new Set(
  COMPOSE_VISIBLE_TAG_LOAI,
);

export function isComposeVisibleTagLoai(loai: string): boolean {
  return COMPOSE_VISIBLE_TAG_LOAI_SET.has(loai);
}

/** Chip lọc menu gắn thẻ — `phan_mem` đã gộp vào `keyword` (nhãn Thẻ). */
export const TAG_LOAI_FILTER_OPTIONS: { id: TagLoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "keyword", label: "Thẻ" },
  { id: "mon_hoc", label: "Môn học" },
  { id: "nganh_dao_tao", label: "Ngành" },
  { id: "nghe", label: "Nghề nghiệp" },
  { id: "fandom", label: "Phân loại" },
];

/** keyword / mon_hoc / nghe / fandom — user tạo tự do. `phan_mem` đã gộp vào keyword. */
export const CREATABLE_TAG_LOAI = [
  "keyword",
  "mon_hoc",
  "nghe",
  "fandom",
] as const;

export type CreatableTagLoai = (typeof CREATABLE_TAG_LOAI)[number];

export const CREATE_TAG_LOAI_LABEL: Record<CreatableTagLoai, string> = {
  keyword: "Thẻ",
  mon_hoc: "Môn học",
  nghe: "Vị trí công việc",
  fandom: "Phân loại",
};

export function isCreatableTagLoai(loai: string): loai is CreatableTagLoai {
  return (
    loai === "keyword" ||
    loai === "mon_hoc" ||
    loai === "nghe" ||
    loai === "fandom"
  );
}

/**
 * Verify CINs cho tag đã gỡ — luôn false (cộng đồng tự tạo tuyệt đối).
 * Giữ helper để chỗ gọi cũ không vỡ; không dùng để bật lại UI.
 */
export function tagSupportsCinsVerify(_loai?: string): boolean {
  return false;
}

export function parsePickableTagLoai(
  raw: string | null | undefined,
): PickableTagLoai {
  if (raw === "mon_hoc") return "mon_hoc";
  if (raw === "nganh_dao_tao") return "nganh_dao_tao";
  if (raw === "nghe") return "nghe";
  if (raw === "fandom") return "fandom";
  /* `phan_mem` và giá trị lạ → keyword (Thẻ). */
  return "keyword";
}

export const PICKABLE_TAG_LOAI_IN_SQL = PICKABLE_TAG_LOAI.map((l) => `'${l}'`).join(
  ", ",
);
