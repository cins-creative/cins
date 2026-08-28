/**
 * Áp accent + họa tiết / ảnh nền giao_dien của user đăng nhập lên `.cins-shell`.
 * Chỉ khi `theme.applyToHome` — trang chủ của viewer, không phải theme chủ hồ sơ.
 * Pattern defs dùng `var(--j-accent)` — phải set `--j-accent` trên shell.
 */

import type { CSSProperties } from "react";

import {
  getPatternDef,
  isDefaultProfileTheme,
  overlayDimFromUi,
  positionToCss,
  profileThemeImageUrl,
  resolveAccentHex,
  resolveDeviceImageId,
  resolveDevicePosition,
  type ProfileGiaoDienState,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";

export const USER_THEME_CHANGE_EVENT = "cins-user-theme-change";

export type UserShellThemeDom = {
  hasAccent: boolean;
  hasPattern: boolean;
  hasImage: boolean;
  style: CSSProperties & {
    ["--j-accent"]?: string;
    ["--j-user-accent"]?: string;
    ["--j-user-bg-image"]?: string;
    ["--j-user-bg-image-sm"]?: string;
    ["--j-user-bg-image-md"]?: string;
    ["--j-user-bg-size"]?: string;
    ["--j-user-bg-position"]?: string;
    ["--j-user-bg-position-sm"]?: string;
    ["--j-user-bg-position-md"]?: string;
    ["--j-user-bg-repeat"]?: string;
    ["--j-user-bg-dim"]?: string;
  };
};

function shellEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(".cins-shell");
}

const SHELL_STYLE_KEYS = [
  "--j-accent",
  "--j-user-accent",
  "--j-user-bg-image",
  "--j-user-bg-image-sm",
  "--j-user-bg-image-md",
  "--j-user-bg-size",
  "--j-user-bg-position",
  "--j-user-bg-position-sm",
  "--j-user-bg-position-md",
  "--j-user-bg-repeat",
  "--j-user-bg-dim",
] as const;

export function computeUserShellTheme(
  theme: ProfileThemeSlice,
): UserShellThemeDom | null {
  /* Home chỉ nhận theme khi user bật applyToHome. */
  if (!theme.applyToHome) return null;

  const state: ProfileGiaoDienState = {
    v: 1,
    theme,
    customs: [],
  };
  const hasAccent = theme.accent !== "cins" || Boolean(theme.accentHex);
  const hasPattern =
    theme.background.kind === "pattern" &&
    theme.background.patternId !== "none";
  const hasImage = theme.background.kind === "image";

  if (isDefaultProfileTheme(state) && !hasImage) return null;
  if (!hasAccent && !hasPattern && !hasImage) return null;

  const accentHex = resolveAccentHex(theme);
  const style: UserShellThemeDom["style"] = {
    ["--j-accent"]: accentHex,
  };
  if (hasAccent) {
    style["--j-user-accent"] = accentHex;
  }

  const bg = theme.background;

  if (hasPattern) {
    const pattern = getPatternDef(bg.patternId);
    if (pattern.image) {
      style["--j-user-bg-image"] = pattern.image;
      style["--j-user-bg-size"] = pattern.size ?? "auto";
      style["--j-user-bg-position"] = pattern.position ?? "0 0";
      style["--j-user-bg-position-sm"] = style["--j-user-bg-position"];
      style["--j-user-bg-position-md"] = style["--j-user-bg-position"];
      style["--j-user-bg-repeat"] = "repeat";
      style["--j-user-bg-dim"] = String(overlayDimFromUi(bg.dim));
    }
  } else if (hasImage) {
    const phoneId = resolveDeviceImageId(bg, "phone");
    const tabletId = resolveDeviceImageId(bg, "tablet");
    const desktopId = resolveDeviceImageId(bg, "desktop");
    const phoneUrl = phoneId ? profileThemeImageUrl(phoneId, "public") : null;
    const tabletUrl = tabletId
      ? profileThemeImageUrl(tabletId, "public")
      : null;
    const desktopUrl = desktopId
      ? profileThemeImageUrl(desktopId, "public")
      : null;

    if (desktopUrl) style["--j-user-bg-image"] = `url("${desktopUrl}")`;
    else if (tabletUrl) style["--j-user-bg-image"] = `url("${tabletUrl}")`;
    else if (phoneUrl) style["--j-user-bg-image"] = `url("${phoneUrl}")`;

    if (phoneUrl) style["--j-user-bg-image-sm"] = `url("${phoneUrl}")`;
    else if (style["--j-user-bg-image"]) {
      style["--j-user-bg-image-sm"] = style["--j-user-bg-image"];
    }
    if (tabletUrl) style["--j-user-bg-image-md"] = `url("${tabletUrl}")`;
    else if (style["--j-user-bg-image"]) {
      style["--j-user-bg-image-md"] = style["--j-user-bg-image"];
    }

    if (style["--j-user-bg-image"]) {
      style["--j-user-bg-size"] = "cover";
      style["--j-user-bg-repeat"] = "no-repeat";
      style["--j-user-bg-position"] = positionToCss(
        resolveDevicePosition(bg, "desktop"),
      );
      style["--j-user-bg-position-sm"] = positionToCss(
        resolveDevicePosition(bg, "phone"),
      );
      style["--j-user-bg-position-md"] = positionToCss(
        resolveDevicePosition(bg, "tablet"),
      );
      style["--j-user-bg-dim"] = String(overlayDimFromUi(bg.dim));
    }
  }

  const painted = Boolean(style["--j-user-bg-image"]);
  if (!hasAccent && !painted) return null;

  return {
    hasAccent,
    hasPattern: painted && hasPattern,
    hasImage: painted && hasImage,
    style,
  };
}

export function clearUserShellTheme(): void {
  const shell = shellEl();
  if (!shell) return;
  shell.removeAttribute("data-user-theme");
  shell.removeAttribute("data-user-accent");
  shell.removeAttribute("data-user-pattern");
  shell.removeAttribute("data-user-bg");
  for (const key of SHELL_STYLE_KEYS) {
    shell.style.removeProperty(key);
  }
}

export function applyUserShellTheme(theme: ProfileThemeSlice): void {
  const shell = shellEl();
  if (!shell) return;

  const computed = computeUserShellTheme(theme);
  if (!computed) {
    clearUserShellTheme();
    return;
  }

  shell.setAttribute("data-user-theme", "1");
  if (computed.hasAccent) {
    shell.setAttribute("data-user-accent", "1");
  } else {
    shell.removeAttribute("data-user-accent");
    shell.style.removeProperty("--j-user-accent");
  }
  if (computed.hasPattern) {
    shell.setAttribute("data-user-pattern", "1");
    shell.removeAttribute("data-user-bg");
  } else if (computed.hasImage) {
    shell.setAttribute("data-user-pattern", "1");
    shell.setAttribute("data-user-bg", "image");
  } else {
    shell.removeAttribute("data-user-pattern");
    shell.removeAttribute("data-user-bg");
    for (const key of SHELL_STYLE_KEYS) {
      if (key === "--j-accent" || key === "--j-user-accent") continue;
      shell.style.removeProperty(key);
    }
  }

  for (const [key, value] of Object.entries(computed.style)) {
    if (typeof value === "string") {
      shell.style.setProperty(key, value);
    }
  }
}

export function dispatchUserThemeChange(theme: ProfileThemeSlice): void {
  applyUserShellTheme(theme);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_THEME_CHANGE_EVENT, { detail: theme }),
  );
}
