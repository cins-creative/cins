"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { KhoaHocAddTile, KhoaHocCard } from "@/components/co-so/KhoaHocCard";
import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import { KhoaHocDeleteConfirm } from "@/components/co-so/KhoaHocDeleteConfirm";
import { KhoaHocDetailView } from "@/components/co-so/KhoaHocDetailView";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import {
  coSoKhoaHocDetailPath,
  coSoTabPath,
} from "@/lib/to-chuc/co-so-routes";

type Props = {
  orgId: string;
  orgSlug: string;
  orgTen: string;
  orgDiaChi?: string | null;
  canManageKhoaHoc: boolean;
  khoaSlug?: string | null;
};

export function CoSoTabKhoaHoc({
  orgId,
  orgSlug,
  orgTen,
  orgDiaChi = null,
  canManageKhoaHoc,
  khoaSlug = null,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<KhoaHocCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaHocCardData | null>(null);
  const [deleting, setDeleting] = useState<KhoaHocCardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/co-so/${orgId}/khoa-hoc`, { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as {
          khoaHoc?: KhoaHocCardData[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Không tải được danh sách khóa học.");
        }
        if (!cancelled) {
          setItems(data.khoaHoc ?? []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Không tải được danh sách khóa học.",
          );
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const selected = useMemo(() => {
    if (!khoaSlug) return null;
    return items.find((k) => k.slug === khoaSlug) ?? null;
  }, [items, khoaSlug]);

  useEffect(() => {
    if (!khoaSlug || items.length === 0) return;
    const exists = items.some((k) => k.slug === khoaSlug);
    if (!exists) {
      router.replace(coSoTabPath(orgSlug, "khoa-hoc"), { scroll: false });
    }
  }, [items, khoaSlug, orgSlug, router]);

  const totals = useMemo(() => {
    const hocVien = items.reduce((sum, k) => sum + k.soHocVien, 0);
    return { khoa: items.length, hocVien };
  }, [items]);

  function openCreate() {
    setEditing(null);
    setCreateOpen(true);
  }

  function openKhoa(khoa: KhoaHocCardData) {
    router.push(coSoKhoaHocDetailPath(orgSlug, khoa.slug), { scroll: false });
  }

  const khoaDetailHref = (khoa: KhoaHocCardData) =>
    coSoKhoaHocDetailPath(orgSlug, khoa.slug);

  function handleCreated(khoa: KhoaHocCardData) {
    setItems((prev) => [khoa, ...prev.filter((k) => k.id !== khoa.id)]);
    router.push(coSoKhoaHocDetailPath(orgSlug, khoa.slug), { scroll: false });
  }

  function handleUpdated(khoa: KhoaHocCardData) {
    setItems((prev) =>
      prev.map((item) => (item.id === khoa.id ? khoa : item)),
    );
    if (khoaSlug === khoa.slug || selected?.id === khoa.id) {
      router.replace(coSoKhoaHocDetailPath(orgSlug, khoa.slug), { scroll: false });
    }
  }

  function handleDeleted(khoaId: string) {
    const wasSelected = selected?.id === khoaId;
    setItems((prev) => prev.filter((k) => k.id !== khoaId));
    if (wasSelected) {
      router.replace(coSoTabPath(orgSlug, "khoa-hoc"), { scroll: false });
    }
  }

  function handleBack() {
    router.push(coSoTabPath(orgSlug, "khoa-hoc"), { scroll: false });
  }

  if (selected) {
    return (
      <KhoaHocDetailView
        orgId={orgId}
        orgTen={orgTen}
        khoa={selected}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return (
      <div className="cso-khd cso-khd--loading">
        <div className="cso-kh-skeleton cso-khd-skeleton" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="cso-kh-empty">
        <p className="cso-kh-empty-title">Không tải được khóa học</p>
        <p className="cso-kh-empty-hint">{loadError}</p>
      </div>
    );
  }

  if (khoaSlug) {
    return (
      <div className="cso-khd cso-khd--loading">
        <div className="cso-kh-skeleton cso-khd-skeleton" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <div className="cso-kh-tab">
        <header className="cso-kh-tab-head">
          <div className="cso-kh-toolbar">
            <div className="cso-kh-toolbar-text">
              <h2 className="cso-kh-toolbar-title">Khóa học</h2>
              {items.length > 0 ? (
                <p className="cso-kh-toolbar-sub">
                  {totals.khoa} khóa · {totals.hocVien} học viên
                </p>
              ) : (
                <p className="cso-kh-toolbar-sub">
                  Chương trình đào tạo tại {orgTen}
                </p>
              )}
            </div>
            {canManageKhoaHoc ? (
              <button
                type="button"
                className="cso-kh-toolbar-btn"
                onClick={openCreate}
              >
                <Plus size={16} aria-hidden />
                Thêm khóa học
              </button>
            ) : null}
          </div>
        </header>

        {items.length === 0 ? (
          <div className="cso-kh-empty">
            <GraduationCap size={36} strokeWidth={1.25} aria-hidden />
            <p className="cso-kh-empty-title">Chưa có khóa học nào</p>
            <p className="cso-kh-empty-hint">
              Tạo khóa học đầu tiên để học viên có thể đăng ký.
            </p>
            {canManageKhoaHoc ? (
              <button
                type="button"
                className="cso-kh-toolbar-btn cso-kh-empty-btn"
                onClick={openCreate}
              >
                <Plus size={16} aria-hidden />
                Thêm khóa học
              </button>
            ) : null}
          </div>
        ) : (
          <div className="cso-kh-grid">
            {items.map((khoa) => (
              <KhoaHocCard
                key={khoa.id}
                khoa={khoa}
                href={khoaDetailHref(khoa)}
                canManage={canManageKhoaHoc}
                onManage={() => openKhoa(khoa)}
                onEdit={() => {
                  setCreateOpen(false);
                  setEditing(khoa);
                }}
                onDelete={() => setDeleting(khoa)}
              />
            ))}
            {canManageKhoaHoc ? (
              <KhoaHocAddTile onClick={openCreate} />
            ) : null}
          </div>
        )}
      </div>

      {canManageKhoaHoc ? (
        <>
          <KhoaHocCreateModal
            open={createOpen && !editing}
            orgId={orgId}
            orgDiaChi={orgDiaChi}
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
          <KhoaHocCreateModal
            open={Boolean(editing)}
            orgId={orgId}
            orgDiaChi={orgDiaChi}
            editing={editing}
            onClose={() => setEditing(null)}
            onUpdated={handleUpdated}
          />
          <KhoaHocDeleteConfirm
            open={Boolean(deleting)}
            orgId={orgId}
            khoa={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={handleDeleted}
          />
        </>
      ) : null}
    </>
  );
}
