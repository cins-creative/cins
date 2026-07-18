import type { Visibility } from "@/lib/editor/types";

/** Giải thích ngắn từng chế độ hiển thị — tooltip menu inline trên Journey. */
export function milestoneVisibilityHint(
  db: Visibility | "tuy_chinh",
  context: "self" | "foreign" = "self",
): string {
  if (db === "tuy_chinh") {
    return "Chặn người cụ thể, hoặc chỉ cho một số người xem.";
  }

  if (context === "foreign" && db === "chi_minh") {
    return "Gỡ khỏi Journey của bạn thôi — bài gốc trên trang tác giả vẫn còn nguyên.";
  }

  switch (db) {
    case "feature":
      return "Để công khai tác phẩm cho tất cả mọi người";
    case "public":
      return "Bạn bè và những người theo dõi mới thấy được";
    case "theo_nhom":
      return "Chỉ bạn bè mới thấy nội dung này";
    case "chi_minh":
      return "Chỉ duy nhất bạn mới xem được nội dung này";
    default:
      return "";
  }
}
