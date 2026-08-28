"use client";

import { Store, X } from "lucide-react";
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

import {
  fetchShopCuaHangClient,
} from "@/lib/shop/client-fetch-cache";
import type { ShopCuaHang } from "@/lib/shop/types";
import {
  profileThemeImageUrl,
  type ProfileCustomEntry,
} from "@/lib/journey/profile-theme";
import {
  clampShopSwitchAspect,
  dispatchShopSwitchPreview,
  parseShopSwitch,
  resolveShopSwitchDto,
  SHOP_SWITCH_ASPECT_MAX,
  SHOP_SWITCH_ASPECT_MIN,
  shopSwitchesEqual,
  type ProfileShopSwitchSlice,
} from "@/lib/journey/shop-switch";
import {
  patchGiaoDien,
  shopSwitchSliceToPatch,
} from "@/lib/journey/giao-dien-patch-client";

import "./journey-theme.css";
import "./journey-shop-switch.css";

type Props = {
  initialShopSwitch?: ProfileShopSwitchSlice | null;
  ownerSlug: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export type JourneyShopSwitchPickerHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  getPatch: () => Record<string, unknown> | null;
  markSaved: (shopSwitch?: unknown, customs?: ProfileCustomEntry[]) => void;
};

function sliceShop(
  raw: ProfileShopSwitchSlice | null | undefined,
  customs?: ProfileCustomEntry[] | null,
): ProfileShopSwitchSlice {
  return parseShopSwitch(raw ?? null, customs);
}

export const JourneyShopSwitchPicker = forwardRef<
  JourneyShopSwitchPickerHandle,
  Props
