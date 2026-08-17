"use client";

import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  ExternalLink,
  FolderTree,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminSlideOver } from "@/components/admin/AdminSlideOver";
import type { AdminShopDanhMucRow } from "@/lib/admin/shop-danh-muc-server";
import { formatRelativeTimeVi } from "@/lib/articles/format";
import { getNameInitials } from "@/lib/journey/profile";
import {
  hangChoHanhDongLabel,
  parseTenNhomMoi,
  tomTatHangChoDeXuat,
  type HangChoDeXuatTomTat,
} from "@/lib/shop/danh-muc-yeu-cau-text";

type HangChoAlias = {
  tuKhoa: string;
  idDanhMuc: string;
  tenDanhMuc: string;
  soShop: number;
  soNhom: number;
};

type HangChoYeuCau = {
  id: string;
  idNhom: string;
  nhanNhom: string | null;
  tuKhoaChuan: string;
  moTa: string;
  idDanhMucGanNhat: string | null;
  tenDanhMucGanNhat: string | null;
  ganNhatLaCha?: boolean;
  soShopCungCum: number;
  taoLuc?: string;
  nguoiDeXuat?: {
    ten: string;
    slug: string;
    avatarUrl: string | null;
  } | null;
  hangHref?: string | null;
  nhomAnhUrl?: string | null;
  soMau?: number;
  mau?: Array<{ id: string; ten: string; anhUrl: string | null }>;
};

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "reviewFromQueue"; yeuCau: HangChoYeuCau }
  | { mode: "createFromQueue"; yeuCau: HangChoYeuCau }
  | { mode: "mergeFromQueue"; yeuCau: HangChoYeuCau }
  | { mode: "edit"; row: AdminShopDanhMucRow };

type FormState = {
  ten: string;
  slug: string;
  moTa: string;
  thuTu: string;
  trangThai: "hien" | "an";
  idCha: string;
  aliasTuKhoa: string;
  chaTen: string;
  chaSlug: string;
  chaMoTa: string;
};

const NEW_CAP_CHA = "__new__";

function emptyForm(): FormState {
  return {
    ten: "",
    slug: "",
    moTa: "",
    thuTu: "100",
    trangThai: "hien",
    idCha: "",
    aliasTuKhoa: "",
    chaTen: "",
    chaSlug: "",
    chaMoTa: "",
  };
}

function formFromRow(row: AdminShopDanhMucRow): FormState {
  return {
    ten: row.ten,
    slug: row.slug,
    moTa: row.moTa ?? "",
    thuTu: String(row.thuTu),
    trangThai: row.trangThai,
    idCha: row.idCha ?? "",
    aliasTuKhoa: "",
    chaTen: "",
    chaSlug: "",
    chaMoTa: "",
  };
}

function cayGoiYHangCho(
  y: HangChoYeuCau,
  catalog: AdminShopDanhMucRow[],
): {
  tomTat: HangChoDeXuatTomTat;
  cha: AdminShopDanhMucRow | null;
  laGan: AdminShopDanhMucRow | null;
  anhEm: AdminShopDanhMucRow[];
} {
  const raw = tomTatHangChoDeXuat(y);
  const gan = y.idDanhMucGanNhat
    ? (catalog.find((r) => r.id === y.idDanhMucGanNhat) ?? null)
    : null;
  const laGan = y.ganNhatLaCha ? null : gan;
  const cha = raw.taoChaMoi
    ? null
    : y.ganNhatLaCha
      ? gan
      : gan?.idCha
        ? (catalog.find((r) => r.id === gan.idCha) ?? null)
        : null;
  const anhEm = cha
    ? catalog
        .filter(
          (r) =>
            r.idCha === cha.id && r.trangThai === "hien" && r.slug !== "khac",
        )
        .sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"))
    : [];
  return {
    tomTat: {
      ...raw,
      tenCha: raw.tenCha ?? cha?.ten ?? null,
      tenLaGan: raw.tenLaGan ?? laGan?.ten ?? null,
    },
    cha,
    laGan,
    anhEm,
  };
}

function formFromYeuCau(
  y: HangChoYeuCau,
  catalog: AdminShopDanhMucRow[],
): FormState {
  const tenNhomMoi = parseTenNhomMoi(y.moTa);
  const gan = catalog.find((r) => r.id === y.idDanhMucGanNhat);
  const ganLaCha =
    y.ganNhatLaCha ||
    Boolean(gan && catalog.some((r) => r.idCha === gan.id));
  return {
    ten: (y.tuKhoaChuan || y.nhanNhom || "").slice(0, 80),
    slug: "",
    moTa: y.moTa,
    thuTu: "100",
    trangThai: "hien",
    idCha: tenNhomMoi
      ? NEW_CAP_CHA
      : ganLaCha
        ? (gan?.id ?? "")
        : (gan?.idCha ?? ""),
    aliasTuKhoa: y.tuKhoaChuan,
    chaTen: tenNhomMoi ?? "",
    chaSlug: "",
    chaMoTa: "",
  };
}

type Props = {
  initialRows: AdminShopDanhMucRow[];
};

