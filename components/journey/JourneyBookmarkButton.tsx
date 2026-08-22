"use client";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import {
  JourneyActionActorsCount,
  type JourneyActionActorsConfig,
} from "@/components/journey/JourneyActionActorsCount";
import { JourneyActionTouchChip } from "@/components/journey/JourneyActionTouchChip";
import { JourneySocialActorsModal } from "@/components/journey/JourneySocialActorsModal";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { useCoarsePointer } from "@/lib/ui/use-coarse-pointer";
import { Bookmark, CheckCircle2, ChevronDown, Lock, Globe2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/use-t";
import {
  BOOKMARK_PRIVATE_NOTE_MAX_LENGTH,
  normalizeBookmarkPrivateNote,
} from "@/lib/journey/bookmark-private-note";
import { getNameInitials } from "@/lib/journey/profile";

export type BookmarkVisibility = "public" | "private";

export type BookmarkSaveParams = {
  visibility: BookmarkVisibility;
  privateNote: string;
};

export type BookmarkSaveEndpoint = (params: BookmarkSaveParams) => {
  url: string;
  body?: Record<string, unknown>;
};

type Props = {
  milestoneId: string;
  title: string;
  initialSaved?: boolean;
  initialCount?: number;
  showCount?: boolean;
  buttonClassName?: string;
  /** Nhãn chữ hiển thị cạnh icon (để cả nút click được, không chỉ icon). */
  label?: string;
  iconSize?: number;
  iconStrokeWidth?: number;
  saveEndpoint?: BookmarkSaveEndpoint;
  resolveOpenBlock?: () => string | null;
  onRequireAuth?: (action: () => void) => void;
  modalZIndex?: number;
  loaiDoiTuong?: string;
  disableActorsReveal?: boolean;
  previewAuthorName?: string | null;
  previewAuthorAvatarUrl?: string | null;
  previewCoverSrc?: string | null;
};

type ViewerChip = {
  name: string;
  slug: string | null;
  avatarUrl: string | null;
};

function formatSaveDemoDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${value.getFullYear()}`;
}

export function JourneyBookmarkButton({
  milestoneId,
  title,
  initialSaved = false,
  initialCount = 0,
  showCount = false,
  buttonClassName = "action-btn",
  label,
  iconSize = 16,
  iconStrokeWidth = 1.8,
  saveEndpoint,
  resolveOpenBlock,
  onRequireAuth,
  modalZIndex = 10800,
  loaiDoiTuong = SOCIAL_LOAI_DOI_TUONG.COT_MOC,
  disableActorsReveal = false,
  previewAuthorName,
  previewAuthorAvatarUrl,
  previewCoverSrc,
}: Props) {
  const t = useT();
  const authGate = useOptionalAuthGate();
  const router = useRouter();
  const defaultRequireAuth = useCallback(
    (action: () => void) => {
      if (authGate) {
        authGate.requireAuth(action);
        return;
      }
      router.push("/login");
    },
    [authGate, router],
  );
  const requireAuth = onRequireAuth ?? defaultRequireAuth;
  const isCoarse = useCoarsePointer();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [actorsOpen, setActorsOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<BookmarkVisibility>("public");
  const [privateNote, setPrivateNote] = useState("");
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [visMenuOpen, setVisMenuOpen] = useState(false);
  const [viewer, setViewer] = useState<ViewerChip | null>(null);
  const visMenuRef = useRef<HTMLDivElement | null>(null);
  const saveSnapshotRef = useRef({ saved: initialSaved, count: initialCount });
  const saveAbortRef = useRef<AbortController | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const closeModal = useCallback(() => {
    saveAbortRef.current?.abort();
    saveAbortRef.current = null;
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(false);
    setIsSaving(false);
    setError(null);
    setSuccess(false);
    setVisMenuOpen(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSaved(initialSaved);
      setCount(initialCount);
    });
  }, [initialSaved, initialCount]);

  useEffect(() => {
    if (!milestoneId) return;
    const onSocial = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          milestoneId: string;
          bookmarked?: boolean;
          bookmarkCount?: number;
        }>
      ).detail;
      if (detail.milestoneId !== milestoneId) return;
      if (typeof detail.bookmarked === "boolean") setSaved(detail.bookmarked);
      if (typeof detail.bookmarkCount === "number") setCount(detail.bookmarkCount);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || blockedMessage) return;
    let cancelled = false;
    void fetch("/api/auth/session-profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { profile?: { tenHienThi?: string | null; slug?: string | null; avatarUrl?: string | null } | null }) => {
        if (cancelled) return;
        const profile = json.profile;
        setViewer({
          name: profile?.tenHienThi?.trim() || profile?.slug?.trim() || t("bookmark.save.you"),
          slug: profile?.slug ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setViewer({ name: t("bookmark.save.you"), slug: null, avatarUrl: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [blockedMessage, open, t]);

  useEffect(() => {
    if (!visMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      const node = visMenuRef.current;
      if (node && !node.contains(event.target as Node)) {
        setVisMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [visMenuOpen]);

  useEffect(() => {
    return () => {
      saveAbortRef.current?.abort();
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const dispatchSaved = (bookmarked: boolean, bookmarkCount?: number) => {
    if (!milestoneId) return;
    window.dispatchEvent(
      new CustomEvent("cins:social-action", {
        detail: {
          milestoneId,
          bookmarked,
          ...(typeof bookmarkCount === "number" ? { bookmarkCount } : {}),
        },
      }),
    );
  };

  const saveBookmark = async () => {
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    saveSnapshotRef.current = { saved, count };

    saveAbortRef.current?.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;

    const endpoint = saveEndpoint?.({ visibility, privateNote }) ?? {
      url: "/api/saved-posts",
      body: {
        loai_doi_tuong: "cot_moc",
        id_doi_tuong: milestoneId,
        visibility,
        ghi_chu_rieng: normalizeBookmarkPrivateNote(privateNote),
      },
    };

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify(endpoint.body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rollback = saveSnapshotRef.current;
        setSaved(rollback.saved);
        setCount(rollback.count);
        setError(typeof json.error === "string" ? json.error : t("bookmark.save.error"));
        return;
      }
      const optimisticCount = saveSnapshotRef.current.saved
        ? saveSnapshotRef.current.count
        : saveSnapshotRef.current.count + 1;
      const syncedCount = Number(json.count ?? optimisticCount);
      setSaved(true);
      setCount(syncedCount);
      dispatchSaved(true, syncedCount);
      setSuccess(true);
      closeTimerRef.current = window.setTimeout(() => {
        closeModal();
      }, 1800);
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const rollback = saveSnapshotRef.current;
      setSaved(rollback.saved);
      setCount(rollback.count);
      setError(t("bookmark.save.network"));
      console.error("[JourneyBookmarkButton] save failed:", err);
    } finally {
      if (saveAbortRef.current === controller) {
        saveAbortRef.current = null;
      }
      setIsSaving(false);
    }
  };

  const openModal = useCallback(() => {
    const blockMsg = resolveOpenBlock?.() ?? null;
    if (blockMsg) {
      setBlockedMessage(blockMsg);
      setError(null);
      setIsSaving(false);
      setSuccess(false);
      setOpen(true);
      return;
    }
    setBlockedMessage(null);
    setError(null);
    setIsSaving(false);
    setSuccess(false);
    setPrivateNote("");
    setOpen(true);
  }, [resolveOpenBlock]);

  const pressBookmark = useCallback(() => {
    requireAuth(openModal);
  }, [openModal, requireAuth]);

  const ownerName = viewer?.name ?? t("bookmark.save.you");
  const ownerSlug = viewer?.slug ?? null;
  const ownerAvatarUrl = viewer?.avatarUrl ?? null;
  const sourceName = previewAuthorName?.trim() || null;
  const visLabel = visibility === "private" ? t("vis.onlyMe") : t("vis.public");
  const visKey = visibility === "private" ? "private" : "public";

  const modal = open ? (
    <div
      className="j-bookmark-confirm-backdrop"
      role="presentation"
      style={{ zIndex: modalZIndex }}
      onClick={closeModal}
    >
      <div
        className={`j-bookmark-confirm${success || blockedMessage ? "" : " is-preview"}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("bookmark.save.aria")}
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="j-bookmark-success">
            <span className="j-bookmark-confirm-icon is-success" aria-hidden>
              <CheckCircle2 size={20} strokeWidth={1.9} />
            </span>
            <h2>{t("bookmark.save.successTitle")}</h2>
            <p>{t("bookmark.save.successBody")}</p>
          </div>
        ) : blockedMessage ? (
          <>
            <button
              type="button"
              className="j-bookmark-confirm-close"
              aria-label={t("bookmark.save.close")}
              onClick={closeModal}
            >
              <X size={16} aria-hidden />
            </button>
            <p className="j-bookmark-confirm-error">{blockedMessage}</p>
            <div className="j-bookmark-confirm-actions">
              <button type="button" className="is-primary" onClick={closeModal}>
                {t("bookmark.save.ok")}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="j-bookmark-confirm-close"
              aria-label={t("bookmark.save.close")}
              onClick={closeModal}
            >
              <X size={16} aria-hidden />
            </button>
            <div
              className={`j-bookmark-frame j-bookmark-frame--user j-bookmark-save-demo${
                visibility === "private" ? " is-private" : ""
              }`}
            >
              <div className="j-bookmark-frame-head">
                <span className="org-chip">
                  <span className="org-logo" aria-hidden>
                    {ownerAvatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={ownerAvatarUrl} alt="" />
                    ) : (
                      getNameInitials(ownerName, ownerSlug ?? "C")
                    )}
                  </span>
                  <span className="org-copy">
                    <strong>{ownerName}</strong>
                    <small className="j-bf-date" title={t("date.saved")}>
                      <span className="j-bf-date-prefix">{t("milestone.type.bookmark")}</span>
                      <span className="j-bf-date-sep" aria-hidden>
                        ·
                      </span>
                      <span>{formatSaveDemoDate(new Date())}</span>
                    </small>
                  </span>
                </span>
                <div className="j-bf-toolbar">
                  <div className="j-bookmark-save-vis" ref={visMenuRef}>
                    <button
                      type="button"
                      className={`ctx-badge j-vis-${visKey} j-bookmark-save-vis-btn`}
                      aria-label={t("bookmark.save.visAria")}
                      aria-haspopup="listbox"
                      aria-expanded={visMenuOpen}
                      onClick={() => setVisMenuOpen((openVis) => !openVis)}
                    >
                      {visibility === "private" ? (
                        <Lock size={11} strokeWidth={1.8} aria-hidden />
                      ) : (
                        <Globe2 size={11} strokeWidth={1.8} aria-hidden />
                      )}
                      {visLabel}
                      <ChevronDown size={12} strokeWidth={2} aria-hidden />
                    </button>
                    {visMenuOpen ? (
                      <div className="j-bookmark-save-vis-pop" role="listbox">
                        <button
                          type="button"
                          role="option"
                          aria-selected={visibility === "public"}
                          className={visibility === "public" ? "is-active" : ""}
                          onClick={() => {
                            setVisibility("public");
                            setVisMenuOpen(false);
                          }}
                        >
                          <Globe2 size={14} aria-hidden />
                          {t("vis.public")}
                        </button>
                        <button
                          type="button"
                          role="option"
                          aria-selected={visibility === "private"}
                          className={visibility === "private" ? "is-active" : ""}
                          onClick={() => {
                            setVisibility("private");
                            setVisMenuOpen(false);
                          }}
                        >
                          <Lock size={14} aria-hidden />
                          {t("vis.onlyMe")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="j-bookmark-save-note">
                <textarea
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  maxLength={BOOKMARK_PRIVATE_NOTE_MAX_LENGTH}
                  rows={2}
                  placeholder={t("bookmark.save.notePlaceholder")}
                  disabled={isSaving}
                  aria-label={t("bookmark.save.noteAria")}
                />
              </div>
              <div className="j-m-card jcard j-bookmark-frame-card j-bookmark-save-origin">
                <div className="jcard-datebar jcard-datebar--bookmark">
                  <span className="org-chip">
                    <span className="org-logo" aria-hidden>
                      {previewAuthorAvatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewAuthorAvatarUrl} alt="" />
                      ) : (
                        getNameInitials(sourceName, "C")
                      )}
                    </span>
                    <span className="org-copy">
                      <strong>{sourceName || t("bookmark.save.original")}</strong>
                      {sourceName ? <small>{t("bookmark.save.original")}</small> : null}
                    </span>
                  </span>
                </div>
                {previewCoverSrc ? (
                  <div className="j-bookmark-save-origin-cover" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewCoverSrc} alt="" />
                  </div>
                ) : null}
                <div className="jcard-text">
                  <strong className="j-bookmark-save-origin-title">{title}</strong>
                </div>
              </div>
            </div>
            {error ? <p className="j-bookmark-confirm-error">{error}</p> : null}
            <div className="j-bookmark-confirm-actions">
              <button type="button" onClick={closeModal}>
                {t("bookmark.save.cancel")}
              </button>
              <button
                type="button"
                className="is-primary"
                disabled={isSaving}
                onClick={() => void saveBookmark()}
              >
                {isSaving ? t("bookmark.save.saving") : t("bookmark.save.confirm")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  const actors = useMemo<JourneyActionActorsConfig | null>(() => {
    if (disableActorsReveal || count <= 0 || !milestoneId) return null;
    return {
      kind: "bookmark",
      loaiDoiTuong,
      idDoiTuong: milestoneId,
      count,
    };
  }, [count, disableActorsReveal, loaiDoiTuong, milestoneId]);

  const openActors = useCallback(() => {
    if (actors) setActorsOpen(true);
  }, [actors]);

  const showActorsCount = showCount && count > 0;

  const actorsModal =
    actors && actorsOpen ? (
      <JourneySocialActorsModal
        open={actorsOpen}
        onClose={() => setActorsOpen(false)}
        kind={actors.kind}
        loaiDoiTuong={actors.loaiDoiTuong}
        idDoiTuong={actors.idDoiTuong}
      />
    ) : null;

  if (isCoarse) {
    return (
      <>
        <JourneyActionTouchChip
          className={`${buttonClassName}${saved ? " is-bookmarked" : ""}`}
          ariaLabel={saved ? "Đã lưu" : "Lưu"}
          ariaPressed={saved}
          onPress={pressBookmark}
          onLongPress={actors ? openActors : undefined}
          longPressHint={actors ? "Giữ để xem người đã lưu" : undefined}
        >
          <Bookmark
            size={iconSize}
            strokeWidth={iconStrokeWidth}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
          {label ? <span className="jbb-label">{label}</span> : null}
          {showActorsCount ? (
            <span className="action-btn-count action-btn-count--static" aria-hidden>
              {count}
            </span>
          ) : null}
        </JourneyActionTouchChip>
        {actorsModal}
        {mounted && modal ? createPortal(modal, document.body) : null}
      </>
    );
  }

  const bookmarkIconButton = (
    <button
      type="button"
      className={
        showActorsCount
          ? "action-btn-part action-btn-part--icon"
          : `${buttonClassName}${saved ? " is-bookmarked" : ""}`
      }
      aria-label={saved ? "Đã lưu" : "Lưu"}
      aria-pressed={saved}
      onClick={(event) => {
        event.stopPropagation();
        pressBookmark();
      }}
    >
      <Bookmark
        size={iconSize}
        strokeWidth={iconStrokeWidth}
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
      {label ? <span className="jbb-label">{label}</span> : null}
      {showActorsCount && !actors ? (
        <span className="action-btn-count action-btn-count--static" aria-hidden>
          {count}
        </span>
      ) : null}
    </button>
  );

  return (
    <>
      {showActorsCount && actors ? (
        <span className={`action-btn action-btn--split${saved ? " is-bookmarked" : ""}`}>
          {bookmarkIconButton}
          <JourneyActionActorsCount actors={actors} />
        </span>
      ) : (
        bookmarkIconButton
      )}
      {mounted && modal ? createPortal(modal, document.body) : null}
      {actorsModal}
    </>
  );
}
