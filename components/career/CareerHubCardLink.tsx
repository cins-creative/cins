"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  CareerHubCardLabels,
  careerHubCardAriaLabel,
  careerHubTooltipText,
} from "@/components/career/CareerHubCardLabels";
import type { NgheNghiepHubItem } from "@/lib/career/types";

const CURSOR_OFFSET = 14;
const TOOLTIP_MAX_W = 360;
const VIEWPORT_PAD = 12;

/** Khi thẻ dùng `children`, nhãn con bật tooltip tĩnh (touch / coarse pointer). */
export const CareerHubStaticTooltipContext = createContext(false);

export function useCareerHubStaticTooltip(): boolean {
  return useContext(CareerHubStaticTooltipContext);
}

type Props = {
  href: string;
  career: NgheNghiepHubItem;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "children" | "className">;

function clampTooltipPosition(
  clientX: number,
  clientY: number,
  size: { w: number; h: number },
): { left: number; top: number } {
  let left = clientX + CURSOR_OFFSET;
  let top = clientY + CURSOR_OFFSET;

  if (left + size.w > window.innerWidth - VIEWPORT_PAD) {
    left = clientX - size.w - CURSOR_OFFSET;
  }
  if (top + size.h > window.innerHeight - VIEWPORT_PAD) {
    top = clientY - size.h - CURSOR_OFFSET;
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - size.w - VIEWPORT_PAD));
  top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - size.h - VIEWPORT_PAD));

  return { left, top };
}

export function CareerHubCardLink({
  href,
  career,
  className,
  children,
  ...linkProps
}: Props) {
  const tooltip = careerHubTooltipText(career.short_description);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef({ x: 0, y: 0 });

  const [mounted, setMounted] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const useCursorTooltip = finePointer && !!tooltip;

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const el = tooltipRef.current;
      const w = el?.offsetWidth ?? TOOLTIP_MAX_W;
      const h = el?.offsetHeight ?? 64;
      setPos(clampTooltipPosition(clientX, clientY, { w, h }));
    },
    [],
  );

  const onEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    setHovering(true);
    if (useCursorTooltip) updatePosition(e.clientX, e.clientY);
  };

  const onFocus = () => setHovering(true);

  const onLeave = () => setHovering(false);

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (!useCursorTooltip) return;
    updatePosition(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!hovering || !useCursorTooltip) return;
    requestAnimationFrame(() => {
      const { x, y } = lastPointer.current;
      updatePosition(x, y);
    });
  }, [hovering, useCursorTooltip, tooltip, updatePosition]);

  const showStaticOnLabels = !!tooltip && !useCursorTooltip;

  return (
    <>
      <CareerHubStaticTooltipContext.Provider value={showStaticOnLabels}>
        <Link
          href={href}
          className={className}
          aria-label={careerHubCardAriaLabel(career)}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onMouseMove={onMove}
          onFocus={onFocus}
          onBlur={onLeave}
          {...linkProps}
        >
          {children}
          {children ? null : (
            <CareerHubCardLabels career={career} showStaticTooltip={showStaticOnLabels} />
          )}
        </Link>
      </CareerHubStaticTooltipContext.Provider>

      {mounted &&
        useCursorTooltip &&
        hovering &&
        createPortal(
          <span
            ref={tooltipRef}
            className="career-hub-card-tooltip career-hub-card-tooltip--cursor"
            role="tooltip"
            style={{ left: pos.left, top: pos.top }}
          >
            {tooltip}
          </span>,
          document.body,
        )}
    </>
  );
}
