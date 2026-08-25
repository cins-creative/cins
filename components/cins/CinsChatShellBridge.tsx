"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  CinsChatProvider,
  useCinsChatContext,
} from "@/components/cins/CinsChatProvider";
import { VerifiedUsersProvider } from "@/components/cins/VerifiedUsersProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function CinsChatShellBridge({
  viewerProfileId,
  children,
}: {
  viewerProfileId: string | null;
  children: ReactNode;
}) {
  const existing = useCinsChatContext();
  const [hydratedId, setHydratedId] = useState<string | null>(viewerProfileId);

  useEffect(() => {
    setHydratedId(viewerProfileId);
  }, [viewerProfileId]);

  useEffect(() => {
    if (viewerProfileId || existing) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authId = session?.user?.id;
        if (!authId || cancelled) return;
        const { data } = await supabase
          .from("user_nguoi_dung")
          .select("id")
          .eq("auth_user_id", authId)
          .maybeSingle<{ id: string }>();
        if (!cancelled && data?.id) setHydratedId(data.id);
      } catch {
        /* thiếu env / RLS — dock chat im lặng */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existing, viewerProfileId]);

  if (existing) {
    return <VerifiedUsersProvider>{children}</VerifiedUsersProvider>;
  }

  return (
    <CinsChatProvider viewerProfileId={hydratedId}>
      <VerifiedUsersProvider>{children}</VerifiedUsersProvider>
    </CinsChatProvider>
  );
}
