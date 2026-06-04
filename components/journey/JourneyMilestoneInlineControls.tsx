"use client";

import { Check, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  updateMilestoneType,
  updateMilestoneVisibility,
} from "@/app/[slug]/journey/actions";
import type {
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";

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

export function JourneyMilestoneInlineControls(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (option: TypeOption | VisibilityOption) => {
    startTransition(async () => {
      const res =
        props.kind === "type"
          ? await updateMilestoneType(props.milestoneId, (option as TypeOption).db)
          : await updateMilestoneVisibility(
              props.milestoneId,
              (option as VisibilityOption).db,
            );
      if (!res.ok) return;
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <span className="j-inline-control" ref={rootRef}>
      <button
        type="button"
        className="j-inline-control-trigger"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {props.children}
      </button>
      {open ? (
        <span className="j-inline-control-menu" role="menu">
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
        </span>
      ) : null}
    </span>
  );
}
