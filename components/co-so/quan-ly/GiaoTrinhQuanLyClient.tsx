"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, ExternalLink, Plus, RefreshCw } from "lucide-react";

import { BaiTapKhoaCard } from "@/components/co-so/BaiTapKhoaCard";
import { GiaoTrinhBaiTapPanel } from "@/components/co-so/GiaoTrinhBaiTapPanel";
import { labelBaiTapSectionDisplay } from "@/lib/to-chuc/khoa-hoc-labels";
import {
  BAI_TAP_SECTION_DISPLAY_DEFAULT,
  type BaiTapKhoaData,
  type BaiTapKhoaDraft,
  type BaiTapSectionDisplayMode,
} from "@/lib/to-chuc/khoa-hoc-types";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";

type KhoaOption = {
  id: string;
  slug: string;
  tenKhoaHoc: string;
};

type Props = {
  orgId: string;
  orgSlug: string;
};

const BAI_TAP_DISPLAY_OPTIONS: BaiTapSectionDisplayMode[] = [
  "an",
  "mot_phan",
  "day_du",
];

/**
 * Tab Giáo trình — UI/CRUD giống khối Bài tập trên trang khóa (chế độ quản lý).
 */
export function GiaoTrinhQuanLyClient({ orgId, orgSlug }: Props) {
  const [khoaOptions, setKhoaOptions] = useState<KhoaOption[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [selectedKhoaId, setSelectedKhoaId] = useState("");
  const [baiTapList, setBaiTapList] = useState<BaiTapKhoaData[]>([]);
  const [displayMode, setDisplayMode] = useState<BaiTapSectionDisplayMode>(
    BAI_TAP_SECTION_DISPLAY_DEFAULT,
  );
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingBai, setLoadingBai] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<BaiTapKhoaData | null>(null);

  const selectedKhoa =
    khoaOptions.find((k) => k.id === selectedKhoaId) ?? null;

  const baiTapApiUrl = selectedKhoa
    ? `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(selectedKhoa.id)}/bai-tap`
    : null;

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/giao-trinh`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải giáo trình.");
      const options = (data.khoaOptions ?? []) as KhoaOption[];
      setKhoaOptions(options);
      setCanEdit(Boolean(data.canEdit));
      setSelectedKhoaId((prev) => {
        if (prev && options.some((k) => k.id === prev)) return prev;
        return options[0]?.id ?? "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoadingMeta(false);
    }
  }, [orgId]);

  const loadBaiTap = useCallback(async () => {
    if (!baiTapApiUrl) {
      setBaiTapList([]);
      setDisplayMode(BAI_TAP_SECTION_DISPLAY_DEFAULT);
      return;
    }
    setLoadingBai(true);
    setError(null);
    try {
      const res = await fetch(baiTapApiUrl, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải bài tập.");
      setBaiTapList((data.baiTap ?? []) as BaiTapKhoaData[]);
      setDisplayMode(
        (data.displayMode as BaiTapSectionDisplayMode) ??
          BAI_TAP_SECTION_DISPLAY_DEFAULT,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
      setBaiTapList([]);
    } finally {
      setLoadingBai(false);
    }
  }, [baiTapApiUrl]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadBaiTap();
  }, [loadBaiTap]);

  async function persistBaiTapList(list: BaiTapKhoaData[]) {
    if (!baiTapApiUrl) throw new Error("Chưa chọn khóa.");
    const res = await fetch(baiTapApiUrl, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baiTap: list }),
    });
    const body = (await res.json().catch(() => null)) as {
      baiTap?: BaiTapKhoaData[];
      error?: string;
    } | null;
    if (!res.ok) {
      throw new Error(body?.error ?? "Không lưu được bài tập.");
    }
    return body?.baiTap ?? list;
  }

  async function handleDisplayModeChange(mode: BaiTapSectionDisplayMode) {
    if (!canEdit || !baiTapApiUrl) return;
    const prev = displayMode;
    setDisplayMode(mode);
    setFlash(null);
    try {
      const res = await fetch(baiTapApiUrl, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayMode: mode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ||
            "Không lưu chế độ hiển thị.",
        );
      }
      setFlash(`Đã đặt: ${labelBaiTapSectionDisplay(mode)}`);
    } catch (err) {
      setDisplayMode(prev);
      setError(err instanceof Error ? err.message : "Lỗi.");
    }
  }

  function openCreate() {
    if (!canEdit || !selectedKhoa) return;
    setEditing(null);
    setPanelOpen(true);
    setFlash(null);
  }

  function openEdit(item: BaiTapKhoaData) {
    setEditing(item);
    setPanelOpen(true);
    setFlash(null);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(null);
  }

  function handleSaveDraft(draft: BaiTapKhoaDraft) {
    if (!canEdit || !selectedKhoa) return;
    const next = editing
      ? baiTapList.map((bt) =>
          bt.id === editing.id ? { ...bt, ...draft } : bt,
        )
      : [...baiTapList, { id: crypto.randomUUID(), ...draft }];

    setBaiTapList(next);
    closePanel();
    setError(null);

    void persistBaiTapList(next)
      .then((saved) => {
        setBaiTapList(saved);
        setFlash(editing ? "Đã cập nhật bài." : "Đã thêm bài tập.");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lỗi lưu.");
        void loadBaiTap();
      });
  }

  const loading = loadingMeta || loadingBai;

  return (
    <div className="cso-lh-page cso-dt-stack">
      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <div className="cso-lh-head-row">
            <div>
              <h2 className="cso-dt-panel-title">Hệ thống giáo trình</h2>
              <p className="cso-dt-panel-sub">
                Giống khối Bài tập trên trang khóa — chọn khóa, chỉnh lộ trình và
                cách hiển thị với khách.
              </p>
            </div>
            <div className="cso-gt-head-actions">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                onClick={() => {
                  void loadMeta();
                  void loadBaiTap();
                }}
                disabled={loading}
                aria-label="Tải lại"
              >
                <RefreshCw size={15} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {khoaOptions.length > 0 ? (
          <div className="cso-gt-filters">
            <label className="cso-gt-filter-label">
              <span className="sr-only">Chọn khóa</span>
              <select
                className="cso-ql-select cso-gt-filter-select"
                value={selectedKhoaId}
                onChange={(e) => {
                  setSelectedKhoaId(e.target.value);
                  setPanelOpen(false);
                  setEditing(null);
                  setFlash(null);
                }}
                aria-label="Chọn khóa để quản lý giáo trình"
              >
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.tenKhoaHoc}
                  </option>
                ))}
              </select>
            </label>
            {selectedKhoa ? (
              <Link
                href={coSoKhoaHocDetailPath(orgSlug, selectedKhoa.slug)}
                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                title="Mở trang khóa"
              >
                <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
                Vào trang khóa học
              </Link>
            ) : null}
          </div>
        ) : null}

        {flash ? (
          <div className="cso-dt-panel-body">
            <p className="cso-ql-flash">{flash}</p>
          </div>
        ) : null}
        {error ? (
          <div className="cso-dt-panel-body">
            <p className="cso-ql-error cso-lh-inline-error">{error}</p>
          </div>
        ) : null}

        <div className="cso-dt-panel-body">
          {loadingMeta && khoaOptions.length === 0 ? (
            <p className="cso-lh-hv-list-muted">Đang tải…</p>
          ) : khoaOptions.length === 0 ? (
            <div className="cso-hv-empty">
              <strong>Chưa có khóa học</strong>
              Tạo khóa trước, rồi thêm bài giáo trình.
            </div>
          ) : (
            <div className="tdh-page--cso cso-gt-bt-host">
              <section
                className="cso-khd-bt-block"
                aria-labelledby="cso-gt-bt-block-title"
              >
                <div
                  id="cso-gt-bt-block-title"
                  className="cso-khd-s-label cso-khd-bt-block-head"
                >
                  <span className="cso-khd-bt-block-head-main">
                    <ClipboardList size={15} aria-hidden />
                    Bài tập
                    {selectedKhoa ? (
                      <span className="cso-khd-s-sum">
                        {selectedKhoa.tenKhoaHoc}
                        {loadingBai
                          ? " · …"
                          : ` · ${baiTapList.length} bài`}
                      </span>
                    ) : null}
                  </span>
                  {canEdit ? (
                    <select
                      className="cso-khd-bt-display-select"
                      value={displayMode}
                      disabled={loadingBai || !selectedKhoa}
                      onChange={(e) =>
                        void handleDisplayModeChange(
                          e.target.value as BaiTapSectionDisplayMode,
                        )
                      }
                      aria-label="Cách hiển thị bài tập cho khách"
                    >
                      {BAI_TAP_DISPLAY_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>
                          {labelBaiTapSectionDisplay(mode)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <div className="cso-khd-bt-block-body">
                  {loadingBai ? (
                    <p className="cso-lh-hv-list-muted">Đang tải bài tập…</p>
                  ) : (
                    <>
                      {baiTapList.length > 0 ? (
                        <div className="cso-khd-bt-list">
                          {baiTapList.map((bt, i) => (
                            <BaiTapKhoaCard
                              key={bt.id}
                              item={bt}
                              index={i}
                              canManage={canEdit}
                              onEdit={canEdit ? openEdit : undefined}
                            />
                          ))}
                        </div>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          className={[
                            "cso-khd-bt-empty-card",
                            baiTapList.length > 0
                              ? "cso-khd-bt-empty-card--compact"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={openCreate}
                        >
                          <Plus size={22} aria-hidden />
                          <span className="cso-khd-bt-empty-title">
                            Thêm bài tập
                          </span>
                          {baiTapList.length === 0 ? (
                            <span className="cso-khd-bt-empty-hint">
                              Chưa có bài tập trong khóa này.
                            </span>
                          ) : null}
                        </button>
                      ) : baiTapList.length === 0 ? (
                        <div className="cso-hv-empty">
                          <strong>Chưa có bài tập</strong>
                          Khóa này chưa có giáo trình.
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>

      {selectedKhoa ? (
        <GiaoTrinhBaiTapPanel
          open={panelOpen}
          onClose={closePanel}
          tenKhoaHoc={selectedKhoa.tenKhoaHoc}
          editItem={editing}
          onSave={handleSaveDraft}
        />
      ) : null}
    </div>
  );
}
