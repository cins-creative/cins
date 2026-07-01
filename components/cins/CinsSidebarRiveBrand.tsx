"use client";

import Link from "next/link";
import {
  Alignment,
  DrawOptimizationOptions,
  Fit,
  Layout,
  useRive,
} from "@rive-app/react-canvas";
import { useEffect, useRef, useState } from "react";

import { useAppSidebarExpanded } from "@/components/cins/useAppSidebarExpanded";
import {
  RIVE_LOGO_SRC,
  RIVE_LOGO_STATE_COLLAPSED,
  RIVE_LOGO_STATE_EXPANDED,
  RIVE_STATE_MACHINE,
  runLogoSidebarTransition,
  setLogoSidebarProgress,
} from "@/lib/cins/sidebar-rive-brand";

const layout = new Layout({
  fit: Fit.Contain,
  alignment: Alignment.CenterLeft,
});

function StaticBrandFallback() {
  return (
    <>
      <div className="sb-brand-mark" aria-hidden>
        <img src="/assets/logo-cins-icon.svg" alt="" />
      </div>
      <div className="sb-brand-text" aria-hidden>
        <img src="/assets/logo-cins-wide.svg" alt="C.INS" />
      </div>
    </>
  );
}

export function CinsSidebarRiveBrand({ sidebarId = "app-sidebar" }: { sidebarId?: string }) {
  const expanded = useAppSidebarExpanded(sidebarId);
  const [useStatic, setUseStatic] = useState(false);
  const progressRef = useRef(0);
  const cancelAnimRef = useRef<(() => void) | null>(null);
  const readyRef = useRef(false);
  const prevExpandedRef = useRef<boolean | null>(null);

  const { rive, RiveComponent } = useRive({
    src: RIVE_LOGO_SRC,
    stateMachines: RIVE_STATE_MACHINE,
    autoplay: false,
    layout,
    drawingOptions: DrawOptimizationOptions.AlwaysDraw,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setUseStatic(true);
    }
  }, []);

  useEffect(() => {
    if (!rive || useStatic) return;

    if (!readyRef.current) {
      const initial = expanded
        ? RIVE_LOGO_STATE_EXPANDED
        : RIVE_LOGO_STATE_COLLAPSED;
      setLogoSidebarProgress(rive, initial);
      progressRef.current = initial;
      readyRef.current = true;
      prevExpandedRef.current = expanded;
      return;
    }

    if (prevExpandedRef.current === expanded) return;
    prevExpandedRef.current = expanded;

    cancelAnimRef.current?.();
    const { cancel } = runLogoSidebarTransition(
      rive,
      expanded,
      progressRef.current,
      (value) => {
        progressRef.current = value;
      },
    );
    cancelAnimRef.current = cancel;
  }, [rive, expanded, useStatic]);

  useEffect(() => {
    return () => {
      cancelAnimRef.current?.();
    };
  }, []);

  return (
    <Link href="/" className="sb-brand" aria-label="C.INS trang chủ">
      {useStatic ? (
        <StaticBrandFallback />
      ) : (
        <div
          className={`sb-brand-rive${expanded ? " is-expanded" : ""}`}
          aria-hidden
        >
          <RiveComponent />
        </div>
      )}
    </Link>
  );
}
