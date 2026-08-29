/**
 * Áp card theme (thanh bài) lên milestone self trên trang Journey — optimistic khi chỉnh trong modal.
 */

import {
  authorCardThemeStyle,
  resolveAuthorCardThemeDto,
  type ProfileCardThemeSlice,
} from "@/lib/journey/card-theme";
import type { ProfileThemeSlice } from "@/lib/journey/profile-theme";

export const USER_CARD_THEME_CHANGE_EVENT = "cins-user-card-theme-change";

const CARD_STYLE_KEYS = [
  "--j-card-accent",
  "--j-card-dim",
  "--j-card-overlay",
  "--j-card-image",
  "--j-card-image-pos",
] as const;

function selfMilestoneEls(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  return [
    ...document.querySelectorAll<HTMLElement>(
      ".j-milestone.j-self:not(.j-card-theme-demo)",
    ),
  ];
}

function clearCardThemeEl(el: HTMLElement): void {
  el.removeAttribute("data-card-theme");
  el.removeAttribute("data-card-image");
  for (const key of CARD_STYLE_KEYS) {
    el.style.removeProperty(key);
  }
}

/** Ghi style card theme lên mọi bài self đang hiển thị (trừ demo trong picker). */
export function applyLiveCardPreview(
  card: ProfileCardThemeSlice,
  profileTheme: ProfileThemeSlice,
): void {
  const dto = resolveAuthorCardThemeDto(card, profileTheme);
  const style = dto ? authorCardThemeStyle(dto) : undefined;

  for (const el of selfMilestoneEls()) {
    if (!dto || !style) {
      clearCardThemeEl(el);
      continue;
    }
    el.setAttribute("data-card-theme", "1");
    if (dto.imageUrl) {
      el.setAttribute("data-card-image", "1");
    } else {
      el.removeAttribute("data-card-image");
    }
    for (const key of CARD_STYLE_KEYS) {
      el.style.removeProperty(key);
    }
    for (const [key, value] of Object.entries(style)) {
      if (typeof value === "string") {
        el.style.setProperty(key, value);
      }
    }
  }
}

export function dispatchUserCardThemeChange(
  card: ProfileCardThemeSlice,
  profileTheme: ProfileThemeSlice,
): void {
  applyLiveCardPreview(card, profileTheme);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(USER_CARD_THEME_CHANGE_EVENT, {
      detail: { card, profileTheme },
    }),
  );
}
