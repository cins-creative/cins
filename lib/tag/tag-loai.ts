/** Loại bài có thể gắn tag lên tác phẩm / milestone. */
export const PICKABLE_TAG_LOAI = [
  "keyword",
  "phan_mem",
  "mon_hoc",
  "nganh_dao_tao",
  "nghe",
] as const;

export type PickableTagLoai = (typeof PICKABLE_TAG_LOAI)[number];

/** keyword / phan_mem / mon_hoc / nghe — user tạo tự do (v7 + mon_hoc). */
export const CREATABLE_TAG_LOAI = [
  "keyword",
  "phan_mem",
  "mon_hoc",
  "nghe",
] as const;

export type CreatableTagLoai = (typeof CREATABLE_TAG_LOAI)[number];

export function isCreatableTagLoai(loai: string): loai is CreatableTagLoai {
  return (
    loai === "keyword" ||
    loai === "phan_mem" ||
    loai === "mon_hoc" ||
    loai === "nghe"
  );
}

export function parsePickableTagLoai(
  raw: string | null | undefined,
): PickableTagLoai {
  if (raw === "phan_mem") return "phan_mem";
  if (raw === "mon_hoc") return "mon_hoc";
  if (raw === "nganh_dao_tao") return "nganh_dao_tao";
  if (raw === "nghe") return "nghe";
  return "keyword";
}

export const PICKABLE_TAG_LOAI_IN_SQL = PICKABLE_TAG_LOAI.map((l) => `'${l}'`).join(
  ", ",
);
