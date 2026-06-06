"use client";

import { Check, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import {
  updateMilestoneType,
  updateMilestoneVisibility,
} from "@/app/[slug]/journey/actions";
import type {
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import {
  dispatchMilestoneInlinePatch,
  type MilestoneInlinePatchDetail,
} from "@/lib/journey/milestone-inline-patch";

const MENU_MIN_WIDTH = 168;

type TypeOption = {
  ui: MilestoneType;
  db: LoaiMoc;
  label: string;
  Icon: LucideIcon;
};

type VisibilityOption = {
  ui: MilestoneVisibility;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
};

type Props =
  | {
      kind: "type";
      milestoneId: string;
      current: MilestoneType;
      options: ReadonlyArray<TypeOption>;
      children: ReactNode;
    }
  | {
      kind: "visibility";
      milestoneId: string;
      current: MilestoneVisibility;
      options: ReadonlyArray<VisibilityOption>;
      children: ReactNode;
    };

function notifyTimelineChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cins:journey-timeline-changed"));
  window.dispatchEvent(new CustomEvent("cins:journey-gallery-sync"));
}

export function JourneyMilestoneInlineControls(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const updateMenuPosition = () => {
    const btn = triggerRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - MENU_MIN_WIDTH),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (option: TypeOption | VisibilityOption) => {
    if (pending || option.ui === props.current) return;

    const previous = props.current;
    const patch: MilestoneInlinePatchDetail = {
      milestoneId: props.milestoneId,
      kind: props.kind,
      value: option.ui,
    };

    setOpen(false);
    dispatchMilestoneInlinePatch(patch);

    startTransition(async () => {
      const res =
        props.kind === "type"
          ? await updateMilestoneType(props.milestoneId, (option as TypeOption).db)
          : await updateMilestoneVisibility(
              props.milestoneId,
              (option as VisibilityOption).db,
            );
      if (!res.ok) {
        dispatchMilestoneInlinePatch({ ...patch, value: previous });
        return;
      }
      notifyTimelineChanged();
      router.refresh();
    });
  };

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        className="j-inline-control-menu is-portal"
        role="menu"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          minWidth: MENU_MIN_WIDTH,
          zIndex: 9600,
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {props.options.map((option) => {
          const active = option.ui === props.current;
          return (
            <button
              key={option.ui}
              type="button"
              className={`j-inline-control-option${active ? " is-active" : ""}`}
              disabled={pending || active}
              onClick={(event) => {
                event.stopPropagation();
                choose(option);
              }}
            >
              <option.Icon size={14} strokeWidth={1.8} aria-hidden />
              <span>{option.label}</span>
              {active ? <Check size={13} strokeWidth={2.1} aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <span
      className="j-inline-control"
      ref={rootRef}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="j-inline-control-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {props.children}
      </button>
      {portalReady && menu ? createPortal(menu, document.body) : null}
    </span>
  );
}
