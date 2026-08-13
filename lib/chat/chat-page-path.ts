/** Trang chat full trong shell (`/chat`) — không gồm `/chat/calls`, `/chat/groups/...`. */
export function isChatPagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/chat";
}
