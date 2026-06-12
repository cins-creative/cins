/** Breakpoint mobile shell tabs — khớp `@media (max-width: 991.98px)` trên trang cơ sở. */
export const CO_SO_MOBILE_SHELL_MQ = "(max-width: 991.98px)";

export type CoSoMobileShellTab = "info" | "content" | "notify";

export function isCoSoMobileShellViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(CO_SO_MOBILE_SHELL_MQ).matches;
}
