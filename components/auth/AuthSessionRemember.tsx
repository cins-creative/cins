"use client";

import { useEffect, useRef } from "react";

import { saveRememberedAccount } from "@/lib/auth/remembered-account";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const VAULT_SYNC_THROTTLE_MS = 30_000;

function getBrowserSupabase() {
  try {
    return createSupabaseBrowserClient();
  } catch {
    return null;
  }
}

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
 * Đồng bộ kho `cins-accounts` khi TOKEN_REFRESHED (throttle 30s).
 * Không gọi refreshSession theo focus — browser client đã autoRefreshToken.
 */
export function AuthSessionRemember() {
  const lastVaultSyncRef = useRef(0);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void syncRememberedProfile();
    });

    function syncVault(): void {
      const now = Date.now();
      if (now - lastVaultSyncRef.current < VAULT_SYNC_THROTTLE_MS) return;
      lastVaultSyncRef.current = now;
      void fetch("/api/auth/vault-sync", {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => {
        /* Mất mạng — lần TOKEN_REFRESHED sau thử lại. */
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        void syncRememberedProfile();
      }
      if (event === "TOKEN_REFRESHED" && session?.user) {
        syncVault();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
