export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      field?:
        | "slug"
        | "ten_hien_thi"
        | "giai_doan"
        | "gioi_tinh"
        | "ngay_sinh"
        | "avatar_id"
        | "bio"
        | "tinh_thanh"
        | "email_lien_he"
        | "ho_ten_nhan"
        | "so_dien_thoai"
        | "dia_chi_chi_tiet"
        | "mxh_links";
    };
