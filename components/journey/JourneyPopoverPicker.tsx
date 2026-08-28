"use client";

import { X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  applyPopoverPreset,
  parsePopoverTheme,
  popoversEqual,
  POPOVER_PRESET_IDS,
  POPOVER_PRESET_LABELS,
  POPOVER_STAT_LABELS,
  popoverThemeStyle,
  resolvePopoverThemeDto,
  withFixedPopoverStructure,
  type PopoverCoverKind,
  type PopoverPresetId,
  type PopoverSurfaceKind,
  type ProfilePopoverThemeSlice,
} from "@/lib/journey/popover-theme";
import {
  DEFAULT_PROFILE_THEME,
  PROFILE_BG_DIM_DEFAULT,
  PROFILE_BG_DIM_MAX,
  PROFILE_BG_DIM_MIN,
  PROFILE_PATTERNS,
  PROFILE_THEME_CUSTOMS_MAX,
  profileThemeImageUrl,
  resolveAccentHex,
  type ProfileCustomEntry,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";
import { JourneyFramedAvatar } from "@/components/journey/JourneyFramedAvatar";
import {
  resolveAvatarFrameDto,
  type ProfileAvatarFrameSlice,
} from "@/lib/journey/avatar-frame";
import {
  patchGiaoDien,
  popoverSliceToPatch,
} from "@/lib/journey/giao-dien-patch-client";

import "./journey-theme.css";
import "./journey-user-popover-theme.css";
import "./journey-popover-picker.css";

type Props = {
  initialPopover?: ProfilePopoverThemeSlice | null;
  profileTheme?: ProfileThemeSlice | null;
  profileAvatarFrame?: ProfileAvatarFrameSlice | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  authorCoverUrl?: string | null;
  authorBio?: string | null;
  authorSlug?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
};

export type JourneyPopoverPickerHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  getPatch: () => Record<string, unknown> | null;
  markSaved: (popover?: unknown, customs?: ProfileCustomEntry[]) => void;
};

function slicePop(
  raw: ProfilePopoverThemeSlice | null | undefined,
  customs?: ProfileCustomEntry[] | null,
): ProfilePopoverThemeSlice {
  return parsePopoverTheme(raw ?? null, customs);
}

function sliceTheme(raw: ProfileThemeSlice | null | undefined): ProfileThemeSlice {
  if (!raw) return { ...DEFAULT_PROFILE_THEME };
  return raw;
}

export const JourneyPopoverPicker = forwardRef<
  JourneyPopoverPickerHandle,
  Props
