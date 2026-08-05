/** Trang chat full trong shell (`/chat`) — không gồm `/chat/goi`, `/chat/nhom/...`. */
export function isChatPagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/chat";
}
