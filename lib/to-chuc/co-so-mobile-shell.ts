/** Breakpoint mobile shell — khớp `@media (max-width: 991.98px)` trên trang cơ sở / trường. */
export const CO_SO_MOBILE_SHELL_MQ = "(max-width: 991.98px)";

export function isCoSoMobileShellViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(CO_SO_MOBILE_SHELL_MQ).matches;
}
