"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { isNgheNghiepHubPath, NGANH_HOC_HUB_PATH, NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";

export function CinsTopbarSearch() {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();

  const isNganhHub = pathname.startsWith(NGANH_HOC_HUB_PATH);
  const isNgheHub = isNgheNghiepHubPath(pathname);

  const action = isNganhHub ? NGANH_HOC_HUB_PATH : NGHE_NGHIEP_HUB_PATH;
  const q = sp.get("q") ?? "";
  const linhVuc = sp.get("linh_vuc") ?? "";
  const nhom = sp.get("nhom") ?? "";

  const placeholder = isNganhHub
    ? "Tìm ngành học, mã ngành…"
    : "Tìm vị trí công việc bạn quan tâm…";

  return (
    <form action={action} method="get" className="tb-search" role="search">
      {isNganhHub && nhom ? (
        <input type="hidden" name="nhom" value={nhom} />
      ) : null}
      {isNgheHub && linhVuc ? (
        <input type="hidden" name="linh_vuc" value={linhVuc} />
      ) : null}
      <Search size={16} strokeWidth={2} aria-hidden className="tb-search-icon" />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={isNganhHub ? "Tìm ngành học" : "Tìm vị trí công việc"}
        autoComplete="off"
      />
    </form>
  );
}
