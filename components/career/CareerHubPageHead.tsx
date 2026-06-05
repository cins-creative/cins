import Link from "next/link";

import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import type { LinhVucRow } from "@/lib/career/types";

type TabKey = "nghe" | "nganh-hoc";

type Props = {
  tab: TabKey;
  activeLinhVuc: LinhVucRow | null;
  activeNhomLabel?: string | null;
};

function linhLabel(lv: LinhVucRow | null): string {
  if (!lv) return "Nghề nghiệp";
  return lv.ten_vi ?? lv.ten ?? lv.ten_en ?? String(lv.slug ?? "");
}

export function CareerHubPageHead({
  tab,
  activeLinhVuc,
  activeNhomLabel = null,
}: Props) {
  const here =
    tab === "nganh-hoc"
      ? (activeNhomLabel?.trim() || "Ngành học")
      : linhLabel(activeLinhVuc);

  return (
    <div className="hn-page-head">
      <div className="hn-page-head-inner">
        <nav className="hn-crumbs" aria-label="Breadcrumb">
          <Link href={NGHE_NGHIEP_HUB_PATH}>Hướng nghiệp</Link>
          <span className="hn-crumbs-sep" aria-hidden>
            ›
          </span>
          <span className="hn-crumbs-here">{here}</span>
        </nav>
      </div>
    </div>
  );
}
