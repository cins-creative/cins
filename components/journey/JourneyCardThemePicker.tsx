"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Moon, MoreHorizontal, Move, Sun, X } from "lucide-react";

import {
  authorCardThemeStyle,
  CARD_IMAGE_ROTATE_DEFAULT,
  CARD_IMAGE_ROTATE_MAX,
  CARD_IMAGE_ROTATE_MIN,
  CARD_IMAGE_SCALE_DEFAULT,
  CARD_IMAGE_SCALE_MAX,
  CARD_IMAGE_SCALE_MIN,
  cardsEqual,
  clampCardImagePos,
  clampCardImageRotate,
  clampCardImageScale,
  DEFAULT_CARD_THEME,
  parseCardTheme,
  resolveAuthorCardThemeDto,
  type CardAccentMode,
  type ProfileCardThemeSlice,
} from "@/lib/journey/card-theme";
import {
  DEFAULT_PROFILE_THEME,
  normalizeAccentHex,
  PROFILE_ACCENTS,
  PROFILE_BG_DIM_DEFAULT,
  PROFILE_BG_DIM_MAX,
  PROFILE_BG_DIM_MIN,
  PROFILE_PATTERNS,
  getPatternDef,
  profileThemeImageUrl,
  resolveAccentHex,
  type ProfileCustomEntry,
  type ProfilePatternId,
  type ProfilePresetAccentId,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";
import { getNameInitials } from "@/lib/journey/profile";
import type { ThemePreviewScheme } from "@/components/journey/JourneyThemeDevicePreview";
import { JourneyThemeUploadProgress } from "@/components/journey/JourneyThemeUploadProgress";
import {
  cardSliceToPatch,
  patchGiaoDien,
} from "@/lib/journey/giao-dien-patch-client";
import { dispatchUserCardThemeChange } from "@/lib/journey/user-card-theme";
import { uploadGiaoDienCustomWithProgress } from "@/lib/files/upload-giao-dien-custom";

import "./journey-theme.css";
import "./journey-card-theme.css";
import "./journey-card-theme-picker.css";

function readDocumentScheme(): ThemePreviewScheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

type Props = {
  initialCard?: ProfileCardThemeSlice | null;
  /** Theme hồ sơ — dùng khi mode = inheritAccent. */
  profileTheme?: ProfileThemeSlice | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
};

export type JourneyCardThemePickerHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  getPatch: () => Record<string, unknown> | null;
  markSaved: (card?: unknown, customs?: ProfileCustomEntry[]) => void;
};

function sliceCard(
  raw: ProfileCardThemeSlice | null | undefined,
): ProfileCardThemeSlice {
  return parseCardTheme(raw ?? DEFAULT_CARD_THEME);
}

function cardPosCss(x: number, y: number): string {
  const px = Math.round(clampCardImagePos(x) * 1000) / 10;
  const py = Math.round(clampCardImagePos(y) * 1000) / 10;
  return `${px}% ${py}%`;
}

function sliceTheme(
  raw: ProfileThemeSlice | null | undefined,
): ProfileThemeSlice {
  if (!raw) {
    return {
      ...DEFAULT_PROFILE_THEME,
      background: {
        ...DEFAULT_PROFILE_THEME.background,
        position: { ...DEFAULT_PROFILE_THEME.background.position },
        devices: {},
      },
    };
  }
  return raw;
}

export const JourneyCardThemePicker = forwardRef<
  JourneyCardThemePickerHandle,
  Props
