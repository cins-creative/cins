"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { isNgheNghiepHubPath, NGANH_HOC_HUB_PATH, NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import { TIM_KIEM_PATH } from "@/lib/search/paths";

/** Ô tìm kiếm — đặt đầu sidebar (`sb-list`). */
export function CinsTopbarSearch() {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

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

  const placeholder = "Tìm kiếm";

  const ariaLabel = isNganhHub
    ? "Tìm ngành học"
    : isNgheHub
      ? "Tìm vị trí công việc"
      : "Tìm kiếm trên CINs";

  return (
    <form
      action={action}
      method="get"
      className="sb-search"
      role="search"
      onClick={() => inputRef.current?.focus()}
    >
      {isNganhHub && nhom ? <input type="hidden" name="nhom" value={nhom} /> : null}
      {isNgheHub && linhVuc ? (
        <input type="hidden" name="linh_vuc" value={linhVuc} />
      ) : null}
      {isTimKiem && kind && kind !== "all" ? (
        <input type="hidden" name="kind" value={kind} />
      ) : null}
      <span className="sb-ico" aria-hidden>
        <Search size={18} strokeWidth={1.8} />
      </span>
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="sb-search-input"
      />
    </form>
  );
}
