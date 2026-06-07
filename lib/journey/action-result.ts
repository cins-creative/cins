export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      field?:
        | "slug"
        | "ten_hien_thi"
        | "giai_doan"
        | "bio"
        | "tinh_thanh"
        | "email_lien_he"
        | "mxh_links";
    };
