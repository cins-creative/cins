"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Moon, MoreHorizontal, Sun, X } from "lucide-react";

import {
  authorCardThemeStyle,
  cardsEqual,
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
  profileThemeImageUrl,
  resolveAccentHex,
  type ProfileCustomEntry,
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
  return raw ? { ...raw } : { ...DEFAULT_CARD_THEME };
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
    commit({ ...cardRef.current, imageId, enabled: true });
  }

  function onClearImage() {
    commit({ ...cardRef.current, imageId: null });
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

  const previewNode = (
    <article
      className="j-milestone j-self j-card-theme-demo"
      aria-hidden
      data-preview-scheme={scheme}
      {...(previewDto
        ? {
            "data-card-theme": "1" as const,
            ...(previewDto.imageUrl
              ? { "data-card-image": "1" as const }
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
            <div className="jcard-datebar jcard-datebar--guest">
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
        <label className="j-card-theme-toggle">
          <input
            type="checkbox"
            checked={card.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Bật màu thanh bài viết</span>
        </label>

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
        </fieldset>

        <fieldset className="j-card-theme-fieldset" disabled={!card.enabled}>
          <legend>Ảnh nền thanh</legend>
          {uploading ? (
            <div className="j-theme-picker-label">
              <JourneyThemeUploadProgress progress={uploadPct} />
            </div>
          ) : null}
          <div className="j-theme-image-row">
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
            <button
              type="button"
              className={
                "j-card-theme-mode" + (!card.imageId ? " is-active" : "")
              }
              aria-pressed={!card.imageId}
              disabled={uploading || status === "saving"}
              onClick={onClearImage}
            >
              Chỉ màu
            </button>
            {customs.map((c) => {
              const thumb = profileThemeImageUrl(c.imageId, "gridsm");
              const selected = card.imageId === c.imageId;
              const busy = removingId === c.imageId;
              return (
                <div
                  key={c.imageId}
                  className={
                    "j-theme-image-custom" +
                    (selected ? " is-active" : "") +
                    (busy ? " is-removing" : "")
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
                      Boolean(removingId) || uploading || status === "saving"
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
                      Boolean(removingId) || uploading || status === "saving"
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
        <div className="j-card-theme-aside-stage">{previewNode}</div>
      </aside>
    </div>
  );
});
