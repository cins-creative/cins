"use client";

import { useT } from "@/lib/i18n/use-t";
import { useLocale, useSetLocale } from "@/lib/locale/context";
import type { CinsLocale } from "@/lib/locale/types";

const OPTIONS: ReadonlyArray<{
  value: CinsLocale;
  short: string;
  labelKey: "locale.vi" | "locale.en";
}> = [
  { value: "vi", short: "VI", labelKey: "locale.vi" },
  { value: "en", short: "EN", labelKey: "locale.en" },
];

function LocaleFlag({ locale }: { locale: CinsLocale }) {
  if (locale === "vi") {
    return (
      <svg
        className="cins-locale-flag"
        viewBox="0 0 24 16"
        width="20"
        height="14"
        aria-hidden
      >
        <rect width="24" height="16" rx="2" fill="#DA251D" />
        <path
          fill="#FFCD00"
          d="M12 3.1 13.18 6.7h3.78l-3.06 2.22 1.17 3.6L12 10.3l-3.07 2.22 1.17-3.6L7.04 6.7h3.78z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="cins-locale-flag"
      viewBox="0 0 24 16"
      width="20"
      height="14"
      aria-hidden
    >
      <rect width="24" height="16" rx="2" fill="#012169" />
      <path stroke="#fff" strokeWidth="2.6" d="M0 0l24 16M24 0L0 16" />
      <path stroke="#C8102E" strokeWidth="1.4" d="M0 0l24 16M24 0L0 16" />
      <path stroke="#fff" strokeWidth="4.4" d="M12 0v16M0 8h24" />
      <path stroke="#C8102E" strokeWidth="2.6" d="M12 0v16M0 8h24" />
    </svg>
  );
}

export function CinsLocaleSwitch() {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const next = locale === "vi" ? "en" : "vi";
  const nextLabel = t(next === "vi" ? "locale.vi" : "locale.en");

  return (
    <div
      className="cins-locale-switch cins-locale-switch--sidebar"
      role="radiogroup"
      aria-label={t("locale.switchAria")}
    >
      <div className="cins-locale-switch-pair">
        {OPTIONS.map((opt) => {
          const active = locale === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(opt.labelKey)}
              title={t(opt.labelKey)}
              className={`cins-locale-switch-btn${active ? " on" : ""}`}
              onClick={() => setLocale(opt.value)}
            >
              <LocaleFlag locale={opt.value} />
              <span>{opt.short}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="cins-locale-switch-solo"
        aria-label={t("locale.cycleTo", { label: nextLabel })}
        title={t("locale.cycleTo", { label: nextLabel })}
        onClick={() => setLocale(next)}
      >
        <LocaleFlag locale={locale} />
      </button>
    </div>
  );
}
