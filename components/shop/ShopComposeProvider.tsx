"use client";

import { useEffect, useState, type ReactNode } from "react";

import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";

type Profile = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
};

type Props = {
  children: ReactNode;
};

/**
 * Bọc trang Kho (`/ban-hang/kho`) bằng JourneyComposeProvider —
 * cho phép mở overlay soạn bài (Giới thiệu sản phẩm) ngay tại dashboard.
 * `syncComposeUrl={false}` — không nhét `?compose=` vào URL ban-hang.
 *
 * Luôn giữ Provider mounted (placeholder khi chưa có profile) để
 * `ShopKhoClient` không remount mất state khi session-profile về.
 */
export function ShopComposeProvider({ children }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session-profile", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          profile?: {
            id?: string;
            slug?: string | null;
            tenHienThi?: string | null;
            avatarId?: string | null;
          } | null;
        } | null;
        const p = json?.profile;
        const id = p?.id?.trim();
        const slug = p?.slug?.trim();
        if (!id || !slug || cancelled) return;
        setProfile({
          id,
          slug,
          tenHienThi: p?.tenHienThi?.trim() || slug,
          avatarId: p?.avatarId?.trim() || null,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <JourneyComposeProvider
      ownerId={profile?.id ?? ""}
      ownerSlug={profile?.slug ?? ""}
      ownerName={profile?.tenHienThi ?? ""}
      ownerAvatarId={profile?.avatarId ?? null}
      isOwner={Boolean(profile)}
      syncComposeUrl={false}
    >
      {children}
    </JourneyComposeProvider>
  );
}
