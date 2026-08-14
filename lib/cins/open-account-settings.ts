/** Mở modal cài đặt tài khoản đúng mục — `UserAccountMenu` lắng nghe. */

export const OPEN_ACCOUNT_SETTINGS_EVENT = "cins:open-account-settings";

export type AccountSettingsSection = "ban-hang";

export function openAccountSettings(section: AccountSettingsSection): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_ACCOUNT_SETTINGS_EVENT, { detail: { section } }),
  );
}
