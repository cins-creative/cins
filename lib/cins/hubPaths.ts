/** Hub khám phá nghề — URL canonical. */
export const NGHE_NGHIEP_HUB_PATH = "/nghe-nghiep";

/** Hub trường / cơ sở đào tạo — URL canonical. */
export const CO_SO_DAO_TAO_HUB_PATH = "/co-so-dao-tao";

export const NGANH_HOC_HUB_PATH = "/nganh-hoc";

export function ngheNghiepDetailHref(slug: string): string {
  const s = slug.trim();
  return s
    ? `${NGHE_NGHIEP_HUB_PATH}/${encodeURIComponent(s)}`
    : NGHE_NGHIEP_HUB_PATH;
}

export function isNgheNghiepHubPath(pathname: string): boolean {
  return (
    pathname === NGHE_NGHIEP_HUB_PATH ||
    pathname.startsWith(`${NGHE_NGHIEP_HUB_PATH}/`)
  );
}

export function isCoSoDaoTaoHubPath(pathname: string): boolean {
  return (
    pathname === CO_SO_DAO_TAO_HUB_PATH ||
    pathname.startsWith(`${CO_SO_DAO_TAO_HUB_PATH}/`) ||
    pathname === "/truong-dai-hoc" ||
    pathname.startsWith("/truong-dai-hoc/")
  );
}

export function nganhHubHref(nhomId?: string): string {
  const nhom = nhomId?.trim();
  if (nhom) {
    return `${NGANH_HOC_HUB_PATH}?nhom=${encodeURIComponent(nhom)}`;
  }
  return NGANH_HOC_HUB_PATH;
}
