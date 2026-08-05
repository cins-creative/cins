"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ExternalLink, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import { LopHocEditModal } from "@/components/co-so/LopHocEditModal";
import { LopHocDeleteConfirm } from "@/components/co-so/quan-ly/LopHocDeleteConfirm";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import {
  labelHinhThucLop,
  labelTrangThaiLop,
  TRANG_THAI_LOP_OPTIONS,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  KhoaHocCardData,
  LoaiMoHinhKhoa,
  LopHocDetailData,
  LopHocFormInput,
  TrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-types";
import type { LopHocQuanLyRow } from "@/lib/to-chuc/lop-hoc-quan-ly-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { CoSoGiaoVienPick } from "@/components/co-so/CoSoGiaoVienPicker";

type KhoaOption = {
  id: string;
  slug: string;
  tenKhoaHoc: string;
  loaiMoHinh: LoaiMoHinhKhoa;
};

type Props = {
  orgId: string;
  orgSlug: string;
  khoaOptions: KhoaOption[];
  /** Lọc bảng theo một khóa — `null` = tất cả khóa. */
  khoaFilterId?: string | null;
  onKhoaFilterChange?: (khoaId: string | null) => void;
  /** Seed từ parent (đã fetch sẵn) — tránh spinner khi chuyển tab. */
  seedRows?: LopHocQuanLyRow[];
  seedCanEdit?: boolean;
  seedReady?: boolean;
  onRowsChange?: (rows: LopHocQuanLyRow[]) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** Merge form → hàng bảng ngay sau Lưu (trước refetch). */
function optimisticLopRow(input: {
  lopId: string;
  payload: LopHocFormInput;
  khoa: KhoaOption;
  prev: LopHocQuanLyRow | null;
  giaoVien: CoSoGiaoVienPick | null;
}): LopHocQuanLyRow {
  const { lopId, payload, khoa, prev, giaoVien } = input;
  const gvId = payload.giaoVienPhuTrach ?? null;
  const gvText = payload.giaoVienText?.trim() || null;
  const chiNhanhIds = payload.chiNhanhIds ?? [];
  const prevCn = prev?.chiNhanh ?? [];
  const chiNhanh = chiNhanhIds.map((id) => {
    const hit = prevCn.find((c) => c.id === id);
    return hit ?? { id, ten: "Chi nhánh", diaChi: null };
  });

  let giaoVienTen: string | null = gvText;
  let giaoVienSlug: string | null = null;
  let giaoVienAvatarId: string | null = null;
  let giaoVienAvatarUrl: string | null = null;

  if (giaoVien && giaoVien.userId === gvId) {
    giaoVienTen = giaoVien.tenHienThi?.trim() || gvText;
    giaoVienSlug = giaoVien.slug?.trim() || null;
    giaoVienAvatarId = giaoVien.avatarId ?? null;
    giaoVienAvatarUrl = getAvatarUrl(giaoVienAvatarId);
  } else if (prev && prev.giaoVienPhuTrach === gvId && gvId) {
    giaoVienTen = prev.giaoVienTen;
    giaoVienSlug = prev.giaoVienSlug;
    giaoVienAvatarId = prev.giaoVienAvatarId;
    giaoVienAvatarUrl = prev.giaoVienAvatarUrl;
  }

  return {
    id: lopId,
    maLop: payload.maLop?.trim() || null,
    lichHoc: payload.lichHoc?.trim() || null,
    hinhThuc: payload.hinhThuc ?? prev?.hinhThuc ?? "truc_tuyen",
    ngayKhaiGiang: payload.ngayKhaiGiang?.trim() || null,
    slotToiDa: payload.slotToiDa ?? null,
    trangThaiLop: payload.trangThaiLop ?? prev?.trangThaiLop ?? "sap_khai_giang",
    giaoVienPhuTrach: gvId,
    giaoVienText: gvId ? null : gvText,
    giaoVienTen,
    giaoVienSlug,
    giaoVienAvatarId,
    giaoVienAvatarUrl,
    khoaId: khoa.id,
    khoaSlug: khoa.slug,
    tenKhoa: khoa.tenKhoaHoc,
    loaiMoHinh: khoa.loaiMoHinh,
    soHocVien: prev?.soHocVien ?? 0,
    avatarId: prev?.avatarId ?? null,
    avatarUrl: prev?.avatarUrl ?? null,
    chiNhanhIds,
    chiNhanh,
  };
}

function toLopDetail(row: LopHocQuanLyRow): LopHocDetailData {
  const ten =
    row.giaoVienTen?.trim() ||
    row.giaoVienText?.trim() ||
    "Đang cập nhật";
  const chiNhanh = row.chiNhanh ?? [];
  return {
    id: row.id,
    maLop: row.maLop,
    tenLop: row.lichHoc,
    hinhThuc: row.hinhThuc,
    lichHoc: row.lichHoc,
    ngayKhaiGiang: row.ngayKhaiGiang ?? "",
    slotToiDa: row.slotToiDa,
    trangThaiLop: row.trangThaiLop,
    conCho:
      row.trangThaiLop === "sap_khai_giang" ||
      row.trangThaiLop === "dang_hoc",
    giaoVienText: row.giaoVienText,
    giaoVien: {
      key: row.giaoVienPhuTrach ?? `text:${ten}`,
      ten,
      slug: row.giaoVienSlug,
      verified: Boolean(row.giaoVienPhuTrach),
      initials: initials(ten),
      vaiTro: null,
      pendingProfile: !row.giaoVienPhuTrach && Boolean(row.giaoVienText),
      avatarUrl: row.giaoVienAvatarUrl,
      avatarId: row.giaoVienAvatarId,
    },
    chiNhanhIds: row.chiNhanhIds ?? [],
    chiNhanh,
    diaChiHoc:
      chiNhanh
        .map((c) => (c.diaChi ? `${c.ten} — ${c.diaChi}` : c.ten))
        .join("\n") || null,
  };
}

function diaDiemLabel(row: LopHocQuanLyRow): string {
  if (row.hinhThuc === "truc_tuyen") return "Online";
  const names = (row.chiNhanh ?? [])
    .map((c) => c.ten.trim())
    .filter(Boolean);
  return names.length > 0 ? names.join(" · ") : "—";
}

function GiaoVienCell({ row }: { row: LopHocQuanLyRow }) {
  const ten = row.giaoVienTen?.trim();
  if (!ten) {
    return <p className="cso-hv-lop">Chưa gán</p>;
  }

  const body = (
    <span className="cso-hv-person cso-lh-gv-cell">
      <span className="cso-hv-ava cso-lh-gv-ava" aria-hidden>
        {row.giaoVienAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.giaoVienAvatarUrl} alt="" />
        ) : (
          initials(ten)
        )}
      </span>
      <span className="cso-hv-person-meta">
        <span className="cso-hv-name">{ten}</span>
        {row.giaoVienSlug ? (
          <span className="cso-hv-slug">@{row.giaoVienSlug}</span>
        ) : row.giaoVienText ? (
          <span className="cso-hv-lop">Tên thủ công</span>
        ) : null}
      </span>
    </span>
  );

  if (!row.giaoVienSlug) {
    return body;
  }

  return (
    <JourneyUserPopover
      slug={row.giaoVienSlug}
      fallbackName={ten}
      fallbackAvatarUrl={row.giaoVienAvatarUrl}
    >
      <span className="cso-lh-gv-open">{body}</span>
    </JourneyUserPopover>
  );
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function khoaOptionsFromCards(rows: KhoaHocCardData[]): KhoaOption[] {
  return rows.map((k) => ({
    id: k.id,
    slug: k.slug,
    tenKhoaHoc: k.tenKhoaHoc,
    loaiMoHinh: k.loaiMoHinh,
  }));
}

export function LopHocQuanLyPanel({
  orgId,
  orgSlug,
  khoaOptions,
  khoaFilterId = null,
  onKhoaFilterChange,
  seedRows,
  seedCanEdit = false,
  seedReady = false,
  onRowsChange,
}: Props) {
  const [rows, setRows] = useState<LopHocQuanLyRow[]>(() => seedRows ?? []);
  const [ownFilterId, setOwnFilterId] = useState<string | null>(khoaFilterId);
  const [loading, setLoading] = useState(() => !seedReady);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(() => seedCanEdit);
  const [editing, setEditing] = useState<LopHocQuanLyRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [createKhoaId, setCreateKhoaId] = useState("");
  const [uploadingLopId, setUploadingLopId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingLop, setDeletingLop] = useState<LopHocQuanLyRow | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const thumbTargetLopIdRef = useRef<string | null>(null);
  const seededRef = useRef(seedReady);

  const applyRows = useCallback(
    (next: LopHocQuanLyRow[]) => {
      setRows(next);
      onRowsChange?.(next);
    },
    [onRowsChange],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/co-so/${encodeURIComponent(orgId)}/lop-hoc`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải lớp.");
        const next = (data.lopHoc ?? []) as LopHocQuanLyRow[];
        applyRows(next);
        setCanEdit(Boolean(data.canEdit));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi.");
      } finally {
        setLoading(false);
      }
    },
    [applyRows, orgId],
  );

  // Seed từ parent khi sẵn sàng — không chờ fetch lại.
  useEffect(() => {
    if (seedRows === undefined) return;
    if (!seedReady) return;
    setRows(seedRows);
    setCanEdit(seedCanEdit);
    setLoading(false);
    seededRef.current = true;
  }, [seedReady, seedRows, seedCanEdit]);

  // Chỉ tự fetch khi đứng một mình (không có seed từ parent).
  useEffect(() => {
    if (seedRows !== undefined) return;
    void load();
  }, [load, seedRows]);

  const filterId = onKhoaFilterChange ? khoaFilterId : ownFilterId;

  const setFilterId = useCallback(
    (next: string | null) => {
      if (onKhoaFilterChange) onKhoaFilterChange(next);
      else setOwnFilterId(next);
    },
    [onKhoaFilterChange],
  );

  const filterOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const k of khoaOptions) byId.set(k.id, k.tenKhoaHoc);
    for (const r of rows) if (!byId.has(r.khoaId)) byId.set(r.khoaId, r.tenKhoa);
    const hvByKhoa = new Map<string, number>();
    for (const r of rows) {
      if (r.trangThaiLop !== "dang_hoc") continue;
      hvByKhoa.set(r.khoaId, (hvByKhoa.get(r.khoaId) ?? 0) + r.soHocVien);
    }
    return [...byId].map(([id, tenKhoaHoc]) => ({
      id,
      tenKhoaHoc,
      soHocVien: hvByKhoa.get(id) ?? 0,
    }));
  }, [khoaOptions, rows]);

  const tongHocVienDangHoc = useMemo(
    () =>
      rows.reduce(
        (sum, r) => (r.trangThaiLop === "dang_hoc" ? sum + r.soHocVien : sum),
        0,
      ),
    [rows],
  );

  const visibleRows = useMemo(
    () => (filterId ? rows.filter((r) => r.khoaId === filterId) : rows),
    [filterId, rows],
  );

  const filterTenKhoa = filterId
    ? (filterOptions.find((k) => k.id === filterId)?.tenKhoaHoc ?? null)
    : null;

  const modalKhoa = useMemo(() => {
    if (editing) {
      const fromOptions = khoaOptions.find((k) => k.id === editing.khoaId);
      return (
        fromOptions ?? {
          id: editing.khoaId,
          slug: editing.khoaSlug,
          tenKhoaHoc: editing.tenKhoa,
          loaiMoHinh: editing.loaiMoHinh,
        }
      );
    }
    if (createOpen && createKhoaId) {
      return khoaOptions.find((k) => k.id === createKhoaId) ?? null;
    }
    return null;
  }, [createKhoaId, createOpen, editing, khoaOptions]);

  function startCreate() {
    if (!canEdit || khoaOptions.length === 0) return;
    setEditing(null);
    const preset =
      filterId && khoaOptions.some((k) => k.id === filterId) ? filterId : null;
    if (preset || khoaOptions.length === 1) {
      setCreateKhoaId(preset ?? khoaOptions[0]!.id);
      setCreateOpen(true);
      return;
    }
    setCreateKhoaId(khoaOptions[0]!.id);
    setPickOpen(true);
  }

  function closeModals() {
    setEditing(null);
    setCreateOpen(false);
    setPickOpen(false);
    setCreateKhoaId("");
  }

  function openThumbPicker(lopId: string) {
    if (!canEdit || uploadingLopId) return;
    thumbTargetLopIdRef.current = lopId;
    thumbInputRef.current?.click();
  }

  async function updateTrangThaiLop(
    row: LopHocQuanLyRow,
    next: TrangThaiLop,
  ) {
    if (!canEdit || statusUpdatingId) return;
    if (next === row.trangThaiLop) return;
    setStatusUpdatingId(row.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(row.khoaId)}/lop/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maLop: row.maLop,
            hinhThuc: row.hinhThuc,
            lichHoc: row.lichHoc,
            ngayKhaiGiang: row.ngayKhaiGiang,
            giaoVienText: row.giaoVienText,
            giaoVienPhuTrach: row.giaoVienPhuTrach,
            slotToiDa: row.slotToiDa,
            trangThaiLop: next,
            chiNhanhIds: row.chiNhanhIds,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ||
            "Không cập nhật được trạng thái lớp.",
        );
      }
      setRows((prev) => {
        const nextRows = prev.map((r) =>
          r.id === row.id ? { ...r, trangThaiLop: next } : r,
        );
        onRowsChange?.(nextRows);
        return nextRows;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi cập nhật trạng thái.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function onThumbFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const lopId = thumbTargetLopIdRef.current;
    event.target.value = "";
    thumbTargetLopIdRef.current = null;
    if (!file || !lopId) return;
    if (!isAllowedUploadImageFile(file)) {
      window.alert("Chỉ chọn ảnh JPG, PNG, WebP hoặc GIF.");
      return;
    }

    setUploadingLopId(lopId);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/avatar/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const uploadJson = (await uploadRes.json()) as {
        imageId?: string;
        error?: string;
      };
      if (!uploadRes.ok || !uploadJson.imageId) {
        throw new Error(uploadJson.error || "Không tải được ảnh.");
      }

      const patchRes = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/lop-hoc/${encodeURIComponent(lopId)}/avatar`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarId: uploadJson.imageId }),
        },
      );
      const patchJson = (await patchRes.json()) as {
        avatarId?: string | null;
        avatarUrl?: string | null;
        error?: string;
      };
      if (!patchRes.ok) {
        throw new Error(patchJson.error || "Không lưu được ảnh lớp.");
      }

      setRows((prev) => {
        const next = prev.map((row) =>
          row.id === lopId
            ? {
                ...row,
                avatarId: patchJson.avatarId ?? null,
                avatarUrl: patchJson.avatarUrl ?? null,
              }
            : row,
        );
        onRowsChange?.(next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đổi được ảnh lớp.");
    } finally {
      setUploadingLopId(null);
    }
  }

  return (
    <>
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void onThumbFileChange(e)}
      />
      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <div className="cso-lh-head-row">
            <div>
              <h2 className="cso-dt-panel-title">
                {filterTenKhoa
                  ? `Danh sách lớp ${filterTenKhoa}`
                  : "Danh sách lớp"}
              </h2>
            </div>
            <div className="cso-lh-head-tools">
              <label className="cso-lh-filter">
                <span className="sr-only">Lọc theo khóa</span>
                <select
                  className="cso-ql-select cso-lh-filter-select"
                  value={filterId ?? ""}
                  onChange={(e) => setFilterId(e.target.value || null)}
                >
                  <option value="">
                    Tất cả khóa — {tongHocVienDangHoc} hv
                  </option>
                  {filterOptions.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.tenKhoaHoc} — {k.soHocVien} hv
                    </option>
                  ))}
                </select>
              </label>
              {canEdit ? (
                <button
                  type="button"
                  className="cso-ql-btn cso-ql-btn--priv"
                  disabled={khoaOptions.length === 0}
                  onClick={startCreate}
                >
                  <Plus size={15} strokeWidth={2.4} aria-hidden />
                  Thêm lớp
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="cso-dt-panel-body">
            <p className="cso-ql-error cso-lh-inline-error">{error}</p>
          </div>
        ) : null}

        <div className="cso-dt-panel-body cso-dt-panel-body--flush">
          <div className="cso-hv-table-wrap">
            <table className="cso-hv-table">
              <thead>
                <tr>
                  <th scope="col">Lớp</th>
                  <th scope="col">Khóa</th>
                  <th scope="col">Giáo viên</th>
                  <th scope="col">Khai giảng</th>
                  <th scope="col">Địa điểm</th>
                  <th scope="col">HV</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="cso-hv-loading">Đang tải…</div>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="cso-hv-empty">
                        <strong>Chưa có lớp</strong>
                        {filterTenKhoa
                          ? `Khóa «${filterTenKhoa}» chưa có lớp nào. Khóa chưa mở lớp — chưa hiện công khai. Chọn «Tất cả khóa» để xem toàn bộ.`
                          : khoaOptions.length === 0
                            ? "Tạo khóa trước, rồi thêm lớp học."
                            : "Bấm «Thêm lớp» để mở lớp thuộc một khóa."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="cso-hv-person">
                          {canEdit ? (
                            <button
                              type="button"
                              className={`cso-hv-ava cso-lh-thumb${uploadingLopId === r.id ? " is-uploading" : ""}`}
                              title="Đổi ảnh lớp (dùng trong chat)"
                              aria-label={`Đổi ảnh lớp ${r.maLop || r.lichHoc || ""}`}
                              disabled={uploadingLopId === r.id}
                              onClick={() => openThumbPicker(r.id)}
                            >
                              {r.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.avatarUrl} alt="" />
                              ) : (
                                <ImagePlus size={16} strokeWidth={2.2} aria-hidden />
                              )}
                            </button>
                          ) : (
                            <span className="cso-hv-ava cso-lh-thumb" aria-hidden>
                              {r.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.avatarUrl} alt="" />
                              ) : (
                                initials(r.maLop || r.lichHoc || r.tenKhoa || "L")
                              )}
                            </span>
                          )}
                          <div className="cso-hv-person-meta">
                            <p className="cso-hv-course">
                              {r.maLop || "Chưa có mã"}
                            </p>
                            <p className="cso-hv-lop">
                              {r.lichHoc
                                ? `${labelHinhThucLop(r.hinhThuc)} · ${r.lichHoc}`
                                : labelHinhThucLop(r.hinhThuc)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="cso-hv-course">{r.tenKhoa}</p>
                      </td>
                      <td>
                        <GiaoVienCell row={r} />
                      </td>
                      <td>
                        <p className="cso-hv-lop">{formatNgay(r.ngayKhaiGiang)}</p>
                      </td>
                      <td>
                        <p className="cso-hv-lop">{diaDiemLabel(r)}</p>
                      </td>
                      <td>
                        <p className="cso-hv-course">
                          {r.soHocVien}
                          {r.slotToiDa != null ? ` / ${r.slotToiDa}` : ""}
                        </p>
                      </td>
                      <td>
                        {canEdit ? (
                          <select
                            className={`cso-lh-status-select${
                              r.trangThaiLop === "dang_hoc"
                                ? " is-ok"
                                : r.trangThaiLop === "huy" ||
                                    r.trangThaiLop === "da_ket_thuc"
                                  ? " is-muted"
                                  : ""
                            }`}
                            value={r.trangThaiLop}
                            disabled={statusUpdatingId === r.id}
                            aria-label={`Trạng thái lớp ${r.maLop || r.lichHoc || ""}`}
                            onChange={(e) =>
                              void updateTrangThaiLop(
                                r,
                                e.target.value as TrangThaiLop,
                              )
                            }
                          >
                            {TRANG_THAI_LOP_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={
                              r.trangThaiLop === "dang_hoc"
                                ? "cso-hv-chip cso-hv-chip--ok"
                                : "cso-hv-chip cso-hv-chip--state"
                            }
                          >
                            {labelTrangThaiLop(r.trangThaiLop)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="cso-hv-actions">
                          <Link
                            href={coSoKhoaHocDetailPath(
                              orgSlug,
                              r.khoaSlug || r.khoaId,
                            )}
                            className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                            title="Mở trang khóa"
                            aria-label={`Mở khóa ${r.tenKhoa}`}
                          >
                            <ExternalLink size={15} strokeWidth={2.2} aria-hidden />
                          </Link>
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon"
                                title="Sửa lớp"
                                aria-label={`Sửa lớp ${r.maLop || r.lichHoc || ""}`}
                                onClick={() => {
                                  setCreateOpen(false);
                                  setPickOpen(false);
                                  setEditing(r);
                                }}
                              >
                                <Pencil size={15} strokeWidth={2.2} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--icon cso-ql-btn--danger-icon"
                                title="Xóa lớp vĩnh viễn"
                                aria-label={`Xóa lớp ${r.maLop || r.lichHoc || ""}`}
                                onClick={() => setDeletingLop(r)}
                              >
                                <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {pickOpen ? (
        <div
          className="cso-lh-khoa-pick"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cso-lh-khoa-pick-title"
        >
          <button
            type="button"
            className="cso-lh-khoa-pick-backdrop"
            aria-label="Đóng"
            onClick={closeModals}
          />
          <div className="cso-lh-khoa-pick-card">
            <h3 id="cso-lh-khoa-pick-title" className="cso-lh-khoa-pick-title">
              Chọn khóa cho lớp mới
            </h3>
            <label className="cso-ql-field">
              <span className="cso-ql-label">Khóa học</span>
              <select
                className="cso-ql-input"
                value={createKhoaId}
                onChange={(e) => setCreateKhoaId(e.target.value)}
              >
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.tenKhoaHoc}
                  </option>
                ))}
              </select>
            </label>
            <div className="cso-lh-khoa-pick-actions">
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--ghost"
                onClick={closeModals}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cso-ql-btn cso-ql-btn--priv"
                disabled={!createKhoaId}
                onClick={() => {
                  setPickOpen(false);
                  setCreateOpen(true);
                }}
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalKhoa ? (
        <LopHocEditModal
          open
          orgId={orgId}
          khoaId={modalKhoa.id}
          loaiMoHinh={modalKhoa.loaiMoHinh}
          tenKhoaHoc={modalKhoa.tenKhoaHoc}
          editing={editing ? toLopDetail(editing) : null}
          onClose={closeModals}
          onSaved={(payload, meta) => {
            const khoa = modalKhoa;
            const prevRow = editing;
            if (khoa) {
              const nextRow = optimisticLopRow({
                lopId: meta.lopId,
                payload,
                khoa,
                prev: prevRow,
                giaoVien: meta.giaoVien,
              });
              setRows((prev) => {
                const next = prevRow
                  ? prev.map((r) => (r.id === prevRow.id ? nextRow : r))
                  : [nextRow, ...prev.filter((r) => r.id !== nextRow.id)];
                onRowsChange?.(next);
                return next;
              });
            }
            closeModals();
            void load({ silent: true });
          }}
        />
      ) : null}

      <LopHocDeleteConfirm
        open={Boolean(deletingLop)}
        orgId={orgId}
        lop={deletingLop}
        onClose={() => setDeletingLop(null)}
        onDeleted={(lopId) => {
          setRows((prev) => {
            const next = prev.filter((r) => r.id !== lopId);
            onRowsChange?.(next);
            return next;
          });
        }}
      />
    </>
  );
}
