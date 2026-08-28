/** Mở modal chỉnh hồ sơ đúng tab — `JourneySidebarOwnerActions` lắng nghe. */

export const OPEN_EDIT_PROFILE_EVENT = "cins:open-edit-profile";

export const EDIT_PROFILE_QUERY = "edit";
export const EDIT_PROFILE_TAB_CUSTOMIZE = "customize";

export type EditProfileOpenTab = "thong-tin" | "customize";

export function openEditProfile(tab: EditProfileOpenTab = "customize"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_EDIT_PROFILE_EVENT, { detail: { tab } }),
  );
}

export function isOwnProfilePath(pathname: string, slug: string): boolean {
  const segs = pathname.split("/").filter(Boolean);
  return segs[0] === slug;
}
