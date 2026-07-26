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
import { PedagogyQuanLyClient } from "@/components/co-so/quan-ly/PedagogyQuanLyClient";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import {
  labelHinhThucLop,
  labelTrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  KhoaHocCardData,
  LoaiMoHinhKhoa,
  LopHocDetailData,
} from "@/lib/to-chuc/khoa-hoc-types";
import type { LopHocQuanLyRow } from "@/lib/to-chuc/lop-hoc-quan-ly-types";

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
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function toLopDetail(row: LopHocQuanLyRow): LopHocDetailData {
  const ten =
    row.giaoVienTen?.trim() ||
    row.giaoVienText?.trim() ||
    "Đang cập nhật";
  return {
    id: row.id,
    maLop: row.maLop,
    tenLop: row.lichHoc,
    hinhThuc: row.hinhThuc,
    lichHoc: row.lichHoc,
    ngayKhaiGiang: row.ngayKhaiGiang,
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
    diaChiHoc: null,
  };
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

function formatNgay(iso: string): string {
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

export function LopHocQuanLyPanel({ orgId, orgSlug, khoaOptions }: Props) {
  const [rows, setRows] = useState<LopHocQuanLyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState<LopHocQuanLyRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [createKhoaId, setCreateKhoaId] = useState("");
  const [uploadingLopId, setUploadingLopId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const thumbTargetLopIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/lop-hoc`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải lớp.");
      setRows((data.lopHoc ?? []) as LopHocQuanLyRow[]);
      setCanEdit(Boolean(data.canEdit));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let dangMo = 0;
    let hv = 0;
    for (const r of rows) {
      if (
        r.trangThaiLop === "sap_khai_giang" ||
        r.trangThaiLop === "dang_hoc"
      ) {
        dangMo += 1;
      }
      hv += r.soHocVien;
    }
    return { total: rows.length, dangMo, hv };
  }, [rows]);

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
    if (khoaOptions.length === 1) {
      setCreateKhoaId(khoaOptions[0]!.id);
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

  async function softDeleteLop(row: LopHocQuanLyRow) {
    if (!canEdit || deletingId) return;
    const label = row.maLop || row.lichHoc || "lớp này";
    const ok = window.confirm(
      `Ẩn lớp «${label}»?\n\nĐây là soft delete — lớp chuyển sang «Đã hủy», dữ liệu học viên được giữ. Có thể khôi phục bằng cách sửa trạng thái lớp.`,
    );
    if (!ok) return;
    setDeletingId(row.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/khoa-hoc/${encodeURIComponent(row.khoaId)}/lop/${encodeURIComponent(row.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error || "Không xóa được lớp.",
        );
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, trangThaiLop: "huy" } : r,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi xóa lớp.");
    } finally {
      setDeletingId(null);
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

      setRows((prev) =>
        prev.map((row) =>
          row.id === lopId
            ? {
                ...row,
                avatarId: patchJson.avatarId ?? null,
                avatarUrl: patchJson.avatarUrl ?? null,
              }
            : row,
        ),
      );
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
      <section className="cso-dt-kpis cso-lh-kpis" aria-label="Tóm tắt lớp học">
        <div className="cso-dt-kpi cso-dt-kpi--hero">
          <p className="cso-dt-kpi-label">Lớp học</p>
          <p className="cso-dt-kpi-value">{loading ? "…" : stats.total}</p>
          <p className="cso-dt-kpi-sub">{stats.dangMo} đang mở</p>
        </div>
        <div className="cso-dt-kpi">
          <p className="cso-dt-kpi-label">Lớp đang mở</p>
          <p className="cso-dt-kpi-value">{loading ? "…" : stats.dangMo}</p>
          <p className="cso-dt-kpi-sub">sắp khai giảng / đang học</p>
        </div>
        <div className="cso-dt-kpi">
          <p className="cso-dt-kpi-label">Học viên</p>
          <p className="cso-dt-kpi-value">{loading ? "…" : stats.hv}</p>
          <p className="cso-dt-kpi-sub">ghi danh các lớp</p>
        </div>
      </section>

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <div className="cso-lh-head-row">
            <div>
              <h2 className="cso-dt-panel-title">Danh sách lớp</h2>
              <p className="cso-dt-panel-sub">
                Lớp thuộc các khóa — sửa thông tin, lịch và giảng viên tại đây.
              </p>
            </div>
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
                    <td colSpan={7}>
                      <div className="cso-hv-loading">Đang tải…</div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="cso-hv-empty">
                        <strong>Chưa có lớp</strong>
                        {khoaOptions.length === 0
                          ? "Tạo khóa trước, rồi thêm lớp học."
                          : "Bấm «Thêm lớp» để mở lớp thuộc một khóa."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
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
                            <p className="cso-hv-name">
                              {r.maLop || r.lichHoc || "Lớp"}
                            </p>
                            <p className="cso-hv-lop">
                              {labelHinhThucLop(r.hinhThuc)}
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
                        <p className="cso-hv-course">
                          {r.soHocVien}
                          {r.slotToiDa != null ? ` / ${r.slotToiDa}` : ""}
                        </p>
                      </td>
                      <td>
                        <span
                          className={
                            r.trangThaiLop === "dang_hoc"
                              ? "cso-hv-chip cso-hv-chip--ok"
                              : "cso-hv-chip cso-hv-chip--state"
                          }
                        >
                          {labelTrangThaiLop(r.trangThaiLop)}
                        </span>
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
                                title="Ẩn lớp (soft delete)"
                                aria-label={`Ẩn lớp ${r.maLop || r.lichHoc || ""}`}
                                disabled={
                                  deletingId === r.id || r.trangThaiLop === "huy"
                                }
                                onClick={() => void softDeleteLop(r)}
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

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head">
          <h2 className="cso-dt-panel-title">Nộp bài & tiến độ</h2>
          <p className="cso-dt-panel-sub">
            Duyệt bài nộp từ phòng lớp. Đạt + chọn bài tiếp → mở khóa bài mới và
            gửi thông báo.
          </p>
        </div>
        <div className="cso-dt-panel-body cso-dt-panel-body--flush">
          <PedagogyQuanLyClient orgId={orgId} />
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
          onSaved={() => {
            closeModals();
            void load();
          }}
        />
      ) : null}
    </>
  );
}
