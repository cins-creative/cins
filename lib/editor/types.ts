/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Block schema — shared giữa client editor & server serializer.    ║
   ║                                                                  ║
   ║ Khớp brief `cins-editor` §2 (Mô hình block). Lưu xuống cột       ║
   ║ `content_tac_pham.noi_dung_blocks` dạng JSONB.                   ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export type BlockType =
  | "h2"
  | "h3"
  | "body"
  | "quote"
  | "imgs"
  | "embed"
  | "palette"
  | "divider"
  | "spacer";

export type Block = {
  id: string;
  loai: BlockType;
  thu_tu: number;
  /**
   * Cấu hình theo type:
   *   - h2/h3/body/quote: { html: string }  — plain text từ textarea, server tự escape khi render.
   *   - imgs: { layout, rounded, gap?, cap, imgs: string[], width?, height?, cols?, cells?, pad? }
   *     `gap` — khe giữa ô (0 | 2 | 4 px), mặc định 2.
   *     Mỗi phần tử `imgs[]` / mosaic `seed`: Cloudflare UUID hoặc URL http(s) đầy đủ.
   *   - embed: { url, provider?, embed_html?, showCoverInPost?, coverThumb?, bunnyVideoId?, videoCanvasRatio? }
   *     `showCoverInPost` — hiện `cover_id` trong thân bài (opt-in `true`).
   *     Card timeline: hiện trừ khi `false` tường minh. Gallery / OG luôn dùng cover.
     *     `coverThumb` — { ratio: "16:9"|"4:3", x:0–100, y:0–100, zoom?:1–3 }
     *     điểm neo + phóng khung thumbnail (Gallery / bài dài).
   *     Có thể nằm trên embed (ưu tiên Bunny) hoặc block đầu.
   *   - palette: { colors: string[] }
   *   - divider: {}
   *   - spacer: { size: "s" | "m" | "l" }
   */
  config?: Record<string, unknown>;
};

/**
 * `che_do_hien_thi_moc_enum` từ DB — dùng chung cho cả `content_cot_moc`
 * và `content_tac_pham.che_do_hien_thi`.
 *
 * - `feature`:    Nổi bật — công khai + ghim lên đầu Journey
 * - `public`:     Công khai — hiện trên Gallery, ai cũng xem
 * - `theo_nhom`:  Theo nhóm — chỉ nhóm bối cảnh được chọn (chi tiết wire sau)
 * - `chi_minh`:   Chỉ mình tôi — riêng tư
 */
export type Visibility = "feature" | "public" | "theo_nhom" | "chi_minh";

export const VALID_VIS: ReadonlyArray<Visibility> = [
  "feature",
  "public",
  "theo_nhom",
  "chi_minh",
];

/** Loại cột mốc (`loai_moc_enum`) — pick khi tạo bài. Default `ca_nhan`. */
export type LoaiMoc =
  | "hoc"
  | "lam_viec"
  | "du_an"
  | "su_kien"
  | "thanh_tuu"
  | "ca_nhan";

export const VALID_LOAI_MOC: ReadonlyArray<LoaiMoc> = [
  "hoc",
  "lam_viec",
  "du_an",
  "su_kien",
  "thanh_tuu",
  "ca_nhan",
];
