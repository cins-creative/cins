"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SuKienCreateModal } from "@/components/co-so/SuKienCreateModal";
import { SuKienDetailView } from "@/components/co-so/SuKienDetailView";
import {
  congDongRootPath,
} from "@/lib/cong-dong/routes";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { SuKienCardData } from "@/lib/to-chuc/su-kien-constants";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgTinhThanh?: string | null;
  orgAvatarId?: string | null;
  canManage: boolean;
  activeSuKienId: string;
};

export function CongDongSuKienDetailHost({
  orgId,
  orgSlug,
  orgTen,
  orgTinhThanh = null,
  orgAvatarId = null,
  canManage,
  activeSuKienId,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<SuKienCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openManageFromQuery, setOpenManageFromQuery] = useState(false);
  const [editing, setEditing] = useState<SuKienCardData | null>(null);

  const backHref = congDongRootPath(orgSlug);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    setOpenManageFromQuery(q.get("manage") === "1");
  }, [activeSuKienId]);

  useEffect(() => {
    let cancelled = false;

    function load() {
      setLoading(true);
      setLoadError(null);
      fetch(`/api/org/${encodeURIComponent(orgId)}/su-kien`, {
        credentials: "include",
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            suKien?: SuKienCardData[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error ?? "Không tải được danh sách sự kiện.");
          }
          if (!cancelled) setItems(data.suKien ?? []);
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setLoadError(
              e instanceof Error ? e.message : "Không tải được sự kiện.",
            );
            setItems([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    load();

    function onSuKienChanged(ev: Event) {
      const detail = (ev as CustomEvent<{ orgId?: string }>).detail;
      if (detail?.orgId && detail.orgId !== orgId) return;
      load();
    }
    window.addEventListener("cins:cong-dong-su-kien-changed", onSuKienChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "cins:cong-dong-su-kien-changed",
        onSuKienChanged,
      );
    };
  }, [orgId]);

  const activeSuKien =
    items.find((s) => s.id === activeSuKienId) ?? null;

  function handleUpdated(suKien: SuKienCardData) {
    setItems((prev) =>
      prev.map((s) => (s.id === suKien.id ? suKien : s)),
    );
    setEditing(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cins:cong-dong-su-kien-changed", {
          detail: { orgId, action: "updated", suKien },
        }),
      );
    }
  }

  function handleSoDangKyChange(suKienId: string, soDangKy: number) {
    setItems((prev) =>
      prev.map((s) => (s.id === suKienId ? { ...s, soDangKy } : s)),
    );
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cins:cong-dong-su-kien-changed", {
            detail: { orgId, action: "deleted", suKienId: id },
          }),
        );
      }
      if (activeSuKienId === id) {
        router.push(backHref, { scroll: false });
      } else {
        setItems((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      /* giữ modal mở */
    }
  }

  if (loading) {
    return (
      <div className="cso-kh-tab">
        <div className="cso-sk-skeleton" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="cso-kh-empty">
        <p className="cso-kh-empty-title">Không tải được sự kiện</p>
        <p className="cso-kh-empty-hint">{loadError}</p>
      </div>
    );
  }

  if (!activeSuKien) {
    return (
      <div className="cso-kh-tab">
        <div className="cso-kh-empty">
          <p className="cso-kh-empty-title">Không tìm thấy sự kiện</p>
          <p className="cso-kh-empty-hint">
            Sự kiện có thể đã bị xóa hoặc không thuộc cộng đồng này.
          </p>
          <button
            type="button"
            className="cso-kh-toolbar-btn cso-kh-empty-btn"
            onClick={() => router.push(backHref, { scroll: false })}
          >
            Quay lại cộng đồng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cso-kh-tab">
      <SuKienDetailView
        orgId={orgId}
        suKien={activeSuKien}
        canManage={canManage}
        variant="panel"
        initialPanelTab={
          canManage && openManageFromQuery ? "manage" : "detail"
        }
        backHref={backHref}
        onBack={() => router.push(backHref, { scroll: false })}
        onEdit={canManage ? () => setEditing(activeSuKien) : undefined}
        onSoDangKyChange={handleSoDangKyChange}
        orgTen={orgTen}
        orgLoai="cong_dong"
        orgAvatarUrl={getAvatarUrl(orgAvatarId)}
        orgHref={congDongRootPath(orgSlug)}
      />
      {canManage ? (
        <SuKienCreateModal
          open={Boolean(editing)}
          orgId={orgId}
          orgTinhThanh={orgTinhThanh}
          editing={editing}
          onClose={() => setEditing(null)}
          onUpdated={handleUpdated}
          onDelete={editing ? handleDelete : undefined}
        />
      ) : null}
    </div>
  );
}
