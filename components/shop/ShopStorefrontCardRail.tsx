"use client";

import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type Props = {
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

/**
 * Rail ngang — cuộn touch tự nhiên; chuột kéo grab (pattern j-shop-loai-more).
 */
export function ShopStorefrontCardRail({
  className,
  ariaLabel,
  children,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    active: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      active: false,
    };
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = trackRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el) return;
    const dx = e.clientX - drag.startX;

    if (!drag.active) {
      if (Math.abs(dx) < 3) return;
      drag.active = true;
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    el.scrollLeft = drag.startScroll - dx;
    e.preventDefault();
  }, []);

  const finishDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (drag.active) suppressClickRef.current = true;
    setDragging(false);
  }, []);

  const onLostPointerCapture = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      finishDrag(e);
    },
    [finishDrag],
  );

  const onClickCapture = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={trackRef}
      className={`j-shop-sf-card-rail${dragging ? " is-dragging" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={onLostPointerCapture}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}
