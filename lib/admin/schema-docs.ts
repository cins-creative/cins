import type { SchemaColumn, SchemaFk, SchemaTable } from "@/lib/admin/schema-types";

/** Mô tả ngắn chức năng từng bảng (admin schema explorer). */
export const SCHEMA_TABLE_DOCS: Record<string, string> = {
  article_alias: "Tên gọi khác / slug phụ của bài entity — dùng dedup và tìm kiếm.",
  article_bai_viet: "Entity / bài canonical (nghề, ngành, keyword, phần mềm, môn học…).",
  article_de_xuat: "Hàng đợi đề xuất tạo entity mới (cổng chặn cho nghề / ngành).",
  article_dong_gop: "Bản thảo đóng góp canonical — user soạn riêng, curator promote.",
  article_dong_gop_binh_luan: "Bình luận trên bản đóng góp canonical.",
  article_gan_cot_moc: "Gắn entity/tag vào cột mốc Journey (polymorphic lens).",
  article_gan_du_an: "Gắn entity vào dự án.",
  article_gan_nhom: "Gắn bài entity vào nhóm phân loại (article_nhom).",
  article_gan_tac_pham: "Gắn entity/tag vào tác phẩm.",
  article_lien_quan: "Quan hệ liên kết giữa các bài entity (related).",
  article_nhom: "Nhóm phân loại cho entity (không lưu trong meta JSONB).",
  article_quyen_tham_dinh: "Phạm vi curator được thẩm định canonical.",
  article_tac_gia: "Attribution tác giả trên bài entity / đóng góp.",

  chat_binh_chon: "Poll trong phòng chat — câu hỏi gắn tin nhắn.",
  chat_binh_chon_lua_chon: "Các lựa chọn của một poll chat.",
  chat_binh_chon_phieu: "Phiếu vote của thành viên cho lựa chọn poll.",
  chat_canvas: "Canvas whiteboard gắn phòng chat (workspace).",
  chat_canvas_node: "Node trên canvas chat (hình/text/link).",
  chat_canvas_tin_an: "Tin nhắn bị ẩn khỏi canvas (soft hide).",
  chat_chan: "Chặn người dùng trong ngữ cảnh chat.",
  chat_da_doc: "Con trỏ đã đọc theo phòng / thành viên.",
  chat_ghim: "Tin nhắn được ghim trong phòng.",
  chat_moc: "Mốc timeline của phòng project (workspace nhóm L28).",
  chat_phong: "Phòng chat có context (1-1, 1_org, nhóm, dự án…).",
  chat_thanh_vien: "Thành viên + vai trò trong phòng chat.",
  chat_the_gan: "Gắn thẻ tài nguyên vào tin nhắn / mốc phòng.",
  chat_the_tai_nguyen: "Thẻ tài nguyên theo phòng (file/link/ghi chú L28).",
  chat_tin_nhan: "Tin nhắn trong phòng chat.",
  chat_yeu_cau_tham_gia: "Xin tham gia phòng (pending / duyệt).",

  cins_huong_dan: "Nội dung hướng dẫn nội bộ CINs (admin).",

  cong_dong_filter: "Nhãn flair trong cộng đồng (Khoe / Hỏi đáp…).",
  cong_dong_filter_gan: "Gắn flair cộng đồng vào cột mốc.",

  content_cot_moc: "Cột mốc Journey — source of truth mọi post/timeline user.",
  content_cot_moc_hien_thi_ngoai_le: "Ngoại lệ hiển thị cột mốc (override che_do).",
  content_diem_feed: "Điểm bài cho World Timeline (L30).",
  content_feed_score_cau_hinh: "Cấu hình công thức điểm feed.",
  content_feed_score_phien_ban: "Phiên bản công thức điểm feed.",
  content_media: "Media đính kèm (ảnh CF / video Bunny / embed).",
  content_share_link: "Short-link OG Facebook (/s/[token]) — server-only.",
  content_tac_pham: "Tác phẩm đa định dạng gắn cột mốc.",
  content_tac_pham_linh_vuc: "Gắn lĩnh vực vào tác phẩm.",
  content_tac_pham_tac_gia: "Đồng tác giả tác phẩm (co-author + trạng thái).",
  content_tac_pham_thuoc_moc: "Junction tác phẩm ↔ cột mốc.",
  content_world_boost: "Boost ẩn đẩy bài lên World (L29, TTL).",

  edu_module_mon: "Module môn trong cấu hình tính điểm (tham chiếu).",
  edu_module_tinh_diem: "Module công thức tính điểm xét tuyển.",
  edu_mon_thi: "Danh mục môn thi đại học.",
  edu_to_hop_mon: "Tổ hợp môn xét tuyển (A00, D01…).",
  edu_to_hop_mon_chi_tiet: "Chi tiết môn trong một tổ hợp.",

  filter_gan: "Gắn nhãn filter cá nhân lên cột mốc / bài org.",
  filter_nhan: "Nhãn filter cục bộ do user/org tự tạo (không discovery toàn cục).",

  gop_y: "Góp ý người dùng gửi về sản phẩm.",

  linh_vuc: "Danh mục lĩnh vực sáng tạo (Game, Phim…).",
  linh_vuc_gan_nhom: "Gắn lĩnh vực vào nhóm lĩnh vực.",
  linh_vuc_nhom: "Nhóm gom các lĩnh vực.",

  org_bai_dang: "Bài đăng trên Journey tổ chức (không dùng content_cot_moc).",
  org_bai_dang_tac_gia: "Tác giả bài đăng org.",
  org_bai_dang_tag: "Tag gắn bài đăng org.",
  org_bai_tap: "Bài tập trong khóa / lớp đào tạo.",
  org_cau_hinh_khoi: "Cấu hình khối xét tuyển theo trường/năm.",
  org_cau_hinh_mon: "Cấu hình môn + trọng số tính điểm (nguồn duy nhất).",
  org_co_so_dao_tao: "Hồ sơ mở rộng cho org loại cơ sở đào tạo.",
  org_dang_ky_su_kien: "Đăng ký tham dự sự kiện org.",
  org_giao_trinh: "Giáo trình / tài liệu khóa học.",
  org_hinh_anh: "Thư viện ảnh của tổ chức (Cloudflare id).",
  org_khoa_hoc: "Khóa học thuộc cơ sở / trường.",
  org_lop_hoc: "Lớp học trong khóa.",
  org_phuong_thuc_xet_tuyen: "Phương thức xét tuyển của trường theo năm.",
  org_scout_luu: "Scout lưu ứng viên / hồ sơ quan tâm.",
  org_su_kien: "Sự kiện tổ chức (workshop, open day…).",
  org_su_kien_loai_ve: "Loại vé / suất của sự kiện.",
  org_to_chuc: "Tổ chức gốc (trường, studio, cộng đồng, CSĐT…).",
  org_truong_dai_hoc: "Hồ sơ mở rộng trường đại học.",
  org_truong_nganh: "Ngành đào tạo của trường → FK bài ngành.",
  org_truong_nganh_mon: "Môn chuyên ngành đồ án gắn ngành trường (L31).",
  org_tuyen_dung: "Tin tuyển dụng của org.",
  org_tuyen_dung_ung_tuyen: "Hồ sơ ứng tuyển vào tin tuyển dụng.",
  org_tuyen_sinh_nam: "Năm tuyển sinh + timeline của trường.",

  project_dong_gop: "Đóng góp vào dự án cộng tác.",
  project_du_an: "Dự án (portfolio / collab).",

  shop_bang_gia: "Bảng giá cửa hàng (catalog pricing).",
  shop_bang_gia_dong: "Dòng trong bảng giá (SP + giá).",
  shop_bien_the: "Biến thể sản phẩm (size/màu).",
  shop_cua_hang: "Cửa hàng UGC gắn org/user (opt-in).",
  shop_don_hang: "Đơn hàng (CINs không cầm tiền).",
  shop_don_hang_dong: "Chi tiết dòng đơn hàng.",
  shop_gio: "Giỏ hàng theo cửa hàng.",
  shop_gio_dong: "Dòng trong giỏ.",
  shop_nhom: "Nhóm sản phẩm trong cửa hàng.",
  shop_nhom_danh_gia: "Đánh giá nhóm / sản phẩm.",
  shop_phuong_thuc_tt: "Phương thức thanh toán cửa hàng (thông tin, không gateway).",
  shop_post_hang: "Kiosk gắn sản phẩm lên post / cột mốc.",
  shop_quay_su_kien: "Quầy bán tại sự kiện.",
  shop_san_pham: "Sản phẩm trong catalog cửa hàng.",

  social_bao_cao: "Báo cáo nội dung / người dùng.",
  social_binh_luan: "Bình luận gắn đối tượng social (cột mốc…).",
  social_luot_xem: "Lượt xem (partitioned theo thời gian).",
  social_luu: "Lưu / bookmark đối tượng.",
  social_reaction: "Reaction (like…) trên đối tượng — đếm realtime.",
  social_thong_bao: "Thông báo in-app cho user.",
  social_thong_ke_doi_tuong_ngay: "Thống kê engagement theo đối tượng / ngày.",

  user_emoji_bo: "Bộ emoji tùy chỉnh của user.",
  user_emoji_muc: "Mục emoji trong bộ.",
  user_filter_journey: "Cấu hình lọc Journey cá nhân (UI prefs).",
  user_gallery_noi_bat: "Mục nổi bật trên Gallery cá nhân.",
  user_hoc_vien_lop: "Ghi danh học viên vào lớp.",
  user_journey_ghim: "Ghim cột mốc trên Journey.",
  user_ket_ban: "Kết bạn 2 chiều (pending / accepted).",
  user_linh_vuc: "Lĩnh vực user quan tâm / chuyên môn.",
  user_nguoi_dung: "Hồ sơ người dùng (map auth.users).",
  user_nhom_boi_canh: "Nhóm bối cảnh / cohort tùy chọn.",
  user_quyen_he_thong: "Role hệ thống (admin / curator) trên trục 1.",
  user_thanh_vien_to_chuc: "Thành viên org + vai trò (owner/admin/…).",
  user_theo_doi: "Theo dõi 1 chiều (người / org / tag).",

  vector_co_dinh: "Vector embedding cố định (pgvector).",
  vector_dong: "Vector động theo phiên bản nội dung.",
  vector_hang_doi: "Hàng đợi job tạo/cập nhật vector.",

  verify_email_token: "Token xác minh email.",
  verify_tham_du_su_kien: "Xác nhận tham dự sự kiện.",
  verify_xac_nhan: "Bản ghi xác nhận (bên thứ hai đồng ý).",
  verify_yeu_cau: "Yêu cầu verify quan hệ / tác phẩm (moat).",
};

