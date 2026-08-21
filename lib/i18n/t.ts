import { MESSAGES, type MessageKey } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE, type CinsLocale } from "@/lib/locale/types";

export type TFn = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name]),
  );
}

export function getT(locale: CinsLocale = DEFAULT_LOCALE): TFn {
  const table = MESSAGES[locale] ?? MESSAGES.vi;
  return (key, vars) => interpolate(table[key] ?? MESSAGES.vi[key] ?? key, vars);
}

export function translate(
  locale: CinsLocale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  return getT(locale)(key, vars);
}
