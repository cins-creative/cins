"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  getPatternDef,
  overlayDimFromUi,
  positionToCss,
  profileThemeImageUrl,
  resolveAccentHex,
  resolveDeviceImageId,
  resolveDevicePosition,
  type ProfileBgPosition,
  type ProfileThemeSlice,
} from "@/lib/journey/profile-theme";

export type ThemePreviewDevice = "phone" | "tablet" | "desktop";

/** Thứ tự ưu tiên UI: máy tính → máy tính bảng → điện thoại. */
const DEVICE_ORDER: readonly ThemePreviewDevice[] = [
  "desktop",
  "tablet",
  "phone",
] as const;

const DEVICES: Record<
  ThemePreviewDevice,
  { label: string; w: number; h: number }
> = {
  desktop: { label: "Máy tính", w: 1280, h: 800 },
  tablet: { label: "Máy tính bảng", w: 992, h: 800 },
  phone: { label: "Điện thoại", w: 375, h: 720 },
};

type Props = {
  theme: ProfileThemeSlice;
  device: ThemePreviewDevice;
  onDeviceChange: (d: ThemePreviewDevice) => void;
  onPositionChange?: (
    device: ThemePreviewDevice,
    position: ProfileBgPosition,
  ) => void;
};

function previewBackground(
  theme: ProfileThemeSlice,
  device: ThemePreviewDevice,
): {
  kind: "none" | "pattern" | "image";
  image: string;
  size: string;
  position: string;
  repeat: string;
  dim: number;
  focal: ProfileBgPosition | null;
} {
  const bg = theme.background;
  if (bg.kind === "image") {
    const imageId = resolveDeviceImageId(bg, device);
    const focal = resolveDevicePosition(bg, device);
    const url = imageId ? profileThemeImageUrl(imageId, "public") : null;
    return {
      kind: imageId && url ? "image" : "none",
      image: url ? `url("${url}")` : "none",
      size: "cover",
      position: positionToCss(focal),
      repeat: "no-repeat",
      dim: overlayDimFromUi(bg.dim),
      focal: imageId && url ? focal : null,
    };
  }
  if (bg.kind === "pattern" && bg.patternId !== "none") {
    const def = getPatternDef(bg.patternId);
    return {
      kind: "pattern",
      image: def.image ?? "none",
      size: def.size ?? "auto",
      position: def.position ?? "0 0",
      repeat: "repeat",
      dim: overlayDimFromUi(bg.dim),
      focal: null,
    };
  }
  return {
    kind: "none",
    image: "none",
    size: "auto",
    position: "0 0",
    repeat: "repeat",
    dim: 0,
    focal: null,
  };
}