const SAMPLE_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SAMPLE_UUID_B = "f9e8d7c6-b5a4-3210-9876-543210fedcba";

export type SchemaFieldSample = {
  text: string;
  /** Có FK → hiện cam, click nhảy bảng. */
  fkRefTable: string | null;
};

function shortLabelFromTable(table: string): string {
  const last = table.split("_").pop() ?? table;
  return last.replace(/_/g, " ");
}

function sampleForName(name: string, type: string): string | null {
  const n = name.toLowerCase();
  const t = type.toLowerCase();

  if (n === "id" || n.startsWith("id_")) {
    if (t.includes("uuid") || t === "uuid") return SAMPLE_UUID.slice(0, 8) + "…";
    if (t.includes("int")) return "42";
  }

  if (n.includes("email")) return "ban@cins.vn";
  if (n.includes("sdt") || n.includes("phone") || n === "so_dien_thoai")
    return "0901234567";
  if (n.includes("slug")) return "thiet-ke-do-hoa";
  if (n === "ten" || n.endsWith("_ten") || n === "ho_ten" || n === "ten_hien_thi")
    return "Nguyễn An";
  if (n === "tieu_de" || n === "ten_phong" || n === "cau_hoi")
    return n === "cau_hoi" ? "Chọn lịch họp tuần này?" : "Portfolio game 2D";
  if (n === "noi_dung" || n === "mo_ta" || n === "tom_tat" || n === "ghi_chu")
    return "Mô tả ngắn mẫu…";
  if (n.includes("avatar") || n.includes("logo") || n.includes("cloudflare"))
    return "cf_img_abc123";
  if (
    n.endsWith("_id") &&
    (n.includes("anh") || n.includes("media") || n.includes("cover"))
  ) {
    return "cf_img_abc123";
  }
  if (n.includes("url") || n === "link") return "https://cins.vn/u/an";
  if (t === "bool" || t === "boolean") {
    if (n.startsWith("da_") || n === "cho_nhieu") return n === "cho_nhieu" ? "false" : "true";
    if (n.startsWith("la_") || n.startsWith("co_")) return "false";
    return "false";
  }
  if (n.endsWith("_luc") || n.includes("ngay") || t.includes("timestamp") || t === "date")
    return "2026-07-20 09:30";
  if (n.includes("gia") || n.includes("tien")) return "199000";
  if (n.includes("so_luong")) return "3";
  if (t.includes("numeric") || t === "int2" || t === "int4" || t === "int8" || t === "float8")
    return "3";
  if (t === "jsonb" || t === "json") return '{"key":"value"}';
  if (t === "text" || t === "varchar" || t.startsWith("character")) return "ví dụ text";
  return null;
}

