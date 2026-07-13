"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type VerifiedUsersContextValue = {
  /** Set slug (lowercase) của các tài khoản đã xác minh. */
  slugs: Set<string>;
  isVerified: (slug: string | null | undefined) => boolean;
};

const VerifiedUsersContext = createContext<VerifiedUsersContextValue | null>(
  null,
);

/**
 * Tải 1 lần danh sách slug tài khoản tick xanh, chia sẻ cho mọi chip/popover.
 * Verified user là số ít → cache cục bộ rẻ, tránh fetch lặp theo từng chip.
 */
export function VerifiedUsersProvider({ children }: { children: ReactNode }) {
  const existing = useContext(VerifiedUsersContext);
  const [slugs, setSlugs] = useState<Set<string>>(() => new Set());
  const loadedRef = useRef(false);

  useEffect(() => {
    if (existing || loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    void fetch("/api/users/verified")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { slugs?: string[] } | null) => {
        if (cancelled || !json?.slugs) return;
        setSlugs(new Set(json.slugs.map((s) => s.toLowerCase())));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [existing]);

  const value = useMemo<VerifiedUsersContextValue>(
    () => ({
      slugs,
      isVerified: (slug) =>
        slug ? slugs.has(slug.trim().toLowerCase()) : false,
    }),
    [slugs],
  );

  if (existing) return <>{children}</>;

  return (
    <VerifiedUsersContext.Provider value={value}>
      {children}
    </VerifiedUsersContext.Provider>
  );
}

/** Trả về true nếu slug thuộc tài khoản đã xác minh. An toàn khi không có provider. */
export function useIsUserVerified(slug: string | null | undefined): boolean {
  const ctx = useContext(VerifiedUsersContext);
  if (!ctx) return false;
  return ctx.isVerified(slug);
}
