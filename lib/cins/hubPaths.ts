/** Hub Hướng nghiệp / Ngành học — URL canonical. */
export const NGHE_NGHIEP_HUB_PATH = "/nghe-nghiep";
export const NGANH_HOC_HUB_PATH = "/nganh-hoc";

export function nganhHubHref(nhomId?: string): string {
  const nhom = nhomId?.trim();
  if (nhom) {
    return `${NGANH_HOC_HUB_PATH}?nhom=${encodeURIComponent(nhom)}`;
  }
  return NGANH_HOC_HUB_PATH;
}
