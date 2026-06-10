"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { KhoaHocAddTile, KhoaHocCard } from "@/components/co-so/KhoaHocCard";
import { KhoaHocCreateModal } from "@/components/co-so/KhoaHocCreateModal";
import { KhoaHocDeleteConfirm } from "@/components/co-so/KhoaHocDeleteConfirm";
import { KhoaHocDetailPlaceholder } from "@/components/co-so/KhoaHocDetailPlaceholder";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  orgId: string;
  orgDiaChi?: string | null;
  canManageKhoaHoc: boolean;
  initialKhoaHoc: KhoaHocCardData[];
};

export function CoSoTabKhoaHoc({
  orgId,
  orgDiaChi = null,
  canManageKhoaHoc,
  initialKhoaHoc,
}: Props) {
  const [items, setItems] = useState(initialKhoaHoc);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KhoaHocCardData | null>(null);
  const [deleting, setDeleting] = useState<KhoaHocCardData | null>(null);
  const [selected, setSelected] = useState<KhoaHocCardData | null>(null);

  const totals = useMemo(() => {
    const hocVien = items.reduce((sum, k) => sum + k.soHocVien, 0);
    return { khoa: items.length, hocVien };
  }, [items]);

  function openCreate() {
    setEditing(null);
    setCreateOpen(true);
  }

  function handleCreated(khoa: KhoaHocCardData) {
    setItems((prev) => [khoa, ...prev.filter((k) => k.id !== khoa.id)]);
    setSelected(khoa);
  }

  function handleUpdated(khoa: KhoaHocCardData) {
    setItems((prev) =>
      prev.map((item) => (item.id === khoa.id ? khoa : item)),
    );
    setSelected((prev) => (prev?.id === khoa.id ? khoa : prev));
  }

  function handleDeleted(khoaId: string) {
    setItems((prev) => prev.filter((k) => k.id !== khoaId));
    setSelected((prev) => (prev?.id === khoaId ? null : prev));
  }

  function handleBack() {
    setSelected(null);
  }

  if (selected) {
    return (
      <KhoaHocDetailPlaceholder khoa={selected} onBack={handleBack} />
    );
  }

  return (
    <>
      <div className="cso-kh-tab">
        <div className="cso-kh-toolbar">
          <div className="cso-kh-toolbar-text">
            <h2 className="cso-kh-toolbar-title">Khóa học</h2>
            {items.length > 0 ? (
              <p className="cso-kh-toolbar-sub">
                {totals.khoa} khóa · {totals.hocVien} học viên
              </p>
            ) : null}
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
                canManage={canManageKhoaHoc}
                onClick={() => setSelected(khoa)}
                onManage={() => setSelected(khoa)}
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
