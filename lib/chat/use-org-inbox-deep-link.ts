"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import type { OrgInboxFilterKey } from "@/components/truong/OrgInboxPanel";

/** Đọc `?filter=` + `?room=` + `?user=` từ URL trang QL tin nhắn. */
export function useOrgInboxDeepLink(defaults?: {
  filter?: OrgInboxFilterKey;
}): {
  initialFilter: OrgInboxFilterKey;
  initialRoomId: string | null;
  initialStudentUserId: string | null;
} {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const filterRaw = searchParams.get("filter")?.trim() ?? "";
    const room = searchParams.get("room")?.trim() || null;
    const user = searchParams.get("user")?.trim() || null;
    const allowed: OrgInboxFilterKey[] = [
      "all",
      "open",
      "replied",
      "unread",
    ];
    const filter = (allowed.includes(filterRaw as OrgInboxFilterKey)
      ? (filterRaw as OrgInboxFilterKey)
      : defaults?.filter) ?? "open";
    return {
      initialFilter: filter,
      initialRoomId: room,
      initialStudentUserId: user,
    };
  }, [searchParams, defaults?.filter]);
}
