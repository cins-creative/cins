"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { CoSoSettingsMembersPanel } from "@/components/co-so/CoSoSettingsMembersPanel";
import type { CoSoMemberAdmin } from "@/lib/to-chuc/co-so-settings-types";

type Props = {
  orgId: string;
  orgSlug: string;
  orgLabel: string;
  onError: (message: string | null) => void;
};

type ViewerInfo = {
  canManage: boolean;
  isOwner: boolean;
};

/** Quản lý thành viên studio — tái dùng panel của cơ sở đào tạo. */
export function StudioSettingsMembersSection({
  orgId,
  orgSlug,
  orgLabel,
  onError,
}: Props) {
  const [members, setMembers] = useState<CoSoMemberAdmin[]>([]);
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/studio/${encodeURIComponent(orgId)}/members`,
        );
        const json = (await res.json().catch(() => null)) as {
          members?: CoSoMemberAdmin[];
          viewer?: { canManage?: boolean; isOwner?: boolean };
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.members) {
          onError(json?.error ?? "Không tải được danh sách thành viên.");
          setViewer({ canManage: false, isOwner: false });
          return;
        }
        setMembers(json.members);
        setViewer({
          canManage: Boolean(json.viewer?.canManage),
          isOwner: Boolean(json.viewer?.isOwner),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, onError]);

  if (loading || !viewer) {
    return (
      <div className="uas-loading">
        <Loader2 size={18} className="uas-spin" aria-hidden />
        <span>Đang tải…</span>
      </div>
    );
  }

  return (
    <CoSoSettingsMembersPanel
      orgId={orgId}
      orgSlug={orgSlug}
      orgLabel={orgLabel}
      apiBase={`/api/studio/${encodeURIComponent(orgId)}`}
      viewerIsOwner={viewer.isOwner}
      members={members}
      canManage={viewer.canManage}
      onMembersChange={setMembers}
      onError={onError}
    />
  );
}
