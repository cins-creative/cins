"use client";

import { Check, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import { GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { JourneyMilestoneCard } from "@/components/journey/JourneyMilestoneCard";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { ShopQuayReviewPost } from "@/components/shop/ShopQuayReviewPost";
import { getCoverUrl } from "@/lib/articles/cover";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import { getNameInitials } from "@/lib/journey/profile";
import {
  galleryMediaKindFromBlocks,
  isGalleryVideoCoverSrc,
  milestoneCardCaptionPlain,
} from "@/lib/journey/post-media";
import type { ShopEvidence, ShopQuaySuKien } from "@/lib/shop/types";

import "./shop-dashboard.css";

/** Bài gắn quầy — đủ lens owner để datebar entity giống Journey. */
function quayMilestoneCard(q: ShopQuaySuKien): MilestoneItem | null {
  const m = q.cotMoc;
  if (!m) return null;
  return {
    ...m,
    lensOwnerId: m.lensOwnerId ?? m.postOwnerId ?? q.idNguoiDung,
    lensOwnerSlug: m.lensOwnerSlug ?? m.postOwnerSlug ?? q.nguoiDungSlug,
    lensOwnerName: m.lensOwnerName ?? q.nguoiDungTen,
    lensOwnerAvatarUrl: m.lensOwnerAvatarUrl ?? q.nguoiDungAvatarUrl,
    postOwnerId: m.postOwnerId ?? q.idNguoiDung,
    postOwnerSlug: m.postOwnerSlug ?? q.nguoiDungSlug,
  };
}

/**
 * Thumb lưới quầy — giống EntityLightGrid: `media` (cover/video) rồi ảnh đầu
 * album trong blocks (`milestonePreviewMedia` cố ý để trống album không cover).
 */
function quayGridThumbSrc(m: MilestoneItem): string | null {
  const fromMedia = m.media?.[0]?.src?.trim();
  if (fromMedia) return fromMedia;

  const entry = resolvePostGridEntry({
    moTa: m.tacPhamMoTa ?? m.body,
    coverId: m.tacPhamCoverId,
    blocks: m.noiDungBlocks ?? [],
  });
  if (!entry) return null;

  return (
    entry.coverSrc?.trim() || getCoverUrl(entry.coverId, "public") || null
  );
}

type QuayGridItem = {
  quayId: string;
  milestoneId: string;
  title: string;
  excerpt: string | null;
  thumbSrc: string | null;
  isVideo: boolean;
};

function quayApprovedGridItems(
  items: ReadonlyArray<ShopQuaySuKien>,
): QuayGridItem[] {
  const out: QuayGridItem[] = [];
  for (const q of items) {
    const m = quayMilestoneCard(q);
    if (!m) continue;
    const milestoneId = (m.cotMocId ?? m.id).trim();
    if (!milestoneId) continue;
    const thumbSrc = quayGridThumbSrc(m);
    const mediaKind = galleryMediaKindFromBlocks(m.noiDungBlocks);
    out.push({
      quayId: q.id,
      milestoneId,
      title: m.title?.trim() || q.nguoiDungTen?.trim() || "Bài đóng góp",
      excerpt:
        milestoneCardCaptionPlain(
          m.tacPhamMoTa ?? m.body,
          m.noiDungBlocks,
        ) ||
        q.nguoiDungTen?.trim() ||
        null,
      thumbSrc,
      isVideo:
        mediaKind === "video" ||
        Boolean(m.media?.[0]?.isVideo) ||
        isGalleryVideoCoverSrc(thumbSrc),
    });
  }
  return out;
}

function focusQuayMilestoneOnTimeline(milestoneId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector(
      `.shop-quay-review-list [data-mid="${CSS.escape(milestoneId)}"]`,
    );
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("is-flash");
    window.setTimeout(() => el.classList.remove("is-flash"), 1600);
  });
}

type Props = {
  suKienId: string;
  canManage?: boolean;
  /** Hiện section kể cả khi chưa có quầy (dùng trong bảng quản lý). */
  alwaysShow?: boolean;
  title?: string;
  /** Báo số quầy đang chờ duyệt (sau mỗi lần tải danh sách). */
  onPendingCountChange?: (count: number) => void;
};

