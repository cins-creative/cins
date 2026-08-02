"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { OrgInboxFilterKey } from "@/components/truong/OrgInboxPanel";

/** Đọc `?filter=` + `?room=` từ URL trang QL tin nhắn. */
export function useOrgInboxDeepLink(defaults?: {
  filter?: OrgInboxFilterKey;
}): {
  initialFilter: OrgInboxFilterKey;
  initialRoomId: string | null;
} {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const filterRaw = searchParams.get("filter")?.trim() ?? "";
    const room = searchParams.get("room")?.trim() || null;
    const allowed: OrgInboxFilterKey[] = [
      "all",
      "open",
      "replied",
      "unread",
      "verify",
      "pending_pay",
    ];
    const filter = (allowed.includes(filterRaw as OrgInboxFilterKey)
      ? (filterRaw as OrgInboxFilterKey)
      : defaults?.filter) ?? "open";
    return { initialFilter: filter, initialRoomId: room };
  }, [searchParams, defaults?.filter]);
}
