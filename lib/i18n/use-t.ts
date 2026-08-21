"use client";

import { useMemo } from "react";

import { getT, type TFn } from "@/lib/i18n/t";
import { useLocale } from "@/lib/locale/context";

export function useT(): TFn {
  const locale = useLocale();
  return useMemo(() => getT(locale), [locale]);
}
