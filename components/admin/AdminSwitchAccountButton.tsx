"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { clearAllClientCaches } from "@/lib/client-cache";
import { clearAllWorldJourneyFirstImpressionSeen } from "@/lib/cins/worldJourneyFirstImpression";
import { clearRecentSearches } from "@/lib/search/recent-searches-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function loginHref(pathname: string): string {
  const next = pathname.startsWith("/admin") ? pathname : "/admin";
  return `/login?next=${encodeURIComponent(next)}`;
}

/**
 * Đăng xuất phiên hiện tại rồi mở /login, giữ `?next=` về trang admin đang xem.
 * Cùng luồng với menu «Chuyển tài khoản» trên AdminTopbar — dùng khi gate
 * chặn quyền nên không có topbar.
 */
export function AdminSwitchAccountButton() {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      clearAllClientCaches();
      clearAllWorldJourneyFirstImpressionSeen();
      clearRecentSearches();
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
      startTransition(() => {
        router.replace(loginHref(pathname));
        router.refresh();
      });
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => void onClick()}
      disabled={busy}
    >
      {busy ? "Đang chuyển…" : "Đăng nhập tài khoản khác"}
    </button>
  );
}
