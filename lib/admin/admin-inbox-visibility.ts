/**
 * Hiện / ẩn nút hộp thư admin trên topbar.
 *
 * Device-local (localStorage), cùng kiểu `home-feed-layout` — không đồng bộ server.
 * Chỉ admin mới thấy mục cài đặt; preference vẫn an toàn nếu user thường có key
 * (topbar không mount AdminInboxButton nếu không phải admin).
 */

export const ADMIN_INBOX_VISIBLE_STORAGE_KEY = "cins-admin-inbox-visible";

/** Sự kiện phát khi đổi trong Cài đặt (cùng tab). */
export const ADMIN_INBOX_VISIBLE_CHANGE_EVENT =
  "cins-admin-inbox-visible-change";

export function readAdminInboxVisible(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(ADMIN_INBOX_VISIBLE_STORAGE_KEY);
    if (raw == null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

/** Lưu lựa chọn + phát sự kiện để topbar cập nhật ngay. */
export function setAdminInboxVisible(visible: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ADMIN_INBOX_VISIBLE_STORAGE_KEY,
      visible ? "1" : "0",
    );
  } catch {
    /* bỏ qua khi localStorage bị chặn */
  }
  window.dispatchEvent(
    new CustomEvent<boolean>(ADMIN_INBOX_VISIBLE_CHANGE_EVENT, {
      detail: visible,
    }),
  );
}