function fkSampleLabel(refTable: string): string {
  const map: Record<string, string> = {
    user_nguoi_dung: "user · Nguyễn An",
    org_to_chuc: "org · Sine Art",
    chat_phong: "phòng · Nhóm portfolio",
    chat_tin_nhan: "tin · “Chào cả nhà”",
    content_cot_moc: "cột mốc · Portfolio Q2",
    content_tac_pham: "tác phẩm · Character sheet",
    article_bai_viet: "entity · Thiết kế đồ họa",
    org_khoa_hoc: "khóa · Digital Painting",
    org_lop_hoc: "lớp · DP-01",
    org_su_kien: "sk · Open Day",
    shop_cua_hang: "shop · Sine Store",
    shop_san_pham: "SP · Áo thun CINs",
    shop_don_hang: "đơn · #SA-1024",
    linh_vuc: "lĩnh vực · Game",
    filter_nhan: "nhãn · BST hè",
    verify_yeu_cau: "verify · chờ xử lý",
  };
  return map[refTable] ?? `→ ${shortLabelFromTable(refTable)}`;
}

/** Sinh giá trị mẫu 1 cột; nếu có FK thì đánh dấu để UI hiện cam + click. */
export function schemaFieldSample(
  table: SchemaTable,
  column: SchemaColumn,
  enumFirstValue?: string | null,
): SchemaFieldSample {
  const fk: SchemaFk | undefined = table.fks.find((f) => f.column === column.name);

  if (fk) {
    return {
      text: fkSampleLabel(fk.refTable),
      fkRefTable: fk.refTable,
    };
  }

  const t = column.type.toLowerCase();
  if ((t.endsWith("_enum") || t.includes("enum")) && enumFirstValue) {
    return { text: enumFirstValue, fkRefTable: null };
  }

  const byName = sampleForName(column.name, column.type);
  if (byName && byName !== "…") return { text: byName, fkRefTable: null };

  if (column.name === "id" || table.pk.includes(column.name)) {
    if (t === "uuid") return { text: SAMPLE_UUID_B.slice(0, 8) + "…", fkRefTable: null };
    return { text: "1", fkRefTable: null };
  }

  if (t === "uuid") return { text: SAMPLE_UUID.slice(0, 8) + "…", fkRefTable: null };
  if (t === "bool" || t === "boolean") return { text: "false", fkRefTable: null };
  if (t === "jsonb" || t === "json") return { text: "{}", fkRefTable: null };
  if (t.includes("timestamp") || t === "date")
    return { text: "2026-07-20 09:30", fkRefTable: null };
  if (t.includes("int") || t.includes("numeric") || t.includes("float") || t === "float8")
    return { text: "0", fkRefTable: null };

  return { text: "—", fkRefTable: null };
}

export function schemaTableDoc(tableName: string): string {
  return (
    SCHEMA_TABLE_DOCS[tableName] ??
    `Bảng ${tableName.replace(/_/g, " ")} — xem cột/FK bên dưới để hiểu quan hệ.`
  );
}
