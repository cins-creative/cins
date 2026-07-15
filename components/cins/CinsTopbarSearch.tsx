"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { isNgheNghiepHubPath, NGANH_HOC_HUB_PATH, NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import { TIM_KIEM_PATH } from "@/lib/search/paths";

export function CinsTopbarSearch() {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();

  const isNganhHub = pathname.startsWith(NGANH_HOC_HUB_PATH);
  const isNgheHub = isNgheNghiepHubPath(pathname);
  const isTimKiem = pathname.startsWith(TIM_KIEM_PATH);

  const action = isNganhHub
    ? NGANH_HOC_HUB_PATH
    : isNgheHub
      ? NGHE_NGHIEP_HUB_PATH
      : TIM_KIEM_PATH;

  const q = sp.get("q") ?? "";
  const linhVuc = sp.get("linh_vuc") ?? "";
  const nhom = sp.get("nhom") ?? "";
  const kind = sp.get("kind") ?? "";

  const placeholder = isNganhHub
    ? "Tìm ngành học, mã ngành…"
    : isNgheHub
      ? "Tìm vị trí công việc bạn quan tâm…"
      : "Tìm nghề, trường, người, bài viết…";

  const ariaLabel = isNganhHub
    ? "Tìm ngành học"
    : isNgheHub
      ? "Tìm vị trí công việc"
      : "Tìm kiếm trên CINs";

  const hasQuery = q.trim().length > 0;
  const [expanded, setExpanded] = useState(hasQuery);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasQuery) setExpanded(true);
  }, [hasQuery]);

  useEffect(() => {
    if (!expanded) return;
    inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const collapseIfEmpty = () => {
      if (inputRef.current?.value.trim()) return;
      setExpanded(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (formRef.current?.contains(e.target as Node)) return;
      collapseIfEmpty();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inputRef.current?.value.trim()) {
        inputRef.current.blur();
        return;
      }
      setExpanded(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      className={`tb-search${expanded ? " is-expanded" : ""}`}
      role="search"
    >
      {isNganhHub && nhom ? <input type="hidden" name="nhom" value={nhom} /> : null}
      {isNgheHub && linhVuc ? (
        <input type="hidden" name="linh_vuc" value={linhVuc} />
      ) : null}
      {isTimKiem && kind && kind !== "all" ? (
        <input type="hidden" name="kind" value={kind} />
      ) : null}
      <button
        type="button"
        className="tb-search-toggle"
        aria-label={expanded ? ariaLabel : "Mở tìm kiếm"}
        aria-expanded={expanded}
        onClick={() => {
          if (expanded) {
            inputRef.current?.focus();
            return;
          }
          setExpanded(true);
        }}
      >
        <Search size={18} strokeWidth={1.8} aria-hidden className="tb-search-icon" />
      </button>
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        tabIndex={expanded ? 0 : -1}
      />
    </form>
  );
}
