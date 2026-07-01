"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas";

import {
  applyLogoSidebarExpanded,
  LOGO_LAYOUT_COLLAPSED,
  RIVE_ARTBOARD,
  RIVE_EXPANDED_INPUT,
  RIVE_LOGO_SRC,
  RIVE_STATE_MACHINE,
  RIVE_TRIGGER_INPUT,
} from "@/lib/cins/sidebar-rive-brand";
import { ensureRiveRuntime } from "@/lib/cins/rive-runtime";

if (typeof window !== "undefined") {
  ensureRiveRuntime();
}

const LOGO_LAYOUT = LOGO_LAYOUT_COLLAPSED;

function isSidebarExpanded(sidebar: HTMLElement): boolean {
  if (window.matchMedia("(max-width: 960px)").matches) {
    return sidebar.classList.contains("open");
  }

  return (
    sidebar.matches(":hover") ||
    sidebar.matches(":focus-within") ||
    sidebar.matches(":has(.sb-user.open)")
  );
}

function watchSidebarExpanded(
  sidebarId: string,
  onChange: (expanded: boolean) => void,
): () => void {
  const sidebar = document.getElementById(sidebarId);
  if (!sidebar) return () => {};

  const sync = () => onChange(isSidebarExpanded(sidebar));

  sync();

  sidebar.addEventListener("mouseenter", sync);
  sidebar.addEventListener("mouseleave", sync);
  sidebar.addEventListener("focusin", sync);
  sidebar.addEventListener("focusout", sync);

  const observer = new MutationObserver(sync);
  observer.observe(sidebar, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
    childList: true,
  });

  const mq = window.matchMedia("(max-width: 960px)");
  mq.addEventListener("change", sync);

  return () => {
    sidebar.removeEventListener("mouseenter", sync);
    sidebar.removeEventListener("mouseleave", sync);
    sidebar.removeEventListener("focusin", sync);
    sidebar.removeEventListener("focusout", sync);
    mq.removeEventListener("change", sync);
    observer.disconnect();
  };
}

type Props = {
  sidebarId?: string;
};

export function CinsSidebarRiveBrandCanvas({
  sidebarId = "app-sidebar",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const expandedRef = useRef(false);
  const lastExpandedRef = useRef<boolean | null>(null);

  expandedRef.current = expanded;

  useEffect(() => watchSidebarExpanded(sidebarId, setExpanded), [sidebarId]);

  const { rive, RiveComponent } = useRive(
    {
      src: RIVE_LOGO_SRC,
      artboard: RIVE_ARTBOARD,
      layout: LOGO_LAYOUT,
      stateMachines: RIVE_STATE_MACHINE,
      autoplay: true,
      onRiveReady: (instance) => {
        setReady(true);
        applyLogoSidebarExpanded(
          instance,
          expandedRef.current,
          {},
          { fireTrigger: false },
        );
        lastExpandedRef.current = expandedRef.current;
      },
    },
    { shouldResizeCanvasToContainer: true },
  );

  const booleanInput = useStateMachineInput(
    rive,
    RIVE_STATE_MACHINE,
    RIVE_EXPANDED_INPUT,
    false,
  );
  const triggerInput = useStateMachineInput(
    rive,
    RIVE_STATE_MACHINE,
    RIVE_TRIGGER_INPUT,
  );

  useEffect(() => {
    if (!rive || !ready) return;
    if (lastExpandedRef.current === expanded) return;

    lastExpandedRef.current = expanded;

    applyLogoSidebarExpanded(rive, expanded, {
      booleanInput,
      triggerInput,
    });
  }, [rive, ready, expanded, booleanInput, triggerInput]);

  return (
    <Link href="/" className="sb-brand" aria-label="C.INS trang chủ">
      <span
        className={`sb-brand-rive${expanded ? " is-expanded" : ""}${ready ? " is-ready" : ""}`}
      >
        {!ready ? (
          <img
            className="sb-brand-rive-fallback"
            src="/assets/logo-cins-icon.svg"
            alt=""
            aria-hidden
          />
        ) : null}
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </span>
    </Link>
  );
}
