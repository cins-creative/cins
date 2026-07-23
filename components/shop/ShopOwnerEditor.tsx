"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getNameInitials } from "@/lib/journey/profile";
import {
  fetchShopCuaHangClient,
  invalidateBanHangClientCache,
  writeShopCuaHangCache,
} from "@/lib/shop/client-fetch-cache";
import {
  shopPublicHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import type { ShopCuaHang, ShopPhuongThucTt } from "@/lib/shop/types";

import "@/components/journey/journey-shop-view.css";
import "./shop-dashboard.css";

type ApiShopResponse = {
  shop?: ShopCuaHang | null;
  banHangBat?: boolean;
  isOwner?: boolean;
  error?: string;
};

type Props = {
  /** Slug trang cá nhân — link xem mặt tiền + initials. */
  ownerSlug?: string | null;
  ownerName?: string | null;
};

export function ShopOwnerEditor({ ownerSlug, ownerName }: Props) {
  const router = useRouter();
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paySavedMsg, setPaySavedMsg] = useState<string | null>(null);
  const [savingPay, setSavingPay] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [ten, setTen] = useState("");
  const [moTa, setMoTa] = useState("");

  const [nganHang, setNganHang] = useState("");
  const [soTaiKhoan, setSoTaiKhoan] = useState("");
  const [tenChuTk, setTenChuTk] = useState("");
  const [editingPtttId, setEditingPtttId] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const applyShop = useCallback((next: ShopCuaHang | null) => {
    setShop(next);
    setTen(next?.ten ?? "");
    setMoTa(next?.moTa ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchShopCuaHangClient();
      applyShop(data.shop);
      if (data.shop) {
        window.dispatchEvent(
          new CustomEvent("cins:shop-profile-changed", {
            detail: { ownerId: data.shop.idNguoiDung, shop: data.shop },
          }),
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được cửa hàng.");
      applyShop(null);
    } finally {
      setLoading(false);
    }
  }, [applyShop]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadImage(file: File): Promise<{ id: string; url: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/post-image/upload", { method: "POST", body: fd });
    const json = (await res.json().catch(() => null)) as {
      imageId?: string;
      url?: string;
      error?: string;
    } | null;
    if (!res.ok || !json?.imageId || !json.url) {
      throw new Error(json?.error ?? "Upload thất bại.");
    }
    return { id: json.imageId, url: json.url };
  }

  async function patchShop(body: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/cua-hang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as ApiShopResponse | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được.");
        return false;
      }
      const next = json?.shop ?? null;
      applyShop(next);
      if (next) {
        writeShopCuaHangCache(next, {
          slug: ownerSlug,
          isOwner: true,
        });
        invalidateBanHangClientCache();
        window.dispatchEvent(
          new CustomEvent("cins:shop-profile-changed", {
            detail: { ownerId: next.idNguoiDung, shop: next },
          }),
        );
      }
      return true;
    } catch {
      setErr("Không lưu được.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function ptttFormReady(): boolean {
    return (
      Boolean(nganHang.trim()) &&
      Boolean(soTaiKhoan.trim()) &&
      Boolean(tenChuTk.trim())
    );
  }

  async function savePhuongThucTt(): Promise<boolean> {
    if (!ptttFormReady()) {
      setErr("Điền đủ ngân hàng, số tài khoản và tên chủ tài khoản.");
      return false;
    }
    const wasEditing = Boolean(editingPtttId);
    setSavingPay(true);
    setPaySavedMsg(null);
    try {
      const ok = await patchShop({
        phuongThuc: {
          id: editingPtttId ?? undefined,
          nganHang,
          soTaiKhoan,
          tenChuTaiKhoan: tenChuTk,
          qrAnhId: null,
          macDinh: true,
          kichHoat: true,
        },
      });
      if (ok) {
        resetPtttForm();
        setPaySavedMsg(
          wasEditing
            ? "Đã cập nhật tài khoản nhận tiền."
            : "Đã lưu tài khoản nhận tiền.",
        );
      }
      return ok;
    } finally {
      setSavingPay(false);
    }
  }

  function fillPtttForm(p: ShopPhuongThucTt) {
    setEditingPtttId(p.id);
    setNganHang(p.nganHang);
    setSoTaiKhoan(p.soTaiKhoan);
    setTenChuTk(p.tenChuTaiKhoan);
    setPaySavedMsg(null);
  }

  function resetPtttForm() {
    setEditingPtttId(null);
    setNganHang("");
    setSoTaiKhoan("");
    setTenChuTk("");
  }

  const nameFallback = ownerName?.trim() || "Cửa hàng";
  const deleteConfirmTarget =
    shop?.ten?.trim() || ten.trim() || nameFallback;

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteConfirmName("");
  }

  async function confirmDeleteShop() {
    if (deleteConfirmName.trim() !== deleteConfirmTarget) return;
    setDeleting(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/cua-hang", { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không xóa được cửa hàng.");
        setDeleteOpen(false);
        setDeleteConfirmName("");
        return;
      }
      invalidateBanHangClientCache();
      window.dispatchEvent(
        new CustomEvent("cins:shop-profile-changed", {
          detail: { ownerId: shop?.idNguoiDung ?? null, shop: null },
        }),
      );
      setDeleteOpen(false);
      setDeleteConfirmName("");
      router.replace("/");
      router.refresh();
    } catch {
      setErr("Không xóa được cửa hàng.");
      setDeleteOpen(false);
      setDeleteConfirmName("");
    } finally {
      setDeleting(false);
    }
  }

  const slug = ownerSlug?.trim() || "";
  const initials = getNameInitials(shop?.ten || ten, slug || "shop");
  const ready = shop?.sanSangNhanDon === true;
  const deleteNameMatched =
    deleteConfirmName.trim() === deleteConfirmTarget;

  if (loading) {
    return (
      <div className="j-shop-loading" aria-busy="true">
        <Loader2 size={18} className="shop-spin" aria-hidden />
        Đang tải cửa hàng…
      </div>
    );
  }

  return (
    <div className="j-shop j-shop-owner-editor-page">
      {err ? (
        <p className="j-shop-err" role="alert">
          {err}
        </p>
      ) : null}

      {!ready ? (
        <div className="j-shop-setup-callout">
          <Wallet size={18} aria-hidden />
          <div>
            <strong>Cần lưu tài khoản nhận tiền</strong>
            <p>Có STK mới mở kho và gắn hàng lên bài để khách mua.</p>
          </div>
        </div>
      ) : null}

      {slug ? (
        <p className="j-shop-owner-editor-view">
          <Link href={shopPublicHref(slug, shopSlugFromTen(ten || shop?.ten, slug))}>
            Xem mặt tiền cửa hàng
          </Link>
        </p>
      ) : null}

      <div id="j-shop-owner-editor" className="j-shop-owner-grid">
        <section
          className="j-shop-panel j-shop-panel-face"
          aria-labelledby="j-shop-panel-face"
        >
          <header className="j-shop-panel-head">
            <h3 id="j-shop-panel-face">Mặt tiền</h3>
            <p className="j-shop-panel-desc">
              Banner, avatar, tên và mô tả khách thấy.
            </p>
          </header>

          <div className="j-shop-media-compact">
            <button
              type="button"
              className="j-shop-cover-edit"
              disabled={coverUploading || saving}
              onClick={() => coverInputRef.current?.click()}
            >
              {shop?.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop.coverUrl} alt="" />
              ) : (
                <span className="j-shop-cover-placeholder">
                  <Camera size={16} aria-hidden />
                  Ảnh bìa
                </span>
              )}
              <span className="j-shop-media-badge">
                {coverUploading ? (
                  <Loader2 size={12} className="shop-spin" />
                ) : (
                  <Camera size={12} />
                )}
              </span>
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void (async () => {
                  setCoverUploading(true);
                  try {
                    const up = await uploadImage(file);
                    await patchShop({ coverId: up.id });
                  } catch (ex) {
                    setErr(
                      ex instanceof Error ? ex.message : "Upload thất bại.",
                    );
                  } finally {
                    setCoverUploading(false);
                  }
                })();
              }}
            />

            <button
              type="button"
              className="j-shop-avatar-edit"
              disabled={avatarUploading || saving}
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Đổi avatar shop"
            >
              {shop?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop.avatarUrl} alt="" />
              ) : (
                <span>{initials}</span>
              )}
              <span className="j-shop-media-badge">
                {avatarUploading ? (
                  <Loader2 size={11} className="shop-spin" />
                ) : (
                  <Camera size={11} />
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void (async () => {
                  setAvatarUploading(true);
                  try {
                    const up = await uploadImage(file);
                    await patchShop({ avatarId: up.id });
                  } catch (ex) {
                    setErr(
                      ex instanceof Error ? ex.message : "Upload thất bại.",
                    );
                  } finally {
                    setAvatarUploading(false);
                  }
                })();
              }}
            />
          </div>

          <form
            className="j-shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                const ok = await patchShop({
                  ten: ten.trim() || null,
                  moTa: moTa.trim() || null,
                });
                if (ok && ptttFormReady()) {
                  await savePhuongThucTt();
                }
              })();
            }}
          >
            <label>
              <span>Tên cửa hàng</span>
              <input
                value={ten}
                onChange={(e) => setTen(e.target.value)}
                maxLength={120}
                placeholder={nameFallback}
              />
            </label>
            <label>
              <span>Mô tả ngắn</span>
              <textarea
                rows={2}
                value={moTa}
                onChange={(e) => setMoTa(e.target.value)}
                maxLength={2000}
                placeholder="Bán gì, nhận hàng thế nào…"
              />
            </label>
            <button type="submit" className="j-shop-save" disabled={saving}>
              {saving && !savingPay ? (
                <Loader2 size={16} className="shop-spin" aria-hidden />
              ) : (
                <Check size={16} aria-hidden />
              )}
              Lưu mặt tiền
            </button>
          </form>
        </section>

        <section
          className={`j-shop-panel j-shop-panel-pay${!ready ? " is-priority" : ""}`}
          aria-labelledby="j-shop-panel-pay"
        >
          <header className="j-shop-panel-head">
            <h3 id="j-shop-panel-pay">
              <Wallet size={16} aria-hidden />
              Nhận tiền
              {!ready ? (
                <span className="j-shop-panel-badge">Bắt buộc</span>
              ) : null}
            </h3>
            <p className="j-shop-panel-desc">
              Một STK chuyển khoản cho cửa hàng. Điền xong phải bấm lưu — đóng
              trang sẽ mất.
            </p>
          </header>

          {paySavedMsg ? (
            <p className="j-shop-pay-ok" role="status">
              <Check size={14} aria-hidden />
              {paySavedMsg}
            </p>
          ) : null}

          {shop?.phuongThucTt.length ? (
            <ul className="j-shop-pay-owned">
              {shop.phuongThucTt.map((p) => (
                <li key={p.id} className="j-shop-pay-saved">
                  <div className="j-shop-pay-saved-main">
                    <div className="j-shop-pay-saved-top">
                      <span className="j-shop-pay-bank">{p.nganHang}</span>
                    </div>
                    <p className="j-shop-pay-stk">{p.soTaiKhoan}</p>
                    <p className="j-shop-pay-holder">{p.tenChuTaiKhoan}</p>
                    <div className="j-shop-pay-actions">
                      <button
                        type="button"
                        aria-label="Sửa tài khoản"
                        title="Sửa"
                        onClick={() => fillPtttForm(p)}
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        aria-label="Xóa tài khoản"
                        onClick={() =>
                          void patchShop({ xoaPhuongThucId: p.id })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="j-shop-pay-empty">Chưa có tài khoản nhận tiền.</p>
          )}

          {!shop?.phuongThucTt.length || editingPtttId ? (
            <form
              className="j-shop-form j-shop-form-pay"
              onSubmit={(e) => {
                e.preventDefault();
                void savePhuongThucTt();
              }}
            >
              <div className="j-shop-pay-fields">
                <label>
                  <span>Ngân hàng</span>
                  <input
                    value={nganHang}
                    onChange={(e) => {
                      setNganHang(e.target.value);
                      setPaySavedMsg(null);
                    }}
                    required
                    placeholder="VD: MB Bank"
                  />
                </label>
                <label>
                  <span>Số tài khoản</span>
                  <input
                    value={soTaiKhoan}
                    onChange={(e) => {
                      setSoTaiKhoan(e.target.value);
                      setPaySavedMsg(null);
                    }}
                    required
                    inputMode="numeric"
                    placeholder="Số tài khoản"
                  />
                </label>
                <label className="j-shop-pay-span">
                  <span>Tên chủ tài khoản</span>
                  <input
                    value={tenChuTk}
                    onChange={(e) => {
                      setTenChuTk(e.target.value.toLocaleUpperCase("vi-VN"));
                      setPaySavedMsg(null);
                    }}
                    autoCapitalize="characters"
                    required
                    placeholder="Đúng như trên app ngân hàng"
                  />
                </label>
              </div>

              <p className="j-shop-pay-qr-note">
                QR chuyển khoản sẽ tự tạo khi khách thanh toán (theo STK, số tiền
                và mã đơn).
              </p>

              <div className="j-shop-form-actions">
                <button
                  type="submit"
                  className="j-shop-save j-shop-save-pay"
                  disabled={saving || savingPay}
                >
                  {savingPay ? (
                    <Loader2 size={16} className="shop-spin" aria-hidden />
                  ) : (
                    <Check size={16} aria-hidden />
                  )}
                  {editingPtttId
                    ? "Lưu chỉnh sửa tài khoản"
                    : "Lưu tài khoản nhận tiền"}
                </button>
                {editingPtttId ? (
                  <button type="button" onClick={resetPtttForm}>
                    Hủy sửa
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
        </section>
      </div>

      <section className="j-shop-danger-zone" aria-labelledby="j-shop-danger-title">
        <header className="j-shop-panel-head">
          <h3 id="j-shop-danger-title">Xóa cửa hàng</h3>
          <p className="j-shop-panel-desc">
            Ẩn cửa hàng, tắt bán hàng và ẩn kho. Mặt tiền cùng STK vẫn giữ trong
            hệ thống; đơn cũ không mất.
          </p>
        </header>
        <button
          type="button"
          className="j-shop-delete-trigger"
          disabled={deleting || saving}
          onClick={() => {
            setDeleteConfirmName("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 size={15} aria-hidden />
          Xóa cửa hàng
        </button>
      </section>

      {deleteOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="shop-kho-delete-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeDeleteDialog();
              }}
            >
              <div
                className="shop-kho-delete-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="j-shop-delete-title"
                aria-describedby="j-shop-delete-desc"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="shop-kho-delete-icon" aria-hidden>
                  <AlertTriangle size={22} strokeWidth={2.2} />
                </div>
                <h3 id="j-shop-delete-title">Xóa cửa hàng?</h3>
                <p id="j-shop-delete-desc" className="shop-kho-delete-desc">
                  Cửa hàng sẽ bị ẩn: tắt bán hàng, ẩn shop công khai và ẩn sản
                  phẩm khỏi kho. Mặt tiền cùng STK nhận tiền vẫn giữ trong hệ
                  thống; đơn hàng cũ không mất. Bật lại bán hàng sau này có thể
                  khôi phục mặt tiền đã lưu.
                </p>
                <label className="j-shop-delete-confirm-label">
                  <span>
                    Nhập <strong>«{deleteConfirmTarget}»</strong> để xác nhận
                  </span>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={deleting}
                    placeholder={deleteConfirmTarget}
                    aria-label={`Nhập tên cửa hàng ${deleteConfirmTarget} để xác nhận xóa`}
                  />
                </label>
                <div className="shop-kho-delete-actions">
                  <button
                    type="button"
                    className="shop-kho-delete-cancel"
                    disabled={deleting}
                    onClick={closeDeleteDialog}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="shop-dash-danger shop-kho-delete-confirm"
                    disabled={deleting || !deleteNameMatched}
                    onClick={() => void confirmDeleteShop()}
                  >
                    {deleting ? (
                      <Loader2 className="shop-spin" size={16} aria-hidden />
                    ) : (
                      <Trash2 size={16} aria-hidden />
                    )}
                    Xóa cửa hàng
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