export function AdminShopDanhMucScreen({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [q, setQ] = useState("");
  const [filterTt, setFilterTt] = useState<"all" | "la" | "cha" | "an">("all");
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aliasCho, setAliasCho] = useState<HangChoAlias[]>([]);
  const [yeuCauCho, setYeuCauCho] = useState<HangChoYeuCau[]>([]);
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminShopDanhMucRow | null>(
    null,
  );

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (panel.mode === "create") setForm(emptyForm());
    if (panel.mode === "createFromQueue") {
      setForm(formFromYeuCau(panel.yeuCau, rows));
    }
    if (panel.mode === "mergeFromQueue") {
      setForm({
        ...emptyForm(),
        aliasTuKhoa: panel.yeuCau.tuKhoaChuan,
      });
      setMergeQuery("");
      setMergeTargetId(
        panel.yeuCau.ganNhatLaCha
          ? ""
          : (panel.yeuCau.idDanhMucGanNhat ?? ""),
      );
    }
    if (panel.mode === "edit") setForm(formFromRow(panel.row));
    setErr(null);
    setDeleteTarget(null);
  }, [panel]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteTarget, busy]);

  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.idCha) ids.add(r.idCha);
    }
    return ids;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const isCha = parentIds.has(r.id);
      if (filterTt === "la" && (isCha || r.trangThai === "an")) return false;
      if (filterTt === "cha" && (!isCha || r.trangThai === "an")) return false;
      if (filterTt === "an" && r.trangThai !== "an") return false;
      if (!needle) return true;
      const hay = [r.ten, r.slug, r.moTa ?? ""].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, filterTt, parentIds]);

  const hangChoCount = aliasCho.length + yeuCauCho.length;

  const parentRows = useMemo(
    () => rows.filter((r) => parentIds.has(r.id) && r.trangThai === "hien"),
    [rows, parentIds],
  );

  const leafRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.trangThai === "hien" && r.slug !== "khac" && !parentIds.has(r.id),
      ),
    [rows, parentIds],
  );

  const mergeOptions = useMemo(() => {
    const needle = mergeQuery.trim().toLowerCase();
    return leafRows.filter((r) => {
      if (!needle) return true;
      return [r.ten, r.slug, r.moTa ?? ""].join(" ").toLowerCase().includes(needle);
    });
  }, [leafRows, mergeQuery]);

  const mergeGroups = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const grouped = new Map<
      string,
      { parent: AdminShopDanhMucRow | null; leaves: AdminShopDanhMucRow[] }
    >();
    for (const leaf of mergeOptions) {
      const key = leaf.idCha ?? "";
      const current = grouped.get(key) ?? {
        parent: leaf.idCha ? (byId.get(leaf.idCha) ?? null) : null,
        leaves: [],
      };
      current.leaves.push(leaf);
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => {
      const at = a.parent?.thuTu ?? 999;
      const bt = b.parent?.thuTu ?? 999;
      return (
        at - bt ||
        (a.parent?.ten ?? "я").localeCompare(b.parent?.ten ?? "я", "vi")
      );
    });
  }, [mergeOptions, rows]);

  const catalogCounts = useMemo(() => {
    let la = 0;
    let cha = 0;
    let an = 0;
    for (const row of rows) {
      if (row.trangThai === "an") {
        an += 1;
        continue;
      }
      if (parentIds.has(row.id)) cha += 1;
      else la += 1;
    }
    return { all: rows.length, la, cha, an };
  }, [rows, parentIds]);

  const catalogGroups = useMemo(() => {
    const filteredIds = new Set(filtered.map((r) => r.id));
    const parents = rows
      .filter((r) => parentIds.has(r.id))
      .sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));

    const groups: Array<{
      parent: AdminShopDanhMucRow | null;
      leaves: AdminShopDanhMucRow[];
    }> = [];

    for (const parent of parents) {
      const leaves = filtered
        .filter((r) => r.idCha === parent.id)
        .sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
      const showParent = filterTt !== "la" && filteredIds.has(parent.id);
      if (leaves.length === 0 && !showParent) continue;
      groups.push({ parent, leaves });
    }

    const orphans = filtered
      .filter((r) => !r.idCha && !parentIds.has(r.id))
      .sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"));
    if (orphans.length > 0) {
      groups.push({ parent: null, leaves: orphans });
    }

    return groups;
  }, [filtered, filterTt, parentIds, rows]);

  const refreshHangCho = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho");
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        alias?: HangChoAlias[];
        yeuCau?: HangChoYeuCau[];
        error?: string;
      } | null;
      if (res.ok && json?.ok) {
        setAliasCho(json.alias ?? []);
        setYeuCauCho(json.yeuCau ?? []);
        return;
      }
      setErr(json?.error ?? "Không tải được hàng chờ danh mục.");
    } catch {
      setErr("Không tải được hàng chờ danh mục.");
    }
  }, []);

  useEffect(() => {
    void refreshHangCho();
  }, [refreshHangCho]);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc?nganhHang=merch");
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        rows?: AdminShopDanhMucRow[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.rows) {
        setErr(json?.error ?? "Không tải lại được danh mục.");
        return;
      }
      setRows(json.rows);
    } catch {
      setErr("Không tải lại được danh mục.");
    }
  }, []);

  async function createCapChaIfNeeded(): Promise<string | null> {
    const selected = form.idCha.trim();
    if (selected !== NEW_CAP_CHA) return selected || null;
    const tenCha = form.chaTen.trim();
    if (!tenCha) throw new Error("Nhập tên cấp cha mới.");
    const res = await fetch("/api/admin/shop/danh-muc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ten: tenCha,
        slug: form.chaSlug.trim() || undefined,
        moTa:
          form.chaMoTa.trim() ||
          `Cấp cha — không gắn loại hàng. Gom ${form.ten.trim() || "danh mục con"}.`,
        thuTu: 50,
        nganhHang: "merch",
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      row?: AdminShopDanhMucRow;
      error?: string;
    } | null;
    if (!res.ok || !json?.ok || !json.row) {
      throw new Error(json?.error ?? "Không tạo được cấp cha.");
    }
    setRows((prev) =>
      [...prev.filter((r) => r.id !== json.row!.id), json.row!].sort(
        (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
      ),
    );
    return json.row.id;
  }

  async function onSave() {
    setBusy(true);
    setErr(null);
    const thuTu = Number.parseInt(form.thuTu, 10);

    try {
      const skipCha =
        panel.mode === "edit" && parentIds.has(panel.row.id);
      const idCha = skipCha ? undefined : await createCapChaIfNeeded();
      const payload = {
        ten: form.ten,
        slug: form.slug.trim() || undefined,
        moTa: form.moTa.trim() || null,
        thuTu: Number.isFinite(thuTu) ? thuTu : 100,
        trangThai: form.trangThai,
        ...(idCha !== undefined ? { idCha } : {}),
      };
      if (panel.mode === "create") {
        const res = await fetch("/api/admin/shop/danh-muc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, nganhHang: "merch" }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          row?: AdminShopDanhMucRow;
          error?: string;
        } | null;
        if (!res.ok || !json?.ok || !json.row) {
          setErr(json?.error ?? "Không tạo được.");
          return;
        }
        setRows((prev) =>
          [...prev, json.row!].sort(
            (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
          ),
        );
        setPanel({ mode: "closed" });
        return;
      }

      if (panel.mode === "edit") {
        const res = await fetch(
          `/api/admin/shop/danh-muc/${encodeURIComponent(panel.row.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          row?: AdminShopDanhMucRow;
          error?: string;
        } | null;
        if (!res.ok || !json?.ok || !json.row) {
          setErr(json?.error ?? "Không lưu được.");
          return;
        }
        setRows((prev) =>
          prev
            .map((r) => (r.id === json.row!.id ? json.row! : r))
            .sort(
              (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
            ),
        );
        setPanel({ mode: "closed" });
      }
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  function onAskDelete(row: AdminShopDanhMucRow) {
    if (parentIds.has(row.id)) {
      setErr("Còn lá con — chuyển hoặc xóa lá trước.");
      return;
    }
    setErr(null);
    setDeleteTarget(row);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/shop/danh-muc/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không xóa được.");
        setDeleteTarget(null);
        return;
      }
      const deletedId = deleteTarget.id;
      setRows((prev) => prev.filter((r) => r.id !== deletedId));
      setDeleteTarget(null);
      if (panel.mode === "edit" && panel.row.id === deletedId) {
        setPanel({ mode: "closed" });
      }
    } catch {
      setErr("Lỗi mạng — thử lại.");
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateFromQueue() {
    if (panel.mode !== "createFromQueue") return;
    setBusy(true);
    setErr(null);
    const thuTu = Number.parseInt(form.thuTu, 10);
    try {
      const idCha = await createCapChaIfNeeded();
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tao-danh-muc",
          id: panel.yeuCau.id,
          ten: form.ten,
          slug: form.slug.trim() || undefined,
          moTa: form.moTa.trim() || null,
          idCha,
          thuTu: Number.isFinite(thuTu) ? thuTu : 100,
          aliasTuKhoa: form.aliasTuKhoa.trim() || form.ten,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        row?: AdminShopDanhMucRow;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không tạo được danh mục.");
        return;
      }
      if (json.row) {
        setRows((prev) =>
          [...prev.filter((r) => r.id !== json.row!.id), json.row!].sort(
            (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
          ),
        );
      }
      setPanel({ mode: "closed" });
      await refreshHangCho();
      await refresh();
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function onMergeFromQueue() {
    if (panel.mode !== "mergeFromQueue" || !mergeTargetId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gop-vao",
          id: panel.yeuCau.id,
          idDanhMuc: mergeTargetId,
          aliasTuKhoa: form.aliasTuKhoa.trim() || panel.yeuCau.tuKhoaChuan,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không gộp được vào danh mục.");
        return;
      }
      setPanel({ mode: "closed" });
      await refreshHangCho();
      await refresh();
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAn(row: AdminShopDanhMucRow) {
    const next = row.trangThai === "hien" ? "an" : "hien";
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/shop/danh-muc/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trangThai: next }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        row?: AdminShopDanhMucRow;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.row) {
        setErr(json?.error ?? "Không đổi trạng thái.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === json.row!.id ? json.row! : r)),
      );
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function promoteAlias(row: HangChoAlias) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote-alias",
          tuKhoa: row.tuKhoa,
          idDanhMuc: row.idDanhMuc,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không promote được alias.");
        return;
      }
      await refreshHangCho();
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function xuLyYeuCau(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/shop/danh-muc/hang-cho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "xu-ly-yeu-cau",
          id,
          trangThai: "tu_choi",
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setErr(json?.error ?? "Không từ chối được yêu cầu.");
        return;
      }
      await refreshHangCho();
      setPanel({ mode: "closed" });
    } catch {
      setErr("Lỗi mạng — thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">
          Danh mục hàng
          {hangChoCount > 0 ? (
            <span
              className="admin-pending-pill"
              aria-label={`${hangChoCount} mục chờ duyệt`}
            >
              {hangChoCount} chờ duyệt
            </span>
          ) : null}
        </h1>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              void refresh();
              void refreshHangCho();
            }}
          >
            <RefreshCw size={15} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPanel({ mode: "create" })}
          >
            + Thêm danh mục
          </button>
        </div>
      </header>

      <div className="page-body dm-admin-body">
        {err ? (
          <p className="dm-admin-msg" role="alert">
            {err}
          </p>
        ) : null}

        <div className="dm-admin-stats" aria-label="Tổng quan danh mục">
          <div className="dm-admin-stat dm-admin-stat--pending">
            <strong>{hangChoCount}</strong>
            <span>Chờ duyệt</span>
          </div>
          <div className="dm-admin-stat">
            <strong>{catalogCounts.la}</strong>
            <span>Lá · chính</span>
          </div>
          <div className="dm-admin-stat">
            <strong>{catalogCounts.cha}</strong>
            <span>Cấp cha · phụ</span>
          </div>
          <div className="dm-admin-stat">
            <strong>{catalogCounts.an}</strong>
            <span>Đã ẩn</span>
          </div>
        </div>

        <section
          className="dm-admin-panel dm-admin-panel--queue"
          aria-labelledby="dm-queue-title"
        >
          <div className="dm-admin-panel-head">
            <div>
              <h2 id="dm-queue-title">
                <span className="dm-admin-panel-icon" aria-hidden>
                  <Clock3 size={16} />
                </span>
                Chờ duyệt
                <span
                  className={`dm-admin-panel-badge${hangChoCount === 0 ? " is-zero" : ""}`}
                >
                  {hangChoCount} mục
                </span>
              </h2>
              <p>
                Alias tự học khi ≥3 shop cùng map — promote một nút. Yêu cầu thiếu:
                admin tạo mục mới hoặc gộp vào mục có sẵn (remap loại trong cụm).
              </p>
            </div>
          </div>

          <div className="dm-admin-queue-grid">
            <div className="dm-admin-queue-col">
              <div className="dm-admin-queue-col-head">
                <h3>Alias tự học</h3>
                <span
                  className={`dm-admin-queue-col-count${aliasCho.length > 0 ? " is-hot" : ""}`}
                >
                  {aliasCho.length}
                </span>
              </div>
              {aliasCho.length > 0 ? (
                <ul className="dm-admin-queue-list">
                  {aliasCho.map((a) => (
                    <li key={`${a.tuKhoa}-${a.idDanhMuc}`}>
                      <article className="dm-admin-queue-card">
                        <div className="dm-admin-queue-card-main">
                          <p className="dm-admin-queue-card-title">
                            <code>{a.tuKhoa}</code>
                            <ArrowRight
                              size={14}
                              className="dm-admin-queue-card-arrow"
                              aria-hidden
                            />
                            <strong>{a.tenDanhMuc}</strong>
                          </p>
                          <div className="dm-admin-queue-card-meta">
                            <span>
                              <strong>{a.soShop}</strong> shop
                            </span>
                            <span>
                              <strong>{a.soNhom}</strong> loại gắn
                            </span>
                          </div>
                        </div>
                        <div className="dm-admin-queue-card-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void promoteAlias(a)}
                          >
                            Thành alias
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dm-admin-queue-empty">
                  <strong>Chưa có alias chờ</strong>
                  <span>Từ khóa đủ 3 shop sẽ hiện ở đây.</span>
                </div>
              )}
            </div>

            <div className="dm-admin-queue-col">
              <div className="dm-admin-queue-col-head">
                <h3>Yêu cầu thiếu</h3>
                <span
                  className={`dm-admin-queue-col-count${yeuCauCho.length > 0 ? " is-hot" : ""}`}
                >
                  {yeuCauCho.length}
                </span>
              </div>
              {yeuCauCho.length > 0 ? (
                <ul className="dm-admin-queue-list">
                  {yeuCauCho.map((y) => {
                    const cay = cayGoiYHangCho(y, rows);
                    const deXuat = cay.tomTat;
                    const nguoi = y.nguoiDeXuat ?? null;
                    const thumbs = (y.mau ?? []).slice(0, 4);
                    return (
                    <li key={y.id}>
                      <article className="dm-admin-queue-card">
                        <div className="dm-admin-queue-card-main">
                          <p className="dm-admin-tree-kicker">
                            {hangChoHanhDongLabel(deXuat.hanhDong)}
                            {y.taoLuc
                              ? ` · ${formatRelativeTimeVi(y.taoLuc)}`
                              : ""}
                          </p>
                          <p className="dm-admin-queue-card-title">
                            <strong>{deXuat.tenLa}</strong>
                          </p>
                          <p className="dm-admin-queue-tree-line">
                            {deXuat.taoChaMoi
                              ? `Nhóm mới «${deXuat.tenCha}»`
                              : (deXuat.tenCha ?? "Chưa rõ nhóm")}
                            <ArrowRight
                              size={14}
                              className="dm-admin-queue-card-arrow"
                              aria-hidden
                            />
                            <em>{deXuat.tenLa}</em>
                          </p>
                          {thumbs.length > 0 ? (
                            <ul className="dm-admin-queue-thumbs">
                              {thumbs.map((m) => (
                                <li key={m.id}>
                                  {m.anhUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.anhUrl} alt="" />
                                  ) : (
                                    <span aria-hidden />
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="dm-admin-queue-card-meta">
                            {y.nhanNhom ? (
                              <span>
                                Loại hàng: <strong>{y.nhanNhom}</strong>
                              </span>
                            ) : null}
                            {typeof y.soMau === "number" && y.soMau > 0 ? (
                              <span>
                                <strong>{y.soMau}</strong> mẫu
                              </span>
                            ) : null}
                            <span>
                              <strong>{y.soShopCungCum}</strong> shop cùng cụm
                            </span>
                          </div>
                          {nguoi ? (
                            <p className="dm-admin-queue-who">
                              {nguoi.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={nguoi.avatarUrl} alt="" />
                              ) : (
                                <span aria-hidden>
                                  {getNameInitials(nguoi.ten, nguoi.slug)}
                                </span>
                              )}
                              {nguoi.slug ? (
                                <Link href={`/${nguoi.slug}`}>{nguoi.ten}</Link>
                              ) : (
                                <span>{nguoi.ten}</span>
                              )}
                            </p>
                          ) : null}
                        </div>
                        <div className="dm-admin-queue-card-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() =>
                              setPanel({ mode: "reviewFromQueue", yeuCau: y })
                            }
                          >
                            Xem kỹ
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() =>
                              setPanel({ mode: "createFromQueue", yeuCau: y })
                            }
                          >
                            Tạo mục
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() =>
                              setPanel({ mode: "mergeFromQueue", yeuCau: y })
                            }
                          >
                            Gộp vào…
                          </button>
                        </div>
                      </article>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="dm-admin-queue-empty">
                  <strong>Chưa có yêu cầu</strong>
                  <span>Seller báo thiếu danh mục sẽ hiện ở đây.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          className="dm-admin-panel dm-admin-table-panel"
          aria-labelledby="dm-catalog-title"
        >
          <div className="dm-admin-panel-head">
            <div>
              <h2 id="dm-catalog-title">
                <span className="dm-admin-panel-icon" aria-hidden>
                  <FolderTree size={16} />
                </span>
                Danh mục canonical
              </h2>
              <p>
                Hai lớp: <strong>lá</strong> là danh mục chính (Kho + chip hub).{" "}
                <strong>Cấp cha</strong> chỉ gom nhóm — không gắn loại, không lên
                filter.
              </p>
            </div>
          </div>

          <div className="dm-admin-toolbar">
            <label className="dm-admin-search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                placeholder="Tìm tên, slug, mô tả…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <div
              className="dm-admin-filters"
              role="tablist"
              aria-label="Lọc trạng thái danh mục"
            >
              {(
                [
                  ["all", "Tất cả", catalogCounts.all],
                  ["la", "Lá · chính", catalogCounts.la],
                  ["cha", "Cấp cha · phụ", catalogCounts.cha],
                  ["an", "Đã ẩn", catalogCounts.an],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filterTt === value}
                  className={`dm-admin-filter${filterTt === value ? " is-active" : ""}`}
                  onClick={() => setFilterTt(value)}
                >
                  {label}
                  <span className="dm-admin-filter-count">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {catalogGroups.length === 0 ? (
            <p className="dm-admin-queue-empty">
              <strong>
                {q.trim() || filterTt !== "all"
                  ? "Không có danh mục khớp bộ lọc."
                  : "Không có danh mục."}
              </strong>
            </p>
          ) : (
            <div className="dm-admin-tree">
              {catalogGroups.map((group) => {
                const parent = group.parent;
                return (
                  <section
                    key={parent?.id ?? "orphans"}
                    className="dm-admin-tree-group"
                  >
                    <header className="dm-admin-tree-parent">
                      <div>
                        <p className="dm-admin-tree-kicker">Cấp cha · phụ</p>
                        <h3>
                          {parent ? parent.ten : "Không nhóm"}
                          {parent ? (
                            <code>{parent.slug}</code>
                          ) : (
                            <code>combo / khac</code>
                          )}
                        </h3>
                      </div>
                      {parent ? (
                        <div className="dm-admin-tree-parent-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() =>
                              setPanel({ mode: "edit", row: parent })
                            }
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => void toggleAn(parent)}
                          >
                            {parent.trangThai === "hien" ? "Ẩn" : "Hiện lại"}
                          </button>
                        </div>
                      ) : null}
                    </header>

                    {group.leaves.length > 0 ? (
                      <ul className="dm-admin-tree-leaves">
                        {group.leaves.map((r) => {
                          const isKhac = r.slug === "khac";
                          return (
                            <li
                              key={r.id}
                              className={`dm-admin-leaf${r.trangThai === "an" ? " is-hidden" : ""}${isKhac ? " is-fallback" : ""}`}
                            >
                              <div className="dm-admin-leaf-main">
                                <div className="dm-admin-leaf-title">
                                  <strong>{r.ten}</strong>
                                  <span
                                    className={`dm-admin-leaf-badge${isKhac ? " is-fallback" : ""}`}
                                  >
                                    {isKhac ? "Dự phòng" : "Chính"}
                                  </span>
                                  {r.trangThai === "an" ? (
                                    <span className="badge badge-an">Ẩn</span>
                                  ) : null}
                                </div>
                                {r.moTa ? (
                                  <p className="dm-admin-leaf-desc">{r.moTa}</p>
                                ) : null}
                                <div className="dm-admin-leaf-meta">
                                  <code>{r.slug}</code>
                                  <span>{r.soNhom} loại gắn</span>
                                </div>
                              </div>
                              <div className="dm-admin-leaf-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  disabled={busy}
                                  onClick={() =>
                                    setPanel({ mode: "edit", row: r })
                                  }
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  disabled={busy}
                                  onClick={() => onAskDelete(r)}
                                >
                                  Xóa
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  disabled={busy || isKhac}
                                  title={
                                    isKhac
                                      ? "Không ẩn mục dự phòng «Khác»"
                                      : undefined
                                  }
                                  onClick={() => void toggleAn(r)}
                                >
                                  {r.trangThai === "hien" ? "Ẩn" : "Hiện lại"}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : filterTt === "cha" ? null : (
                      <p className="dm-admin-tree-empty">
                        Không có lá trong nhóm này.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AdminSlideOver
        open={panel.mode !== "closed"}
        wide={
          panel.mode === "mergeFromQueue" || panel.mode === "reviewFromQueue"
        }
        title={
          panel.mode === "create"
            ? "Thêm danh mục"
            : panel.mode === "reviewFromQueue"
              ? "Duyệt đề xuất danh mục"
              : panel.mode === "createFromQueue"
                ? "Tạo danh mục từ yêu cầu"
                : panel.mode === "mergeFromQueue"
                  ? "Gộp vào danh mục lá"
                  : "Sửa danh mục"
        }
        onClose={() =>
          !busy && !deleteTarget && setPanel({ mode: "closed" })
        }
        footer={
          <>
            {panel.mode === "edit" ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy}
                onClick={() => onAskDelete(panel.row)}
              >
                Xóa
              </button>
            ) : panel.mode === "reviewFromQueue" ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy}
                onClick={() => void xuLyYeuCau(panel.yeuCau.id)}
              >
                Từ chối
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setPanel({ mode: "closed" })}
            >
              {panel.mode === "reviewFromQueue" ? "Đóng" : "Hủy"}
            </button>
            {panel.mode === "mergeFromQueue" ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() =>
                    setPanel({
                      mode: "createFromQueue",
                      yeuCau: panel.yeuCau,
                    })
                  }
                >
                  Tạo mục mới
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !mergeTargetId}
                  onClick={() => void onMergeFromQueue()}
                >
                  {busy ? "Đang gộp…" : "Gộp vào lá này"}
                </button>
              </>
            ) : panel.mode === "createFromQueue" ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy ||
                  !form.ten.trim() ||
                  (form.idCha === NEW_CAP_CHA && !form.chaTen.trim())
                }
                onClick={() => void onCreateFromQueue()}
              >
                {busy ? "Đang tạo…" : "Tạo & gắn loại"}
              </button>
            ) : panel.mode === "reviewFromQueue" ? (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() =>
                    setPanel({
                      mode: "mergeFromQueue",
                      yeuCau: panel.yeuCau,
                    })
                  }
                >
                  Gộp vào…
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() =>
                    setPanel({
                      mode: "createFromQueue",
                      yeuCau: panel.yeuCau,
                    })
                  }
                >
                  Tạo mục
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  busy ||
                  !form.ten.trim() ||
                  (form.idCha === NEW_CAP_CHA && !form.chaTen.trim())
                }
                onClick={() => void onSave()}
              >
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            )}
          </>
        }
      >
        {panel.mode === "reviewFromQueue" ? (
          <HangChoReviewBody
            yeuCau={panel.yeuCau}
            catalog={rows}
            err={err}
          />
        ) : panel.mode === "mergeFromQueue" ? (
          <div className="admin-edit-form dm-admin-merge-form">
            {err ? (
              <p className="dm-admin-msg" role="alert">
                {err}
              </p>
            ) : null}
            <p className="dm-admin-queue-card-desc">
              Gắn loại «
              {panel.yeuCau.nhanNhom ?? panel.yeuCau.tuKhoaChuan}» vào một{" "}
              <strong>lá · chính</strong>. Cấp cha chỉ để định hướng — không
              nhận loại hàng.
            </p>
            <label className="admin-edit-form__field">
              <span>Alias từ khóa</span>
              <input
                type="text"
                value={form.aliasTuKhoa}
                maxLength={80}
                disabled={busy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aliasTuKhoa: e.target.value }))
                }
              />
            </label>
            <label className="admin-edit-form__field">
              <span>Tìm lá đích</span>
              <input
                type="search"
                value={mergeQuery}
                placeholder="Tên hoặc slug…"
                disabled={busy}
                onChange={(e) => setMergeQuery(e.target.value)}
              />
            </label>
            <div className="dm-admin-merge-tree">
              {mergeGroups.length === 0 ? (
                <p className="dm-admin-queue-empty">
                  <strong>Không có lá khớp</strong>
                  <span>
                    Đổi từ khóa tìm, hoặc tạo mục mới kèm cấp cha.
                  </span>
                </p>
              ) : (
                mergeGroups.map((group) => (
                  <section
                    key={group.parent?.id ?? "orphans"}
                    className="dm-admin-merge-group"
                  >
                    <p className="dm-admin-tree-kicker">
                      Cấp cha · phụ
                      {group.parent ? ` · ${group.parent.ten}` : " · Không nhóm"}
                      {group.parent &&
                      panel.yeuCau.ganNhatLaCha &&
                      panel.yeuCau.idDanhMucGanNhat === group.parent.id
                        ? " · gợi ý seller"
                        : ""}
                    </p>
                    <div className="dm-admin-merge-list">
                      {group.leaves.map((opt) => {
                        const selected = mergeTargetId === opt.id;
                        const ganNhat =
                          panel.yeuCau.idDanhMucGanNhat === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`dm-admin-merge-option${selected ? " is-selected" : ""}`}
                            disabled={busy}
                            onClick={() => setMergeTargetId(opt.id)}
                          >
                            <span>
                              <strong>{opt.ten}</strong>
                              <em className="dm-admin-leaf-badge">Chính</em>
                              {ganNhat ? (
                                <em className="dm-admin-merge-hint">
                                  Gần nhất
                                </em>
                              ) : null}
                            </span>
                            <small>
                              {opt.slug} · {opt.soNhom} loại
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
            <p className="dm-admin-merge-note">
              Không có lá phù hợp? «Tạo mục mới» — chọn cấp cha có sẵn hoặc tạo
              cấp cha mới rồi gắn loại vào lá đó.
            </p>
          </div>
        ) : (
          <div className="dm-admin-form">
            {err ? (
              <p className="dm-admin-msg" role="alert">
                {err}
              </p>
            ) : null}

            {panel.mode === "createFromQueue" ? (
              <div className="dm-admin-form-banner">
                <p className="dm-admin-tree-kicker">Từ yêu cầu thiếu</p>
                <strong>
                  {tomTatHangChoDeXuat(panel.yeuCau).tenLa}
                </strong>
                <p>
                  Tạo lá rồi gắn loại «
                  {panel.yeuCau.nhanNhom ?? panel.yeuCau.tuKhoaChuan}». Seller
                  không tạo được mục — chỉ admin.
                </p>
              </div>
            ) : panel.mode === "edit" ? (
              <div className="dm-admin-form-hero">
                <p className="dm-admin-tree-kicker">
                  {parentIds.has(panel.row.id)
                    ? "Cấp cha · phụ"
                    : panel.row.slug === "khac"
                      ? "Dự phòng"
                      : "Lá · chính"}
                </p>
                <h3>{form.ten.trim() || panel.row.ten}</h3>
                <p>
                  <code>{form.slug.trim() || panel.row.slug}</code>
                  {panel.row.soNhom > 0
                    ? ` · ${panel.row.soNhom} loại`
                    : " · chưa gắn loại"}
                  {panel.row.idCha
                    ? ` · dưới ${rows.find((r) => r.id === panel.row.idCha)?.ten ?? "cấp cha"}`
                    : parentIds.has(panel.row.id)
                      ? ""
                      : " · không nhóm"}
                </p>
              </div>
            ) : (
              <div className="dm-admin-form-hero">
                <p className="dm-admin-tree-kicker">Danh mục mới</p>
                <h3>{form.ten.trim() || "Chưa đặt tên"}</h3>
                <p>
                  Lá nhận loại hàng. Cấp cha chỉ để gom — không gắn loại.
                </p>
              </div>
            )}

            <section className="dm-admin-form-section">
              <p className="dm-admin-tree-kicker">Nhận diện</p>
              <div className="dm-admin-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="dm-ten">
                    Tên
                  </label>
                  <input
                    id="dm-ten"
                    className="form-input"
                    type="text"
                    value={form.ten}
                    maxLength={80}
                    placeholder="vd. Pad chuột & deskmat"
                    disabled={busy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ten: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="dm-slug">
                    Slug
                  </label>
                  <input
                    id="dm-slug"
                    className="form-input"
                    type="text"
                    value={form.slug}
                    maxLength={64}
                    spellCheck={false}
                    placeholder={
                      panel.mode === "edit" ? undefined : "Để trống = tự tạo"
                    }
                    disabled={busy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }
                  />
                </div>
              </div>
              {panel.mode === "createFromQueue" ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="dm-alias">
                    Alias từ khóa
                  </label>
                  <input
                    id="dm-alias"
                    className="form-input"
                    type="text"
                    value={form.aliasTuKhoa}
                    maxLength={80}
                    disabled={busy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, aliasTuKhoa: e.target.value }))
                    }
                  />
                  <p className="form-hint">Tên cũ thành alias khi gắn cụm</p>
                </div>
              ) : null}
            </section>

            {panel.mode === "edit" && parentIds.has(panel.row.id) ? (
              <section className="dm-admin-form-section">
                <p className="dm-admin-tree-kicker">Cấp cha · phụ</p>
                <p className="dm-admin-form-help">
                  Cấp cha không nằm dưới cấp cha khác. Chuyển lá con sang nhóm
                  khác trước nếu muốn giải tán nhóm này.
                </p>
              </section>
            ) : (
              <section className="dm-admin-form-section">
                <p className="dm-admin-tree-kicker">Cấp cha · phụ</p>
                <p className="dm-admin-form-help">
                  Không nhận loại hàng. Chọn nhóm có sẵn hoặc tạo cấp cha mới.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="dm-cha">
                    Gom dưới
                  </label>
                  <select
                    id="dm-cha"
                    className="form-select"
                    value={form.idCha}
                    disabled={busy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, idCha: e.target.value }))
                    }
                  >
                    <option value="">— Không nhóm (lá gốc) —</option>
                    {parentRows
                      .filter(
                        (p) =>
                          panel.mode !== "edit" || p.id !== panel.row.id,
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ten}
                        </option>
                      ))}
                    <option value={NEW_CAP_CHA}>+ Tạo cấp cha mới…</option>
                  </select>
                </div>
                {form.idCha === NEW_CAP_CHA ? (
                  <div className="dm-admin-new-cha">
                    <p className="dm-admin-tree-kicker">Cấp cha mới</p>
                    <div className="dm-admin-form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="dm-cha-ten">
                          Tên cấp cha
                        </label>
                        <input
                          id="dm-cha-ten"
                          className="form-input"
                          type="text"
                          value={form.chaTen}
                          maxLength={80}
                          placeholder="vd. Đồ dùng in hình"
                          disabled={busy}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, chaTen: e.target.value }))
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="dm-cha-slug">
                          Slug cha
                        </label>
                        <input
                          id="dm-cha-slug"
                          className="form-input"
                          type="text"
                          value={form.chaSlug}
                          maxLength={64}
                          spellCheck={false}
                          placeholder="Để trống = tự tạo"
                          disabled={busy}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, chaSlug: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="dm-cha-mota">
                        Mô tả cấp cha
                      </label>
                      <textarea
                        id="dm-cha-mota"
                        className="form-input"
                        value={form.chaMoTa}
                        rows={2}
                        maxLength={500}
                        placeholder="Cấp cha — không gắn loại hàng. Gom…"
                        disabled={busy}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, chaMoTa: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            <section className="dm-admin-form-section">
              <p className="dm-admin-tree-kicker">Ranh giới</p>
              <p className="dm-admin-form-help">
                Seller không thấy. Viết gì thuộc mục này và gì phải sang mục
                khác.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="dm-mota">
                  Mô tả nội bộ
                </label>
                <textarea
                  id="dm-mota"
                  className="form-input"
                  value={form.moTa}
                  rows={4}
                  maxLength={500}
                  placeholder="vd. Pad in hình, deskmat. Không gồm coaster hay ốp."
                  disabled={busy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, moTa: e.target.value }))
                  }
                />
              </div>
            </section>

            <section className="dm-admin-form-section">
              <p className="dm-admin-tree-kicker">Hiển thị</p>
              <div className="dm-admin-form-row dm-admin-form-row--meta">
                <div className="form-group">
                  <label className="form-label" htmlFor="dm-thutu">
                    Thứ tự
                  </label>
                  <input
                    id="dm-thutu"
                    className="form-input"
                    type="number"
                    value={form.thuTu}
                    disabled={busy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, thuTu: e.target.value }))
                    }
                  />
                  <p className="form-hint">Số nhỏ hiện trước</p>
                </div>
                {panel.mode !== "createFromQueue" ? (
                  <div className="form-group">
                    <span className="form-label" id="dm-tt-label">
                      Trạng thái
                    </span>
                    <div
                      className="dm-admin-seg"
                      role="group"
                      aria-labelledby="dm-tt-label"
                    >
                      <button
                        type="button"
                        className={`dm-admin-seg-btn${form.trangThai === "hien" ? " is-on" : ""}`}
                        disabled={busy}
                        aria-pressed={form.trangThai === "hien"}
                        onClick={() =>
                          setForm((f) => ({ ...f, trangThai: "hien" }))
                        }
                      >
                        Hiện
                      </button>
                      <button
                        type="button"
                        className={`dm-admin-seg-btn${form.trangThai === "an" ? " is-off" : ""}`}
                        disabled={busy}
                        aria-pressed={form.trangThai === "an"}
                        onClick={() =>
                          setForm((f) => ({ ...f, trangThai: "an" }))
                        }
                      >
                        Ẩn
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </AdminSlideOver>

      {deleteTarget ? (
        <div
          className="admin-confirm-backdrop open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setDeleteTarget(null);
          }}
        >
          <div
            className="admin-confirm-dialog admin-confirm-dialog--danger"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dm-admin-delete-title"
            aria-describedby="dm-admin-delete-desc"
          >
            <div className="admin-confirm-dialog__header">
              <span className="admin-confirm-dialog__icon" aria-hidden>
                <AlertTriangle size={18} strokeWidth={2.2} />
              </span>
              <h2
                id="dm-admin-delete-title"
                className="admin-confirm-dialog__title"
              >
                {deleteTarget.soNhom > 0
                  ? "Xóa danh mục đang có loại gắn?"
                  : "Xóa danh mục?"}
              </h2>
              <button
                type="button"
                className="so-close"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="admin-confirm-dialog__body">
              <p
                id="dm-admin-delete-desc"
                className="admin-confirm-dialog__lead"
              >
                Xóa «<strong>{deleteTarget.ten}</strong>» (
                <code>{deleteTarget.slug}</code>
                ). Alias gắn mục này cũng mất. Không hoàn tác.
              </p>
              {deleteTarget.soNhom > 0 ? (
                <div className="admin-delete-warn admin-delete-warn--block admin-delete-warn--row">
                  <ShieldAlert size={15} strokeWidth={2.2} aria-hidden />
                  <span>
                    {deleteTarget.soNhom} loại đang gắn sẽ mất danh mục (chưa
                    map). {deleteTarget.slug === "khac"
                      ? "Đây là mục dự phòng — seller báo thiếu cần slug khac. Nên gộp/chuyển loại trước."
                      : "Nên gộp/chuyển loại trước nếu còn dùng."}
                  </span>
                </div>
              ) : deleteTarget.slug === "khac" ? (
                <div className="admin-delete-warn admin-delete-warn--block admin-delete-warn--row">
                  <ShieldAlert size={15} strokeWidth={2.2} aria-hidden />
                  <span>
                    Đây là mục dự phòng. Seller báo thiếu cần slug{" "}
                    <code>khac</code>.
                  </span>
                </div>
              ) : (
                <div className="admin-delete-warn admin-delete-warn--block admin-delete-warn--row">
                  <ShieldAlert size={15} strokeWidth={2.2} aria-hidden />
                  <span>Xóa hẳn khỏi cây danh mục. Không hoàn tác.</span>
                </div>
              )}
            </div>
            <div className="admin-confirm-dialog__footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void onConfirmDelete()}
                disabled={busy}
              >
                {busy
                  ? "Đang xóa…"
                  : deleteTarget.soNhom > 0
                    ? `Xóa và bỏ map ${deleteTarget.soNhom} loại`
                    : "Xóa danh mục"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function HangChoReviewBody({
  yeuCau,
  catalog,
  err,
}: {
  yeuCau: HangChoYeuCau;
  catalog: AdminShopDanhMucRow[];
  err: string | null;
}) {
  const cay = cayGoiYHangCho(yeuCau, catalog);
  const deXuat = cay.tomTat;
  const nguoi = yeuCau.nguoiDeXuat ?? null;
  const mau = yeuCau.mau ?? [];
  const anhEmHien = cay.anhEm.slice(0, 8);
  const anhEmCon = cay.anhEm.length - anhEmHien.length;

  return (
    <div className="dm-admin-review">
      {err ? (
        <p className="dm-admin-msg" role="alert">
          {err}
        </p>
      ) : null}

      <section className="dm-admin-review-block">
        <p className="dm-admin-tree-kicker">Đề xuất</p>
        <dl className="dm-admin-review-dl">
          <div>
            <dt>Tên lá</dt>
            <dd>
              <strong>{deXuat.tenLa}</strong>
            </dd>
          </div>
          <div>
            <dt>Hành động</dt>
            <dd>{hangChoHanhDongLabel(deXuat.hanhDong)}</dd>
          </div>
          <div>
            <dt>Cấp cha</dt>
            <dd>
              {deXuat.taoChaMoi
                ? `Tạo mới «${deXuat.tenCha}»`
                : (deXuat.tenCha ?? "Chưa rõ — cần chọn khi tạo")}
            </dd>
          </div>
          {deXuat.tenLaGan ? (
            <div>
              <dt>Gần lá</dt>
              <dd>{deXuat.tenLaGan}</dd>
            </div>
          ) : null}
          <div>
            <dt>Cụm</dt>
            <dd>
              {yeuCau.soShopCungCum} shop cùng từ khóa
              {yeuCau.taoLuc
                ? ` · gửi ${formatRelativeTimeVi(yeuCau.taoLuc)}`
                : ""}
            </dd>
          </div>
        </dl>
      </section>

      <section className="dm-admin-review-block">
        <p className="dm-admin-tree-kicker">Cây hiện tại</p>
        <div className="dm-admin-review-tree">
          <p
            className={`dm-admin-review-tree-cha${deXuat.taoChaMoi ? " is-new" : ""}`}
          >
            {deXuat.taoChaMoi
              ? `Nhóm mới · ${deXuat.tenCha}`
              : cay.cha
                ? cay.cha.ten
                : "Không nhóm"}
            {cay.cha ? <code>{cay.cha.slug}</code> : null}
          </p>
          <ul>
            {anhEmHien.map((leaf) => (
              <li
                key={leaf.id}
                className={
                  cay.laGan?.id === leaf.id ? "is-gan" : undefined
                }
              >
                <span>{leaf.ten}</span>
                {cay.laGan?.id === leaf.id ? (
                  <em>gần nhất</em>
                ) : (
                  <small>{leaf.soNhom} loại</small>
                )}
              </li>
            ))}
            {anhEmCon > 0 ? (
              <li className="is-more">+{anhEmCon} lá khác</li>
            ) : null}
            <li className="is-de-xuat">
              <span>{deXuat.tenLa}</span>
              <em>đề xuất</em>
            </li>
          </ul>
        </div>
        <p className="dm-admin-form-help">
          Lá nhận loại hàng. Cấp cha chỉ gom nhóm — không gắn loại, không lên
          chip hub.
        </p>
      </section>

      <section className="dm-admin-review-block">
        <p className="dm-admin-tree-kicker">Người đề xuất</p>
        {nguoi ? (
          <div className="dm-admin-review-who">
            {nguoi.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nguoi.avatarUrl} alt="" />
            ) : (
              <span aria-hidden>
                {getNameInitials(nguoi.ten, nguoi.slug)}
              </span>
            )}
            <div>
              {nguoi.slug ? (
                <Link href={`/${nguoi.slug}`}>{nguoi.ten}</Link>
              ) : (
                <strong>{nguoi.ten}</strong>
              )}
              {yeuCau.hangHref ? (
                <Link href={yeuCau.hangHref} target="_blank" rel="noreferrer">
                  Xem loại trên shop
                  <ExternalLink size={12} aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="dm-admin-form-help">Không tải được hồ sơ seller.</p>
        )}
      </section>

      <section className="dm-admin-review-block">
        <p className="dm-admin-tree-kicker">Hàng cần gắn</p>
        <p className="dm-admin-review-nhom">
          <strong>{yeuCau.nhanNhom ?? deXuat.tenLa}</strong>
          {typeof yeuCau.soMau === "number" ? (
            <span>{yeuCau.soMau} mẫu</span>
          ) : null}
        </p>
        {mau.length > 0 ? (
          <ul className="dm-admin-review-mau">
            {mau.map((m) => {
              const href = yeuCau.hangHref
                ? `${yeuCau.hangHref}?variant=${encodeURIComponent(m.id)}`
                : null;
              const inner = (
                <>
                  {m.anhUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.anhUrl} alt="" />
                  ) : (
                    <span aria-hidden />
                  )}
                  <em>{m.ten}</em>
                </>
              );
              return (
                <li key={m.id}>
                  {href ? (
                    <Link href={href} target="_blank" rel="noreferrer">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="dm-admin-form-help">
            Loại này chưa có mẫu — vẫn gắn được sau khi tạo/gộp danh mục.
          </p>
        )}
      </section>
    </div>
  );
}
