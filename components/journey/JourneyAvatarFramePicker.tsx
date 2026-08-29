"use client";

import { Moon, Sun, X } from "lucide-react";
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
  AVATAR_COLOR_PRESETS,
  AVATAR_OVERLAY_BLENDS,
  avatarFrameClass,
  avatarFrameStyle,
  dispatchAvatarFramePreview,
  framesEqual,
  getAvatarColorPreset,
  normalizeFrameHex,
  parseAvatarFrame,
  resolveAvatarFrameDto,
  resolveFrameColors,
  type AvatarColorPresetId,
  type AvatarOverlayBlendId,
  type ProfileAvatarFrameSlice,
} from "@/lib/journey/avatar-frame";
import { downloadAvatarOverlayTemplate } from "@/lib/journey/avatar-overlay-template";
import { getNameInitials } from "@/lib/journey/profile";
import { uploadGiaoDienCustomWithProgress } from "@/lib/files/upload-giao-dien-custom";
import {
  profileThemeImageUrl,
  type ProfileCustomEntry,
} from "@/lib/journey/profile-theme";
import {
  avatarFrameSliceToPatch,
  patchGiaoDien,
} from "@/lib/journey/giao-dien-patch-client";
import type { ThemePreviewScheme } from "@/components/journey/JourneyThemeDevicePreview";
import { JourneyThemeUploadProgress } from "@/components/journey/JourneyThemeUploadProgress";

import "./journey-theme.css";
import "./journey-avatar-frame.css";

type Props = {
  initialFrame?: ProfileAvatarFrameSlice | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
};

export type JourneyAvatarFramePickerHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  getPatch: () => Record<string, unknown> | null;
  markSaved: (avatarFrame?: unknown, customs?: ProfileCustomEntry[]) => void;
};

function sliceFrame(
  raw: ProfileAvatarFrameSlice | null | undefined,
  customs?: ProfileCustomEntry[] | null,
): ProfileAvatarFrameSlice {
  return parseAvatarFrame(raw ?? null, customs);
}

function readDocumentScheme(): ThemePreviewScheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function PreviewAvatar({
  dtoClass,
  dtoStyle,
  hasOverlay,
  avatarUrl,
  initials,
}: {
  dtoClass: string;
  dtoStyle: CSSProperties | undefined;
  hasOverlay: boolean;
  avatarUrl: string | null;
  initials: string;
}) {
  return (
    <div
      className={
        "j-avf-picker-preview-lg j-avatar" + (dtoClass ? ` ${dtoClass}` : "")
      }
      style={dtoStyle}
      aria-hidden
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" />
      ) : (
        <span>{initials}</span>
      )}
      {hasOverlay ? <span className="j-avf-overlay" aria-hidden /> : null}
    </div>
  );
}

export const JourneyAvatarFramePicker = forwardRef<
  JourneyAvatarFramePickerHandle,
  Props
