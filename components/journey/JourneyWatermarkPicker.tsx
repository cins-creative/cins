"use client";

import { Moon, Sun, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { JourneyImageWatermark } from "@/components/journey/JourneyImageWatermark";
import { JourneyThemeUploadProgress } from "@/components/journey/JourneyThemeUploadProgress";
import type { ThemePreviewScheme } from "@/components/journey/JourneyThemeDevicePreview";
import { uploadGiaoDienCustomWithProgress } from "@/lib/files/upload-giao-dien-custom";
import {
  patchGiaoDien,
  watermarkSliceToPatch,
} from "@/lib/journey/giao-dien-patch-client";
import {
  profileThemeImageUrl,
  type ProfileCustomEntry,
} from "@/lib/journey/profile-theme";
import {
  DEFAULT_WATERMARK,
  WATERMARK_CORNERS,
  WATERMARK_MARGIN_MAX,
  WATERMARK_MARGIN_MIN,
  WATERMARK_OPACITY_MAX,
  WATERMARK_OPACITY_MIN,
  WATERMARK_SIZE_MAX,
  WATERMARK_SIZE_MIN,
  parseWatermark,
  resolveWatermarkDto,
  watermarksEqual,
  type ProfileWatermarkSlice,
  type WatermarkCornerId,
} from "@/lib/journey/watermark";
import { downloadWatermarkTemplate } from "@/lib/journey/watermark-template";

import "./journey-theme.css";
import "./journey-watermark.css";

type Props = {
  initialWatermark?: ProfileWatermarkSlice | null;
  ownerSlug?: string | null;
  tenHienThi?: string | null;
  onDirtyChange?: (dirty: boolean) => void;
};

export type JourneyWatermarkPickerHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  getPatch: () => Record<string, unknown> | null;
  markSaved: (watermark?: unknown, customs?: ProfileCustomEntry[]) => void;
};

function sliceWm(
  raw: ProfileWatermarkSlice | null | undefined,
  customs?: ProfileCustomEntry[] | null,
): ProfileWatermarkSlice {
  return parseWatermark(raw ?? null, customs);
}

function readDocumentScheme(): ThemePreviewScheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export const JourneyWatermarkPicker = forwardRef<
  JourneyWatermarkPickerHandle,
  Props
