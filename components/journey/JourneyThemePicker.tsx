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

import { JourneyThemeUploadProgress } from "@/components/journey/JourneyThemeUploadProgress";
import { uploadGiaoDienCustomWithProgress } from "@/lib/files/upload-giao-dien-custom";

import {
  accentFromRecentHex,
  DEFAULT_PROFILE_ACCENT_RECENTS,
  DEFAULT_PROFILE_THEME,
  getPatternDef,
  isDefaultProfileTheme,
  normalizeAccentHex,
  parseAccentRecent,
  parseProfileGiaoDien,
  PROFILE_ACCENTS,
  PROFILE_BG_DIM_DEFAULT,
  PROFILE_BG_DIM_MAX,
  PROFILE_BG_DIM_MIN,
  PROFILE_PATTERNS,
  PROFILE_THEME_BG_SWITCH_DEFAULT,
  PROFILE_THEME_CUSTOMS_MAX,
  profileThemeCssVars,
  profileThemeImageUrl,
  rememberAccentRecent,
  removeProfileCustomImage,
  resolveAccentHex,
  resolveDeviceImageId,
  type ProfileBackground,
  type ProfileBgPosition,
  type ProfileCustomEntry,
  type ProfileGiaoDienState,
  type ProfilePatternId,
  type ProfileThemeDeviceId,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";
import { DEFAULT_AVATAR_FRAME } from "@/lib/journey/avatar-frame";
import { DEFAULT_CARD_THEME } from "@/lib/journey/card-theme";
import { DEFAULT_POPOVER_THEME } from "@/lib/journey/popover-theme";
import { DEFAULT_SHOP_SWITCH } from "@/lib/journey/shop-switch";
import { dispatchUserThemeChange } from "@/lib/journey/user-shell-theme";
import {
  patchGiaoDien,
  resetGiaoDienTheme,
  themeSliceToPatch,
} from "@/lib/journey/giao-dien-patch-client";
import {
  JourneyThemeDevicePreview,
  type ThemePreviewDevice,
} from "@/components/journey/JourneyThemeDevicePreview";

import "./journey-theme.css";

type Props = {
  /** State ban đầu từ SSR (đã parse) hoặc null → mặc định. */
  initialTheme?: ProfileThemeSlice | null;
  /** Báo modal khi draft ≠ bản đã lưu. */
  onDirtyChange?: (dirty: boolean) => void;
};

export type JourneyThemePickerHandle = {
  isDirty: () => boolean;
  /** Persist draft. `true` = ok. */
  save: () => Promise<boolean>;
  /** Bỏ draft, trả preview về baseline. */
  discard: () => void;
  getPatch: () => Record<string, unknown> | null;
  isDefaultDraft: () => boolean;
  markSaved: (customs?: ProfileCustomEntry[]) => void;
};

function clearPageThemeVars(page: HTMLElement) {
  page.removeAttribute("data-profile-theme");
  page.removeAttribute("data-profile-bg");
  for (const key of [
    "--j-accent",
    "--j-bg-image",
    "--j-bg-image-sm",
    "--j-bg-image-md",
    "--j-bg-size",
    "--j-bg-position",
    "--j-bg-position-sm",
    "--j-bg-position-md",
    "--j-bg-repeat",
    "--j-bg-dim",
  ]) {
    page.style.removeProperty(key);
  }
}

function applyLivePreview(theme: ProfileThemeSlice) {
  /* Hồ sơ: `.cins-journey-page` không phải home feed. */
  const page = document.querySelector<HTMLElement>(
    ".cins-journey-page:not(.world-journey-home)",
  );
  if (page) {
    const imageIds = new Set<string>();
    if (theme.background.imageId) imageIds.add(theme.background.imageId);
    for (const d of Object.values(theme.background.devices ?? {})) {
      if (d?.imageId) imageIds.add(d.imageId);
    }
    const state: ProfileGiaoDienState = {
      v: 1,
      theme,
      customs: [...imageIds].map((imageId) => ({
        imageId,
        createdAt: "",
      })),
      card: DEFAULT_CARD_THEME,
      avatarFrame: DEFAULT_AVATAR_FRAME,
      popover: DEFAULT_POPOVER_THEME,
      shopSwitch: DEFAULT_SHOP_SWITCH,
    };
    if (isDefaultProfileTheme(state) && theme.background.kind !== "image") {
      clearPageThemeVars(page);
    } else {
      const vars = profileThemeCssVars(state);
      page.setAttribute("data-profile-theme", "1");
      if (theme.background.kind === "image") {
        page.setAttribute("data-profile-bg", "image");
      } else {
        page.removeAttribute("data-profile-bg");
      }
      for (const [key, value] of Object.entries(vars)) {
        if (typeof value === "string") {
          page.style.setProperty(key, value);
        }
      }
    }
  }
  dispatchUserThemeChange(theme);
}

function cloneBackground(bg: ProfileBackground): ProfileBackground {
  const devices: ProfileBackground["devices"] = {};
  for (const [k, v] of Object.entries(bg.devices ?? {})) {
    if (!v) continue;
    devices[k as ProfileThemeDeviceId] = {
      imageId: v.imageId,
      position: { ...v.position },
    };
  }
  return {
    ...bg,
    position: { ...bg.position },
    devices,
  };
}

/** Gom imageId từ background (default + per-device) → stub customs để hiện thumb. */
function customsFromBackground(bg: ProfileBackground): ProfileCustomEntry[] {
  const ids = new Set<string>();
  if (bg.imageId) ids.add(bg.imageId);
  for (const d of Object.values(bg.devices ?? {})) {
    if (d?.imageId) ids.add(d.imageId);
  }
  return [...ids].map((imageId) => ({ imageId, createdAt: "" }));
}

/** Merge customs — giữ entry cũ (createdAt), thêm id còn thiếu lên đầu. */
function mergeCustoms(
  prev: ProfileCustomEntry[],
  extra: ProfileCustomEntry[],
): ProfileCustomEntry[] {
  if (extra.length === 0) return prev;
  const have = new Set(prev.map((c) => c.imageId));
  const missing = extra.filter((c) => c.imageId && !have.has(c.imageId));
  if (missing.length === 0) return prev;
  return [...missing, ...prev].slice(0, PROFILE_THEME_CUSTOMS_MAX);
}

function sliceFromInitial(
  initial: ProfileThemeSlice | null | undefined,
): ProfileThemeSlice {
  if (!initial) {
    return {
      ...DEFAULT_PROFILE_THEME,
      background: cloneBackground(DEFAULT_PROFILE_THEME.background),
    };
  }
  return {
    accent: initial.accent,
    accentHex: initial.accent === "custom" ? initial.accentHex : null,
    applyToHome: initial.applyToHome === true,
    background: cloneBackground(initial.background),
  };
}

function posEqual(a: ProfileBgPosition, b: ProfileBgPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

function devicesEqual(
  a: ProfileBackground["devices"],
  b: ProfileBackground["devices"],
): boolean {
  const keys = new Set([
    ...Object.keys(a ?? {}),
    ...Object.keys(b ?? {}),
  ] as ProfileThemeDeviceId[]);
  for (const k of keys) {
    const da = a?.[k];
    const db = b?.[k];
    if (!da && !db) continue;
    if (!da || !db) return false;
    if ((da.imageId ?? null) !== (db.imageId ?? null)) return false;
    if (!posEqual(da.position, db.position)) return false;
  }
  return true;
}

const ACCENT_RECENT_STORAGE_KEY = "cins.profile-theme.accentRecent.v2";

function readStoredAccentRecent(): string[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_PROFILE_ACCENT_RECENTS];
  }
  try {
    const raw = window.localStorage.getItem(ACCENT_RECENT_STORAGE_KEY);
    if (!raw) return [...DEFAULT_PROFILE_ACCENT_RECENTS];
    return parseAccentRecent(JSON.parse(raw) as unknown);
  } catch {
    return [...DEFAULT_PROFILE_ACCENT_RECENTS];
  }
}