function QuayUserMeta({ q }: { q: ShopQuaySuKien }) {
  const name = q.nguoiDungTen ?? "Artist";
  const initials = getNameInitials(q.nguoiDungTen, q.nguoiDungSlug ?? "C");
  return (
    <div className="shop-quay-user">
      <span className="shop-quay-user-avatar" aria-hidden>
        {q.nguoiDungAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.nguoiDungAvatarUrl} alt="" />
        ) : (
          initials
        )}
      </span>
      <span className="shop-quay-user-copy">
        <strong>{name}</strong>
        {q.nguoiDungSlug ? (
          <span className="shop-dash-hint">@{q.nguoiDungSlug}</span>
        ) : null}
      </span>
    </div>
  );
}

function EvidenceBlock({ items }: { items: ShopEvidence[] }) {
  if (items.length === 0) {
    return <p className="shop-dash-hint">Không kèm bằng chứng.</p>;
  }

  const images = items.filter(
    (e) => (e.kind === "file" || e.kind === "link") && Boolean(e.href),
  );
  const notes = items.filter((e) => e.kind === "text");
  const orphanLinks = items.filter(
    (e) =>
      e.kind === "link" &&
      !e.href &&
      Boolean(e.detail || e.label),
  );

  return (
    <div className="shop-quay-evidence">
      <h5 className="shop-quay-evidence-title">Ảnh xác thực</h5>
      {images.length > 0 ? (
        <ul className="shop-quay-evidence-grid">
          {images.map((e, i) => (
            <li key={`img-${i}`}>
              <a
                href={e.href}
                target="_blank"
                rel="noreferrer"
                className="shop-quay-evidence-shot"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.href} alt={e.label || "Ảnh xác thực"} />
              </a>
              {e.label ? (
                <span className="shop-dash-hint">{e.label}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {notes.map((e, i) => {
        const text = e.detail || e.label;
        if (!text) return null;
        return (
          <p key={`note-${i}`} className="shop-quay-evidence-note">
            {text}
          </p>
        );
      })}
      {orphanLinks.map((e, i) => {
        const text = e.detail || e.label;
        if (!text) return null;
        return (
          <p key={`link-${i}`} className="shop-quay-evidence-note">
            {text}
          </p>
        );
      })}
      {images.length === 0 &&
      notes.length === 0 &&
      orphanLinks.length === 0 ? (
        <p className="shop-dash-hint">Không kèm bằng chứng.</p>
      ) : null}
    </div>
  );
}

function QuayApprovedCard({ q }: { q: ShopQuaySuKien }) {
  const milestone = quayMilestoneCard(q);
  if (!milestone) {
    return (
      <li className="shop-dash-item shop-quay-review-item">
        <QuayUserMeta q={q} />
        <p className="shop-dash-hint">
          {q.idCotMoc
            ? "Không tải được bài gốc của cột mốc này."
            : "Yêu cầu không gắn bài viết."}
        </p>
      </li>
    );
  }

  const ownerSlug =
    milestone.lensOwnerSlug ?? milestone.postOwnerSlug ?? q.nguoiDungSlug ?? "";
  const ownerProfileId =
    milestone.lensOwnerId ?? milestone.postOwnerId ?? q.idNguoiDung;

  return (
    <li className="shop-quay-review-card">
      <JourneyMilestoneCard
        milestone={milestone}
        entityLens
        analyticsNguon="entity_lens"
        ownerSlug={ownerSlug || undefined}
        ownerProfileId={ownerProfileId}
        authorAvatarUrl={milestone.lensOwnerAvatarUrl ?? null}
        authorName={milestone.lensOwnerName ?? null}
      />
    </li>
  );
}

function QuayApprovedGridView({
  items,
  layout,
  onOpen,
}: {
  items: ReadonlyArray<QuayGridItem>;
  layout: "card" | "masonry";
  onOpen: (milestoneId: string) => void;
}) {
  if (items.length === 0) {
    return <p className="shop-dash-hint">Chưa có nội dung được duyệt.</p>;
  }

  const gridClass =
    layout === "masonry"
      ? "j-main-gallery-grid j-main-gallery-grid--masonry shop-quay-gallery-grid"
      : "j-main-gallery-grid j-main-gallery-grid--card shop-quay-gallery-grid";

  return (
    <div className={gridClass} role="list" aria-label="Lưới đóng góp sự kiện">
      {items.map((it) => (
        <button
          key={it.quayId}
          type="button"
          role="listitem"
          className={`j-main-gallery-item${it.thumbSrc ? "" : " is-text"}`}
          onClick={() => onOpen(it.milestoneId)}
          aria-label={`Xem bài: ${it.title}`}
        >
          <div className="j-main-gallery-thumb">
            {it.thumbSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.thumbSrc}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : null}
            {it.isVideo ? <GalleryVideoPlayBadge /> : null}
          </div>
          {layout === "card" ? (
            <span className="j-main-gallery-info-panel">
              <strong className="j-main-gallery-info-title">{it.title}</strong>
              {it.excerpt ? (
                <small className="j-main-gallery-info-excerpt">
                  {it.excerpt}
                </small>
              ) : null}
            </span>
          ) : (
            <span className="j-main-gallery-overlay" aria-hidden>
              <span className="j-main-gallery-overlay-title">{it.title}</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ShopQuaySuKienPanel({
  suKienId,
  canManage = false,
  alwaysShow = false,
  title = "Nội dung đóng góp sự kiện",
  onPendingCountChange,
}: Props) {
  const [items, setItems] = useState<ShopQuaySuKien[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<ContentSurfaceView>("timeline");
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<{
    id: string;
    mode: "reject" | "revoke";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = canManage ? "?pending=1" : "";
      const res = await fetch(`/api/su-kien/${suKienId}/quay${q}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopQuaySuKien[];
      } | null;
      const next = json?.items ?? [];
      setItems(next);
      onPendingCountChange?.(
        next.filter((i) => i.trangThai === "cho_xu_ly").length,
      );
    } finally {
      setLoading(false);
    }
  }, [suKienId, canManage, onPendingCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view !== "timeline" || !pendingFocusId) return;
    focusQuayMilestoneOnTimeline(pendingFocusId);
    setPendingFocusId(null);
  }, [view, pendingFocusId]);

  async function respond(
    id: string,
    action: "approve" | "reject",
    lyDo?: string,
  ) {
    setBusyId(id);
    setActionErr(null);
    try {
      const res = await fetch(`/api/su-kien/${suKienId}/quay/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lyDo: lyDo?.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setActionErr(json?.error ?? "Không cập nhật được.");
        return;
      }
      setReasonTarget(null);
      setReasonText("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openReason(id: string, mode: "reject" | "revoke") {
    setReasonTarget({ id, mode });
    setReasonText("");
    setActionErr(null);
  }

  async function confirmReason() {
    if (!reasonTarget) return;
    const lyDo = reasonText.trim();
    if (!lyDo) {
      setActionErr(
        reasonTarget.mode === "revoke"
          ? "Nhập lý do gỡ khỏi sự kiện."
          : "Nhập lý do từ chối.",
      );
      return;
    }
    await respond(reasonTarget.id, "reject", lyDo);
  }

  const approved = items.filter((i) => i.trangThai === "da_duyet");
  const pending = items.filter((i) => i.trangThai === "cho_xu_ly");
  const gridItems = useMemo(
    () =>
      quayApprovedGridItems(
        items.filter((i) => i.trangThai === "da_duyet"),
      ),
    [items],
  );

  const openFromGrid = useCallback((milestoneId: string) => {
    setView("timeline");
    setPendingFocusId(milestoneId);
  }, []);

  if (loading) {
    return (
      <p className="shop-dash-hint">
        <Loader2 className="shop-spin" size={14} /> Đang tải quầy…
      </p>
    );
  }

  if (!approved.length && !(canManage && pending.length) && !alwaysShow) {
    return null;
  }

  const showPublicSurface = !canManage && approved.length > 0;

  return (
    <section
      className="shop-quay-panel"
      style={{ marginTop: alwaysShow ? 0 : 16 }}
    >
      <div className="j-tlb shop-quay-tlb">
        <span className="j-tlb-streak-slow" aria-hidden="true" />
        <div className="j-tlb-date">
          <h3 className="shop-quay-tlb-label">{title}</h3>
        </div>
        {showPublicSurface ? (
          <ContentSurfaceViewToggle view={view} onViewChange={setView} />
        ) : null}
      </div>

      {!canManage ? (
        approved.length ? (
          view === "timeline" ? (
            <ul className="shop-dash-list shop-quay-review-list">
              {approved.map((q) => (
                <QuayApprovedCard key={q.id} q={q} />
              ))}
            </ul>
          ) : (
            <QuayApprovedGridView
              items={gridItems}
              layout={view === "masonry" ? "masonry" : "card"}
              onOpen={openFromGrid}
            />
          )
        ) : alwaysShow ? (
          <p className="shop-dash-hint">Chưa có nội dung được duyệt.</p>
        ) : null
      ) : (
        <>
          {actionErr ? (
            <p className="shop-dash-hint shop-quay-action-err" role="alert">
              {actionErr}
            </p>
          ) : null}

          {approved.length ? (
            <ul className="shop-dash-list">
              {approved.map((q) => {
                const asking = reasonTarget?.id === q.id;
                return (
                  <li
                    key={q.id}
                    className={
                      asking
                        ? "shop-dash-item shop-quay-manage-item is-reason"
                        : "shop-dash-item shop-quay-manage-item"
                    }
                  >
                    <div className="shop-quay-manage-row">
                      <QuayUserMeta q={q} />
                      <div className="shop-dash-actions">
                        <span className="shop-dash-hint">Đã duyệt</span>
                        <button
                          type="button"
                          className="shop-dash-danger"
                          disabled={busyId === q.id}
                          onClick={() => openReason(q.id, "revoke")}
                        >
                          Gỡ
                        </button>
                      </div>
                    </div>
                    {asking ? (
                      <div className="shop-quay-reason-box">
                        <textarea
                          rows={2}
                          value={reasonText}
                          onChange={(e) => setReasonText(e.target.value)}
                          placeholder="Lý do gỡ khỏi sự kiện…"
                          autoFocus
                        />
                        <div className="shop-quay-reason-actions">
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() => {
                              setReasonTarget(null);
                              setReasonText("");
                            }}
                          >
                            Huỷ
                          </button>
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={busyId === q.id || !reasonText.trim()}
                            onClick={() => void confirmReason()}
                          >
                            {busyId === q.id ? (
                              <Loader2 className="shop-spin" size={14} />
                            ) : (
                              "Xác nhận gỡ"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="shop-dash-hint">Chưa có nội dung được duyệt.</p>
          )}

          {pending.length > 0 ? (
            <>
              <h4 style={{ fontSize: 14, margin: "14px 0 8px" }}>
                Chờ duyệt ({pending.length})
              </h4>
              <ul className="shop-dash-list shop-quay-review-list">
                {pending.map((q) => {
                  const asking = reasonTarget?.id === q.id;
                  return (
                    <li
                      key={q.id}
                      className="shop-dash-item shop-quay-review-item"
                    >
                      <header className="shop-quay-review-head">
                        <QuayUserMeta q={q} />
                        <div className="shop-dash-actions">
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() => void respond(q.id, "approve")}
                            aria-label="Duyệt"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="shop-dash-danger"
                            disabled={busyId === q.id}
                            onClick={() => openReason(q.id, "reject")}
                            aria-label="Từ chối"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </header>

                      {asking ? (
                        <div className="shop-quay-reason-box">
                          <textarea
                            rows={2}
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            placeholder="Lý do từ chối…"
                            autoFocus
                          />
                          <div className="shop-quay-reason-actions">
                            <button
                              type="button"
                              disabled={busyId === q.id}
                              onClick={() => {
                                setReasonTarget(null);
                                setReasonText("");
                              }}
                            >
                              Huỷ
                            </button>
                            <button
                              type="button"
                              className="shop-dash-danger"
                              disabled={busyId === q.id || !reasonText.trim()}
                              onClick={() => void confirmReason()}
                            >
                              {busyId === q.id ? (
                                <Loader2 className="shop-spin" size={14} />
                              ) : (
                                "Xác nhận từ chối"
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {q.cotMoc ? (
                        <ShopQuayReviewPost
                          milestone={q.cotMoc}
                          sellerUserId={q.idNguoiDung}
                          sellerName={q.nguoiDungTen}
                          sellerSlug={q.nguoiDungSlug}
                        />
                      ) : q.idCotMoc ? (
                        <p className="shop-dash-hint">
                          Không tải được bài gốc của cột mốc này.
                        </p>
                      ) : (
                        <p className="shop-dash-hint">
                          Yêu cầu không gắn bài viết.
                        </p>
                      )}

                      <EvidenceBlock items={q.bangChung} />
                    </li>
                  );
                })}
              </ul>
            </>
          ) : alwaysShow ? (
            <p className="shop-dash-hint" style={{ marginTop: 10 }}>
              Không có nội dung đang chờ duyệt.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