>(function JourneyWatermarkPicker(
  { initialWatermark = null, ownerSlug = null, tenHienThi = null, onDirtyChange },
  ref,
) {
  const [wm, setWm] = useState(() => sliceWm(initialWatermark));
  const [baseline, setBaseline] = useState(() => sliceWm(initialWatermark));
  const [customs, setCustoms] = useState<ProfileCustomEntry[]>([]);
  const wmRef = useRef(wm);
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
  const [asideTab, setAsideTab] = useState<"preview" | "guide">("preview");

  const dirty = !watermarksEqual(wm, baseline);

  useEffect(() => {
    setScheme(readDocumentScheme());
  }, []);

  useEffect(() => {
    wmRef.current = wm;
  }, [wm]);
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
          watermark?: unknown;
          customs?: ProfileCustomEntry[];
        };
        if (cancelled) return;
        const nextCustoms = Array.isArray(data.customs) ? data.customs : [];
        setCustoms(nextCustoms);
        customsRef.current = nextCustoms;
        if (data.watermark) {
          const parsed = parseWatermark(data.watermark, nextCustoms);
          setWm(parsed);
          setBaseline(parsed);
          wmRef.current = parsed;
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

  const commit = useCallback((next: ProfileWatermarkSlice) => {
    wmRef.current = next;
    setWm(next);
  }, []);

  const persist = useCallback(async (next: ProfileWatermarkSlice) => {
    setStatus("saving");
    setErrMsg(null);
    try {
      const data = await patchGiaoDien(watermarkSliceToPatch(next));
      if (!data.ok) {
        throw new Error(data.error ?? "Không lưu được.");
      }
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      const saved = data.watermark
        ? parseWatermark(data.watermark, customsRef.current)
        : next;
      setBaseline(saved);
      baselineRef.current = saved;
      commit(saved);
      setStatus("ok");
      window.setTimeout(() => setStatus("idle"), 1600);
      return true;
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Không lưu được.");
      return false;
    }
  }, [commit]);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => !watermarksEqual(wmRef.current, baselineRef.current),
      save: () => persist(wmRef.current),
      discard: () => {
        commit(baselineRef.current);
        setErrMsg(null);
        setStatus("idle");
      },
      getPatch: () => {
        if (watermarksEqual(wmRef.current, baselineRef.current)) return null;
        return watermarkSliceToPatch(wmRef.current);
      },
      markSaved: (watermark, nextCustoms) => {
        if (Array.isArray(nextCustoms)) {
          setCustoms(nextCustoms);
          customsRef.current = nextCustoms;
        }
        const saved = watermark
          ? parseWatermark(watermark, customsRef.current)
          : wmRef.current;
        setBaseline(saved);
        baselineRef.current = saved;
        commit(saved);
        setStatus("ok");
        window.setTimeout(() => setStatus("idle"), 1600);
      },
    }),
    [commit, persist],
  );

  function setEnabled(enabled: boolean) {
    commit({ ...wmRef.current, enabled });
  }

  function setProtectOverlay(protectOverlay: boolean) {
    commit({
      ...wmRef.current,
      protectOverlay,
      enabled: true,
    });
  }

  function setCustom(imageId: string | null) {
    if (!imageId) {
      commit({
        ...wmRef.current,
        source: "preset",
        imageId: null,
      });
      return;
    }
    commit({
      ...wmRef.current,
      source: "custom",
      imageId,
      enabled: true,
    });
  }

  function setCorner(corner: WatermarkCornerId) {
    commit({ ...wmRef.current, corner, enabled: true });
  }

  async function onDownloadTemplate() {
    setTemplateBusy(true);
    setErrMsg(null);
    try {
      await downloadWatermarkTemplate();
    } catch (err) {
      setErrMsg(
        err instanceof Error ? err.message : "Không tạo được guideline.",
      );
    } finally {
      setTemplateBusy(false);
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    setUploadPct(0);
    setErrMsg(null);
    try {
      const data = await uploadGiaoDienCustomWithProgress(file, setUploadPct);
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      } else {
        const entry = {
          imageId: data.imageId,
          createdAt: new Date().toISOString(),
        };
        const next = [
          entry,
          ...customsRef.current.filter((c) => c.imageId !== data.imageId),
        ];
        setCustoms(next);
        customsRef.current = next;
      }
      setCustom(data.imageId);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Upload thất bại.");
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemoveCustom(imageId: string) {
    setRemovingId(imageId);
    setErrMsg(null);
    try {
      const res = await fetch("/api/user/giao-dien/custom", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        customs?: ProfileCustomEntry[];
        watermark?: unknown;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Không xóa được.");
      }
      const nextCustoms = Array.isArray(data.customs)
        ? data.customs
        : customsRef.current.filter((c) => c.imageId !== imageId);
      setCustoms(nextCustoms);
      customsRef.current = nextCustoms;
      if (data.watermark) {
        const parsed = parseWatermark(data.watermark, nextCustoms);
        commit(parsed);
        setBaseline(parsed);
        baselineRef.current = parsed;
      } else if (wmRef.current.imageId === imageId) {
        const cleared = {
          ...wmRef.current,
          imageId: null,
          source: "preset" as const,
        };
        commit(cleared);
      }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Không xóa được.");
    } finally {
      setRemovingId(null);
    }
  }

  const previewDto = resolveWatermarkDto(wm, {
    ownerSlug,
    tenHienThi,
  });
  const hasCustomLogo = wm.source === "custom" && Boolean(wm.imageId);

  return (
    <div className="j-theme-picker j-wm-picker">
      <div className="j-theme-picker-main">
        <section
          className={
            "j-theme-section j-theme-section--home" +
            (wm.enabled ? " is-active" : "")
          }
          aria-labelledby="j-wm-enable-heading"
        >
          <div className="j-theme-home-row">
            <span className="j-theme-home-text">
              <span className="j-theme-home-check-title" id="j-wm-enable-heading">
                Bật watermark ảnh bài
              </span>
            </span>
            <button
              type="button"
              className={"j-theme-home-switch" + (wm.enabled ? " is-on" : "")}
              role="switch"
              aria-checked={wm.enabled}
              aria-labelledby="j-wm-enable-heading"
              onClick={() => setEnabled(!wm.enabled)}
            >
              <span className="j-theme-home-switch-knob" aria-hidden />
            </button>
          </div>
        </section>
        {status === "err" && errMsg ? (
          <p className="j-theme-picker-error" role="alert">
            {errMsg}
          </p>
        ) : null}
        {status === "ok" ? (
          <p className="j-theme-picker-status" role="status">
            Đã lưu watermark
          </p>
        ) : null}

        <section
          className={
            "j-theme-section j-theme-section--home" +
            (wm.enabled && wm.protectOverlay ? " is-active" : "") +
            (!wm.enabled ? " j-wm-section--dim" : "")
          }
          aria-labelledby="j-wm-overlay-heading"
        >
          <div className="j-theme-home-row">
            <span className="j-theme-home-text">
              <span
                className="j-theme-home-check-title"
                id="j-wm-overlay-heading"
              >
                Lớp phủ mặc định
              </span>
            </span>
            <button
              type="button"
              className={
                "j-theme-home-switch" + (wm.protectOverlay ? " is-on" : "")
              }
              role="switch"
              aria-checked={wm.protectOverlay}
              aria-labelledby="j-wm-overlay-heading"
              disabled={!wm.enabled}
              onClick={() => setProtectOverlay(!wm.protectOverlay)}
            >
              <span className="j-theme-home-switch-knob" aria-hidden />
            </button>
          </div>
        </section>

        <section
          className={
            "j-theme-section" + (!wm.enabled ? " j-wm-section--dim" : "")
          }
          aria-labelledby="j-wm-custom-heading"
        >
          <div className="j-theme-picker-label" id="j-wm-custom-heading">
            <span>Logo tùy chọn</span>
            {uploading ? (
              <JourneyThemeUploadProgress progress={uploadPct} />
            ) : hasCustomLogo ? (
              <button
                type="button"
                className="j-theme-picker-reset"
                onClick={() => setCustom(null)}
              >
                Bỏ logo
              </button>
            ) : (
              <span className="j-theme-picker-status">PNG / chữ ký</span>
            )}
          </div>
          <div className="j-theme-image-row">
            <button
              type="button"
              className="j-theme-image-upload"
              disabled={
                !wm.enabled ||
                Boolean(removingId) ||
                uploading ||
                status === "saving"
              }
              onClick={() => fileInputRef.current?.click()}
            >
              + Tải watermark
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="j-theme-image-file"
              aria-label="Tải watermark"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            {customs.map((c) => {
              const url = profileThemeImageUrl(c.imageId, "gridsm");
              const selected =
                wm.source === "custom" && wm.imageId === c.imageId;
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
                    aria-label="Chọn watermark"
                    disabled={
                      !wm.enabled ||
                      Boolean(removingId) ||
                      uploading ||
                      status === "saving"
                    }
                    style={
                      url ? { backgroundImage: `url("${url}")` } : undefined
                    }
                    onClick={() =>
                      setCustom(selected ? null : c.imageId)
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
        </section>

        <section
          className={
            "j-theme-section" +
            (!wm.enabled || !hasCustomLogo ? " j-wm-section--dim" : "")
          }
          aria-labelledby="j-wm-corner-heading"
          hidden={!hasCustomLogo}
        >
          <div className="j-theme-picker-label" id="j-wm-corner-heading">
            <span>Góc đặt</span>
          </div>
          <div className="j-wm-corner-grid" role="group" aria-label="Góc watermark">
            {WATERMARK_CORNERS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={
                  `j-wm-corner-btn j-wm-corner-btn--${c.id}` +
                  (wm.corner === c.id ? " is-active" : "")
                }
                aria-pressed={wm.corner === c.id}
                disabled={!wm.enabled}
                onClick={() => setCorner(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="j-wm-slider-row">
            <label>
              <span>Kích thước</span>
              <span>{wm.sizePct}%</span>
            </label>
            <input
              type="range"
              min={WATERMARK_SIZE_MIN}
              max={WATERMARK_SIZE_MAX}
              value={wm.sizePct}
              disabled={!wm.enabled}
              onChange={(e) =>
                commit({
                  ...wmRef.current,
                  sizePct: Number(e.target.value),
                  enabled: true,
                })
              }
            />
          </div>
          <div className="j-wm-slider-row">
            <label>
              <span>Độ mờ</span>
              <span>{Math.round(wm.opacity * 100)}%</span>
            </label>
            <input
              type="range"
              min={WATERMARK_OPACITY_MIN}
              max={WATERMARK_OPACITY_MAX}
              step={0.01}
              value={wm.opacity}
              disabled={!wm.enabled}
              onChange={(e) =>
                commit({
                  ...wmRef.current,
                  opacity: Number(e.target.value),
                  enabled: true,
                })
              }
            />
          </div>
          <div className="j-wm-slider-row">
            <label>
              <span>Lề</span>
              <span>{wm.marginPct}%</span>
            </label>
            <input
              type="range"
              min={WATERMARK_MARGIN_MIN}
              max={WATERMARK_MARGIN_MAX}
              value={wm.marginPct}
              disabled={!wm.enabled}
              onChange={(e) =>
                commit({
                  ...wmRef.current,
                  marginPct: Number(e.target.value),
                  enabled: true,
                })
              }
            />
          </div>
        </section>
      </div>

      <aside
        className="j-theme-picker-aside j-wm-picker-aside"
        aria-label="Xem trước watermark"
      >
        <div
          className="j-wm-picker-aside-tabs"
          role="tablist"
          aria-label="Aside watermark"
        >
          <button
            type="button"
            role="tab"
            className={
              "j-wm-picker-aside-tab" +
              (asideTab === "preview" ? " is-active" : "")
            }
            aria-selected={asideTab === "preview"}
            onClick={() => setAsideTab("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            role="tab"
            className={
              "j-wm-picker-aside-tab" +
              (asideTab === "guide" ? " is-active" : "")
            }
            aria-selected={asideTab === "guide"}
            onClick={() => setAsideTab("guide")}
          >
            Guideline
          </button>
        </div>

        {asideTab === "preview" ? (
          <>
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
                    "j-theme-scheme-btn" +
                    (scheme === "light" ? " is-active" : "")
                  }
                  aria-pressed={scheme === "light"}
                  onClick={() => setScheme("light")}
                >
                  <Sun size={14} strokeWidth={2.1} aria-hidden />
                  <span>Sáng</span>
                </button>
                <button
                  type="button"
                  className={
                    "j-theme-scheme-btn" +
                    (scheme === "dark" ? " is-active" : "")
                  }
                  aria-pressed={scheme === "dark"}
                  onClick={() => setScheme("dark")}
                >
                  <Moon size={14} strokeWidth={2.1} aria-hidden />
                  <span>Tối</span>
                </button>
              </div>
            </div>
            <div
              className="j-wm-preview-stage j-wm-host"
              data-preview-scheme={scheme}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="j-wm-preview-stage-photo"
                src="/watermarks/preview-sample.jpg"
                alt=""
                aria-hidden
              />
              {previewDto ? (
                <JourneyImageWatermark
                  dto={previewDto}
                  protect={false}
                  showProtectText
                />
              ) : (
                <span className="j-wm-preview-stage-label">
                  Bật watermark để xem
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="j-avf-picker-aside-stage">
            <p className="j-theme-picker-status">
              Tải PNG guideline ({DEFAULT_WATERMARK.sizePct}% gợi ý kích thước,
              vùng TL / TR / BL / BR / CENTER). Vẽ logo/chữ ký trên nền trong
              suốt rồi upload ở mục «Logo tùy chọn».
            </p>
            <button
              type="button"
              className="j-wm-template-dl"
              disabled={templateBusy}
              onClick={() => void onDownloadTemplate()}
            >
              {templateBusy ? "Đang tạo…" : "Tải guideline"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
});
