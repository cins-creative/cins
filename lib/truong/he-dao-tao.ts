/** Khớp `he_dao_tao_enum` — `docs/CINS_SCHEMA.md`. */
export const HE_DAO_TAO_VALUES = [
  "dai_hoc",
  "cao_dang",
  "trung_cap",
  "chung_chi",
] as const;

export type HeDaoTaoEnum = (typeof HE_DAO_TAO_VALUES)[number];

export const HE_DAO_TAO_LABELS: Record<HeDaoTaoEnum, string> = {
  dai_hoc: "Đại học",
  cao_dang: "Cao đẳng",
  trung_cap: "Trung cấp",
  chung_chi: "Chứng chỉ",
};

export function isHeDaoTaoEnum(value: string): value is HeDaoTaoEnum {
  return (HE_DAO_TAO_VALUES as readonly string[]).includes(value);
}

export function labelHeDaoTao(value: string | null | undefined): string {
  const key = value?.trim();
  if (!key) return "—";
  if (isHeDaoTaoEnum(key)) return HE_DAO_TAO_LABELS[key];
  return key;
}

export function normalizeHeDaoTao(
  value: string | null | undefined,
): HeDaoTaoEnum {
  const key = value?.trim();
  if (key && isHeDaoTaoEnum(key)) return key;
  return "dai_hoc";
}
