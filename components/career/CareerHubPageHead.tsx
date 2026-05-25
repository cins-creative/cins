import Link from "next/link";

import { NGANH_HOC_HUB_PATH, NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";
import type { LinhVucRow } from "@/lib/career/types";

type TabKey = "nghe" | "nganh-hoc";

type Props = {
  tab: TabKey;
  hubBase?: string;
  activeLinhVuc: LinhVucRow | null;
  activeSlug: string;
  searchQuery: string;
  activeNhomLabel?: string | null;
  activeNhomId?: string;
};

function linhLabel(lv: LinhVucRow | null): string {
  if (!lv) return "Nghề nghiệp";
  return lv.ten_vi ?? lv.ten ?? lv.ten_en ?? String(lv.slug ?? "");
}

export function CareerHubPageHead({
  tab,
  hubBase = "/nghe-nghiep",
  activeLinhVuc,
  activeSlug,
  searchQuery,
  activeNhomLabel = null,
  activeNhomId = "",
}: Props) {
  const here =
    tab === "nganh-hoc"
      ? (activeNhomLabel?.trim() || "Ngành học")
      : linhLabel(activeLinhVuc);
  const searchAction =
    tab === "nganh-hoc" ? NGANH_HOC_HUB_PATH : NGHE_NGHIEP_HUB_PATH;

  return (
    <div className="hn-page-head">
      <div className="hn-page-head-inner">
        <div className="hn-head-row">
          <nav className="hn-crumbs" aria-label="Breadcrumb">
            <Link href={NGHE_NGHIEP_HUB_PATH}>Hướng nghiệp</Link>
            <span className="hn-crumbs-sep" aria-hidden>
              ›
            </span>
            <span className="hn-crumbs-here">{here}</span>
          </nav>

          <form
            action={searchAction}
            method="get"
            className="hn-head-search"
            role="search"
          >
            {tab === "nganh-hoc" && activeNhomId ? (
              <input type="hidden" name="nhom" value={activeNhomId} />
            ) : tab === "nghe" ? (
              <input type="hidden" name="linh_vuc" value={activeSlug} />
            ) : null}
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              fill="none"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder={
                tab === "nganh-hoc"
                  ? "Nhập tên ngành học hoặc mã ngành…"
                  : "Nhập tên vị trí công việc bạn quan tâm…"
              }
              aria-label={
                tab === "nganh-hoc" ? "Tìm ngành học" : "Tìm vị trí công việc"
              }
            />
          </form>
        </div>
      </div>
    </div>
  );
}
