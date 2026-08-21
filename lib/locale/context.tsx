"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { persistCinsLocale } from "./persist";
import { DEFAULT_LOCALE, htmlLang, type CinsLocale } from "./types";

type LocaleContextValue = {
  locale: CinsLocale;
  setLocale: (next: CinsLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * Seed locale từ Server Component (root layout đọc `getCinsLocale()`),
 * để client chrome đọc bằng `useLocale()` mà không lệch hydration.
 * `setLocale` ghi cookie (lựa chọn user) rồi `router.refresh()`.
 */
export function LocaleProvider({
  locale: seed,
  children,
}: {
  locale: CinsLocale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<CinsLocale>(seed);

  useEffect(() => {
    setLocaleState(seed);
  }, [seed]);

  const setLocale = useCallback(
    (next: CinsLocale) => {
      persistCinsLocale(next);
      setLocaleState(next);
      document.documentElement.lang = htmlLang(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): CinsLocale {
  return useContext(LocaleContext).locale;
}

export function useSetLocale(): (next: CinsLocale) => void {
  return useContext(LocaleContext).setLocale;
}
