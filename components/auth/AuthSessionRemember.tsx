"use client";

import { useEffect } from "react";

import { saveRememberedAccount } from "@/lib/auth/remembered-account";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

async function syncRememberedProfile(): Promise<void> {
  const res = await fetch("/api/auth/session-profile", { cache: "no-store" });
  if (!res.ok) return;

  const json = (await res.json()) as {
    profile?: {
      id: string;
      slug: string;
      tenHienThi: string | null;
      email: string | null;
      avatarId: string | null;
    } | null;
  };

  if (!json.profile) return;
  saveRememberedAccount(json.profile);
}

/**
 * Giữ session Supabase sống + ghi profile vào localStorage sau đăng nhập.
 * Không lưu token — chỉ metadata tài khoản để đăng nhập lại nhanh.
 */
export function AuthSessionRemember() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void syncRememberedProfile();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        void syncRememberedProfile();
      }
    });

    const refresh = () => {
      void supabase.auth.refreshSession();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