>(function JourneyAvatarFramePicker(
  {
    initialFrame = null,
    authorName = null,
    authorAvatarUrl = null,
    onDirtyChange,
  },
  ref,
) {
  const [frame, setFrame] = useState(() => sliceFrame(initialFrame));
  const [baseline, setBaseline] = useState(() => sliceFrame(initialFrame));
  const [customs, setCustoms] = useState<ProfileCustomEntry[]>([]);
  const frameRef = useRef(frame);
  const baselineRef = useRef(baseline);
  const customsRef = useRef(customs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [scheme, setScheme] = useState<ThemePreviewScheme>("light");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const dirty = !framesEqual(frame, baseline);

  useEffect(() => {
    setScheme(readDocumentScheme());
  }, []);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);
  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);
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
          avatarFrame?: unknown;
          customs?: ProfileCustomEntry[];
        };
        if (cancelled) return;
        const nextCustoms = Array.isArray(data.customs) ? data.customs : [];
        setCustoms(nextCustoms);
        customsRef.current = nextCustoms;
        if (data.avatarFrame) {
          const parsed = parseAvatarFrame(data.avatarFrame, nextCustoms);
          setFrame(parsed);
          setBaseline(parsed);
          frameRef.current = parsed;
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

  const commit = useCallback((next: ProfileAvatarFrameSlice) => {
    frameRef.current = next;
    setFrame(next);
    dispatchAvatarFramePreview(next);
  }, []);

  const persist = useCallback(async (next: ProfileAvatarFrameSlice) => {
    setStatus("saving");
    setErrMsg(null);
    try {
      const data = await patchGiaoDien(avatarFrameSliceToPatch(next));
      if (!data.ok) {
        throw new Error(data.error ?? "Không lưu được.");
      }
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      const saved = data.avatarFrame
        ? parseAvatarFrame(data.avatarFrame, customsRef.current)
        : sliceFrame(next, customsRef.current);
      setBaseline(saved);
      baselineRef.current = saved;
      setFrame(saved);
      frameRef.current = saved;
      dispatchAvatarFramePreview(saved);
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
      isDirty: () => !framesEqual(frameRef.current, baselineRef.current),
      save: async () => persist(frameRef.current),
      getPatch: () => {
        if (framesEqual(frameRef.current, baselineRef.current)) return null;
        return avatarFrameSliceToPatch(frameRef.current);
      },
      markSaved: (avatarFrame, customs) => {
        if (Array.isArray(customs)) {
          setCustoms(customs);
          customsRef.current = customs;
        }
        const saved = avatarFrame
          ? parseAvatarFrame(avatarFrame, customsRef.current)
          : sliceFrame(frameRef.current, customsRef.current);
        setBaseline(saved);
        baselineRef.current = saved;
        setFrame(saved);
        frameRef.current = saved;
        dispatchAvatarFramePreview(saved);
        setStatus("ok");
        window.setTimeout(
          () => setStatus((s) => (s === "ok" ? "idle" : s)),
          1600,
        );
      },
      discard: () => {
        const base = sliceFrame(baselineRef.current, customsRef.current);
        frameRef.current = base;
        setFrame(base);
        dispatchAvatarFramePreview(base);
      },
    }),
    [persist],
  );

  const previewDto = resolveAvatarFrameDto(frame);
  const previewCls = avatarFrameClass(previewDto);
  const previewStyle = avatarFrameStyle(previewDto);
  const colors = resolveFrameColors(frame);
  const initials = getNameInitials(authorName, "U");
  const name = (authorName ?? "").trim() || "Bạn";

  function setEnabled(enabled: boolean) {
    commit({ ...frameRef.current, enabled });
  }

  function setPreset(presetId: AvatarColorPresetId) {
    commit({
      ...frameRef.current,
      enabled: true,
      presetId,
      /* Đổi preset → reset override về màu preset. */
      hex: null,
      hex2: null,
    });
  }

  function setHex(raw: string) {
    const hex = normalizeFrameHex(raw);
    if (!hex) return;
    const prev = frameRef.current;
    const preset = getAvatarColorPreset(prev.presetId);
    commit({
      ...prev,
      enabled: true,
      hex: hex === preset.hex ? null : hex,
    });
  }

  function setHex2(raw: string) {
    const hex = normalizeFrameHex(raw);
    if (!hex) return;
    const prev = frameRef.current;
    const preset = getAvatarColorPreset(prev.presetId);
    if (preset.style !== "gradient") return;
    commit({
      ...prev,
      enabled: true,
      hex2: hex === preset.hex2 ? null : hex,
    });
  }

  function setOverlay(imageId: string | null) {
    commit({
      ...frameRef.current,
      enabled: true,
      overlayImageId: imageId,
    });
  }

  function setOverlayBlend(overlayBlend: AvatarOverlayBlendId) {
    commit({
      ...frameRef.current,
      enabled: true,
      overlayBlend,
    });
  }

  async function onDownloadTemplate() {
    setTemplateBusy(true);
    setErrMsg(null);
    try {
      await downloadAvatarOverlayTemplate();
    } catch (err) {
      setStatus("err");
      setErrMsg(
        err instanceof Error ? err.message : "Không tải được mẫu thiết kế.",
      );
    } finally {
      setTemplateBusy(false);
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    setUploadPct(1);
    setErrMsg(null);
    try {
      const data = await uploadGiaoDienCustomWithProgress(file, setUploadPct);
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      } else {
        const next = [
          {
            imageId: data.imageId,
            createdAt: new Date().toISOString(),
          },
          ...customsRef.current.filter((c) => c.imageId !== data.imageId),
        ];
        setCustoms(next);
        customsRef.current = next;
      }
      setOverlay(data.imageId);
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Upload thất bại.");
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
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Không xóa được ảnh.");
      }

      const nextCustoms = Array.isArray(data?.customs)
        ? data.customs
        : customsRef.current.filter((c) => c.imageId !== id);
      setCustoms(nextCustoms);
      customsRef.current = nextCustoms;

      const scrub = (f: ProfileAvatarFrameSlice): ProfileAvatarFrameSlice =>
        f.overlayImageId === id ? { ...f, overlayImageId: null } : f;

      /* Giữ chỉnh sửa chưa lưu khác; chỉ gỡ ref ảnh đã xóa khỏi draft + baseline. */
      const nextFrame = scrub(frameRef.current);
      const nextBaseline = scrub(baselineRef.current);

      setBaseline(nextBaseline);
      baselineRef.current = nextBaseline;
      commit(nextFrame);
      setStatus("ok");
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Không xóa được ảnh.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div
      className="j-theme-picker j-avf-picker"
      style={{ ["--j-accent" as string]: colors.hex }}
      aria-label="Khung & viền avatar"
    >
      <div className="j-theme-picker-main">
        <section
          className={
            "j-theme-section j-theme-section--home" +
            (frame.enabled ? " is-active" : "")
          }
          aria-labelledby="j-avf-enable-heading"
        >
          <div className="j-theme-home-row">
            <span className="j-theme-home-text">
              <span
                className="j-theme-home-check-title"
                id="j-avf-enable-heading"
              >
                Bật khung avatar
              </span>
              <span className="j-theme-home-check-desc">
                Viền màu theo preset + overlay thiết kế quanh ảnh đại diện.
              </span>
            </span>
            <button
              type="button"
              className={
                "j-theme-home-switch" + (frame.enabled ? " is-on" : "")
              }
              role="switch"
              aria-checked={frame.enabled}
              aria-labelledby="j-avf-enable-heading"
              onClick={() => setEnabled(!frame.enabled)}
            >
              <span className="j-theme-home-switch-knob" aria-hidden />
            </button>
          </div>
        </section>

        <section
          className={
            "j-theme-section" + (!frame.enabled ? " j-avf-section--dim" : "")
          }
          aria-labelledby="j-avf-ring-heading"
          aria-disabled={!frame.enabled}
        >
          <div className="j-theme-picker-label" id="j-avf-ring-heading">
            <span>Viền màu</span>
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
            className="j-theme-swatch-row"
            role="listbox"
            aria-label="Preset màu viền"
          >
            <button
              type="button"
              role="option"
              aria-selected={frame.presetId === "none"}
              aria-label="Không màu"
              title="Không màu"
              className={
                "j-theme-swatch j-theme-swatch--none" +
                (frame.presetId === "none" ? " is-active" : "")
              }
              onClick={() => setPreset("none")}
            />
            {AVATAR_COLOR_PRESETS.filter((p) => p.id !== "none").map((p) => {
              const selected = frame.presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={p.label}
                  title={p.label}
                  className={"j-theme-swatch" + (selected ? " is-active" : "")}
                  style={
                    (p.style === "gradient" && p.hex2
                      ? {
                          background: `conic-gradient(from 140deg, ${p.hex}, ${p.hex2}, ${p.hex})`,
                        }
                      : { ["--swatch" as string]: p.hex }) as CSSProperties
                  }
                  onClick={() => setPreset(p.id)}
                />
              );
            })}
            {colors.style !== "none" ? (
              <label
                className="j-theme-colorwheel is-active"
                title="Đổi màu viền"
              >
                <span className="j-theme-colorwheel-ring" aria-hidden />
                <span
                  className="j-theme-colorwheel-current"
                  style={{ background: colors.hex }}
                  aria-hidden
                />
                <input
                  type="color"
                  value={colors.hex}
                  aria-label="Đổi màu viền"
                  onInput={(e) => setHex(e.currentTarget.value)}
                  onChange={(e) => setHex(e.currentTarget.value)}
                />
              </label>
            ) : null}
          </div>

          {colors.style === "gradient" ? (
            <>
              <div className="j-theme-picker-label">
                <span>Stop 2 · gradient</span>
              </div>
              <div className="j-theme-swatch-row j-avf-stop2-row">
                <label
                  className="j-theme-colorwheel is-active"
                  title="Màu gradient thứ hai"
                >
                  <span className="j-theme-colorwheel-ring" aria-hidden />
                  <span
                    className="j-theme-colorwheel-current"
                    style={{ background: colors.hex2 ?? colors.hex }}
                    aria-hidden
                  />
                  <input
                    type="color"
                    value={colors.hex2 ?? colors.hex}
                    aria-label="Màu gradient thứ hai"
                    onInput={(e) => setHex2(e.currentTarget.value)}
                    onChange={(e) => setHex2(e.currentTarget.value)}
                  />
                </label>
              </div>
            </>
          ) : null}
        </section>

        <section
          className={
            "j-theme-section" + (!frame.enabled ? " j-avf-section--dim" : "")
          }
          aria-labelledby="j-avf-overlay-heading"
          aria-disabled={!frame.enabled}
        >
          <div className="j-theme-picker-label" id="j-avf-overlay-heading">
            <span>Overlay thiết kế</span>
            {uploading ? (
              <JourneyThemeUploadProgress progress={uploadPct} />
            ) : frame.overlayImageId ? (
              <button
                type="button"
                className="j-theme-picker-reset j-avf-overlay-remove"
                onClick={() => setOverlay(null)}
              >
                Gỡ overlay
              </button>
            ) : (
              <span className="j-theme-picker-status">
                PNG/GIF · expand ~15px · không tile
              </span>
            )}
          </div>

          <div className="j-theme-image-row">
            <button
              type="button"
              className="j-theme-image-upload"
              disabled={
                Boolean(removingId) || uploading || status === "saving"
              }
              onClick={() => fileInputRef.current?.click()}
            >
              + Tải ảnh / GIF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="j-theme-image-file"
              aria-label="Tải overlay avatar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            {customs.map((c) => {
              const url = profileThemeImageUrl(c.imageId, "gridsm");
              const selected = frame.overlayImageId === c.imageId;
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
                    aria-label="Chọn overlay"
                    disabled={
                      Boolean(removingId) || uploading || status === "saving"
                    }
                    style={
                      url ? { backgroundImage: `url("${url}")` } : undefined
                    }
                    onClick={() =>
                      setOverlay(selected ? null : c.imageId)
                    }
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
          {frame.overlayImageId ? (
            <>
              <div className="j-theme-picker-label">
                <span>Hòa trộn</span>
                <span className="j-theme-picker-status">
                  Áp lớp phủ lên ảnh đại diện
                </span>
              </div>
              <div
                className="j-avf-blend-row"
                role="listbox"
                aria-label="Chế độ hòa trộn overlay"
              >
                {AVATAR_OVERLAY_BLENDS.map((b) => {
                  const selected = frame.overlayBlend === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={
                        "j-avf-blend-chip" + (selected ? " is-active" : "")
                      }
                      onClick={() => setOverlayBlend(b.id)}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>

        <footer className="j-theme-picker-footer">
          <p className="j-theme-picker-hint">
            Chọn xong bấm <strong>Lưu giao diện</strong>. Overlay phủ ngoài
            avatar ~15px, luôn contain giữa khung.
          </p>
        </footer>
      </div>

      <aside
        className="j-theme-picker-aside j-avf-picker-aside"
        aria-label="Xem trước avatar"
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
        <div
          className="j-avf-picker-aside-stage"
          data-preview-scheme={scheme}
        >
          <span className="j-avf-picker-aside-meta">{name}</span>
          <PreviewAvatar
            dtoClass={previewCls}
            dtoStyle={previewStyle}
            hasOverlay={Boolean(previewDto?.overlayImageUrl)}
            avatarUrl={authorAvatarUrl}
            initials={initials}
          />
          <button
            type="button"
            className="j-avf-template-dl"
            disabled={templateBusy}
            onClick={() => void onDownloadTemplate()}
          >
            {templateBusy ? "Đang tạo…" : "Tải guideline"}
          </button>
        </div>
      </aside>
    </div>
  );
});
