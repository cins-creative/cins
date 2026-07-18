"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import type { ShopEvidence, ShopQuaySuKien } from "@/lib/shop/types";
import { SHOP_TRANG_THAI_QUAY_LABEL } from "@/lib/shop/types";
import { formatTimelineDate } from "@/lib/truong/timeline";

import "./shop-dashboard.css";

const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

type SuKienOpt = {
  id: string;
  ten: string;
  orgTen?: string;
  batDau?: string;
  status?: string;
  coverSrc?: string | null;
  orgAvatarUrl?: string | null;
};

type ModalTab = "xin" | "quan-ly";

type Props = {
  open: boolean;
  milestoneId: string;
  onClose: () => void;
};

export function ShopXinQuayModal({ open, milestoneId, onClose }: Props) {
  const titleId = useId();
  const listId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);

  const [tab, setTab] = useState<ModalTab>("xin");
  const [events, setEvents] = useState<SuKienOpt[]>([]);
  const [mine, setMine] = useState<ShopQuaySuKien[]>([]);
  const [query, setQuery] = useState("");
  const [suKienId, setSuKienId] = useState("");
  const [note, setNote] = useState("");
  const [anhUrl, setAnhUrl] = useState<string | null>(null);
  const [anhId, setAnhId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mineLoading, setMineLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyQuayId, setBusyQuayId] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawLyDo, setWithdrawLyDo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function clearLocalPreview() {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
  }

  function resetEvidence() {
    clearLocalPreview();
    setNote("");
    setAnhUrl(null);
    setAnhId(null);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      const res = await fetch("/api/shop/quay/cua-toi", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopQuaySuKien[];
      } | null;
      setMine(res.ok ? (json?.items ?? []) : []);
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setOk(false);
    setErr(null);
    setQuery("");
    setSuKienId("");
    setTab("xin");
    setWithdrawId(null);
    setWithdrawLyDo("");
    resetEvidence();
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/su-kien/list?upcoming=1&limit=8", {
          cache: "no-store",
        }).catch(() => null);
        if (res?.ok) {
          const json = (await res.json()) as {
            items?: Array<{
              id?: unknown;
              ten?: unknown;
              orgTen?: unknown;
              batDau?: unknown;
              status?: unknown;
              coverSrc?: unknown;
              orgAvatarUrl?: unknown;
            }>;
          };
          const items: SuKienOpt[] = (json.items ?? [])
            .filter(
              (it): it is typeof it & { id: string; ten: string } =>
                typeof it.id === "string" && typeof it.ten === "string",
            )
            .map((it) => ({
              id: it.id,
              ten: it.ten,
              orgTen: typeof it.orgTen === "string" ? it.orgTen : undefined,
              batDau: typeof it.batDau === "string" ? it.batDau : undefined,
              status: typeof it.status === "string" ? it.status : undefined,
              coverSrc:
                typeof it.coverSrc === "string" && it.coverSrc.trim()
                  ? it.coverSrc.trim()
                  : null,
              orgAvatarUrl:
                typeof it.orgAvatarUrl === "string" && it.orgAvatarUrl.trim()
                  ? it.orgAvatarUrl.trim()
                  : null,
            }));
          setEvents(items);
          if (items[0]) setSuKienId(items[0].id);
        } else {
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    })();
    void loadMine();
    return () => {
      clearLocalPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when modal opens
  }, [open, loadMine]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => {
      const hay = `${ev.ten} ${ev.orgTen ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [events, query]);

  async function onPickImage(file: File | null) {
    if (!file) return;
    if (!isAllowedUploadImageFile(file)) {
      setErr("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      setErr("Ảnh quá lớn (giới hạn 8MB).");
      return;
    }

    clearLocalPreview();
    const localUrl = URL.createObjectURL(file);
    localUrlRef.current = localUrl;
    setAnhUrl(localUrl);
    setAnhId(null);
    setUploading(true);
    setErr(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => null)) as {
        url?: string;
        imageId?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.url) {
        throw new Error(json?.error ?? "Không tải ảnh được.");
      }
      clearLocalPreview();
      setAnhUrl(json.url);
      setAnhId(json.imageId?.trim() || null);
    } catch (e) {
      clearLocalPreview();
      setAnhUrl(null);
      setAnhId(null);
      setErr(e instanceof Error ? e.message : "Không tải ảnh được.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (!suKienId.trim()) {
      setErr("Chọn sự kiện sắp diễn ra.");
      return;
    }
    if (uploading) {
      setErr("Đợi ảnh tải xong rồi gửi.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const bangChung: ShopEvidence[] = [];
      if (anhUrl && anhId) {
        bangChung.push({
          label: "Ảnh xác thực",
          kind: "file",
          href: anhUrl,
          detail: anhId,
        });
      } else if (anhUrl && !anhUrl.startsWith("blob:")) {
        bangChung.push({
          label: "Ảnh xác thực",
          kind: "file",
          href: anhUrl,
        });
      }
      if (note.trim()) {
        bangChung.push({
          label: "Ghi chú xác thực",
          kind: "text",
          detail: note.trim(),
        });
      }

      const res = await fetch(`/api/su-kien/${suKienId}/quay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cotMocId: milestoneId,
          bangChung,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không gửi được.");
        return;
      }
      setOk(true);
      void loadMine();
    } finally {
      setSaving(false);
    }
  }

  async function confirmWithdraw() {
    if (!withdrawId) return;
    const lyDo = withdrawLyDo.trim();
    if (!lyDo) {
      setErr("Nhập lý do rút khỏi sự kiện.");
      return;
    }
    const row = mine.find((q) => q.id === withdrawId);
    if (!row) return;
    setBusyQuayId(withdrawId);
    setErr(null);
    try {
      const res = await fetch(`/api/su-kien/${row.idSuKien}/quay/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw", lyDo }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không rút được.");
        return;
      }
      setWithdrawId(null);
      setWithdrawLyDo("");
      await loadMine();
    } finally {
      setBusyQuayId(null);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="uas-backdrop" role="presentation" onClick={onClose}>
      <div
        className="uas-modal shop-xin-quay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <h2 id={titleId} className="uas-title">
            Tham gia sự kiện
          </h2>
          <button type="button" className="uas-close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div
          className="shop-xin-quay-tabs"
          role="tablist"
          aria-label="Tham gia sự kiện"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "xin"}
            className={
              tab === "xin"
                ? "shop-xin-quay-tab is-active"
                : "shop-xin-quay-tab"
            }
            onClick={() => {
              setTab("xin");
              setErr(null);
            }}
          >
            Xin tham gia
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "quan-ly"}
            className={
              tab === "quan-ly"
                ? "shop-xin-quay-tab is-active"
                : "shop-xin-quay-tab"
            }
            onClick={() => {
              setTab("quan-ly");
              setErr(null);
              setOk(false);
              void loadMine();
            }}
          >
            Đã / đang tham gia
            {mine.length > 0 ? (
              <span className="shop-xin-quay-tab-count">{mine.length}</span>
            ) : null}
          </button>
        </div>

        <div className="shop-xin-quay-body">
          {err ? (
            <p className="shop-xin-quay-err" role="alert">
              {err}
            </p>
          ) : null}

          {tab === "xin" ? (
            ok ? (
              <p className="shop-xin-quay-ok">
                Đã gửi yêu cầu. Chờ ban tổ chức duyệt.
              </p>
            ) : loading ? (
              <p className="shop-xin-quay-loading">
                <Loader2 className="shop-spin" size={16} /> Đang tải…
              </p>
            ) : (
              <>
                <section className="shop-xin-quay-section">
                  <header className="shop-xin-quay-section-head">
                    <h3 className="shop-xin-quay-section-title">Chọn sự kiện</h3>
                    <p className="shop-xin-quay-section-desc">
                      Tìm và chọn sự kiện sắp diễn ra gần nhất.
                    </p>
                  </header>
                  <label className="shop-xin-quay-search">
                    <span className="visually-hidden">Tìm sự kiện</span>
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm theo tên sự kiện…"
                      autoComplete="off"
                      aria-controls={listId}
                    />
                  </label>
                  {filtered.length > 0 ? (
                    <ul
                      id={listId}
                      className="shop-xin-quay-list"
                      role="listbox"
                      aria-label="Sự kiện sắp diễn ra"
                    >
                      {filtered.map((ev) => {
                        const selected = ev.id === suKienId;
                        const dateLbl = formatTimelineDate(ev.batDau);
                        const thumbSrc = ev.coverSrc || ev.orgAvatarUrl || null;
                        return (
                          <li key={ev.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={
                                selected
                                  ? "shop-xin-quay-item is-selected"
                                  : "shop-xin-quay-item"
                              }
                              onClick={() => setSuKienId(ev.id)}
                            >
                              <span
                                className={
                                  thumbSrc
                                    ? "shop-xin-quay-thumb"
                                    : "shop-xin-quay-thumb is-empty"
                                }
                                aria-hidden
                              >
                                {thumbSrc ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumbSrc}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      const img = e.currentTarget;
                                      const fallback = ev.orgAvatarUrl;
                                      if (
                                        fallback &&
                                        img.getAttribute("src") !== fallback &&
                                        !img.dataset.fallback
                                      ) {
                                        img.dataset.fallback = "1";
                                        img.src = fallback;
                                        return;
                                      }
                                      img.style.display = "none";
                                      img.parentElement?.classList.add(
                                        "is-empty",
                                      );
                                    }}
                                  />
                                ) : null}
                              </span>
                              <span className="shop-xin-quay-item-copy">
                                <span className="shop-xin-quay-item-ten">
                                  {ev.ten}
                                </span>
                                <span className="shop-xin-quay-item-meta">
                                  {dateLbl ? `${dateLbl}` : null}
                                  {dateLbl && ev.orgTen ? " · " : null}
                                  {ev.orgTen ?? null}
                                  {ev.status === "active"
                                    ? " · Đang diễn ra"
                                    : null}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="shop-xin-quay-empty">
                      {events.length === 0
                        ? "Chưa có sự kiện sắp diễn ra."
                        : "Không khớp tên sự kiện trong danh sách."}
                    </p>
                  )}
                </section>

                <section className="shop-xin-quay-section">
                  <header className="shop-xin-quay-section-head">
                    <h3 className="shop-xin-quay-section-title">
                      Bằng chứng xác thực
                      <span className="shop-xin-quay-optional">Tuỳ chọn</span>
                    </h3>
                    <p className="shop-xin-quay-section-desc">
                      Ảnh hoặc ghi chú giúp ban tổ chức nhận đúng người đăng ký.
                    </p>
                  </header>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="shop-xin-quay-file"
                    disabled={uploading}
                    onChange={(e) =>
                      void onPickImage(e.target.files?.[0] ?? null)
                    }
                  />
                  {anhUrl ? (
                    <div className="shop-xin-quay-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={anhUrl} alt="Ảnh bằng chứng xác thực" />
                      {uploading ? (
                        <div className="shop-xin-quay-preview-busy">
                          <Loader2
                            size={16}
                            className="shop-spin"
                            aria-hidden
                          />
                          Đang tải lên…
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="shop-xin-quay-preview-clear"
                          onClick={() => {
                            clearLocalPreview();
                            setAnhUrl(null);
                            setAnhId(null);
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                        >
                          Gỡ ảnh
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="shop-xin-quay-upload-btn"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? (
                        <>
                          <Loader2
                            size={16}
                            className="shop-spin"
                            aria-hidden
                          />
                          Đang tải…
                        </>
                      ) : (
                        <>
                          <ImagePlus size={16} strokeWidth={2} aria-hidden />
                          Tải ảnh lên
                        </>
                      )}
                    </button>
                  )}
                  <textarea
                    className="shop-xin-quay-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú thêm cho ban tổ chức…"
                  />
                </section>
              </>
            )
          ) : mineLoading ? (
            <p className="shop-xin-quay-loading">
              <Loader2 className="shop-spin" size={16} /> Đang tải…
            </p>
          ) : mine.length === 0 ? (
            <p className="shop-xin-quay-empty">
              Bạn chưa có quầy đang chờ duyệt hoặc đã được duyệt.
            </p>
          ) : (
            <ul className="shop-xin-quay-mine-list">
              {mine.map((q) => {
                const dateLbl = formatTimelineDate(q.suKienBatDau);
                const isWithdraw = withdrawId === q.id;
                return (
                  <li key={q.id} className="shop-xin-quay-mine-item">
                    <div className="shop-xin-quay-mine-copy">
                      <strong>
                        {q.suKienTen?.trim() || "Sự kiện"}
                      </strong>
                      <span className="shop-xin-quay-item-meta">
                        {SHOP_TRANG_THAI_QUAY_LABEL[q.trangThai]}
                        {dateLbl ? ` · ${dateLbl}` : null}
                        {q.orgTen ? ` · ${q.orgTen}` : null}
                      </span>
                    </div>
                    {isWithdraw ? (
                      <div className="shop-xin-quay-withdraw">
                        <textarea
                          className="shop-xin-quay-note"
                          rows={2}
                          value={withdrawLyDo}
                          onChange={(e) => setWithdrawLyDo(e.target.value)}
                          placeholder="Lý do rút khỏi sự kiện…"
                          autoFocus
                        />
                        <div className="shop-xin-quay-withdraw-actions">
                          <button
                            type="button"
                            className="shop-xin-quay-withdraw-cancel"
                            disabled={busyQuayId === q.id}
                            onClick={() => {
                              setWithdrawId(null);
                              setWithdrawLyDo("");
                            }}
                          >
                            Huỷ
                          </button>
                          <button
                            type="button"
                            className="shop-xin-quay-withdraw-confirm"
                            disabled={
                              busyQuayId === q.id || !withdrawLyDo.trim()
                            }
                            onClick={() => void confirmWithdraw()}
                          >
                            {busyQuayId === q.id ? (
                              <Loader2 className="shop-spin" size={14} />
                            ) : (
                              "Xác nhận rút"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="shop-xin-quay-withdraw-btn"
                        disabled={busyQuayId === q.id}
                        onClick={() => {
                          setWithdrawId(q.id);
                          setWithdrawLyDo("");
                          setErr(null);
                        }}
                      >
                        Rút khỏi sự kiện
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {tab === "xin" && !ok ? (
          <footer className="shop-xin-quay-foot">
            <button
              type="button"
              className="shop-xin-quay-submit"
              disabled={saving || uploading || !suKienId}
              onClick={() => void submit()}
            >
              {saving ? (
                <Loader2 className="shop-spin" size={16} />
              ) : (
                "Gửi duyệt"
              )}
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
