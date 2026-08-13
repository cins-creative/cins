"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SuKienDetailView } from "@/components/co-so/SuKienDetailView";
import { SubjectPageTracker } from "@/components/social/SubjectPageTracker";
import type { SuKienCardData } from "@/lib/to-chuc/su-kien-constants";
import { suKienCardPath } from "@/lib/to-chuc/su-kien-routes";

const SuKienCreateModal = dynamic(
  () =>
    import("@/components/co-so/SuKienCreateModal").then((m) => ({
      default: m.SuKienCreateModal,
    })),
  { ssr: false },
);

type Props = {
  orgId: string;
  orgTen: string;
  orgLoai: string;
  orgAvatarUrl: string | null;
  orgHref: string;
  orgTinhThanh?: string | null;
  canManage: boolean;
  suKien: SuKienCardData;
  viewerProfileId?: string | null;
};

/** Trang `/su-kien/...` — toolbar Sửa/Quản lý + modal sửa cho admin org. */
export function SuKienStandaloneDetailHost({
  orgId,
  orgTen,
  orgLoai,
  orgAvatarUrl,
  orgHref,
  orgTinhThanh = null,
  canManage,
  suKien: initialSuKien,
  viewerProfileId = null,
}: Props) {
  const router = useRouter();
  const [suKien, setSuKien] = useState(initialSuKien);
  const [editing, setEditing] = useState<SuKienCardData | null>(null);
  const [openManageFromQuery, setOpenManageFromQuery] = useState(false);

  useEffect(() => {
    setSuKien(initialSuKien);
  }, [initialSuKien]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    setOpenManageFromQuery(q.get("manage") === "1");
  }, [suKien.id]);

  function handleUpdated(next: SuKienCardData) {
    setSuKien({
      ...next,
      hasQuay: next.hasQuay ?? suKien.hasQuay,
    });
    setEditing(null);
    const nextPath = suKienCardPath(next);
    const current =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "";
    if (current && !current.startsWith(nextPath)) {
      router.replace(nextPath);
    } else {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!editing) return;
    const id = editing.id;
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(orgId)}/su-kien/${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) return;
      setEditing(null);
      router.push(orgHref);
    } catch {
      /* giữ modal */
    }
  }

  return (
    <>
      <SubjectPageTracker
        loai="su_kien"
        id={suKien.id}
        nguon="permalink"
      />
      <SuKienDetailView
        orgId={orgId}
        suKien={suKien}
        canManage={canManage}
        variant="page"
        initialPanelTab={
          canManage && openManageFromQuery ? "manage" : "detail"
        }
        onEdit={canManage ? () => setEditing(suKien) : undefined}
        orgTen={orgTen}
        orgLoai={orgLoai}
        orgAvatarUrl={orgAvatarUrl}
        orgHref={orgHref}
        viewerProfileId={viewerProfileId}
      />
      {canManage && editing ? (
        <SuKienCreateModal
          open
          orgId={orgId}
          orgTinhThanh={orgTinhThanh}
          editing={editing}
          onClose={() => setEditing(null)}
          onUpdated={handleUpdated}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
}
