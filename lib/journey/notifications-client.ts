/** Client — báo topbar refetch feed thông báo chưa đọc. */
export function emitNotificationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cins:notifications-changed"));
}
