"use client";

import {
  BookOpen,
  ChevronDown,
  GripVertical,
  ImageOff,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MsIcon } from "@/components/cins/MsIcon";
import { GiaoTrinhBaiTapPanel } from "@/components/co-so/GiaoTrinhBaiTapPanel";
import { isInlineBaiTapThumbnail } from "@/lib/to-chuc/bai-tap-thumbnail";
import type {
  BaiTapKhoaData,
  BaiTapKhoaDraft,
  BaiTapModuleData,
  BoGiaoTrinhBaiData,
  BoGiaoTrinhChiTiet,
  BoGiaoTrinhData,
  LoaiBaiGiaoTrinh,
} from "@/lib/to-chuc/khoa-hoc-types";
import {
  LOAI_BAI_GIAO_TRINH_LABEL,
  LOAI_BAI_GIAO_TRINH_ORDER,
} from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  orgId: string;
  orgSlug: string;
};

type GtTab = "giao_trinh" | "bai_tap";

const GT_TABS: { id: GtTab; label: string; short: string }[] = [
  { id: "giao_trinh", label: "Giáo trình", short: "Giáo trình" },
  { id: "bai_tap", label: "Bài tập", short: "Bài tập" },
];

function BaiTapThumb({
  url,
  size = 48,
}: {
  url: string | null;
  size?: number;
}) {
  if (!url) {
    return (
      <span
        className="cso-gt-thumb-box cso-gt-thumb-box--empty"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <ImageOff size={16} strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span
      className="cso-gt-thumb-box"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className="cso-gt-thumb-img"
        unoptimized={isInlineBaiTapThumbnail(url)}
      />
    </span>
  );
}

function moduleToEditItem(m: BaiTapModuleData): BaiTapKhoaData {
  return {
    id: m.id,
    tenBaiTap: m.tenBaiTap,
    moTa: m.moTa,
    yeuCau: m.yeuCau,
    videoYoutubeUrl: m.videoYoutubeUrl,
    thumbnailUrl: m.thumbnailUrl,
    giaoTrinhBaiId: null,
    visible: true,
  };
}

export function GiaoTrinhQuanLyClient({ orgId }: Props) {
  const [tab, setTab] = useState<GtTab>("giao_trinh");
  const [canEdit, setCanEdit] = useState(false);
  const [modules, setModules] = useState<BaiTapModuleData[]>([]);
  const [boList, setBoList] = useState<BoGiaoTrinhData[]>([]);
  const [selectedBoId, setSelectedBoId] = useState("");
  const [boChiTiet, setBoChiTiet] = useState<BoGiaoTrinhChiTiet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBo, setLoadingBo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleBoFilter, setModuleBoFilter] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingModule, setEditingModule] =
    useState<BaiTapModuleData | null>(null);
  const [newBoTen, setNewBoTen] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedBaiId, setExpandedBaiId] = useState<string | null>(null);
  const [dragBaiIndex, setDragBaiIndex] = useState<number | null>(null);
  const [dropBaiIndex, setDropBaiIndex] = useState<number | null>(null);

  const apiBai = `/api/co-so/${orgId}/bai-tap`;
  const apiBo = `/api/co-so/${orgId}/bo-giao-trinh`;

  const loadMeta = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const [modRes, boRes] = await Promise.all([
        fetch(`${apiBai}?pageSize=100`, { credentials: "include" }),
        fetch(apiBo, { credentials: "include" }),
      ]);
      const modJson = (await modRes.json().catch(() => null)) as {
        rows?: BaiTapModuleData[];
        canEdit?: boolean;
        error?: string;
      } | null;
      const boJson = (await boRes.json().catch(() => null)) as {
        rows?: BoGiaoTrinhData[];
        canEdit?: boolean;
        error?: string;
      } | null;

      if (!modRes.ok) throw new Error(modJson?.error ?? "Không tải thư viện.");
      if (!boRes.ok) throw new Error(boJson?.error ?? "Không tải bộ giáo trình.");

      setModules(modJson?.rows ?? []);
      setBoList(boJson?.rows ?? []);
      setCanEdit(Boolean(modJson?.canEdit ?? boJson?.canEdit));

      setSelectedBoId((prev) => {
        if (prev && (boJson?.rows ?? []).some((b) => b.id === prev)) return prev;
        return boJson?.rows?.[0]?.id ?? "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [apiBai, apiBo]);

  const loadBoChiTiet = useCallback(
    async (boId: string) => {
      if (!boId) {
        setBoChiTiet(null);
        return;
      }
      setLoadingBo(true);
      try {
        const res = await fetch(`${apiBo}/${boId}`, { credentials: "include" });
        const json = (await res.json().catch(() => null)) as {
          row?: BoGiaoTrinhChiTiet;
          error?: string;
        } | null;
        if (!res.ok) throw new Error(json?.error ?? "Không tải chi tiết bộ.");
        setBoChiTiet(json?.row ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi.");
        setBoChiTiet(null);
      } finally {
        setLoadingBo(false);
      }
    },
    [apiBo],
  );

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setExpandedBaiId(null);
    setDragBaiIndex(null);
    setDropBaiIndex(null);
    void loadBoChiTiet(selectedBoId);
  }, [selectedBoId, loadBoChiTiet]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    return modules.filter((m) => {
      if (moduleBoFilter === "__chua_gan__") {
        if (m.boIds.length > 0) return false;
      } else if (moduleBoFilter) {
        if (!m.boIds.includes(moduleBoFilter)) return false;
      }
      if (!q) return true;
      return (
        m.tenBaiTap.toLowerCase().includes(q) ||
        (m.moTa?.toLowerCase().includes(q) ?? false) ||
        (m.yeuCau?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [modules, moduleSearch, moduleBoFilter]);

  const assignedIds = useMemo(
    () => new Set((boChiTiet?.bai ?? []).map((b) => b.baiTapId)),
    [boChiTiet],
  );

  async function persistBoBai(items: BoGiaoTrinhBaiData[]) {
    if (!selectedBoId) return;
    const res = await fetch(`${apiBo}/${selectedBoId}/bai`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((b) => ({
          baiTapId: b.baiTapId,
          thuocTinh: b.thuocTinh,
          ghiChu: b.ghiChu,
        })),
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      row?: BoGiaoTrinhChiTiet;
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? "Không lưu được danh sách.");
    const row = json?.row ?? null;
    setBoChiTiet(row);
    if (row) {
      setBoList((prev) =>
        prev.map((b) =>
          b.id === row.id ? { ...b, soBai: row.bai.length } : b,
        ),
      );
      const assigned = new Set(row.bai.map((b) => b.baiTapId));
      setModules((prev) =>
        prev.map((m) => {
          const inThis = assigned.has(m.id);
          const hadThis = m.boIds.includes(row.id);
          if (inThis === hadThis) return m;
          const boIds = inThis
            ? [...m.boIds, row.id]
            : m.boIds.filter((id) => id !== row.id);
          return { ...m, boIds, soBoDangDung: boIds.length };
        }),
      );
    }
  }

  function applyModuleLocally(row: BaiTapModuleData, mode: "create" | "update") {
    if (mode === "create") {
      setModules((prev) => [
        { ...row, boIds: row.boIds ?? [], soBoDangDung: row.boIds?.length ?? 0 },
        ...prev.filter((m) => m.id !== row.id),
      ]);
      return;
    }
    setModules((prev) =>
      prev.map((m) =>
        m.id === row.id
          ? {
              ...m,
              ...row,
              boIds: row.boIds?.length ? row.boIds : m.boIds,
              soBoDangDung: row.boIds?.length
                ? row.boIds.length
                : m.soBoDangDung,
            }
          : m,
      ),
    );
    setBoChiTiet((prev) => {
      if (!prev) return prev;
      let changed = false;
      const bai = prev.bai.map((b) => {
        if (b.baiTapId !== row.id) return b;
        changed = true;
        return {
          ...b,
          tenBaiTap: row.tenBaiTap,
          moTa: row.moTa,
          yeuCau: row.yeuCau,
          videoYoutubeUrl: row.videoYoutubeUrl,
          thumbnailUrl: row.thumbnailUrl,
        };
      });
      return changed ? { ...prev, bai } : prev;
    });
  }

  function openCreateModule() {
    setEditingModule(null);
    setPanelOpen(true);
    setFlash(null);
  }

  function openEditModule(m: BaiTapModuleData) {
    setEditingModule(m);
    setPanelOpen(true);
    setFlash(null);
  }

  async function handleSaveModule(draft: BaiTapKhoaDraft) {
    if (!canEdit) return;
    setError(null);
    try {
      if (editingModule) {
        const res = await fetch(`${apiBai}/${editingModule.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenBaiTap: draft.tenBaiTap,
            moTa: draft.moTa,
            yeuCau: draft.yeuCau,
            videoYoutubeUrl: draft.videoYoutubeUrl,
            thumbnailUrl: draft.thumbnailUrl,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          row?: BaiTapModuleData;
          error?: string;
        } | null;
        if (!res.ok || !json?.row) {
          throw new Error(json?.error ?? "Không lưu được.");
        }
        applyModuleLocally(json.row, "update");
        setFlash("Đã cập nhật bài tập.");
      } else {
        const res = await fetch(apiBai, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenBaiTap: draft.tenBaiTap,
            moTa: draft.moTa,
            yeuCau: draft.yeuCau,
            videoYoutubeUrl: draft.videoYoutubeUrl,
            thumbnailUrl: draft.thumbnailUrl,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          row?: BaiTapModuleData;
          error?: string;
        } | null;
        if (!res.ok || !json?.row) {
          throw new Error(json?.error ?? "Không tạo được.");
        }
        applyModuleLocally(json.row, "create");
        setFlash("Đã thêm bài tập vào thư viện.");
      }
      setPanelOpen(false);
      setEditingModule(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu.");
    }
  }

  async function handleDeleteModule(m: BaiTapModuleData) {
    if (!canEdit) return;
    const forceHint =
      m.soBoDangDung > 0
        ? `\n\nBài đang dùng trong ${m.soBoDangDung} bộ — xóa sẽ gỡ khỏi tất cả bộ.`
        : "";
    const ok = window.confirm(
      `Xóa bài «${m.tenBaiTap}» khỏi thư viện?${forceHint}`,
    );
    if (!ok) return;

    setError(null);
    try {
      let res = await fetch(`${apiBai}/${m.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 409) {
        const again = window.confirm(
          `Bài đang gắn trong bộ. Xóa luôn và gỡ khỏi mọi bộ?`,
        );
        if (!again) return;
        res = await fetch(`${apiBai}/${m.id}?force=1`, {
          method: "DELETE",
          credentials: "include",
        });
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? "Không xóa được.",
        );
      }
      setModules((prev) => prev.filter((x) => x.id !== m.id));
      setBoChiTiet((prev) => {
        if (!prev) return prev;
        const bai = prev.bai.filter((b) => b.baiTapId !== m.id);
        if (bai.length === prev.bai.length) return prev;
        return { ...prev, bai, soBai: bai.length };
      });
      if (m.boIds.length > 0) {
        const removeSet = new Set(m.boIds);
        setBoList((prev) =>
          prev.map((b) =>
            removeSet.has(b.id)
              ? { ...b, soBai: Math.max(0, b.soBai - 1) }
              : b,
          ),
        );
      }
      setFlash(`Đã xóa «${m.tenBaiTap}».`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi xóa.");
    }
  }

  async function handleCreateBo() {
    if (!canEdit || !newBoTen.trim()) return;
    setError(null);
    try {
      const res = await fetch(apiBo, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenBo: newBoTen.trim() }),
      });
      const json = (await res.json().catch(() => null)) as {
        row?: BoGiaoTrinhData;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Không tạo được bộ.");
      setNewBoTen("");
      setFlash(`Đã tạo bộ «${json?.row?.tenBo}».`);
      await loadMeta();
      if (json?.row?.id) setSelectedBoId(json.row.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function handleDeleteBo(bo: BoGiaoTrinhData) {
    if (!canEdit) return;
    const warn =
      bo.khoaTenList.length > 0
        ? `\n\nKhóa đang dùng bộ này sẽ mất giáo trình: ${bo.khoaTenList.join(", ")}.`
        : "";
    if (!window.confirm(`Xóa bộ «${bo.tenBo}»?${warn}`)) return;
    try {
      const res = await fetch(`${apiBo}/${bo.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? "Không xóa được bộ.",
        );
      }
      setFlash(`Đã xóa bộ «${bo.tenBo}».`);
      await loadMeta();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function handleAddBaiToBo(moduleId: string) {
    if (!canEdit || !boChiTiet) return;
    if (assignedIds.has(moduleId)) return;
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const next: BoGiaoTrinhBaiData[] = [
      ...boChiTiet.bai,
      {
        baiTapId: mod.id,
        tenBaiTap: mod.tenBaiTap,
        moTa: mod.moTa,
        yeuCau: mod.yeuCau,
        videoYoutubeUrl: mod.videoYoutubeUrl,
        thumbnailUrl: mod.thumbnailUrl,
        thuocTinh: "bai_tap",
        thuTu: boChiTiet.bai.length + 1,
        ghiChu: null,
      },
    ];
    setPickerOpen(false);
    try {
      await persistBoBai(next);
      setFlash(`Đã gán «${mod.tenBaiTap}» vào bộ.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi gán.");
    }
  }

  async function handleChangeThuocTinh(
    baiTapId: string,
    thuocTinh: LoaiBaiGiaoTrinh,
  ) {
    if (!canEdit || !boChiTiet) return;
    const next = boChiTiet.bai.map((b) =>
      b.baiTapId === baiTapId ? { ...b, thuocTinh } : b,
    );
    try {
      await persistBoBai(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function handleRemoveBaiFromBo(baiTapId: string) {
    if (!canEdit || !boChiTiet) return;
    const next = boChiTiet.bai.filter((b) => b.baiTapId !== baiTapId);
    try {
      await persistBoBai(next);
      setFlash("Đã gỡ bài khỏi bộ.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  async function handleReorderBai(from: number, to: number) {
    if (!canEdit || !boChiTiet) return;
    if (from === to || from < 0 || to < 0 || from >= boChiTiet.bai.length || to >= boChiTiet.bai.length) {
      return;
    }
    const next = [...boChiTiet.bai];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    try {
      await persistBoBai(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    }
  }

  function clearBaiDrag() {
    setDragBaiIndex(null);
    setDropBaiIndex(null);
  }

  const selectedBo = boList.find((b) => b.id === selectedBoId) ?? null;

  return (
    <div className="cso-lh-page cso-dt-stack">
      <nav className="cso-lh-tabs" aria-label="Giáo trình và bài tập">
        <div className="cso-gt-tabs-main">
          <div className="cso-lh-trail" role="tablist">
            {GT_TABS.map(({ id, label, short }, index) => {
              const isOn = tab === id;
              const isFirst = index === 0;
              const isLast = index === GT_TABS.length - 1;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isOn}
                  className={[
                    "cso-lh-tab",
                    isFirst ? "is-first" : "",
                    isLast ? "is-last" : "",
                    isOn ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setTab(id)}
                >
                  <span className="cso-lh-tab-label">
                    <span className="cso-lh-tab-label-full">{label}</span>
                    <span className="cso-lh-tab-label-short">{short}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="cso-lh-trail-hint">
            {tab === "giao_trinh"
                ? "Lập bộ · gán bài từ thư viện"
              : "Thư viện module dùng lại trên nhiều bộ"}
          </p>
        </div>
        <button
          type="button"
          className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
          onClick={() => void loadMeta()}
          disabled={loading}
          aria-label="Tải lại"
        >
          <RefreshCw size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </nav>

      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? (
        <p className="cso-ql-error cso-lh-inline-error">{error}</p>
      ) : null}

      {/* Tab Giáo trình */}
      <div
        className="cso-lh-tab-pane"
        hidden={tab !== "giao_trinh"}
        aria-hidden={tab !== "giao_trinh"}
      >
        <section className="cso-dt-panel">
          <div className="cso-dt-panel-head">
            <div className="cso-lh-head-row">
              <div>
                <h2 className="cso-dt-panel-title">Bộ giáo trình</h2>
                <p className="cso-dt-panel-sub">
                  {boList.length} bộ · gán module và thuộc tính theo từng bộ
                </p>
              </div>
            </div>
          </div>
          <div className="cso-dt-panel-body cso-gt-bo-layout">
            <div className="cso-gt-bo-sidebar">
              {canEdit ? (
                <div className="cso-gt-bo-create">
                  <input
                    className="cso-ql-input"
                    value={newBoTen}
                    onChange={(e) => setNewBoTen(e.target.value)}
                    placeholder="Tên bộ mới…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreateBo();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
                    disabled={!newBoTen.trim()}
                    onClick={() => void handleCreateBo()}
                  >
                    <Plus size={14} aria-hidden />
                    Tạo
                  </button>
                </div>
              ) : null}
              {loading ? (
                <p className="cso-lh-hv-list-muted">Đang tải…</p>
              ) : boList.length === 0 ? (
                <div className="cso-hv-empty">
                  <strong>Chưa có bộ giáo trình</strong>
                  Tạo bộ rồi gán bài từ thư viện.
                </div>
              ) : (
                <ul className="cso-gt-bo-list">
                  {boList.map((bo) => (
                    <li key={bo.id}>
                      <button
                        type="button"
                        className={`cso-gt-bo-item${selectedBoId === bo.id ? " is-active" : ""}`}
                        onClick={() => setSelectedBoId(bo.id)}
                      >
                        <BookOpen size={14} aria-hidden />
                        <span>
                          <strong>{bo.tenBo}</strong>
                          <em>
                            {bo.soBai} bài
                            {bo.khoaTenList.length
                              ? ` · ${bo.khoaTenList.length} khóa`
                              : ""}
                          </em>
                        </span>
                      </button>
                      {canEdit ? (
                        <button
                          type="button"
                          className="cso-gt-bo-del"
                          aria-label={`Xóa bộ ${bo.tenBo}`}
                          onClick={() => void handleDeleteBo(bo)}
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="cso-gt-bo-detail">
              {!selectedBo ? (
                <p className="cso-lh-hv-list-muted">Chọn một bộ để gán bài.</p>
              ) : loadingBo ? (
                <p className="cso-lh-hv-list-muted">Đang tải…</p>
              ) : (
                <>
                  <div className="cso-gt-bo-detail-head">
                    <h3>{selectedBo.tenBo}</h3>
                    {canEdit ? (
                      <button
                        type="button"
                        className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                        onClick={() => setPickerOpen((v) => !v)}
                      >
                        <Plus size={14} aria-hidden />
                        Gán bài từ thư viện
                      </button>
                    ) : null}
                  </div>

                  {pickerOpen ? (
                    <div className="cso-gt-picker">
                      {modules.filter((m) => !assignedIds.has(m.id)).length ===
                      0 ? (
                        <p className="cso-lh-hv-list-muted">
                          Không còn bài nào để gán — sang tab Bài tập để tạo
                          thêm.
                        </p>
                      ) : (
                        <ul className="cso-gt-picker-grid">
                          {modules
                            .filter((m) => !assignedIds.has(m.id))
                            .map((m) => (
                              <li key={m.id}>
                                <button
                                  type="button"
                                  className="cso-gt-picker-card"
                                  onClick={() => void handleAddBaiToBo(m.id)}
                                >
                                  <BaiTapThumb url={m.thumbnailUrl} size={40} />
                                  <span className="cso-gt-picker-card-name">
                                    {m.tenBaiTap}
                                  </span>
                                  <Plus
                                    size={15}
                                    className="cso-gt-picker-card-add"
                                    aria-hidden
                                  />
                                </button>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                  {(boChiTiet?.bai ?? []).length === 0 ? (
                    <div className="cso-hv-empty">
                      <strong>Bộ trống</strong>
                      Gán bài từ thư viện để lập lộ trình.
                    </div>
                  ) : (
                    <ol className="cso-gt-assigned-list">
                      {(boChiTiet?.bai ?? []).map((b, i) => {
                        const isOpen = expandedBaiId === b.baiTapId;
                        return (
                          <li
                            key={b.baiTapId}
                            className={[
                              "cso-gt-assigned-row",
                              dragBaiIndex === i ? "is-dragging" : "",
                              dropBaiIndex === i && dragBaiIndex !== i
                                ? "is-drop-target"
                                : "",
                              isOpen ? "is-open" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onDragOver={(e) => {
                              if (!canEdit || dragBaiIndex === null) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              setDropBaiIndex(i);
                            }}
                            onDragEnter={(e) => {
                              if (!canEdit || dragBaiIndex === null) return;
                              e.preventDefault();
                              setDropBaiIndex(i);
                            }}
                            onDragLeave={(e) => {
                              if (
                                e.currentTarget.contains(
                                  e.relatedTarget as Node,
                                )
                              ) {
                                return;
                              }
                              setDropBaiIndex((prev) =>
                                prev === i ? null : prev,
                              );
                            }}
                            onDrop={(e) => {
                              if (!canEdit) return;
                              e.preventDefault();
                              const from =
                                dragBaiIndex ??
                                Number.parseInt(
                                  e.dataTransfer.getData("text/plain"),
                                  10,
                                );
                              if (!Number.isNaN(from)) {
                                void handleReorderBai(from, i);
                              }
                              clearBaiDrag();
                            }}
                          >
                            <div className="cso-gt-assigned-main">
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="cso-gt-drag-handle"
                                  draggable
                                  title="Kéo để đổi thứ tự"
                                  aria-label={`Kéo đổi thứ tự ${b.tenBaiTap}`}
                                  aria-grabbed={dragBaiIndex === i}
                                  onDragStart={(e) => {
                                    setDragBaiIndex(i);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      String(i),
                                    );
                                  }}
                                  onDragEnd={clearBaiDrag}
                                >
                                  <GripVertical size={15} aria-hidden />
                                </button>
                              ) : null}
                              <span className="cso-gt-assigned-num">
                                Bài {i + 1}
                              </span>
                              <BaiTapThumb url={b.thumbnailUrl} size={44} />
                              <span className="cso-gt-assigned-name">
                                {b.tenBaiTap}
                                {b.videoYoutubeUrl ? (
                                  <span
                                    className="cso-gt-assigned-yt"
                                    role="img"
                                    aria-label="Có video"
                                  >
                                    <MsIcon name="smart_display" />
                                  </span>
                                ) : null}
                              </span>
                              <div className="cso-gt-assigned-ctrls">
                                {canEdit ? (
                                  <select
                                    className="cso-ql-select cso-gt-assigned-select"
                                    value={b.thuocTinh}
                                    aria-label={`Thuộc tính ${b.tenBaiTap}`}
                                    onChange={(e) =>
                                      void handleChangeThuocTinh(
                                        b.baiTapId,
                                        e.target.value as LoaiBaiGiaoTrinh,
                                      )
                                    }
                                  >
                                    {LOAI_BAI_GIAO_TRINH_ORDER.map((v) => (
                                      <option key={v} value={v}>
                                        {LOAI_BAI_GIAO_TRINH_LABEL[v]}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="cso-khd-bt-card-loai">
                                    {LOAI_BAI_GIAO_TRINH_LABEL[b.thuocTinh]}
                                  </span>
                                )}
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="cso-gt-icon-btn"
                                    aria-label={`Sửa ${b.tenBaiTap}`}
                                    title="Sửa bài tập"
                                    onClick={() => {
                                      const fromLib = modules.find(
                                        (m) => m.id === b.baiTapId,
                                      );
                                      openEditModule(
                                        fromLib ?? {
                                          id: b.baiTapId,
                                          tenBaiTap: b.tenBaiTap,
                                          moTa: b.moTa,
                                          yeuCau: b.yeuCau,
                                          videoYoutubeUrl: b.videoYoutubeUrl,
                                          thumbnailUrl: b.thumbnailUrl,
                                          soBoDangDung: 0,
                                          boIds: [],
                                          capNhatLuc: "",
                                        },
                                      );
                                    }}
                                  >
                                    <Pencil size={14} aria-hidden />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className={`cso-gt-icon-btn${isOpen ? " is-open" : ""}`}
                                  aria-expanded={isOpen}
                                  aria-label={
                                    isOpen
                                      ? `Thu gọn ${b.tenBaiTap}`
                                      : `Xem chi tiết ${b.tenBaiTap}`
                                  }
                                  onClick={() =>
                                    setExpandedBaiId((prev) =>
                                      prev === b.baiTapId ? null : b.baiTapId,
                                    )
                                  }
                                >
                                  <ChevronDown size={15} aria-hidden />
                                </button>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="cso-gt-icon-btn cso-gt-icon-btn--danger"
                                    aria-label={`Gỡ ${b.tenBaiTap}`}
                                    onClick={() =>
                                      void handleRemoveBaiFromBo(b.baiTapId)
                                    }
                                  >
                                    <X size={15} aria-hidden />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {isOpen ? (
                              <div className="cso-gt-assigned-detail">
                                {b.moTa ? (
                                  <p>
                                    <strong>Nội dung</strong>
                                    {b.moTa}
                                  </p>
                                ) : null}
                                {b.yeuCau ? (
                                  <p>
                                    <strong>Yêu cầu</strong>
                                    {b.yeuCau}
                                  </p>
                                ) : null}
                                {b.videoYoutubeUrl ? (
                                  <p>
                                    <strong>Video</strong>
                                    <a
                                      href={b.videoYoutubeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="cso-ql-link"
                                    >
                                      {b.videoYoutubeUrl}
                                    </a>
                                  </p>
                                ) : null}
                                {!b.moTa && !b.yeuCau && !b.videoYoutubeUrl ? (
                                  <p className="cso-lh-hv-list-muted">
                                    Chưa có mô tả, yêu cầu hay video.
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Tab Bài tập */}
      <div
        className="cso-lh-tab-pane"
        hidden={tab !== "bai_tap"}
        aria-hidden={tab !== "bai_tap"}
      >
        <section className="cso-dt-panel">
          <div className="cso-dt-panel-head">
            <div className="cso-lh-head-row">
              <div>
                <h2 className="cso-dt-panel-title">Thư viện bài tập</h2>
                <p className="cso-dt-panel-sub">
                  {modules.length} bài · dùng lại trên nhiều bộ giáo trình
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className="cso-ql-btn cso-ql-btn--primary cso-ql-btn--sm"
                  onClick={openCreateModule}
                >
                  <Plus size={15} aria-hidden />
                  Thêm bài tập
                </button>
              ) : null}
            </div>
          </div>
          <div className="cso-dt-panel-body">
            <div className="cso-gt-module-toolbar">
              <label className="cso-gt-filter-label">
                <span className="sr-only">Tìm bài</span>
                <input
                  className="cso-ql-input cso-gt-search"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Tìm theo tên, nội dung…"
                />
              </label>
              <label className="cso-gt-filter-label">
                <span className="sr-only">Lọc theo giáo trình</span>
                <select
                  className="cso-ql-select cso-gt-bo-filter"
                  value={moduleBoFilter}
                  onChange={(e) => setModuleBoFilter(e.target.value)}
                >
                  <option value="">Tất cả giáo trình</option>
                  <option value="__chua_gan__">Chưa gán bộ</option>
                  {boList.map((bo) => (
                    <option key={bo.id} value={bo.id}>
                      {bo.tenBo}
                      {bo.soBai > 0 ? ` (${bo.soBai})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {loading ? (
              <p className="cso-lh-hv-list-muted">Đang tải…</p>
            ) : filteredModules.length === 0 ? (
              <div className="cso-hv-empty">
                <strong>Chưa có bài tập</strong>
                Tạo bài trong thư viện, rồi sang tab Giáo trình để gán vào bộ.
              </div>
            ) : (
              <ul className="cso-gt-module-grid">
                {filteredModules.map((m) => (
                  <li key={m.id} className="cso-gt-module-card">
                    <div className="cso-gt-module-card-thumb">
                      <BaiTapThumb url={m.thumbnailUrl} size={120} />
                    </div>
                    <div className="cso-gt-module-card-body">
                      <strong className="cso-gt-module-card-name">
                        {m.tenBaiTap}
                      </strong>
                      <span className="cso-gt-module-meta">
                        {m.boIds.length === 0
                          ? "Chưa gán bộ"
                          : boList
                              .filter((b) => m.boIds.includes(b.id))
                              .map((b) => b.tenBo)
                              .join(" · ") ||
                            `Đang dùng ở ${m.soBoDangDung} bộ`}
                      </span>
                      {m.moTa ? (
                        <p className="cso-gt-module-field">
                          <strong>Nội dung</strong>
                          <span>{m.moTa}</span>
                        </p>
                      ) : null}
                      {m.yeuCau ? (
                        <p className="cso-gt-module-field">
                          <strong>Yêu cầu</strong>
                          <span>{m.yeuCau}</span>
                        </p>
                      ) : null}
                      {m.videoYoutubeUrl ? (
                        <p className="cso-gt-module-field cso-gt-module-field--video">
                          <strong>Video giáo trình</strong>
                          <a
                            href={m.videoYoutubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cso-ql-link"
                          >
                            <MsIcon name="smart_display" />
                            Xem trên YouTube
                          </a>
                        </p>
                      ) : null}
                      {!m.moTa && !m.yeuCau && !m.videoYoutubeUrl ? (
                        <p className="cso-gt-module-empty">
                          Chưa có nội dung, yêu cầu hay video.
                        </p>
                      ) : null}
                      {canEdit ? (
                        <div className="cso-gt-module-actions">
                          <button
                            type="button"
                            className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                            onClick={() => openEditModule(m)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="cso-gt-icon-btn cso-gt-icon-btn--danger"
                            onClick={() => void handleDeleteModule(m)}
                            aria-label={`Xóa ${m.tenBaiTap}`}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <GiaoTrinhBaiTapPanel
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setEditingModule(null);
        }}
        tenKhoaHoc="Thư viện bài tập"
        editItem={editingModule ? moduleToEditItem(editingModule) : null}
        onSave={(draft) => {
          void handleSaveModule(draft);
        }}
      />
    </div>
  );
}
