/**
 * Chế độ giao diện (sáng / tối / theo thiết bị).
 *
 * - Lưu lựa chọn của người dùng vào localStorage (device-local, không đồng bộ server).
 * - Áp trực tiếp lên <html data-theme="..."> + color-scheme để token CSS phản ứng ngay.
 * - Script no-flash trong layout đọc cùng key này trước khi paint.
 */

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "cins-theme";

export const THEME_MODE_OPTIONS: ReadonlyArray<{
  value: ThemeMode;
  label: string;
  desc: string;
}> = [
  { value: "light", label: "Sáng", desc: "Luôn dùng nền sáng." },
  { value: "dark", label: "Tối", desc: "Luôn dùng nền tối." },
  {
    value: "system",
    label: "Theo thiết bị",
    desc: "Tự đổi theo cài đặt hệ điều hành.",
  },
];

export function normalizeThemeMode(value: unknown): ThemeMode {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  return systemPrefersDark() ? "dark" : "light";
}

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Áp theme đã resolve lên <html> (data-theme + color-scheme). */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

/** Lưu lựa chọn + áp ngay lên DOM. */
export function setThemeMode(mode: ThemeMode): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* bỏ qua khi localStorage bị chặn */
    }
  }
  applyResolvedTheme(resolveTheme(mode));
}

/**
 * Theo dõi thay đổi theme hệ điều hành khi mode = "system".
 * Trả về hàm huỷ đăng ký. Chỉ gắn listener khi mode = "system".
 */
export function watchSystemTheme(
  mode: ThemeMode,
  onChange: (resolved: ResolvedTheme) => void,
): () => void {
  if (mode !== "system" || typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? "dark" : "light");
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
