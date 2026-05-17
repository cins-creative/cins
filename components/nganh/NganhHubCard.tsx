import Image from "next/image";
import Link from "next/link";

import { getCoverUrl } from "@/lib/articles/cover";
import type { DeptCardTheme } from "@/lib/career/hubRailTheme";
import type { NganhHubItem } from "@/lib/nganh/types";

type Props = {
  item: NganhHubItem;
  href: string;
  deptTheme: DeptCardTheme;
};

function displayTitle(item: NganhHubItem): string {
  return (item.titleVi ?? item.title ?? item.slug).trim();
}

function subtitle(item: NganhHubItem, main: string): string | null {
  const eng = (item.titleEng ?? "").trim();
  if (!eng || eng.toLowerCase() === main.toLowerCase()) return null;
  return eng;
}

function thumbLabel(item: NganhHubItem, title: string): string {
  const code = item.ma_nganh?.trim();
  if (code) return code;
  const w = title.split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || "NH";
}

export function NganhHubCard({ item, href, deptTheme }: Props) {
  const main = displayTitle(item);
  const sub = subtitle(item, main);
  const khoi = item.khoi_thi?.filter(Boolean) ?? [];
  const coverUrl = getCoverUrl(item.cover_id);

  return (
    <li>
      <Link
        href={href}
        className="hn-role-card hn-nganh-card"
        data-dept={deptTheme}
        aria-label={
          item.ma_nganh
            ? `${main} — mã ngành ${item.ma_nganh}`
            : main
        }
      >
        <div className="hn-role-thumb">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt=""
              width={240}
              height={160}
              className="career-hub-card-img"
              sizes="(max-width: 560px) 50vw, 255px"
            />
          ) : (
            <div className="career-hub-card-ph hn-nganh-card-ph" aria-hidden>
              <span className="hn-nganh-thumb-label">
                {thumbLabel(item, main)}
              </span>
            </div>
          )}
        </div>
        <div className="hn-role-body">
          <span className="career-hub-card-text">
            <span className="career-hub-card-title">{main}</span>
            {sub ? (
              <span className="career-hub-card-title-vi">{sub}</span>
            ) : null}
            {item.ma_nganh ? (
              <span className="hn-nganh-ma-badge">
                Mã ngành: {item.ma_nganh}
              </span>
            ) : null}
            {khoi.length > 0 ? (
              <span className="hn-nganh-khoi">
                {khoi.slice(0, 4).join(" · ")}
                {khoi.length > 4 ? " …" : ""}
              </span>
            ) : null}
          </span>
          <footer className="hn-role-foot">
            <span className="hn-role-arrow" aria-hidden>
              →
            </span>
          </footer>
        </div>
      </Link>
    </li>
  );
}
