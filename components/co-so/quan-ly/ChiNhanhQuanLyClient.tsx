"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Pencil, X, Check, ImagePlus } from "lucide-react";

import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type Row = {
  id: string;
  ten: string;
  diaChi: string | null;
  tinhThanh: string | null;
  dienThoai: string | null;
  email: string | null;
  coverId: string | null;
  dangHoatDong: boolean;
};

type Props = { orgId: string };

const DRAFT_NEW = "__new__";

function coverUrlFromId(coverId: string | null | undefined): string | null {
  const id = coverId?.trim();
  if (!id) return null;
  return resolveTruongImageSrcSync(id, ["public", "cover", "medium"]);
}

async function uploadBranchCover(
  orgId: string,
  file: File,
): Promise<{ imageId: string; url: string } | null> {
  const form = new FormData();
  form.append("file", file);
  const token =
    process.env.NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN?.trim();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/university/${encodeURIComponent(orgId)}/upload`, {
    method: "POST",
    body: form,
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  return (await res.json()) as { imageId: string; url: string };
}

function OrgBranchCoverPick({
  orgId,
  coverId,
  previewUrl,
  disabled,
  onPicked,
  onClear,
}: {
  orgId: string;
  coverId: string | null;
  previewUrl: string | null;
  disabled?: boolean;
  onPicked: (imageId: string, url: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const src = previewUrl || coverUrlFromId(coverId);

  async function onFile(file: File | undefined) {
    if (!file || disabled) return;
    setUploading(true);
    const uploaded = await uploadBranchCover(orgId, file);
    setUploading(false);
    if (!uploaded) return;
    onPicked(uploaded.imageId, uploaded.url);
  }

  return (
    <div className="cso-cn-cover">
      <button
        type="button"
        className="cso-cn-cover-btn"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        aria-label={src ? "Đổi ảnh cơ sở" : "Thêm ảnh cơ sở"}
        title={src ? "Đổi ảnh cơ sở" : "Thêm ảnh cơ sở"}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            className="cso-cn-cover-img"
            sizes="72px"
            unoptimized={
              src.includes("imagedelivery.net") || src.startsWith("blob:")
            }
          />
        ) : (
          <span className="cso-cn-cover-ph">
            <ImagePlus size={18} strokeWidth={2} aria-hidden />
          </span>
        )}
        {uploading ? <span className="cso-cn-cover-busy">…</span> : null}
      </button>
      {coverId || previewUrl ? (
        <button
          type="button"
          className="cso-cn-cover-clear"
          disabled={disabled || uploading}
          onClick={onClear}
        >
          Xóa ảnh
        </button>
      ) : (
        <span className="cso-cn-cover-hint">Ảnh cơ sở</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="cso-cn-cover-input"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ChiNhanhQuanLyClient({ orgId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** `DRAFT_NEW` = đang thêm hàng mới; uuid = đang sửa. */
  const [draftId, setDraftId] = useState<string | null>(null);
  const [editTen, setEditTen] = useState("");
  const [editDiaChi, setEditDiaChi] = useState("");
  const [editTinhThanh, setEditTinhThanh] = useState("");
  const [editDienThoai, setEditDienThoai] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCoverId, setEditCoverId] = useState<string | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);

  const isCreating = draftId === DRAFT_NEW;
  const isDrafting = draftId !== null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/academy/${orgId}/branches`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải chi nhánh.");
      setRows(
        (data.rows ?? []).map((r: Row) => ({
          ...r,
          coverId: r.coverId ?? null,
        })),
      );
      setCanEdit(Boolean(data.canEdit));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetDraft() {
    setDraftId(null);
    setEditTen("");
    setEditDiaChi("");
    setEditTinhThanh("");
    setEditDienThoai("");
    setEditEmail("");
    setEditCoverId(null);
    setEditCoverPreview(null);
  }

  function startCreate() {
    setDraftId(DRAFT_NEW);
    setEditTen("");
    setEditDiaChi("");
    setEditTinhThanh("");
    setEditDienThoai("");
    setEditEmail("");
    setEditCoverId(null);
    setEditCoverPreview(null);
    setError(null);
    setFlash(null);
  }

  function startEdit(row: Row) {
    setDraftId(row.id);
    setEditTen(row.ten);
    setEditDiaChi(row.diaChi ?? "");
    setEditTinhThanh(row.tinhThanh ?? "");
    setEditDienThoai(row.dienThoai ?? "");
    setEditEmail(row.email ?? "");
    setEditCoverId(row.coverId ?? null);
    setEditCoverPreview(null);
    setError(null);
  }

  async function saveDraft() {
    if (!draftId) return;
    if (!editTen.trim() || !editDiaChi.trim()) {
      setError("Cần tên và địa chỉ chi nhánh.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isCreating) {
        const res = await fetch(`/api/academy/${orgId}/branches`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ten: editTen,
            diaChi: editDiaChi,
            tinhThanh: editTinhThanh || null,
            dienThoai: editDienThoai || null,
            email: editEmail || null,
            coverId: editCoverId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tạo.");
        setFlash("Đã thêm — đồng bộ trang cơ sở.");
      } else {
        const res = await fetch(`/api/academy/${orgId}/branches`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draftId,
            ten: editTen,
            diaChi: editDiaChi || null,
            tinhThanh: editTinhThanh || null,
            dienThoai: editDienThoai || null,
            email: editEmail || null,
            coverId: editCoverId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không cập nhật.");
        setFlash(`Đã lưu «${editTen}».`);
      }
      resetDraft();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: Row) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/academy/${orgId}/branches`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, dangHoatDong: !row.dangHoatDong }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không cập nhật.");
      setFlash(
        row.dangHoatDong
          ? `Đã ẩn «${row.ten}».`
          : `Đã hiện lại «${row.ten}».`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi.");
    } finally {
      setBusy(false);
    }
  }

  const activeCount = rows.filter((r) => r.dangHoatDong).length;

  function renderDraftRow(key: string, statusChip?: ReactNode) {
    return (
      <tr key={key} className="cso-cn-row--editing">
        <td>
          <div className="cso-cn-edit-name">
            <OrgBranchCoverPick
              orgId={orgId}
              coverId={editCoverId}
              previewUrl={editCoverPreview}
              disabled={busy}
              onPicked={(imageId, url) => {
                setEditCoverId(imageId);
                setEditCoverPreview(url);
              }}
              onClear={() => {
                setEditCoverId(null);
                setEditCoverPreview(null);
              }}
            />
            <div className="cso-cn-edit-name-fields">
              <input
                className="cso-ql-input cso-cn-edit-input"
                value={editTen}
                onChange={(e) => setEditTen(e.target.value)}
                placeholder="Tên chi nhánh"
                aria-label="Tên chi nhánh"
                autoFocus
              />
              <input
                className="cso-ql-input cso-cn-edit-input cso-cn-edit-input--sub"
                value={editTinhThanh}
                onChange={(e) => setEditTinhThanh(e.target.value)}
                placeholder="Tỉnh/thành"
                aria-label="Tỉnh/thành"
              />
            </div>
          </div>
        </td>
        <td>
          <input
            className="cso-ql-input cso-cn-edit-input"
            value={editDiaChi}
            onChange={(e) => setEditDiaChi(e.target.value)}
            placeholder="Địa chỉ"
            aria-label="Địa chỉ"
          />
        </td>
        <td>
          <input
            className="cso-ql-input cso-cn-edit-input"
            value={editDienThoai}
            onChange={(e) => setEditDienThoai(e.target.value)}
            placeholder="Điện thoại"
            aria-label="Điện thoại"
          />
          <input
            className="cso-ql-input cso-cn-edit-input cso-cn-edit-input--sub"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
          />
        </td>
        <td>
          {statusChip ?? (
            <span className="cso-hv-chip cso-hv-chip--ok">Mới</span>
          )}
        </td>
        <td>
          <div className="cso-hv-actions">
            <button
              type="button"
              disabled={busy || !editTen.trim() || !editDiaChi.trim()}
              className="cso-ql-btn cso-ql-btn--priv cso-ql-btn--sm"
              onClick={() => void saveDraft()}
            >
              <Check size={14} strokeWidth={2.4} aria-hidden />
              Lưu
            </button>
            <button
              type="button"
              disabled={busy}
              className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
              onClick={resetDraft}
            >
              <X size={14} strokeWidth={2.4} aria-hidden />
              Hủy
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="cso-cn cso-dt-stack">
      {flash ? <p className="cso-ql-flash">{flash}</p> : null}
      {error ? <p className="cso-ql-error">{error}</p> : null}

      <section className="cso-dt-panel">
        <div className="cso-dt-panel-head cso-cn-list-head">
          <div>
            <h2 className="cso-dt-panel-title">Chi nhánh</h2>
            <p className="cso-dt-panel-sub">
              Địa chỉ trên trang cơ sở — sửa / ẩn tại đây sẽ đồng bộ công khai.
              {rows.length > 0
                ? ` · ${activeCount}/${rows.length} đang hoạt động`
                : ""}
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              disabled={busy || isDrafting}
              className="cso-ql-btn cso-ql-btn--priv cso-cn-add"
              onClick={startCreate}
            >
              <Plus size={15} strokeWidth={2.4} aria-hidden />
              Thêm chi nhánh
            </button>
          ) : null}
        </div>
        <div className="cso-dt-panel-body cso-dt-panel-body--flush">
          <div className="cso-hv-table-wrap">
            <table className="cso-hv-table">
              <thead>
                <tr>
                  <th scope="col">Tên</th>
                  <th scope="col">Địa chỉ</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="cso-hv-loading">Đang tải…</div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {isCreating ? renderDraftRow(DRAFT_NEW) : null}
                    {rows.length === 0 && !isCreating ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="cso-hv-empty">
                            <strong>Chưa có chi nhánh</strong>
                            Bấm «Thêm chi nhánh» để thêm địa điểm trên trang cơ
                            sở.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) =>
                        draftId === r.id ? (
                          renderDraftRow(
                            r.id,
                            r.dangHoatDong ? (
                              <span className="cso-hv-chip cso-hv-chip--ok">
                                Hoạt động
                              </span>
                            ) : (
                              <span className="cso-hv-chip cso-hv-chip--state">
                                Ẩn
                              </span>
                            ),
                          )
                        ) : (
                          <tr key={r.id}>
                            <td>
                              <div className="cso-cn-view-name">
                                {coverUrlFromId(r.coverId) ? (
                                  <span
                                    className="cso-cn-cover-thumb"
                                    aria-hidden
                                  >
                                    <Image
                                      src={coverUrlFromId(r.coverId)!}
                                      alt=""
                                      fill
                                      className="cso-cn-cover-img"
                                      sizes="48px"
                                      unoptimized
                                    />
                                  </span>
                                ) : (
                                  <span
                                    className="cso-cn-cover-thumb cso-cn-cover-thumb--empty"
                                    aria-hidden
                                  >
                                    <ImagePlus size={14} strokeWidth={2} />
                                  </span>
                                )}
                                <div>
                                  <p className="cso-hv-name">{r.ten}</p>
                                  {r.tinhThanh ? (
                                    <p className="cso-hv-lop">{r.tinhThanh}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td>
                              <p className="cso-cn-addr">{r.diaChi || "—"}</p>
                            </td>
                            <td>
                              {r.dienThoai || r.email ? (
                                <>
                                  {r.dienThoai ? (
                                    <p className="cso-cn-addr">{r.dienThoai}</p>
                                  ) : null}
                                  {r.email ? (
                                    <p className="cso-hv-lop">{r.email}</p>
                                  ) : null}
                                </>
                              ) : (
                                <span className="cso-hv-days-empty">—</span>
                              )}
                            </td>
                            <td>
                              {r.dangHoatDong ? (
                                <span className="cso-hv-chip cso-hv-chip--ok">
                                  Hoạt động
                                </span>
                              ) : (
                                <span className="cso-hv-chip cso-hv-chip--state">
                                  Ẩn
                                </span>
                              )}
                            </td>
                            <td>
                              {canEdit ? (
                                <div className="cso-hv-actions">
                                  <button
                                    type="button"
                                    disabled={busy || isDrafting}
                                    className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                    onClick={() => startEdit(r)}
                                  >
                                    <Pencil
                                      size={13}
                                      strokeWidth={2.2}
                                      aria-hidden
                                    />
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy || isDrafting}
                                    className="cso-ql-btn cso-ql-btn--ghost cso-ql-btn--sm"
                                    onClick={() => void toggle(r)}
                                  >
                                    {r.dangHoatDong ? "Ẩn" : "Hiện"}
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