function MockProfileAside() {
  return (
    <div className="j-theme-device-aside j-theme-device-aside--profile">
      <div className="j-td-cover" />
      <div className="j-td-avatar" />
      <div className="j-td-name" />
      <div className="j-td-handle" />
      <div className="j-td-btn" />
      <div className="j-td-bio">
        <span />
        <span />
        <span className="j-td-line--short" />
      </div>
      <div className="j-td-stats">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function MockTimelineBar() {
  return (
    <div className="j-td-tlb">
      <span className="j-td-tlb-year" />
      <span className="j-td-tlb-chip" />
      <span className="j-td-tlb-chip" />
      <span className="j-td-tlb-chip j-td-tlb-chip--icon" />
    </div>
  );
}

function MockPostCard({ variant = "single" }: { variant?: "single" | "grid" }) {
  return (
    <div className="j-theme-device-card j-td-post">
      <div className="j-td-post-head">
        <div className="j-td-post-av" />
        <div className="j-td-post-meta">
          <span className="j-td-post-name" />
          <span className="j-td-post-time" />
        </div>
      </div>
      <div className="j-td-post-text">
        <span />
        <span className="j-td-line--short" />
      </div>
      {variant === "grid" ? (
        <div className="j-td-post-media j-td-post-media--grid">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="j-td-post-media j-td-post-media--hero">
          <span />
        </div>
      )}
    </div>
  );
}

/** Gallery aside — khớp `--j-gallery-w` 340px: pin 16:9 + lưới vuông. */
function MockGalleryAside() {
  return (
    <div className="j-theme-device-aside j-theme-device-aside--gallery">
      <div className="j-td-gal-head">
        <span className="j-td-gal-title" />
      </div>
      <div className="j-td-gal-pin" />
      <div className="j-td-gal-grid">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function MockFeed({
  posts,
}: {
  posts: ReadonlyArray<"single" | "grid">;
}) {
  return (
    <div className="j-theme-device-feed">
      <MockTimelineBar />
      {posts.map((variant, i) => (
        <MockPostCard key={i} variant={variant} />
      ))}
    </div>
  );
}

/**
 * Mockup nền theme — kéo neo ảnh theo tab thiết bị.
 */
export function JourneyThemeDevicePreview({
  theme,
  device,
  onDeviceChange,
  onPositionChange,
}: Props) {
  const accent = resolveAccentHex(theme);
  const spec = DEVICES[device];
  const bg = useMemo(
    () => previewBackground(theme, device),
    [theme, device],
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 360, h: 420 });
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    pos: ProfileBgPosition;
  } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setStageSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const usableW = Math.max(80, stageSize.w);
  const usableH = Math.max(80, stageSize.h);
  /* Scale toàn khung gốc — không resize layout bên trong (tránh bóp block). */
  const scale = Math.min(1, usableW / spec.w, usableH / spec.h);
  const visualW = Math.max(1, Math.round(spec.w * scale));
  const visualH = Math.max(1, Math.round(spec.h * scale));

  const canPan = Boolean(bg.focal && onPositionChange);

  function onScreenPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canPan || !bg.focal) return;
    e.preventDefault();
    const el = screenRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      pos: { ...bg.focal },
    };
  }

  function onScreenPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !onPositionChange) return;
    const el = screenRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    /* Pan: kéo sang phải → ảnh đi theo tay (trừ delta — tránh ngược hướng). */
    const dx = (e.clientX - drag.lastX) / rect.width;
    const dy = (e.clientY - drag.lastY) / rect.height;
    const next = {
      x: Math.min(1, Math.max(0, drag.pos.x - dx)),
      y: Math.min(1, Math.max(0, drag.pos.y - dy)),
    };
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.pos = next;
    onPositionChange(device, next);
  }

  function onScreenPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      screenRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  return (
    <div className="j-theme-device">
      <div className="j-theme-picker-label">
        <span>Demo thiết bị</span>
      </div>
      <div
        className="j-theme-device-tabs"
        role="tablist"
        aria-label="Khung xem trước"
      >
        {DEVICE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={device === id}
            className={
              "j-theme-device-tab" + (device === id ? " is-active" : "")
            }
            onClick={() => onDeviceChange(id)}
          >
            {DEVICES[id].label}
            <span className="j-theme-device-tab-size">
              {DEVICES[id].w}×{DEVICES[id].h}
            </span>
          </button>
        ))}
      </div>

      <div className="j-theme-device-stage" ref={stageRef}>
        <div
          className="j-theme-device-scale"
          style={{ width: visualW, height: visualH }}
        >
          <div
            className="j-theme-device-frame"
            data-device={device}
            style={{
              width: spec.w,
              height: spec.h,
              transform: `scale(${scale})`,
            }}
            aria-label={`Xem trước ${spec.label} ${spec.w}×${spec.h}`}
          >
          <div
            ref={screenRef}
            className={
              "j-theme-device-screen" + (canPan ? " is-pannable" : "")
            }
            data-preview-bg={bg.kind}
            onPointerDown={onScreenPointerDown}
            onPointerMove={onScreenPointerMove}
            onPointerUp={onScreenPointerUp}
            onPointerCancel={onScreenPointerUp}
            style={
              {
                ["--j-accent" as string]: accent,
                ["--preview-image" as string]: bg.image,
                ["--preview-size" as string]: bg.size,
                ["--preview-position" as string]: bg.position,
                ["--preview-repeat" as string]: bg.repeat,
                ["--preview-dim-pct" as string]: `${Math.round(bg.dim * 100)}%`,
              } as CSSProperties
            }
          >
            <div className="j-theme-device-chrome" aria-hidden>
              <div className="j-td-chrome-brand">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="j-td-chrome-right">
                <span className="j-td-chrome-dot" />
                <span className="j-td-chrome-dot" />
                <span className="j-td-chrome-user" />
              </div>
            </div>
            <div className="j-theme-device-body" aria-hidden>
              {device === "phone" ? (
                <>
                  <MockProfileAside />
                  <MockFeed posts={["single", "grid"]} />
                </>
              ) : device === "tablet" ? (
                <>
                  <MockProfileAside />
                  <MockFeed posts={["single", "grid"]} />
                </>
              ) : (
                <>
                  <MockProfileAside />
                  <MockFeed posts={["single", "grid"]} />
                  <MockGalleryAside />
                </>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
      <p className="j-theme-device-meta">
        {canPan
          ? `${spec.label} · rê chuột vào khung rồi kéo để chỉnh vùng ảnh`
          : `${spec.label} · ${spec.w}px — nền lộ ở khoảng trống`}
      </p>
    </div>
  );
}