function writeStoredAccentRecent(hexes: string[]) {
  try {
    window.localStorage.setItem(
      ACCENT_RECENT_STORAGE_KEY,
      JSON.stringify(hexes.slice(0, DEFAULT_PROFILE_ACCENT_RECENTS.length)),
    );
  } catch {
    /* quota / private mode */
  }
}

function themesEqual(a: ProfileThemeSlice, b: ProfileThemeSlice): boolean {
  return (
    a.accent === b.accent &&
    (a.accentHex ?? null) === (b.accentHex ?? null) &&
    a.applyToHome === b.applyToHome &&
    a.background.kind === b.background.kind &&
    a.background.patternId === b.background.patternId &&
    (a.background.imageId ?? null) === (b.background.imageId ?? null) &&
    a.background.dim === b.background.dim &&
    posEqual(a.background.position, b.background.position) &&
    devicesEqual(a.background.devices, b.background.devices)
  );
}

export const JourneyThemePicker = forwardRef<JourneyThemePickerHandle, Props>(
  function JourneyThemePicker({ initialTheme = null, onDirtyChange }, ref) {
    const [baseline, setBaseline] = useState<ProfileThemeSlice>(() =>
      sliceFromInitial(initialTheme),
    );
    const [theme, setTheme] = useState<ProfileThemeSlice>(() =>
      sliceFromInitial(initialTheme),
    );
    const themeRef = useRef(theme);
    const baselineRef = useRef(baseline);
    themeRef.current = theme;
    baselineRef.current = baseline;

    const [accentRecent, setAccentRecent] = useState<string[]>(() =>
      readStoredAccentRecent(),
    );
    const accentRecentRef = useRef(accentRecent);
    accentRecentRef.current = accentRecent;

    const pushAccentRecent = useCallback((hex: string) => {
      const next = rememberAccentRecent(hex, accentRecentRef.current);
      accentRecentRef.current = next;
      setAccentRecent(next);
      writeStoredAccentRecent(next);
    }, []);

    const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">(
      "idle",
    );
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const customLiveRef = useRef(
      theme.accent === "custom" && theme.accentHex
        ? theme.accentHex
        : "#1F74C9",
    );
    const customSwatchRef = useRef<HTMLSpanElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    /* Seed từ theme SSR — tránh trống lịch sử trước khi GET / khi đổi tab Họa tiết. */
    const [customs, setCustoms] = useState<ProfileCustomEntry[]>(() =>
      customsFromBackground(sliceFromInitial(initialTheme).background),
    );
    const customsRef = useRef(customs);
    customsRef.current = customs;
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [previewDevice, setPreviewDevice] =
      useState<ThemePreviewDevice>(() => {
        if (typeof window === "undefined") return "desktop";
        return window.matchMedia("(max-width: 899px)").matches
          ? "phone"
          : "desktop";
      });
    const previewDeviceRef = useRef(previewDevice);
    previewDeviceRef.current = previewDevice;
    const lastPatternRef = useRef<ProfilePatternId>(
      theme.background.kind === "pattern" &&
        theme.background.patternId !== "none"
        ? theme.background.patternId
        : "dots",
    );
    /* Giữ bản ảnh gần nhất khi sang Họa tiết — quay lại Ảnh nền không mất lịch sử/neo. */
    const lastImageBgRef = useRef<ProfileBackground | null>(
      theme.background.kind === "image"
        ? cloneBackground(theme.background)
        : null,
    );
    const [bgPanel, setBgPanel] = useState<"pattern" | "image">(() =>
      theme.background.kind === "image" ? "image" : "pattern",
    );

    const dirty = !themesEqual(theme, baseline);

    useEffect(() => {
      onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const persist = useCallback(async (next: ProfileThemeSlice) => {
      setStatus("saving");
      setErrMsg(null);
      try {
        /* Phải dùng customs thật — `customs: []` sẽ khiến isDefault=true rồi
         * DELETE xóa luôn lịch sử ảnh trên server. */
        const state: ProfileGiaoDienState = {
          v: 1,
          theme: next,
          customs: customsRef.current,
          card: DEFAULT_CARD_THEME,
      avatarFrame: DEFAULT_AVATAR_FRAME,
      popover: DEFAULT_POPOVER_THEME,
      shopSwitch: DEFAULT_SHOP_SWITCH,
        };
        if (isDefaultProfileTheme(state)) {
          const data = await resetGiaoDienTheme();
          if (!data.ok) throw new Error(data.error ?? "Không khôi phục được.");
          setCustoms([]);
          customsRef.current = [];
          lastImageBgRef.current = null;
        } else {
          const data = await patchGiaoDien(themeSliceToPatch(next));
          if (!data.ok) throw new Error(data.error ?? "Không lưu được.");
          if (Array.isArray(data.customs)) {
            setCustoms(data.customs);
            customsRef.current = data.customs;
          }
        }
        const savedHex = resolveAccentHex(next);
        const accentChanged =
          savedHex !== resolveAccentHex(baselineRef.current);
        setBaseline(sliceFromInitial(next));
        baselineRef.current = sliceFromInitial(next);
        if (accentChanged) pushAccentRecent(savedHex);
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
    }, [pushAccentRecent]);

    const commitDraft = useCallback((next: ProfileThemeSlice) => {
      themeRef.current = next;
      setTheme(next);
      applyLivePreview(next);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () =>
          !themesEqual(themeRef.current, baselineRef.current),
        save: async () => persist(themeRef.current),
        getPatch: () => {
          if (themesEqual(themeRef.current, baselineRef.current)) return null;
          return themeSliceToPatch(themeRef.current);
        },
        isDefaultDraft: () =>
          isDefaultProfileTheme({
            v: 1,
            theme: themeRef.current,
            customs: customsRef.current,
            card: DEFAULT_CARD_THEME,
            avatarFrame: DEFAULT_AVATAR_FRAME,
            popover: DEFAULT_POPOVER_THEME,
            shopSwitch: DEFAULT_SHOP_SWITCH,
          }),
        markSaved: (customs) => {
          const next = sliceFromInitial(themeRef.current);
          const savedHex = resolveAccentHex(next);
          const accentChanged =
            savedHex !== resolveAccentHex(baselineRef.current);
          setBaseline(next);
          baselineRef.current = next;
          if (accentChanged) pushAccentRecent(savedHex);
          if (Array.isArray(customs)) {
            setCustoms(customs);
            customsRef.current = customs;
          }
          setStatus("ok");
          window.setTimeout(
            () => setStatus((s) => (s === "ok" ? "idle" : s)),
            1600,
          );
        },
        discard: () => {
          const base = sliceFromInitial(baselineRef.current);
          themeRef.current = base;
          setTheme(base);
          setBgPanel(base.background.kind === "image" ? "image" : "pattern");
          if (
            base.background.kind === "pattern" &&
            base.background.patternId !== "none"
          ) {
            lastPatternRef.current = base.background.patternId;
          }
          if (base.background.kind === "image") {
            lastImageBgRef.current = cloneBackground(base.background);
          }
          if (base.accent === "custom" && base.accentHex) {
            customLiveRef.current = base.accentHex;
          }
          applyLivePreview(base);
          setStatus("idle");
          setErrMsg(null);
        },
      }),
      [persist, pushAccentRecent],
    );

    /* Đồng bộ từ server khi mount (tránh stale SSR).
     * Không dùng hydratedRef — Strict Mode cleanup cancel fetch #1 rồi chặn
     * fetch #2 → customs kẹt [] dù DB vẫn có lịch sử. */
    useEffect(() => {
      let cancelled = false;
      void (async () => {
        try {
          const res = await fetch("/api/user/giao-dien");
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as {
            theme?: ProfileThemeSlice;
            customs?: ProfileCustomEntry[];
          };
          if (cancelled) return;
          if (data.theme) {
            const next = sliceFromInitial(data.theme);
            themeRef.current = next;
            baselineRef.current = next;
            setTheme(next);
            setBaseline(next);
            setBgPanel(next.background.kind === "image" ? "image" : "pattern");
            if (
              next.background.kind === "pattern" &&
              next.background.patternId !== "none"
            ) {
              lastPatternRef.current = next.background.patternId;
            }
            if (next.background.kind === "image") {
              lastImageBgRef.current = cloneBackground(next.background);
            }
            if (next.accent === "custom" && next.accentHex) {
              customLiveRef.current = next.accentHex;
            }
            applyLivePreview(next);
          }
          /* Customs luôn áp từ server khi có mảng — kể cả theme đang pattern. */
          if (Array.isArray(data.customs)) {
            const fromTheme = data.theme
              ? customsFromBackground(
                  sliceFromInitial(data.theme).background,
                )
              : [];
            const merged =
              data.customs.length > 0
                ? mergeCustoms(data.customs, fromTheme)
                : mergeCustoms(customsRef.current, fromTheme);
            if (!cancelled) {
              customsRef.current = merged;
              setCustoms(merged);
              if (
                !lastImageBgRef.current &&
                merged[0]?.imageId
              ) {
                const dim =
                  themeRef.current.background.dim || PROFILE_BG_DIM_DEFAULT;
                lastImageBgRef.current = {
                  kind: "image",
                  patternId: "none",
                  imageId: merged[0].imageId,
                  dim: Math.max(dim, PROFILE_BG_DIM_MIN),
                  position: { ...themeRef.current.background.position },
                  devices: {},
                };
              }
            }
          }
        } catch {
          /* giữ initialTheme */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    function onRecentSwatch(hex: string) {
      const choice = accentFromRecentHex(hex);
      if (choice.accent === "custom" && choice.accentHex) {
        customLiveRef.current = choice.accentHex;
      }
      const prev = themeRef.current;
      commitDraft({
        ...prev,
        accent: choice.accent,
        accentHex: choice.accentHex,
        background: { ...prev.background },
      });
    }

    function onCustomPreview(hex: string) {
      const normalized = normalizeAccentHex(hex) ?? hex;
      customLiveRef.current = normalized;
      if (customSwatchRef.current) {
        customSwatchRef.current.style.background = normalized;
      }
      const prev = themeRef.current;
      applyLivePreview({
        ...prev,
        accent: "custom",
        accentHex: normalized,
        background: { ...prev.background },
      });
    }

    function onCustomCommit(hex: string) {
      const normalized = normalizeAccentHex(hex) ?? "#1F74C9";
      customLiveRef.current = normalized;
      const choice = accentFromRecentHex(normalized);
      const prev = themeRef.current;
      commitDraft({
        ...prev,
        accent: choice.accent,
        accentHex: choice.accentHex,
        background: { ...prev.background },
      });
    }

    function onPattern(id: ProfilePatternId) {
      const prev = themeRef.current;
      if (prev.background.kind === "image") {
        lastImageBgRef.current = cloneBackground(prev.background);
        setCustoms((cur) => {
          const merged = mergeCustoms(
            cur,
            customsFromBackground(prev.background),
          );
          customsRef.current = merged;
          return merged;
        });
      }
      if (id !== "none") lastPatternRef.current = id;
      setBgPanel("pattern");
      commitDraft({
        ...prev,
        background: {
          ...cloneBackground(prev.background),
          kind: id === "none" ? "none" : "pattern",
          patternId: id === "none" ? "none" : id,
          imageId: null,
          devices: {},
        },
      });
    }

    function onBgPanel(panel: "pattern" | "image") {
      if (panel === "pattern") {
        onPattern(lastPatternRef.current || "dots");
        return;
      }
      setBgPanel("image");
      const prev = themeRef.current;
      if (prev.background.kind === "image") return;

      /* Khôi phục bản ảnh trước khi sang Họa tiết (kèm devices / position). */
      const snap = lastImageBgRef.current;
      if (snap?.imageId || Object.values(snap?.devices ?? {}).some((d) => d?.imageId)) {
        const background = cloneBackground(snap!);
        setCustoms((cur) => {
          const merged = mergeCustoms(cur, customsFromBackground(background));
          customsRef.current = merged;
          return merged;
        });
        commitDraft({ ...prev, background });
        return;
      }

      const fallback =
        prev.background.imageId ??
        customsRef.current[0]?.imageId ??
        null;
      if (fallback) {
        onSelectCustomImage(fallback);
      }
      /* Chưa có ảnh — chỉ mở panel upload, chưa đổi kind. */
    }

    function onSelectCustomImage(imageId: string) {
      const prev = themeRef.current;
      const device = previewDeviceRef.current;
      const background = cloneBackground(prev.background);
      const prevD = background.devices[device] ?? {
        imageId: null,
        position: { ...background.position },
      };
      background.kind = "image";
      background.patternId = "none";
      background.imageId = background.imageId ?? imageId;
      background.dim = Math.max(background.dim, PROFILE_BG_DIM_MIN);
      background.devices[device] = { ...prevD, imageId };
      lastImageBgRef.current = cloneBackground(background);
      setCustoms((cur) => {
        const merged = mergeCustoms(cur, [{ imageId, createdAt: "" }]);
        customsRef.current = merged;
        return merged;
      });
      setBgPanel("image");
      commitDraft({ ...prev, background });
    }

    function onDevicePosition(
      device: ThemePreviewDevice,
      position: ProfileBgPosition,
    ) {
      const prev = themeRef.current;
      if (prev.background.kind !== "image") return;
      const background = cloneBackground(prev.background);
      const prevD = background.devices[device] ?? {
        imageId: null,
        position: { ...background.position },
      };
      background.devices[device] = { ...prevD, position };
      commitDraft({ ...prev, background });
    }

    function onDim(value: number) {
      const prev = themeRef.current;
      commitDraft({
        ...prev,
        background: {
          ...cloneBackground(prev.background),
          dim: Math.min(
            PROFILE_BG_DIM_MAX,
            Math.max(PROFILE_BG_DIM_MIN, value),
          ),
        },
      });
    }

    function onApplyToHome(checked: boolean) {
      const prev = themeRef.current;
      commitDraft({ ...prev, applyToHome: checked });
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
        onSelectCustomImage(data.imageId);
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
          theme?: ProfileThemeSlice;
          customs?: ProfileCustomEntry[];
        } | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Không xóa được ảnh.");
        }

        const nextCustoms = Array.isArray(data?.customs)
          ? data.customs
          : customsRef.current.filter((c) => c.imageId !== id);
        setCustoms(nextCustoms);
        customsRef.current = nextCustoms;

        /* Scrub local draft/baseline — giữ chỉnh sửa chưa lưu (accent, dim…). */
        const nextTheme = removeProfileCustomImage(
          {
            v: 1,
            theme: themeRef.current,
            customs: nextCustoms,
            card: DEFAULT_CARD_THEME,
      avatarFrame: DEFAULT_AVATAR_FRAME,
      popover: DEFAULT_POPOVER_THEME,
      shopSwitch: DEFAULT_SHOP_SWITCH,
          },
          id,
        ).theme;
        const nextBaseline = removeProfileCustomImage(
          {
            v: 1,
            theme: baselineRef.current,
            customs: nextCustoms,
            card: DEFAULT_CARD_THEME,
      avatarFrame: DEFAULT_AVATAR_FRAME,
      popover: DEFAULT_POPOVER_THEME,
      shopSwitch: DEFAULT_SHOP_SWITCH,
          },
          id,
        ).theme;

        if (nextTheme.background.kind === "image") {
          lastImageBgRef.current = cloneBackground(nextTheme.background);
        } else {
          lastImageBgRef.current = null;
          if (bgPanel === "image" && nextCustoms.length === 0) {
            setBgPanel("pattern");
            lastPatternRef.current = "dots";
          }
        }

        setBaseline(nextBaseline);
        baselineRef.current = nextBaseline;
        commitDraft(nextTheme);
        setStatus("ok");
      } catch (err) {
        setStatus("err");
        setErrMsg(err instanceof Error ? err.message : "Không xóa được ảnh.");
      } finally {
        setRemovingId(null);
      }
    }

    function onResetDraft() {
      const next = sliceFromInitial(null);
      customLiveRef.current = "#1F74C9";
      lastPatternRef.current = "dots";
      setBgPanel("pattern");
      commitDraft(next);
    }

    const liveAccent = resolveAccentHex(theme);
    const patternId =
      theme.background.kind === "pattern"
        ? theme.background.patternId
        : theme.background.kind === "image"
          ? null
          : "none";
    const imageSelected = theme.background.kind === "image";
    const deviceImageId = imageSelected
      ? resolveDeviceImageId(theme.background, previewDevice)
      : null;
    const deviceLabel =
      previewDevice === "phone"
        ? "điện thoại"
        : previewDevice === "tablet"
          ? "máy tính bảng"
          : "máy tính";
    const customValue =
      theme.accent === "custom" && theme.accentHex
        ? theme.accentHex
        : customLiveRef.current;
    const customSelected =
      theme.accent === "custom" && !accentRecent.includes(liveAccent);

    const switchPatternId: ProfilePatternId =
      theme.background.kind === "pattern" &&
      theme.background.patternId !== "none"
        ? theme.background.patternId
        : lastPatternRef.current || "dots";
    const switchPatternDef = getPatternDef(switchPatternId);
    const switchPatternThumb =
      switchPatternDef.thumbImage !== undefined
        ? switchPatternDef.thumbImage
        : switchPatternDef.image;
    const switchImageId =
      deviceImageId ??
      (lastImageBgRef.current
        ? resolveDeviceImageId(lastImageBgRef.current, previewDevice)
        : null) ??
      customs[0]?.imageId ??
      null;
    const switchImageUserUrl = switchImageId
      ? profileThemeImageUrl(switchImageId, "gridsm")
      : null;
    const switchImageUrl =
      switchImageUserUrl ?? PROFILE_THEME_BG_SWITCH_DEFAULT;
    const switchImageIsPlaceholder = !switchImageUserUrl;

    return (
      <div
        className="j-theme-picker"
        style={{ ["--j-accent" as string]: liveAccent }}
        aria-label="Giao diện trang hồ sơ"
      >
        <div className="j-theme-picker-main">
        <section
          className="j-theme-section"
          aria-labelledby="j-theme-accent-heading"
        >
        <div className="j-theme-picker-label" id="j-theme-accent-heading">
          <span>Màu nhấn</span>
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
        <div
          className="j-theme-swatch-row j-theme-swatch-row--recent"
          role="listbox"
          aria-label="Chọn màu nhấn"
        >
          {accentRecent.map((hex) => {
            const preset = PROFILE_ACCENTS.find(
              (a) => a.hex.toUpperCase() === hex,
            );
            const selected = liveAccent === hex;
            const label = preset?.label ?? hex;
            return (
              <button
                key={hex}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={label}
                title={label}
                className={"j-theme-swatch" + (selected ? " is-active" : "")}
                style={{ ["--swatch" as string]: hex }}
                onClick={() => onRecentSwatch(hex)}
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
              onChange={(e) => onCustomCommit(e.currentTarget.value)}
              onBlur={() => onCustomCommit(customLiveRef.current)}
            />
          </label>
        </div>
        </section>

        <section
          className="j-theme-section"
          aria-labelledby="j-theme-bg-heading"
        >
        <div className="j-theme-picker-label" id="j-theme-bg-heading">
          <span>Nền trang</span>
        </div>
        <div
          className="j-theme-bg-switch"
          role="tablist"
          aria-label="Kiểu nền"
        >
          <button
            type="button"
            role="tab"
            aria-selected={bgPanel === "pattern"}
            className={
              "j-theme-bg-switch-btn j-theme-bg-switch-btn--pattern" +
              (bgPanel === "pattern" ? " is-active" : "")
            }
            style={
              {
                ["--j-accent" as string]: liveAccent,
                ...(switchPatternThumb
                  ? {
                      ["--preview-image" as string]: switchPatternThumb,
                      ["--preview-size" as string]:
                        switchPatternDef.thumbSize ??
                        switchPatternDef.size ??
                        "auto",
                      ["--preview-position" as string]:
                        switchPatternDef.thumbPosition ??
                        switchPatternDef.position ??
                        "0 0",
                    }
                  : {}),
              } as CSSProperties
            }
            onClick={() => onBgPanel("pattern")}
          >
            Họa tiết
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={bgPanel === "image"}
            className={
              "j-theme-bg-switch-btn j-theme-bg-switch-btn--image" +
              (bgPanel === "image" ? " is-active" : "") +
              (switchImageIsPlaceholder ? " is-placeholder" : "")
            }
            style={
              {
                ["--switch-image" as string]: `url("${switchImageUrl}")`,
              } as CSSProperties
            }
            onClick={() => onBgPanel("image")}
          >
            Ảnh nền
          </button>
        </div>

        {bgPanel === "pattern" ? (
          <div
            className="j-theme-pattern-row"
            role="listbox"
            aria-label="Chọn họa tiết nền"
          >
            {PROFILE_PATTERNS.map((p) => {
              const selected = !imageSelected && p.id === patternId;
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
                  style={{ ["--j-accent" as string]: liveAccent }}
                  onClick={() => onPattern(p.id)}
                >
                  <span
                    className="j-theme-pattern-preview"
                    style={
                      thumbImage
                        ? {
                            ["--preview-image" as string]: thumbImage,
                            ["--preview-size" as string]:
                              thumbSize ?? "auto",
                            ["--preview-position" as string]:
                              thumbPosition ?? "0 0",
                          }
                        : undefined
                    }
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="j-theme-picker-label">
              <span>Ảnh · {deviceLabel}</span>
              {uploading ? (
                <JourneyThemeUploadProgress progress={uploadPct} />
              ) : null}
            </div>
            <div className="j-theme-image-row">
              <button
                type="button"
                className="j-theme-image-upload"
                disabled={uploading || status === "saving"}
                onClick={() => fileInputRef.current?.click()}
              >
                + Tải cho {deviceLabel}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="j-theme-image-file"
                aria-label={`Tải ảnh nền cho ${deviceLabel}`}
                onChange={(e) =>
                  void onUploadFile(e.currentTarget.files?.[0] ?? null)
                }
              />
              {customs.map((c) => {
                const thumb = profileThemeImageUrl(c.imageId, "gridsm");
                const selected =
                  imageSelected && deviceImageId === c.imageId;
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
                        "j-theme-image-thumb" +
                        (selected ? " is-active" : "")
                      }
                      aria-pressed={selected}
                      aria-label="Chọn ảnh nền đã tải"
                      disabled={Boolean(removingId) || uploading || status === "saving"}
                      style={
                        thumb
                          ? { backgroundImage: `url("${thumb}")` }
                          : undefined
                      }
                      onClick={() => onSelectCustomImage(c.imageId)}
                    />
                    <button
                      type="button"
                      className="j-theme-image-remove"
                      aria-label="Xóa ảnh này khỏi lịch sử"
                      title="Xóa ảnh"
                      disabled={Boolean(removingId) || uploading || status === "saving"}
                      onClick={() => void onRemoveCustom(c.imageId)}
                    >
                      <X size={12} strokeWidth={2.2} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {imageSelected ||
        (theme.background.kind === "pattern" &&
          theme.background.patternId !== "none") ? (
          <div className="j-theme-dim">
            <label className="j-theme-dim-label" htmlFor="j-theme-dim">
              Độ đậm nền
              <span>{Math.round(theme.background.dim * 100)}%</span>
            </label>
            <input
              id="j-theme-dim"
              type="range"
              min={PROFILE_BG_DIM_MIN}
              max={PROFILE_BG_DIM_MAX}
              step={0.01}
              value={theme.background.dim || PROFILE_BG_DIM_DEFAULT}
              onChange={(e) => onDim(Number(e.currentTarget.value))}
            />
          </div>
        ) : null}
        </section>

        <section
          className={
            "j-theme-section j-theme-section--home" +
            (theme.applyToHome ? " is-active" : "")
          }
          aria-labelledby="j-theme-home-heading"
        >
          <div className="j-theme-home-row">
            <span className="j-theme-home-text">
              <span className="j-theme-home-check-title" id="j-theme-home-heading">
                Áp dụng giao diện này lên trang chủ của tôi
              </span>
              <span className="j-theme-home-check-desc">
                Người khác không thấy theme của bạn trên trang chủ họ.
              </span>
            </span>
            <button
              type="button"
              className={
                "j-theme-home-switch" + (theme.applyToHome ? " is-on" : "")
              }
              role="switch"
              aria-checked={theme.applyToHome}
              aria-labelledby="j-theme-home-heading"
              onClick={() => onApplyToHome(!theme.applyToHome)}
            >
              <span className="j-theme-home-switch-knob" aria-hidden />
            </button>
          </div>
        </section>

        <footer className="j-theme-picker-footer">
          <div className="j-theme-picker-actions">
            <button
              type="button"
              className="j-theme-picker-reset"
              onClick={onResetDraft}
              disabled={status === "saving" || uploading}
            >
              Khôi phục mặc định
            </button>
          </div>
          <p className="j-theme-picker-hint">
            Chọn xong bấm <strong>Lưu giao diện</strong>. Đổi tab thiết bị để
            neo / ảnh riêng; rê vào demo rồi kéo để chỉnh vùng ảnh.
          </p>
        </footer>
        </div>

        <aside className="j-theme-picker-aside" aria-label="Xem trước thiết bị">
          <JourneyThemeDevicePreview
            theme={theme}
            device={previewDevice}
            onDeviceChange={setPreviewDevice}
            onPositionChange={onDevicePosition}
          />
        </aside>
      </div>
    );
  },
);

JourneyThemePicker.displayName = "JourneyThemePicker";

/** Helper — parse raw giao_dien từ SSR cho initialTheme. */
export function themeSliceFromGiaoDien(raw: unknown): ProfileThemeSlice {
  return parseProfileGiaoDien(raw).theme;
}
