"use client";

import { ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import type { ShopEvidence, ShopQuaySuKien } from "@/lib/shop/types";
import { SHOP_TRANG_THAI_QUAY_LABEL } from "@/lib/shop/types";
import { suKienCardPath, suKienDetailPath } from "@/lib/to-chuc/su-kien-routes";
import { formatTimelineDate } from "@/lib/truong/timeline";

import "@/components/cins/user-account-settings-modal.css";
import "./shop-dashboard.css";

const UPLOAD_MAX_BYTES = MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES;

type SuKienOpt = {
  id: string;
  slug?: string | null;
  ten: string;
  orgTen?: string;
  batDau?: string;
  status?: string;
  coverSrc?: string | null;
  orgAvatarUrl?: string | null;
};

type PanelTab = "xin" | "quan-ly";

type Props = {
  /** Khi false — không fetch (dùng nếu bọc lazy). Mặc định true. */
  active?: boolean;
};

/**
 * Xin / quản lý quầy sự kiện theo shop (`id_cot_moc = null`).
 * Dùng trên tab `/seller/events`.
 */
export function ShopXinQuayPanel({ active = true }: Props) {
  const listId = useId();
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);

  const [tab, setTab] = useState<PanelTab>("xin");
  const [events, setEvents] = useState<SuKienOpt[]>([]);
  const [mine, setMine] = useState<ShopQuaySuKien[]>([]);
  const [query, setQuery] = useState("");
  const [applyEvent, setApplyEvent] = useState<SuKienOpt | null>(null);
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
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

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

  function closeApplyModal() {
    if (saving || uploading) return;
    setApplyEvent(null);
    setModalErr(null);
    resetEvidence();
  }

  function openApplyModal(ev: SuKienOpt) {
    setOk(false);
    setErr(null);
    setModalErr(null);
    resetEvidence();
    setApplyEvent(ev);
  }

  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      const res = await fetch("/api/shop/booths/mine", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopQuaySuKien[];
      } | null;
      setMine(res.ok ? (json?.items ?? []) : []);
    } finally {
      setMineLoading(false);
    }
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    setOk(false);
    setErr(null);
    setModalErr(null);
    setQuery("");
    setApplyEvent(null);
    setTab("xin");
    setWithdrawId(null);
    setWithdrawLyDo("");
    resetEvidence();
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/events/list?upcoming=1&limit=24", {
          cache: "no-store",
        }).catch(() => null);
        if (res?.ok) {
          const json = (await res.json()) as {
            items?: Array<{
              id?: unknown;
              slug?: unknown;
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
              slug: typeof it.slug === "string" ? it.slug : null,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when panel becomes active
  }, [active, loadMine]);

  useEffect(() => {
    if (!applyEvent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeApplyModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close uses latest saving/uploading
  }, [applyEvent, saving, uploading]);

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
      setModalErr("Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      setModalErr(cloudflareImageTooLargeError());
      return;
    }

    clearLocalPreview();
    const localUrl = URL.createObjectURL(file);
    localUrlRef.current = localUrl;
    setAnhUrl(localUrl);
    setAnhId(null);
    setUploading(true);
    setModalErr(null);

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
      setModalErr(e instanceof Error ? e.message : "Không tải ảnh được.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (!applyEvent) {
      setModalErr("Chọn sự kiện sắp diễn ra.");
      return;
    }
    if (uploading) {
      setModalErr("Đợi ảnh tải xong rồi gửi.");
      return;
    }
    setSaving(true);
    setModalErr(null);
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

      const res = await fetch(`/api/events/${applyEvent.id}/booths`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bangChung }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setModalErr(json?.error ?? "Không gửi được.");
        return;
      }
      setApplyEvent(null);
      resetEvidence();
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
      const res = await fetch(`/api/events/${row.idSuKien}/booths/${row.id}`, {
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

  const applyModal =
    portalReady && applyEvent
      ? createPortal(
          <div
            className="uas-backdrop"
            role="presentation"
            onClick={closeApplyModal}
          >
            <div
              className="uas-modal shop-xin-quay-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="uas-head">
                <h2 id={titleId} className="uas-title">
                  Xin tham gia
                </h2>
                <button
                  type="button"
                  className="uas-close"
                  onClick={closeApplyModal}
                  disabled={saving || uploading}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="shop-xin-quay-body">
                <div className="shop-xin-quay-apply-target">
                  <strong>{applyEvent.ten}</strong>
                  <span className="shop-xin-quay-item-meta">
                    {formatTimelineDate(applyEvent.batDau)}
                    {applyEvent.orgTen
                      ? ` · ${applyEvent.orgTen}`
                      : null}
                    {applyEvent.status === "active"
                      ? " · Đang diễn ra"
                      : null}
                  </span>
                </div>

                {modalErr ? (
                  <p className="shop-xin-quay-err" role="alert">
                    {modalErr}
                  </p>
                ) : null}

                <section className="shop-xin-quay-section">
                  <header className="shop-xin-quay-section-head">
                    <h3 className="shop-xin-quay-section-title">
                      Bằng chứng xác thực
                      <span className="shop-xin-quay-optional">Tuỳ chọn</span>
                    </h3>
                    <p className="shop-xin-quay-section-desc">
                      Ảnh hoặc ghi chú giúp ban tổ chức nhận đúng shop đăng ký.
                    </p>
                  </header>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="shop-xin-quay-file"
                    disabled={uploading || saving}
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
                          disabled={saving}
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
                      disabled={uploading || saving}
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
                    disabled={saving}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú thêm cho ban tổ chức…"
                  />
                </section>
              </div>

              <footer className="shop-xin-quay-foot">
                <button
                  type="button"
                  className="shop-xin-quay-withdraw-cancel"
                  disabled={saving || uploading}
                  onClick={closeApplyModal}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="shop-xin-quay-submit"
                  disabled={saving || uploading}
                  onClick={() => void submit()}
                >
                  {saving ? (
                    <Loader2 className="shop-spin" size={16} />
                  ) : (
                    "Gửi duyệt"
                  )}
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section
        className="shop-dash-card shop-xin-quay-panel"
        aria-label="Sự kiện"
      >
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
              tab === "xin" ? "shop-xin-quay-tab is-active" : "shop-xin-quay-tab"
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
              setApplyEvent(null);
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
                Đã gửi yêu cầu. Chờ ban tổ chức duyệt. Shop sẽ hiện trên mặt tiền
                khi được duyệt.{" "}
                <button
                  type="button"
                  className="shop-xin-quay-ok-again"
                  onClick={() => setOk(false)}
                >
                  Xin thêm sự kiện khác
                </button>
              </p>
            ) : loading ? (
              <p className="shop-xin-quay-loading">
                <Loader2 className="shop-spin" size={16} /> Đang tải…
              </p>
            ) : (
              <section className="shop-xin-quay-section">
                <header className="shop-xin-quay-section-head">
                  <h3 className="shop-xin-quay-section-title">Chọn sự kiện</h3>
                  <p className="shop-xin-quay-section-desc">
                    Bấm sự kiện để đăng ký cửa hàng. Icon mở trang sự kiện.
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
                      const dateLbl = formatTimelineDate(ev.batDau);
                      const thumbSrc = ev.coverSrc || ev.orgAvatarUrl || null;
                      const href = suKienCardPath(ev);
                      return (
                        <li key={ev.id}>
                          <div
                            role="option"
                            aria-selected={applyEvent?.id === ev.id}
                            className={
                              applyEvent?.id === ev.id
                                ? "shop-xin-quay-item is-selected"
                                : "shop-xin-quay-item"
                            }
                          >
                            <button
                              type="button"
                              className="shop-xin-quay-item-main"
                              onClick={() => openApplyModal(ev)}
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
                            <Link
                              href={href}
                              className="shop-xin-quay-open"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Mở trang sự kiện ${ev.ten}`}
                              title="Mở trang sự kiện"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink
                                size={16}
                                strokeWidth={2}
                                aria-hidden
                              />
                            </Link>
                          </div>
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
            )
          ) : mineLoading ? (
            <p className="shop-xin-quay-loading">
              <Loader2 className="shop-spin" size={16} /> Đang tải…
            </p>
          ) : mine.length === 0 ? (
            <p className="shop-xin-quay-empty">
              Shop chưa có quầy đang chờ duyệt hoặc đã được duyệt.
            </p>
          ) : (
            <ul className="shop-xin-quay-mine-list">
              {mine.map((q) => {
                const dateLbl = formatTimelineDate(q.suKienBatDau);
                const isReWithdraw = withdrawId === q.id;
                return (
                  <li key={q.id} className="shop-xin-quay-mine-item">
                    <div className="shop-xin-quay-mine-copy">
                      <strong>{q.suKienTen?.trim() || "Sự kiện"}</strong>
                      <span className="shop-xin-quay-item-meta">
                        {SHOP_TRANG_THAI_QUAY_LABEL[q.trangThai]}
                        {dateLbl ? ` · ${dateLbl}` : null}
                        {q.orgTen ? ` · ${q.orgTen}` : null}
                      </span>
                    </div>
                    {isReWithdraw ? (
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
                      <div className="shop-xin-quay-mine-actions">
                        <Link
                          href={suKienDetailPath(q.suKienSlug || q.idSuKien)}
                          className="shop-xin-quay-open"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Mở trang sự kiện"
                          title="Mở trang sự kiện"
                        >
                          <ExternalLink
                            size={16}
                            strokeWidth={2}
                            aria-hidden
                          />
                        </Link>
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
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      {applyModal}
    </>
  );
}
