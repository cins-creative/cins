"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Cho user thoát phiên đang dở onboarding — không bắt buộc, chỉ là exit hatch
 * phòng khi họ muốn quay lại sau. Sign out → redirect về landing.
 */
export function OnboardingSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      startTransition(() => {
        router.replace("/");
        router.refresh();
      });
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="cins-onb-signout"
      onClick={() => void onClick()}
      disabled={busy}
      aria-label="Đăng xuất và quay lại trang chủ"
    >
      {busy ? "Đang thoát…" : "Để sau ↗"}
    </button>
  );
}
