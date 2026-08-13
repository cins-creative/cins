/** Hub khám phá nghề — URL canonical. */
export const NGHE_NGHIEP_HUB_PATH = "/careers";

/** Hub trường / cơ sở đào tạo — base route của trang chi tiết trường (giữ cho `truongRootPath`). */
export const CO_SO_DAO_TAO_HUB_PATH = "/university";

/** Hub tổ chức gộp (trường ĐH + cơ sở đào tạo + studio) — URL listing canonical. */
export const TO_CHUC_HUB_PATH = "/organizations";

/** Hub tìm khóa học — URL canonical. */
export const TIM_KHOA_HOC_HUB_PATH = "/find-courses";

export const NGANH_HOC_HUB_PATH = "/majors";

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
    pathname === "/university" ||
    pathname.startsWith("/university/")
  );
}

export function isToChucHubPath(pathname: string): boolean {
  return (
    pathname === TO_CHUC_HUB_PATH ||
    pathname.startsWith(`${TO_CHUC_HUB_PATH}/`)
  );
}

export function isTimKhoaHocHubPath(pathname: string): boolean {
  return (
    pathname === TIM_KHOA_HOC_HUB_PATH ||
    pathname.startsWith(`${TIM_KHOA_HOC_HUB_PATH}/`)
  );
}

export function nganhHubHref(nhomId?: string): string {
  const nhom = nhomId?.trim();
  if (nhom) {
    return `${NGANH_HOC_HUB_PATH}?group=${encodeURIComponent(nhom)}`;
  }
  return NGANH_HOC_HUB_PATH;
}
