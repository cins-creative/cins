import "server-only";

/** UUID profile `user_nguoi_dung` của CINS — owner mọi org user tạo. */
export function getCinsSystemUserId(): string {
  const id = process.env.CINS_SYSTEM_USER_ID?.trim();
  if (!id) {
    throw new Error(
      "Thiếu CINS_SYSTEM_USER_ID trong env — cần để gán owner khi tạo cộng đồng.",
    );
  }
  return id;
}