>(function JourneyCardThemePicker(
  {
    initialCard = null,
    profileTheme = null,
    authorName = null,
    authorAvatarUrl = null,
    onDirtyChange,
  },
  ref,
) {
  const [card, setCard] = useState(() => sliceCard(initialCard));
  const [baseline, setBaseline] = useState(() => sliceCard(initialCard));
  const [theme, setTheme] = useState(() => sliceTheme(profileTheme));
  const [customs, setCustoms] = useState<ProfileCustomEntry[]>([]);
  const cardRef = useRef(card);
  const baselineRef = useRef(baseline);
  const themeRef = useRef(theme);
  const customsRef = useRef(customs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewArticleRef = useRef<HTMLElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const datebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    pos: { x: number; y: number };
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [scheme, setScheme] = useState<ThemePreviewScheme>("light");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const customLiveRef = useRef(
    normalizeAccentHex(card.accentHex) ?? "#1F74C9",
  );
  const customSwatchRef = useRef<HTMLSpanElement>(null);

  const dirty = !cardsEqual(card, baseline);

  useEffect(() => {
    setScheme(readDocumentScheme());
  }, []);

  useEffect(() => {
    cardRef.current = card;
  }, [card]);
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    customsRef.current = customs;
  }, [customs]);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const el = cropRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!cardRef.current.enabled || !cardRef.current.imageId) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.06 : -0.06;
      onImagePlace({
        scale: clampCardImageScale(cardRef.current.scale + delta),
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [card.enabled, card.imageId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/giao-dien");
        if (!res.ok) return;
        const data = (await res.json()) as {
          card?: unknown;
          theme?: ProfileThemeSlice;
          customs?: ProfileCustomEntry[];
        };
        if (cancelled) return;
        if (data.theme) setTheme(sliceTheme(data.theme));
        const nextCustoms = Array.isArray(data.customs) ? data.customs : [];
        setCustoms(nextCustoms);
        customsRef.current = nextCustoms;
        if (data.card) {
          const parsed = parseCardTheme(data.card, nextCustoms);
          setCard(parsed);
          setBaseline(parsed);
          cardRef.current = parsed;
          baselineRef.current = parsed;
          if (parsed.accentHex) customLiveRef.current = parsed.accentHex;
        }
      } catch {
        /* giữ initial */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: ProfileCardThemeSlice) => {
    cardRef.current = next;
    setCard(next);
    dispatchUserCardThemeChange(next, themeRef.current);
  }, []);

  const persist = useCallback(async (next: ProfileCardThemeSlice) => {
    setStatus("saving");
    setErrMsg(null);
    try {
      const data = await patchGiaoDien(cardSliceToPatch(next));
      if (!data.ok) {
        throw new Error(data.error ?? "Không lưu được.");
      }
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      const saved = data.card
        ? parseCardTheme(data.card, customsRef.current)
        : sliceCard(next);
      setBaseline(saved);
      baselineRef.current = saved;
      setCard(saved);
      cardRef.current = saved;
      dispatchUserCardThemeChange(saved, themeRef.current);
      setStatus("ok");
      window.setTimeout(
        () => setStatus((s) => (s === "ok" ? "idle" : s)),
        1600,
      );
      return true;
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Không lưu được.");
      return false;
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => !cardsEqual(cardRef.current, baselineRef.current),
      save: async () => persist(cardRef.current),
      getPatch: () => {
        if (cardsEqual(cardRef.current, baselineRef.current)) return null;
        return cardSliceToPatch(cardRef.current);
      },
      markSaved: (cardRaw, nextCustoms) => {
        if (Array.isArray(nextCustoms)) {
          setCustoms(nextCustoms);
          customsRef.current = nextCustoms;
        }
        const saved = cardRaw
          ? parseCardTheme(cardRaw, customsRef.current)
          : sliceCard(cardRef.current);
        setBaseline(saved);
        baselineRef.current = saved;
        setCard(saved);
        cardRef.current = saved;
        dispatchUserCardThemeChange(saved, themeRef.current);
        setStatus("ok");
        window.setTimeout(
          () => setStatus((s) => (s === "ok" ? "idle" : s)),
          1600,
        );
      },
      discard: () => {
        const base = sliceCard(baselineRef.current);
        cardRef.current = base;
        setCard(base);
        dispatchUserCardThemeChange(base, themeRef.current);
      },
    }),
    [persist],
  );

  const previewDto = resolveAuthorCardThemeDto(card, theme);
  const previewAccent =
    previewDto?.accentHex ??
    (card.enabled && card.mode === "inheritAccent"
      ? resolveAccentHex(theme)
      : null);
  const previewName = authorName?.trim() || "Bạn";
  const initials = getNameInitials(previewName, "C");

  function setEnabled(enabled: boolean) {
    commit({ ...cardRef.current, enabled });
  }

  function setMode(mode: CardAccentMode) {
    commit({ ...cardRef.current, mode });
  }

  function onDim(value: number) {
    commit({
      ...cardRef.current,
      dim: Math.min(PROFILE_BG_DIM_MAX, Math.max(PROFILE_BG_DIM_MIN, value)),
    });
  }

  function onSelectImage(imageId: string) {
    commit({
      ...cardRef.current,
      imageId,
      enabled: true,
      patternId: "none",
    });
  }

  function onClearImage() {
    commit({ ...cardRef.current, imageId: null, patternId: "none" });
  }

  function onPattern(id: ProfilePatternId) {
    commit({
      ...cardRef.current,
      mode: "custom",
      enabled: true,
      patternId: id,
      imageId: id === "none" ? cardRef.current.imageId : null,
    });
  }

  function onImagePlace(partial: {
    position?: { x: number; y: number };
    scale?: number;
    rotate?: number;
  }) {
    const cur = cardRef.current;
    commit({
      ...cur,
      position: partial.position
        ? {
            x: clampCardImagePos(partial.position.x),
            y: clampCardImagePos(partial.position.y),
          }
        : cur.position,
      scale:
        partial.scale !== undefined
          ? clampCardImageScale(partial.scale)
          : cur.scale,
      rotate:
        partial.rotate !== undefined
          ? clampCardImageRotate(partial.rotate)
          : cur.rotate,
    });
  }

  function resetImagePlace() {
    onImagePlace({
      position: { x: 0.5, y: 0.5 },
      scale: CARD_IMAGE_SCALE_DEFAULT,
      rotate: CARD_IMAGE_ROTATE_DEFAULT,
    });
  }

  function paintPreviewPlace(
    pos: { x: number; y: number },
    scale: number,
    rotate: number,
  ) {
    const el = previewArticleRef.current;
    if (!el) return;
    el.style.setProperty("--j-card-image-pos", cardPosCss(pos.x, pos.y));
    el.style.setProperty("--j-card-image-nx", String(pos.x));
    el.style.setProperty("--j-card-image-ny", String(pos.y));
    el.style.setProperty("--j-card-image-scale", String(scale));
    el.style.setProperty("--j-card-image-rotate", `${rotate}deg`);
  }

  function onCropPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!cardRef.current.imageId || !cardRef.current.enabled) return;
    e.preventDefault();
    e.stopPropagation();
    const el = cropRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
    const pos = cardRef.current.position;
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      pos: { x: pos.x, y: pos.y },
    };
  }

  function onCropPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const cur = cardRef.current;
    const bar = datebarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    /* Cùng hệ số với ::before trên thanh thật (rộng × 1/1.44). */
    const canvasH = Math.max(rect.height, rect.width / 1.44);
    const dx = (e.clientX - drag.lastX) / rect.width;
    const dy = (e.clientY - drag.lastY) / canvasH;
    const next = {
      x: clampCardImagePos(drag.pos.x - dx),
      y: clampCardImagePos(drag.pos.y - dy),
    };
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.pos = next;
    paintPreviewPlace(next, cur.scale, cur.rotate);
  }

  function onCropPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    cropRef.current?.classList.remove("is-dragging");
    try {
      cropRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    onImagePlace({ position: drag.pos });
  }

  function onAccent(id: ProfilePresetAccentId) {
    commit({
      ...cardRef.current,
      mode: "custom",
      accent: id,
      accentHex: null,
    });
  }

  function onCustomPreview(hex: string) {
    const normalized = normalizeAccentHex(hex) ?? hex;
    customLiveRef.current = normalized;
    if (customSwatchRef.current) {
      customSwatchRef.current.style.background = normalized;
    }
  }

  function onCustomCommit(hex: string) {
    const normalized = normalizeAccentHex(hex) ?? "#1F74C9";
    customLiveRef.current = normalized;
    commit({
      ...cardRef.current,
      mode: "custom",
      accent: "custom",
      accentHex: normalized,
    });
  }

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setUploadPct(1);
    setErrMsg(null);
    try {
      const data = await uploadGiaoDienCustomWithProgress(file, setUploadPct);
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      onSelectImage(data.imageId);
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemoveCustom(imageId: string) {
    const id = imageId.trim();
    if (!id || removingId) return;
    setRemovingId(id);
    setErrMsg(null);
    try {
      const res = await fetch("/api/user/giao-dien/custom", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: id }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        customs?: ProfileCustomEntry[];
        card?: unknown;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Không xóa được ảnh.");
      }
      const nextCustoms = Array.isArray(data?.customs)
        ? data.customs
        : customsRef.current.filter((c) => c.imageId !== id);
      setCustoms(nextCustoms);
      customsRef.current = nextCustoms;

      const scrub = (c: ProfileCardThemeSlice): ProfileCardThemeSlice =>
        c.imageId === id ? { ...c, imageId: null } : c;
      const nextCard = data?.card
        ? parseCardTheme(data.card, nextCustoms)
        : scrub(cardRef.current);
      const nextBase = scrub(baselineRef.current);
      commit(nextCard);
      setBaseline(nextBase);
      baselineRef.current = nextBase;
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Không xóa được ảnh.");
    } finally {
      setRemovingId(null);
    }
  }

  const customSelected = card.mode === "custom" && card.accent === "custom";
  const customValue =
    normalizeAccentHex(card.accentHex) ??
    normalizeAccentHex(customLiveRef.current) ??
    "#1F74C9";

  const previewStyle: CSSProperties | undefined = previewDto
    ? authorCardThemeStyle(previewDto)
    : previewAccent
      ? { ["--j-card-accent"]: previewAccent }
      : undefined;

  const canPlaceImage = Boolean(card.enabled && card.imageId);
  const imageScale = clampCardImageScale(card.scale);
  const imageRotate = clampCardImageRotate(card.rotate);
  const imagePos = {
    x: clampCardImagePos(card.position?.x),
    y: clampCardImagePos(card.position?.y),
  };

  const datebarInner = (
    <>
      <span className="org-chip">
        <span className="org-logo" aria-hidden>
          {authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={authorAvatarUrl} alt="" />
          ) : (
            initials
          )}
        </span>
        <span className="org-copy">
          <strong>{previewName}</strong>
          <small>Vừa xong</small>
        </span>
      </span>
      <div className="jcard-corner-actions">
        <span className="j-m-menu jcard-date-menu">
          <span className="j-m-menu-btn" aria-hidden>
            <MoreHorizontal size={18} strokeWidth={2} />
          </span>
        </span>
      </div>
    </>
  );

  const previewNode = (
    <article
      ref={previewArticleRef}
      className={
        "j-milestone j-self j-card-theme-demo" +
        (canPlaceImage ? " is-placing" : "")
      }
      data-preview-scheme={scheme}
      {...(previewDto
        ? {
            "data-card-theme": "1" as const,
            ...(previewDto.imageUrl
              ? { "data-card-image": "1" as const }
              : {}),
            ...(previewDto.patternId !== "none" && !previewDto.imageUrl
              ? { "data-card-pattern": "1" as const }
              : {}),
            ...(previewDto.accentHex
              ? { "data-card-accent": "1" as const }
              : {}),
            style: previewStyle,
          }
        : previewStyle
          ? { style: previewStyle }
          : {})}
    >
      <div className="j-m-body-wrap">
        <div className="j-m-card jcard jcard--photo">
          <div className="j-m-card-main">
            <div
              ref={canPlaceImage ? cropRef : undefined}
              className={canPlaceImage ? "j-card-theme-crop" : undefined}
              onPointerDown={canPlaceImage ? onCropPointerDown : undefined}
              onPointerMove={canPlaceImage ? onCropPointerMove : undefined}
              onPointerUp={canPlaceImage ? onCropPointerUp : undefined}
              onPointerCancel={canPlaceImage ? onCropPointerUp : undefined}
            >
              <div
                ref={datebarRef}
                className={
                  "jcard-datebar jcard-datebar--guest" +
                  (previewDto ? " jcard-datebar--author-theme" : "")
                }
              >
                {datebarInner}
                {canPlaceImage ? (
                  <div
                    className="j-card-theme-crop-handle"
                    role="slider"
                    aria-label="Kéo vị trí ảnh"
                    aria-valuemin={-100}
                    aria-valuemax={200}
                    aria-valuenow={Math.round(imagePos.x * 100)}
                    tabIndex={0}
                    onPointerDown={onCropPointerDown}
                  >
                    <Move size={12} strokeWidth={2.4} aria-hidden />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="jcard-body j-card-theme-demo-body">
              <span className="j-card-theme-demo-title-shape" />
              <span className="j-card-theme-demo-line" />
              <span className="j-card-theme-demo-line j-card-theme-demo-line--mid" />
              <span className="j-card-theme-demo-line j-card-theme-demo-line--short" />
              <div className="j-card-theme-demo-grid" aria-hidden>
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="j-card-theme-demo-actions" aria-hidden>
                <span />
                <span />
                <span className="j-card-theme-demo-actions-spacer" />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div
      className="j-theme-picker j-card-theme-picker"
      aria-label="Giao diện thanh bài viết"
    >
      <div className="j-theme-picker-main">
        <div className="j-theme-picker-label">
          <span>Thanh bài viết</span>
          {status === "saving" ? (
            <span className="j-theme-picker-status">Đang lưu…</span>
          ) : status === "ok" ? (
            <span className="j-theme-picker-status is-ok">Đã lưu</span>
          ) : status === "err" ? (
            <span className="j-theme-picker-status is-err" role="alert">
              {errMsg ?? "Lỗi"}
            </span>
          ) : dirty ? (
            <span className="j-theme-picker-status">Chưa lưu</span>
          ) : null}
        </div>
        <section
          className={
            "j-theme-section j-theme-section--home" +
            (card.enabled ? " is-active" : "")
          }
          aria-labelledby="j-card-enable-heading"
        >
          <div className="j-theme-home-row">
            <span className="j-theme-home-text">
              <span
                className="j-theme-home-check-title"
                id="j-card-enable-heading"
              >
                Bật màu thanh bài viết
              </span>
            </span>
            <button
              type="button"
              className={"j-theme-home-switch" + (card.enabled ? " is-on" : "")}
              role="switch"
              aria-checked={card.enabled}
              aria-labelledby="j-card-enable-heading"
              onClick={() => setEnabled(!card.enabled)}
            >
              <span className="j-theme-home-switch-knob" aria-hidden />
            </button>
          </div>
        </section>

        <fieldset className="j-card-theme-fieldset" disabled={!card.enabled}>
          <legend>Màu</legend>
          <div
            className="j-card-theme-mode-row"
            role="radiogroup"
            aria-label="Nguồn màu"
          >
            <button
              type="button"
              role="radio"
              aria-checked={card.mode === "inheritAccent"}
              className={
                "j-card-theme-mode" +
                (card.mode === "inheritAccent" ? " is-active" : "")
              }
              onClick={() => setMode("inheritAccent")}
            >
              Theo theme hồ sơ
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={card.mode === "custom"}
              className={
                "j-card-theme-mode" +
                (card.mode === "custom" ? " is-active" : "")
              }
              onClick={() => setMode("custom")}
            >
              Màu riêng
            </button>
          </div>

          {card.mode === "custom" ? (
            <div
              className="j-theme-swatch-row"
              role="listbox"
              aria-label="Màu thanh bài"
            >
              {PROFILE_ACCENTS.map((a) => {
                const selected = a.id === card.accent && !customSelected;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={a.label}
                    title={a.label}
                    className={
                      "j-theme-swatch" + (selected ? " is-active" : "")
                    }
                    style={{ ["--swatch" as string]: a.hex }}
                    onClick={() => onAccent(a.id)}
                  />
                );
              })}
              <label
                className={
                  "j-theme-colorwheel" + (customSelected ? " is-active" : "")
                }
                title="Màu tự chọn"
              >
                <span className="j-theme-colorwheel-ring" aria-hidden />
                <span
                  ref={customSwatchRef}
                  className="j-theme-colorwheel-current"
                  style={{ background: customValue }}
                  aria-hidden
                />
                <input
                  type="color"
                  value={customValue}
                  aria-label="Màu tự chọn"
                  onInput={(e) => onCustomPreview(e.currentTarget.value)}
                  onChange={(e) => onCustomPreview(e.currentTarget.value)}
                  onBlur={() => onCustomCommit(customLiveRef.current)}
                />
              </label>
            </div>
          ) : null}

          {card.mode === "custom" ? (
            <div className="j-card-theme-pattern-block">
              <span className="j-card-theme-pattern-label">Họa tiết</span>
              <div
                className="j-theme-pattern-row"
                role="listbox"
                aria-label="Họa tiết thanh bài"
              >
                {PROFILE_PATTERNS.map((p) => {
                  const selected =
                    !card.imageId && (card.patternId ?? "none") === p.id;
                  const def = getPatternDef(p.id);
                  const thumbImage =
                    def.thumbImage !== undefined ? def.thumbImage : def.image;
                  const thumbSize = def.thumbSize ?? def.size;
                  const thumbPosition = def.thumbPosition ?? def.position;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-label={p.label}
                      title={p.label}
                      className={
                        "j-theme-pattern" + (selected ? " is-active" : "")
                      }
                      style={
                        {
                          ["--j-accent" as string]:
                            previewAccent ?? customValue,
                        } as CSSProperties
                      }
                      onClick={() => onPattern(p.id)}
                    >
                      <span
                        className="j-theme-pattern-preview"
                        style={
                          thumbImage
                            ? ({
                                ["--preview-image" as string]: thumbImage,
                                ["--preview-size" as string]:
                                  thumbSize ?? "auto",
                                ["--preview-position" as string]:
                                  thumbPosition ?? "0 0",
                              } as CSSProperties)
                            : undefined
                        }
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </fieldset>

        <fieldset
          className="j-card-theme-fieldset"
          disabled={!card.enabled}
          aria-label="Ảnh nền thanh"
        >
          <section className="j-theme-section">
            <div className="j-theme-picker-label">
              <span>Ảnh nền thanh</span>
              {uploading ? (
                <JourneyThemeUploadProgress progress={uploadPct} />
              ) : null}
            </div>
            <div className="j-theme-image-row">
              <button
                type="button"
                className={
                  "j-theme-image-thumb j-card-theme-img-none" +
                  (!card.imageId ? " is-active" : "")
                }
                aria-pressed={!card.imageId}
                disabled={uploading || status === "saving"}
                onClick={onClearImage}
              >
                Chỉ màu
              </button>
              <button
                type="button"
                className="j-theme-image-upload"
                disabled={uploading || status === "saving"}
                onClick={() => fileInputRef.current?.click()}
              >
                + Tải ảnh
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="j-theme-image-file"
                aria-label="Tải ảnh nền thanh bài"
                onChange={(e) =>
                  void onUploadFile(e.currentTarget.files?.[0] ?? null)
                }
              />
              {customs.map((c) => {
                const thumb = profileThemeImageUrl(c.imageId, "gridsm");
                const selected = card.imageId === c.imageId;
                const busy = removingId === c.imageId;
                return (
                  <div
                    key={c.imageId}
                    className={
                      "j-theme-image-custom" +
                      (selected ? " is-active" : "")
                      + (busy ? " is-removing" : "")
                    }
                  >
                    <button
                      type="button"
                      className={
                        "j-theme-image-thumb" + (selected ? " is-active" : "")
                      }
                      aria-pressed={selected}
                      aria-label="Chọn ảnh nền thanh"
                      disabled={
                        Boolean(removingId) ||
                        uploading ||
                        status === "saving"
                      }
                      style={
                        thumb
                          ? { backgroundImage: `url("${thumb}")` }
                          : undefined
                      }
                      onClick={() => onSelectImage(c.imageId)}
                    />
                    <button
                      type="button"
                      className="j-theme-image-remove"
                      aria-label="Xóa ảnh này khỏi lịch sử"
                      title="Xóa ảnh"
                      disabled={
                        Boolean(removingId) ||
                        uploading ||
                        status === "saving"
                      }
                      onClick={() => void onRemoveCustom(c.imageId)}
                    >
                      <X size={12} strokeWidth={2.2} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="j-theme-dim">
              <label className="j-theme-dim-label" htmlFor="j-card-theme-dim">
                Độ đậm nền
                <span>
                  {Math.round((card.dim || PROFILE_BG_DIM_DEFAULT) * 100)}%
                </span>
              </label>
              <input
                id="j-card-theme-dim"
                type="range"
                min={PROFILE_BG_DIM_MIN}
                max={PROFILE_BG_DIM_MAX}
                step={0.01}
                value={card.dim || PROFILE_BG_DIM_DEFAULT}
                onChange={(e) => onDim(Number(e.currentTarget.value))}
              />
            </div>
          </section>
        </fieldset>
      </div>

      <aside
        className="j-theme-picker-aside j-card-theme-picker-aside"
        aria-label="Xem trước thanh bài"
      >
        <div className="j-theme-picker-label j-theme-device-head">
          <span>Xem trước</span>
          <div
            className="j-theme-scheme-toggle"
            role="group"
            aria-label="Nền demo"
          >
            <button
              type="button"
              className={
                "j-theme-scheme-btn" + (scheme === "light" ? " is-active" : "")
              }
              aria-pressed={scheme === "light"}
              title="Nền sáng"
              onClick={() => setScheme("light")}
            >
              <Sun size={14} strokeWidth={2.1} aria-hidden />
              <span>Sáng</span>
            </button>
            <button
              type="button"
              className={
                "j-theme-scheme-btn" + (scheme === "dark" ? " is-active" : "")
              }
              aria-pressed={scheme === "dark"}
              title="Nền tối"
              onClick={() => setScheme("dark")}
            >
              <Moon size={14} strokeWidth={2.1} aria-hidden />
              <span>Tối</span>
            </button>
          </div>
        </div>
        <div className="j-card-theme-aside-stage">
          {previewNode}
          {canPlaceImage ? (
            <div className="j-card-theme-place">
              <p className="j-card-theme-place-hint">
                Kéo thanh bài để đặt ảnh. Lăn chuột để phóng.
              </p>
              <div className="j-card-theme-place-row">
                <label htmlFor="j-card-theme-scale">Phóng</label>
                <input
                  id="j-card-theme-scale"
                  type="range"
                  min={CARD_IMAGE_SCALE_MIN}
                  max={CARD_IMAGE_SCALE_MAX}
                  step={0.01}
                  value={imageScale}
                  onChange={(e) =>
                    onImagePlace({ scale: Number(e.currentTarget.value) })
                  }
                />
                <span>{Math.round(imageScale * 100)}%</span>
              </div>
              <div className="j-card-theme-place-row">
                <label htmlFor="j-card-theme-rotate">Xoay</label>
                <input
                  id="j-card-theme-rotate"
                  type="range"
                  min={CARD_IMAGE_ROTATE_MIN}
                  max={CARD_IMAGE_ROTATE_MAX}
                  step={1}
                  value={imageRotate}
                  onChange={(e) =>
                    onImagePlace({ rotate: Number(e.currentTarget.value) })
                  }
                />
                <span>{Math.round(imageRotate)}°</span>
              </div>
              <div className="j-card-theme-place-actions">
                <button
                  type="button"
                  className="j-card-theme-place-btn"
                  onClick={resetImagePlace}
                >
                  Đặt lại
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
});
