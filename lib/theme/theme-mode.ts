/**
 * Chế độ giao diện (sáng / tối / theo thiết bị).
 *
 * - Lưu lựa chọn của người dùng vào localStorage (device-local, không đồng bộ server).
 * - Áp trực tiếp lên <html data-theme="..."> + color-scheme để token CSS phản ứng ngay.
 * - Script no-flash (ThemeRoot + useServerInsertedHTML) đọc cùng key này trước khi paint.
 * - ThemeRoot (client) sync lại sau hydrate + theo dõi prefers-color-scheme.
 * - Guest home có thể khoá nền sáng tạm thời qua acquireForceLightTheme().
 */

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "cins-theme";
export const THEME_CHANGE_EVENT = "cins:theme-change";

/**
 * Inline script no-flash — inject qua useServerInsertedHTML (không render
 * <script> trong cây React: React 19 cảnh báo / không chạy trên client).
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(m!=="light"&&m!=="dark"&&m!=="system")m="system";var d=m==="dark"||(m==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);var t=d?"dark":"light";var r=document.documentElement;r.setAttribute("data-theme",t);r.style.colorScheme=t;}catch(e){}})();`;

/** Ghi đè nền sáng trước paint (guest home) — cùng cơ chế inject như trên. */
export const FORCE_LIGHT_THEME_SCRIPT =
  '(function(){try{var r=document.documentElement;r.setAttribute("data-theme","light");r.style.colorScheme="light";}catch(e){}})();';

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

/** Số trang đang khoá nền sáng (vd. guest home). Ref-count để chịu React Strict Mode. */
let forceLightLocks = 0;

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

export function isForceLightThemeActive(): boolean {
  return forceLightLocks > 0;
}

/** Áp theme đã resolve lên <html> (data-theme + color-scheme). */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  if (forceLightLocks > 0 && resolved !== "light") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

/**
 * Đồng bộ DOM theo localStorage (hoặc giữ sáng nếu đang khoá guest home).
 * Gọi từ ThemeRoot sau hydrate / khi storage đổi.
 */
export function syncThemeFromStorage(): void {
  if (forceLightLocks > 0) {
    applyResolvedTheme("light");
    return;
  }
  applyResolvedTheme(resolveTheme(readThemeMode()));
}

function emitThemeChange(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode } }),
  );
}

/** Lưu lựa chọn + áp ngay lên DOM (trừ khi đang khoá nền sáng). */
export function setThemeMode(mode: ThemeMode): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* bỏ qua khi localStorage bị chặn */
    }
  }
  if (forceLightLocks > 0) {
    applyResolvedTheme("light");
  } else {
    applyResolvedTheme(resolveTheme(mode));
  }
  emitThemeChange(mode);
}

/**
 * Khoá nền sáng tạm thời (guest home).
 * Cleanup dùng microtask để Strict Mode remount không nháy dark→light.
 */
export function acquireForceLightTheme(): () => void {
  forceLightLocks += 1;
  applyResolvedTheme("light");
  let released = false;
  return () => {
    if (released) return;
    released = true;
    forceLightLocks = Math.max(0, forceLightLocks - 1);
    queueMicrotask(() => {
      syncThemeFromStorage();
    });
  };
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
  const handler = (e: MediaQueryListEvent) =>
    onChange(e.matches ? "dark" : "light");
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