>(function JourneyPopoverPicker(
  {
    initialPopover = null,
    profileTheme = null,
    profileAvatarFrame = null,
    authorName = null,
    authorAvatarUrl = null,
    authorCoverUrl = null,
    authorBio = null,
    authorSlug = null,
    onDirtyChange,
  },
  ref,
) {
  const [pop, setPop] = useState(() => slicePop(initialPopover));
  const [baseline, setBaseline] = useState(() => slicePop(initialPopover));
  const [theme, setTheme] = useState(() => sliceTheme(profileTheme));
  const [customs, setCustoms] = useState<ProfileCustomEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const popRef = useRef(pop);
  const baselineRef = useRef(baseline);
  const themeRef = useRef(theme);
  const customsRef = useRef(customs);
  const fileInputRef = useRef<HTMLInputElement>(null);

  popRef.current = pop;
  baselineRef.current = baseline;
  themeRef.current = theme;
  customsRef.current = customs;

  const dirty = !popoversEqual(pop, baseline);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/giao-dien");
        if (!res.ok) return;
        const data = (await res.json()) as {
          popover?: unknown;
          theme?: ProfileThemeSlice;
          customs?: ProfileCustomEntry[];
        };
        if (cancelled) return;
        const nextCustoms = Array.isArray(data.customs) ? data.customs : [];
        setCustoms(nextCustoms);
        customsRef.current = nextCustoms;
        if (data.theme) {
          const t = sliceTheme(data.theme);
          setTheme(t);
          themeRef.current = t;
        }
        if (
          data.popover &&
          popoversEqual(popRef.current, baselineRef.current)
        ) {
          const parsed = parsePopoverTheme(data.popover, nextCustoms);
          setPop(parsed);
          setBaseline(parsed);
          popRef.current = parsed;
          baselineRef.current = parsed;
        }
      } catch {
        /* giữ initial */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: ProfilePopoverThemeSlice) => {
    const fixed = withFixedPopoverStructure(next);
    popRef.current = fixed;
    setPop(fixed);
  }, []);

  const persist = useCallback(async (next: ProfilePopoverThemeSlice) => {
    setError(null);
    try {
      const data = await patchGiaoDien(popoverSliceToPatch(next));
      if (!data.ok) {
        throw new Error(data.error ?? "Không lưu được card.");
      }
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      const saved = parsePopoverTheme(
        data.popover ?? next,
        customsRef.current,
      );
      setPop(saved);
      setBaseline(saved);
      popRef.current = saved;
      baselineRef.current = saved;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được.");
      return false;
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => !popoversEqual(popRef.current, baselineRef.current),
      save: async () => persist(popRef.current),
      getPatch: () => {
        if (popoversEqual(popRef.current, baselineRef.current)) return null;
        return popoverSliceToPatch(popRef.current);
      },
      markSaved: (popover, customs) => {
        if (Array.isArray(customs)) {
          setCustoms(customs);
          customsRef.current = customs;
        }
        const saved = parsePopoverTheme(
          popover ?? popRef.current,
          customsRef.current,
        );
        setPop(saved);
        setBaseline(saved);
        popRef.current = saved;
        baselineRef.current = saved;
      },
      discard: () => {
        const base = slicePop(baselineRef.current, customsRef.current);
        popRef.current = base;
        setPop(base);
      },
    }),
    [persist],
  );

  const previewSlug = authorSlug?.trim() || "ban";
  const previewDto = resolvePopoverThemeDto(pop, theme, previewSlug);
  const previewStyle = popoverThemeStyle(previewDto);
  const previewAccent =
    previewDto?.accentHex ??
    (pop.enabled ? resolveAccentHex(theme) : null);
  const name = authorName?.trim() || "Tên hiển thị";
  const bio = authorBio?.trim() || "Bio mẫu — giới thiệu ngắn về bạn.";
  const coverKind = previewDto?.cover.kind ?? "profile";
  const useCoverImg = coverKind === "profile" && Boolean(authorCoverUrl);

  function setEnabled(enabled: boolean) {
    if (!enabled) {
      commit({ ...popRef.current, enabled: false });
      return;
    }
    const cur = popRef.current;
    /* Bật lần đầu → Mặc định CINS + cover ảnh bìa + nền gradient. */
    if (cur.preset === "default" && !cur.enabled) {
      commit(applyPopoverPreset(cur, "default"));
      return;
    }
    commit({ ...cur, enabled: true });
  }

  function onPreset(id: PopoverPresetId) {
    commit(applyPopoverPreset(popRef.current, id));
  }

  function setSurface(kind: PopoverSurfaceKind) {
    if (kind === "gradient") {
      commit({
        ...popRef.current,
        enabled: true,
        surface: {
          ...popRef.current.surface,
          kind: "gradient",
          imageId: null,
        },
      });
      return;
    }
    const keepId = popRef.current.surface.imageId;
    const fallback = customsRef.current[0]?.imageId ?? null;
    const imageId = keepId ?? fallback;
    commit({
      ...popRef.current,
      enabled: true,
      surface: {
        ...popRef.current.surface,
        kind: imageId ? "image" : "gradient",
        imageId,
      },
    });
  }

  function onSelectSurfaceImage(imageId: string) {
    commit({
      ...popRef.current,
      enabled: true,
      surface: {
        ...popRef.current.surface,
        kind: "image",
        imageId,
      },
    });
  }

  function onSurfaceDim(dim: number) {
    commit({
      ...popRef.current,
      enabled: true,
      surface: {
        ...popRef.current.surface,
        dim,
      },
    });
  }

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/user/giao-dien/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        imageId?: string;
        customs?: ProfileCustomEntry[];
      } | null;
      if (!res.ok || !data?.imageId) {
        throw new Error(data?.error ?? "Không tải được ảnh.");
      }
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      onSelectSurfaceImage(data.imageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemoveCustom(imageId: string) {
    const id = imageId.trim();
    if (!id || removingId) return;
    setRemovingId(id);
    setError(null);
    try {
      const res = await fetch("/api/user/giao-dien/custom", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: id }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        customs?: ProfileCustomEntry[];
        popover?: unknown;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Không xóa được ảnh.");
      }
      const nextCustoms = Array.isArray(data?.customs)
        ? data.customs
        : customsRef.current.filter((c) => c.imageId !== id);
      setCustoms(nextCustoms);
      customsRef.current = nextCustoms;

      const nextPop = data?.popover
        ? parsePopoverTheme(data.popover, nextCustoms)
        : popRef.current.surface.imageId === id
          ? {
              ...popRef.current,
              surface: {
                ...popRef.current.surface,
                kind: "gradient" as const,
                imageId: null,
              },
            }
          : popRef.current;
      commit(nextPop);
      if (baselineRef.current.surface.imageId === id) {
        const nextBase = {
          ...baselineRef.current,
          surface: {
            ...baselineRef.current.surface,
            kind: "gradient" as const,
            imageId: null,
          },
        };
        setBaseline(nextBase);
        baselineRef.current = nextBase;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được ảnh.");
    } finally {
      setRemovingId(null);
    }
  }

  function setCoverKind(kind: PopoverCoverKind) {
    commit({
      ...popRef.current,
      enabled: true,
      cover: {
        ...popRef.current.cover,
        kind,
        imageId: null,
        patternId:
          kind === "pattern" && popRef.current.cover.patternId === "none"
            ? "dots"
            : popRef.current.cover.patternId,
      },
    });
  }

  function setCoverPattern(patternId: (typeof PROFILE_PATTERNS)[number]["id"]) {
    commit({
      ...popRef.current,
      enabled: true,
      cover: {
        ...popRef.current.cover,
        kind: "pattern",
        patternId: patternId === "none" ? "dots" : patternId,
        imageId: null,
      },
    });
  }

  return (
    <div
      className="j-theme-picker j-pop-theme-picker"
      aria-label="Giao diện card user"
    >
      <div className="j-theme-picker-main">
        <div className="j-theme-picker-label">
          <span>Card user</span>
          {error ? (
            <span className="j-theme-picker-status is-err" role="alert">
              {error}
            </span>
          ) : dirty ? (
            <span className="j-theme-picker-status">Chưa lưu</span>
          ) : null}
        </div>

        <label className="j-pop-theme-toggle">
          <input
            type="checkbox"
            checked={pop.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Bật giao diện card user</span>
        </label>
        <p className="j-pop-theme-hint">
          Màu theo theme hồ sơ. Cover mặc định ảnh bìa — chỉ đổi nền / cover.
          Cover, avatar và Feature luôn hiện đủ. Nhớ{" "}
          <strong>Lưu giao diện</strong>.
        </p>

        <fieldset className="j-pop-theme-fieldset" disabled={!pop.enabled}>
          <legend>Preset</legend>
          <div className="j-pop-theme-chips">
            {POPOVER_PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`j-pop-theme-chip${pop.preset === id ? " is-on" : ""}`}
                onClick={() => onPreset(id)}
              >
                {POPOVER_PRESET_LABELS[id]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="j-pop-theme-fieldset" disabled={!pop.enabled}>
          <legend>Nền card</legend>
          <div className="j-pop-theme-chips">
            <button
              type="button"
              className={`j-pop-theme-chip${pop.surface.kind === "gradient" ? " is-on" : ""}`}
              onClick={() => setSurface("gradient")}
            >
              Gradient
            </button>
            <button
              type="button"
              className={`j-pop-theme-chip${pop.surface.kind === "image" ? " is-on" : ""}`}
              onClick={() => setSurface("image")}
            >
              Ảnh
            </button>
          </div>

          {pop.surface.kind === "image" ? (
            <div className="j-theme-image-row j-pop-theme-image-row">
              <button
                type="button"
                className="j-theme-image-upload"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Đang tải…" : "+ Tải ảnh"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="j-theme-image-file"
                aria-label="Tải ảnh nền card"
                onChange={(e) =>
                  void onUploadFile(e.currentTarget.files?.[0] ?? null)
                }
              />
              <span className="j-pop-theme-hint j-pop-theme-hint--inline">
                Cùng lịch sử Theme · tối đa {PROFILE_THEME_CUSTOMS_MAX}
              </span>
              {customs.map((c) => {
                const thumb = profileThemeImageUrl(c.imageId, "gridsm");
                const selected = pop.surface.imageId === c.imageId;
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
                      aria-label="Chọn ảnh nền card"
                      disabled={Boolean(removingId) || uploading}
                      style={
                        thumb
                          ? { backgroundImage: `url("${thumb}")` }
                          : undefined
                      }
                      onClick={() => onSelectSurfaceImage(c.imageId)}
                    />
                    <button
                      type="button"
                      className="j-theme-image-remove"
                      aria-label="Xóa ảnh này khỏi lịch sử"
                      title="Xóa ảnh"
                      disabled={Boolean(removingId) || uploading}
                      onClick={() => void onRemoveCustom(c.imageId)}
                    >
                      <X size={12} strokeWidth={2.2} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="j-theme-dim">
            <label className="j-theme-dim-label" htmlFor="j-pop-surface-dim">
              Độ đậm nền
              <span>
                {Math.round(
                  (pop.surface.dim || PROFILE_BG_DIM_DEFAULT) * 100,
                )}
                %
              </span>
            </label>
            <input
              id="j-pop-surface-dim"
              type="range"
              min={PROFILE_BG_DIM_MIN}
              max={PROFILE_BG_DIM_MAX}
              step={0.01}
              value={pop.surface.dim || PROFILE_BG_DIM_DEFAULT}
              onChange={(e) => onSurfaceDim(Number(e.currentTarget.value))}
            />
          </div>
        </fieldset>

        <fieldset className="j-pop-theme-fieldset" disabled={!pop.enabled}>
          <legend>Cover</legend>
          <div className="j-pop-theme-chips">
            <button
              type="button"
              className={`j-pop-theme-chip${pop.cover.kind === "profile" ? " is-on" : ""}`}
              onClick={() => setCoverKind("profile")}
            >
              Ảnh bìa hồ sơ
            </button>
            <button
              type="button"
              className={`j-pop-theme-chip${pop.cover.kind === "pattern" ? " is-on" : ""}`}
              onClick={() => setCoverKind("pattern")}
            >
              Pattern
            </button>
            <button
              type="button"
              className={`j-pop-theme-chip${pop.cover.kind === "solid" ? " is-on" : ""}`}
              onClick={() => setCoverKind("solid")}
            >
              Màu đặc
            </button>
          </div>
          {pop.cover.kind === "pattern" ? (
            <div className="j-pop-theme-chips">
              {PROFILE_PATTERNS.filter((p) => p.id !== "none").map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`j-pop-theme-chip${pop.cover.patternId === p.id ? " is-on" : ""}`}
                  onClick={() => setCoverPattern(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : null}
        </fieldset>
      </div>

      <aside
        className="j-theme-picker-aside j-pop-theme-picker-aside"
        aria-label="Xem trước card"
      >
        <div className="j-theme-picker-label">
          <span>Xem trước</span>
        </div>
        <div className="j-pop-theme-preview">
          <div
            className="j-user-popover j-pop-theme-preview-frame"
            data-pop-theme={pop.enabled ? "" : undefined}
            data-pop-surface={previewDto?.surface.kind}
            data-pop-layout="masonry"
            style={
              pop.enabled
                ? {
                    ...previewStyle,
                    ...(previewAccent
                      ? { ["--j-pop-accent"]: previewAccent }
                      : null),
                  }
                : undefined
            }
          >
            <article className="j-friend-card j-user-pop-card">
              <div
                className={`j-friend-cover${useCoverImg ? " has-img" : ""}`}
                data-pop-cover={
                  pop.enabled && coverKind !== "profile" ? coverKind : undefined
                }
                aria-hidden
              >
                {useCoverImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={authorCoverUrl!} alt="" />
                ) : null}
              </div>
              <div className="j-friend-body">
                <JourneyFramedAvatar
                  className="j-friend-avatar"
                  sizePx={78}
                  frame={resolveAvatarFrameDto(profileAvatarFrame)}
                >
                  {authorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={authorAvatarUrl} alt="" />
                  ) : (
                    <span>{name.slice(0, 1)}</span>
                  )}
                </JourneyFramedAvatar>
                <h3>{name}</h3>
                <p className="j-friend-bio" data-pop-bio="clamp2">
                  {bio}
                </p>
                <div className="j-friend-stats">
                  {(["feature", "gallery", "banBe"] as const).map((id) => (
                    <span key={id}>
                      <strong>—</strong>
                      {POPOVER_STAT_LABELS[id]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="j-user-featured is-open">
                <div
                  className="j-user-featured-masonry"
                  style={{ ["--j-featured-cols"]: 3 } as CSSProperties}
                >
                  {Array.from({ length: 3 }).map((_, col) => (
                    <div key={col} className="j-user-featured-mcol">
                      <div
                        className="j-user-featured-tile j-pop-theme-skel"
                        style={{ aspectRatio: "4/3" }}
                      />
                      <div
                        className="j-user-featured-tile j-pop-theme-skel"
                        style={{ aspectRatio: "3/4" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </aside>
    </div>
  );
});