>(function JourneyShopSwitchPicker(
  { initialShopSwitch = null, ownerSlug, onDirtyChange },
  ref,
) {
  const [slice, setSlice] = useState(() => sliceShop(initialShopSwitch));
  const [baseline, setBaseline] = useState(() => sliceShop(initialShopSwitch));
  const [customs, setCustoms] = useState<ProfileCustomEntry[]>([]);
  const [shop, setShop] = useState<ShopCuaHang | null>(null);
  const sliceRef = useRef(slice);
  const baselineRef = useRef(baseline);
  const customsRef = useRef(customs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const dirty = !shopSwitchesEqual(slice, baseline);

  useEffect(() => {
    sliceRef.current = slice;
  }, [slice]);
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
    void (async () => {
      try {
        const data = await fetchShopCuaHangClient({ slug: ownerSlug });
        if (!cancelled) setShop(data.shop);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerSlug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/giao-dien");
        if (!res.ok) return;
        const data = (await res.json()) as {
          shopSwitch?: unknown;
          customs?: ProfileCustomEntry[];
        };
        if (cancelled) return;
        const nextCustoms = Array.isArray(data.customs) ? data.customs : [];
        setCustoms(nextCustoms);
        customsRef.current = nextCustoms;
        if (data.shopSwitch) {
          const parsed = parseShopSwitch(data.shopSwitch, nextCustoms);
          setSlice(parsed);
          setBaseline(parsed);
          sliceRef.current = parsed;
          baselineRef.current = parsed;
          dispatchShopSwitchPreview(resolveShopSwitchDto(parsed));
        }
      } catch {
        /* giữ initial */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: ProfileShopSwitchSlice) => {
    sliceRef.current = next;
    setSlice(next);
    dispatchShopSwitchPreview(resolveShopSwitchDto(next));
  }, []);

  const persist = useCallback(async (next: ProfileShopSwitchSlice) => {
    setStatus("saving");
    setErrMsg(null);
    try {
      const data = await patchGiaoDien(shopSwitchSliceToPatch(next));
      if (!data.ok) {
        throw new Error(data.error ?? "Không lưu được.");
      }
      if (Array.isArray(data.customs)) {
        setCustoms(data.customs);
        customsRef.current = data.customs;
      }
      const saved = data.shopSwitch
        ? parseShopSwitch(data.shopSwitch, customsRef.current)
        : sliceShop(next, customsRef.current);
      setBaseline(saved);
      baselineRef.current = saved;
      setSlice(saved);
      sliceRef.current = saved;
      dispatchShopSwitchPreview(resolveShopSwitchDto(saved));
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
      isDirty: () => !shopSwitchesEqual(sliceRef.current, baselineRef.current),
      save: async () => persist(sliceRef.current),
      getPatch: () => {
        if (shopSwitchesEqual(sliceRef.current, baselineRef.current)) {
          return null;
        }
        return shopSwitchSliceToPatch(sliceRef.current);
      },
      markSaved: (shopSwitch, customs) => {
        if (Array.isArray(customs)) {
          setCustoms(customs);
          customsRef.current = customs;
        }
        const saved = shopSwitch
          ? parseShopSwitch(shopSwitch, customsRef.current)
          : sliceShop(sliceRef.current, customsRef.current);
        setBaseline(saved);
        baselineRef.current = saved;
        setSlice(saved);
        sliceRef.current = saved;
        dispatchShopSwitchPreview(resolveShopSwitchDto(saved));
        setStatus("ok");
        window.setTimeout(
          () => setStatus((s) => (s === "ok" ? "idle" : s)),
          1600,
        );
      },
      discard: () => {
        const base = sliceShop(baselineRef.current, customsRef.current);
        sliceRef.current = base;
        setSlice(base);
        dispatchShopSwitchPreview(resolveShopSwitchDto(base));
      },
    }),
    [persist],
  );

  function setAspect(aspect: number) {
    commit({
      ...sliceRef.current,
      aspect: clampShopSwitchAspect(aspect),
    });
  }

  function setImage(imageId: string | null) {
    commit({
      ...sliceRef.current,
      kind: imageId ? "poster" : "classic",
      imageId,
    });
  }

  function setShowName(showName: boolean) {
    commit({
      ...sliceRef.current,
      showName,
    });
  }

  async function onUpload(file: File) {
    setUploading(true);
    setErrMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/user/giao-dien/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        imageId?: string;
        customs?: ProfileCustomEntry[];
      } | null;
      if (!res.ok || !data?.imageId) {
        throw new Error(data?.error ?? "Upload thất bại.");
      }
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
      setImage(data.imageId);
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

      const scrub = (s: ProfileShopSwitchSlice): ProfileShopSwitchSlice =>
        s.imageId === id
          ? { ...s, imageId: null, kind: "classic" as const }
          : s;

      const nextSlice = scrub(sliceRef.current);
      const nextBaseline = scrub(baselineRef.current);

      setBaseline(nextBaseline);
      baselineRef.current = nextBaseline;
      commit(nextSlice);
      setStatus("ok");
    } catch (err) {
      setStatus("err");
      setErrMsg(err instanceof Error ? err.message : "Không xóa được ảnh.");
    } finally {
      setRemovingId(null);
    }
  }

  const dto = resolveShopSwitchDto(slice);
  const shopName = shop?.ten?.trim() || "chưa đặt tên";
  const hasCustomImage = Boolean(slice.imageId && dto.imageUrl);
  const previewCover = hasCustomImage
    ? dto.imageUrl
    : shop?.coverUrl ?? null;
  const previewStyle = {
    ["--j-shop-switch-aspect"]: String(slice.aspect),
    ...(hasCustomImage
      ? { ["--j-shop-switch-pos"]: dto.positionCss }
      : {}),
  } as CSSProperties;
  const showRow = slice.showName;

  function onPanStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!hasCustomImage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: sliceRef.current.position.x,
      origY: sliceRef.current.position.y,
    };
  }

  function onPanMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const dx = (event.clientX - pan.startX) / rect.width;
    const dy = (event.clientY - pan.startY) / rect.height;
    commit({
      ...sliceRef.current,
      position: {
        x: Math.min(1, Math.max(0, pan.origX - dx)),
        y: Math.min(1, Math.max(0, pan.origY - dy)),
      },
    });
  }

  function onPanEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null;
    }
  }

  const noneSelected = !slice.imageId;
  const noneCover = shop?.coverUrl ?? null;

  return (
    <div className="j-theme-picker j-ssw-picker" aria-label="Khối Shop">
      <div className="j-theme-picker-main">
        <section className="j-theme-section" aria-labelledby="j-ssw-image-heading">
          <div className="j-theme-picker-label" id="j-ssw-image-heading">
            <span>Ảnh khối</span>
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
            ) : uploading ? (
              <span className="j-theme-picker-status">Đang tải…</span>
            ) : null}
          </div>
          <div className="j-theme-image-row">
            <button
              type="button"
              className={
                "j-theme-image-thumb j-ssw-image-none" +
                (noneSelected ? " is-active" : "")
              }
              aria-pressed={noneSelected}
              aria-label="Dùng ảnh bìa cửa hàng"
              disabled={Boolean(removingId) || uploading || status === "saving"}
              style={
                noneCover
                  ? { backgroundImage: `url("${noneCover}")` }
                  : undefined
              }
              onClick={() => setImage(null)}
            >
              {!noneCover ? "Nền" : null}
            </button>
            <button
              type="button"
              className="j-theme-image-upload"
              disabled={Boolean(removingId) || uploading || status === "saving"}
              onClick={() => fileInputRef.current?.click()}
            >
              + Tải ảnh
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="j-theme-image-file"
              aria-label="Tải ảnh khối Shop"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            {customs.map((c) => {
              const url = profileThemeImageUrl(c.imageId, "gridsm");
              const selected = slice.imageId === c.imageId;
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
                    aria-label="Chọn ảnh khối Shop"
                    disabled={
                      Boolean(removingId) ||
                      uploading ||
                      status === "saving"
                    }
                    style={
                      url ? { backgroundImage: `url("${url}")` } : undefined
                    }
                    onClick={() => setImage(c.imageId)}
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
        </section>

        <section
          className="j-theme-section"
          aria-labelledby="j-ssw-aspect-heading"
        >
          <div className="j-theme-picker-label" id="j-ssw-aspect-heading">
            <span>Tỉ lệ khối</span>
          </div>
          <label className="j-ssw-slider">
            <span className="j-ssw-slider-ends">
              <span>Cao (4:3)</span>
              <span>Thấp (3:1)</span>
            </span>
            <input
              type="range"
              min={SHOP_SWITCH_ASPECT_MIN}
              max={SHOP_SWITCH_ASPECT_MAX}
              step={0.01}
              value={slice.aspect}
              aria-label="Tỉ lệ rộng trên cao"
              onChange={(e) => setAspect(Number(e.currentTarget.value))}
            />
          </label>
        </section>

        <section
          className="j-theme-section j-theme-section--home"
          aria-labelledby="j-ssw-name-heading"
        >
          <div className="j-theme-home-row">
            <span className="j-theme-home-text">
              <span
                className="j-theme-home-check-title"
                id="j-ssw-name-heading"
              >
                Hiện tên shop
              </span>
              <span className="j-theme-home-check-desc">
                Tắt để ẩn tên, logo và lớp phủ — chỉ còn ảnh khối.
              </span>
            </span>
            <button
              type="button"
              className={
                "j-theme-home-switch" + (slice.showName ? " is-on" : "")
              }
              role="switch"
              aria-checked={slice.showName}
              aria-labelledby="j-ssw-name-heading"
              onClick={() => setShowName(!slice.showName)}
            >
              <span className="j-theme-home-switch-knob" aria-hidden />
            </button>
          </div>
        </section>
      </div>

      <aside className="j-theme-picker-aside j-ssw-aside">
        <div className="j-theme-picker-label">Xem trước sidebar</div>
        <div
          className={"j-ssw-preview" + (hasCustomImage ? " is-pan" : "")}
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerCancel={onPanEnd}
        >
          <div className="j-profile-shop-switch j-ssw-preview-card">
            <div
              className={
                "j-profile-shop-switch-btn is-poster" +
                (showRow ? " show-name" : "")
              }
              style={previewStyle}
            >
              <span
                className={`j-profile-shop-switch-cover${previewCover ? " has-img" : ""}`}
                style={
                  previewCover
                    ? { backgroundImage: `url(${previewCover})` }
                    : undefined
                }
                aria-hidden
              />
              {showRow ? (
                <span className="j-profile-shop-switch-scrim" aria-hidden />
              ) : null}
              {showRow ? (
                <span className="j-profile-shop-switch-row">
                  <span className="j-profile-shop-switch-avatar" aria-hidden>
                    {shop?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.avatarUrl} alt="" width={44} height={44} />
                    ) : (
                      <Store size={16} strokeWidth={2} />
                    )}
                  </span>
                  <span className="j-profile-shop-switch-copy">
                    <span className="j-profile-shop-switch-label">
                      <Store size={12} strokeWidth={2.25} aria-hidden />
                      Shop
                    </span>
                    <span className="j-profile-shop-switch-name">{shopName}</span>
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          {hasCustomImage ? (
            <p className="j-ssw-pan-hint">Kéo trên ảnh để chỉnh neo.</p>
          ) : (
            <p className="j-ssw-pan-hint">
              Ô trống dùng ảnh bìa cửa hàng. Đổi bìa / tên ở trang Shop.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
});

JourneyShopSwitchPicker.displayName = "JourneyShopSwitchPicker";
