import Link from "next/link";

import type { FollowedOrgUpcomingItem } from "@/lib/cins/home-adaptive/followed-org-upcoming";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-dang-ky";

const MONTHS = [
  "Th1", "Th2", "Th3", "Th4", "Th5", "Th6",
  "Th7", "Th8", "Th9", "Th10", "Th11", "Th12",
];

function dateBadge(dateLabel: string): { month: string; day: string } | null {
  const match = dateLabel.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return {
    month: MONTHS[monthIdx] ?? "",
    day: match[1].padStart(2, "0"),
  };
}

function kindTag(item: FollowedOrgUpcomingItem): string | null {
  if (item.kind === "khoa") return "Khóa học";
  if (item.kind === "moc") return "Mốc tuyển sinh";
  if (!item.subLabel) return null;
  if (item.label.toLowerCase().includes(item.subLabel.toLowerCase())) return null;
  return item.subLabel;
}

function dateRangeLine(dateLabel: string): string | null {
  const clean = dateLabel.replace(/\s*·\s*Đang diễn ra$/, "").trim();
  if (!clean.includes("–")) return null;
  return clean;
}

/** Một dòng sự kiện sidebar trang chủ. */
export function HaOrgUpcomingRow({
  item,
}: {
  item: FollowedOrgUpcomingItem & { phanHoi?: LoaiPhanHoiSuKien | null };
}) {
  const badge = dateBadge(item.dateLabel);
  const tag = kindTag(item);
  const range = dateRangeLine(item.dateLabel);
  const isLive = item.status === "active";
  const phanHoi = item.phanHoi ?? null;

  function headBadge() {
    if (phanHoi === "se_tham_gia") {
      return <span className="ha-org-up-rsvp">Sẽ tham gia</span>;
    }
    if (phanHoi === "quan_tam") {
      return <span className="ha-org-up-interest">Quan tâm</span>;
    }
    if (isLive) return <span className="ha-org-up-live">Đang diễn ra</span>;
    if (tag) return <span className="ha-org-up-tag">{tag}</span>;
    return null;
  }

  return (
    <li className="ha-org-up-item">
      <Link href={item.href} className="ha-org-up" prefetch={false}>
        <div
          className={`ha-org-up-date${isLive ? " ha-org-up-date--live" : ""}`}
          aria-hidden
        >
          {badge ? (
            <>
              <span className="ha-org-up-date-month">{badge.month}</span>
              <span className="ha-org-up-date-day">{badge.day}</span>
            </>
          ) : (
            <span className="ha-org-up-date-fallback">
              {item.kind === "su_kien" ? "SK" : item.kind === "khoa" ? "KH" : "M"}
            </span>
          )}
        </div>
        <div className="ha-org-up-body">
          <div className="ha-org-up-head">
            <span className="ha-org-up-org">{item.orgName}</span>
            {headBadge()}
          </div>
          <p className="ha-org-up-title">{item.label}</p>
          {range ? <p className="ha-org-up-range">{range}</p> : null}
        </div>
      </Link>
    </li>
  );
}
