"use client";

import { CalendarDays, ImageIcon, MapPin, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SuKienDetailModal } from "@/components/co-so/SuKienDetailModal";
import { SuKienHeroCarousel } from "@/components/su-kien/SuKienHeroCarousel";
import {
  LOAI_SU_KIEN_LABELS,
  LOAI_SU_KIEN_VALUES,
  labelLoaiSuKien,
  labelSuKienVe,
  type LoaiSuKien,
} from "@/lib/to-chuc/su-kien-constants";
import type { SuKienListItem } from "@/lib/to-chuc/su-kien-listing";
import {
  TINH_THANH_SELECT_OPTIONS,
  formatSuKienDiaDiemDisplay,
  labelTinhThanh,
} from "@/lib/truong/contact";

type Props = {
  events: SuKienListItem[];
};

type TimeFilter = "upcoming" | "past";

const MONTHS = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

function eventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return {
    month: MONTHS[d.getMonth()] ?? "",
    day: String(d.getDate()).padStart(2, "0"),
  };
}

function formatTimeRange(batDau: string, ketThuc: string | null): string {
  const start = new Date(batDau);
  if (Number.isNaN(start.getTime())) return "";
  const timeFmt = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startStr = timeFmt.format(start);
  if (!ketThuc) return startStr;
  const end = new Date(ketThuc);
  if (Number.isNaN(end.getTime())) return startStr;
  return `${startStr} – ${timeFmt.format(end)}`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function eventTag(item: SuKienListItem): { label: string; kind: string } {
  if (item.status === "active") {
    return { label: "Đang diễn ra", kind: "is-live" };
  }
  const daysUntil =
    (new Date(item.batDau).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntil >= 0 && daysUntil <= 14) {
    return { label: "Sắp diễn ra", kind: "is-hot" };
  }
  return { label: labelLoaiSuKien(item.loaiSuKien), kind: "" };
}

function SuKienListCard({
  item,
  onOpen,
}: {
  item: SuKienListItem;
  onOpen: (item: SuKienListItem) => void;
}) {
  const { month, day } = eventDate(item.batDau);
  const tag = eventTag(item);
  const location = formatSuKienDiaDiemDisplay(item.tinhThanh, item.diaDiem);
  const time = formatTimeRange(item.batDau, item.ketThuc);

  return (
    <button
      type="button"
      className="evb-card"
      onClick={() => onOpen(item)}
    >
      <div className="evb-card-img relative">
        {item.coverSrc ? (
          <Image
            src={item.coverSrc}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 700px) 100vw, 33vw"
          />
        ) : (
          <span className="sk-list-cover-ph" aria-hidden>
            <ImageIcon size={36} strokeWidth={1.25} />
          </span>
        )}
        <span className={`evb-card-tag ${tag.kind}`.trim()}>
          {tag.kind === "is-live" ? <span className="evb-pulse" /> : null}
          {tag.label}
        </span>
        <div className="evb-card-date">
          <span className="evb-card-date-d">{day}</span>
          <span className="evb-card-date-m">{month}</span>
        </div>
      </div>
      <div className="evb-card-body">
        <div className="evb-card-meta">
          {time ? <span>🕐 {time}</span> : null}
          {location ? (
            <span>
              <MapPin size={13} strokeWidth={2} aria-hidden />
              {location}
            </span>
          ) : null}
        </div>
        <h2 className="evb-card-title">{item.ten}</h2>
        {item.moTa ? <p className="evb-card-desc">{item.moTa}</p> : null}
        <div className="evb-card-foot">
          <div className="evb-card-host">
            {item.orgTen}{" "}
            <span>{labelSuKienVe(item.mienPhi, item.giaVe)}</span>
          </div>
          <span className="evb-card-cta">Xem chi tiết →</span>
        </div>
      </div>
    </button>
  );
}

export function SuKienListingClient({ events }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [loaiFilter, setLoaiFilter] = useState<LoaiSuKien | "all">("all");
  const [tinhThanh, setTinhThanh] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<SuKienListItem | null>(null);

  const upcomingCount = useMemo(
    () => events.filter((e) => e.status !== "done").length,
    [events],
  );
  const pastCount = useMemo(
    () => events.filter((e) => e.status === "done").length,
    [events],
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    return events.filter((item) => {
      const isPast = item.status === "done";
      if (timeFilter === "upcoming" && isPast) return false;
      if (timeFilter === "past" && !isPast) return false;
      if (loaiFilter !== "all" && item.loaiSuKien !== loaiFilter) return false;
      if (tinhThanh && item.tinhThanh !== tinhThanh) return false;
      if (!q) return true;
      const haystack = normalize(
        [
          item.ten,
          item.moTa ?? "",
          item.orgTen,
          labelLoaiSuKien(item.loaiSuKien),
          labelTinhThanh(item.tinhThanh) ?? "",
          item.diaDiem ?? "",
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [events, timeFilter, loaiFilter, tinhThanh, query]);

  function handleSoDangKyChange(suKienId: string, soDangKy: number) {
    setDetail((prev) =>
      prev?.id === suKienId ? { ...prev, soDangKy } : prev,
    );
  }

  return (
    <>
      <SuKienHeroCarousel
        events={events}
        upcomingCount={upcomingCount}
        pastCount={pastCount}
        onOpen={setDetail}
      />

      <div className="sk-list-page">
      <div className="sk-list-body">
      <div className="sk-list-toolbar">
        <div
          className="sk-list-pills"
          role="tablist"
          aria-label="Lọc theo thời gian"
        >
          {(
            [
              ["upcoming", "Sắp diễn ra", upcomingCount],
              ["past", "Đã qua", pastCount],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={timeFilter === key}
              className={`sk-list-pill${timeFilter === key ? " on" : ""}`}
              onClick={() => setTimeFilter(key)}
            >
              {label}
              {count > 0 ? ` · ${count}` : ""}
            </button>
          ))}
        </div>

        <div className="sk-list-toolbar-row">
          <label className="sk-list-search">
            <Search size={18} strokeWidth={2} aria-hidden />
            <input
              type="search"
              placeholder="Tìm sự kiện, tổ chức…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm sự kiện"
              autoComplete="off"
            />
          </label>

          <label className="sk-list-select-wrap">
            <span className="sk-list-select-label">Khu vực</span>
            <select
              className="sk-list-select"
              value={tinhThanh}
              onChange={(e) => setTinhThanh(e.target.value)}
              aria-label="Lọc theo khu vực"
            >
              <option value="">Tất cả khu vực</option>
              {TINH_THANH_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className="sk-list-pills sk-list-pills--wrap"
          role="tablist"
          aria-label="Lọc theo loại sự kiện"
        >
          <button
            type="button"
            role="tab"
            aria-selected={loaiFilter === "all"}
            className={`sk-list-pill sk-list-pill--sm${loaiFilter === "all" ? " on" : ""}`}
            onClick={() => setLoaiFilter("all")}
          >
            Tất cả
          </button>
          {LOAI_SU_KIEN_VALUES.map((loai) => (
            <button
              key={loai}
              type="button"
              role="tab"
              aria-selected={loaiFilter === loai}
              className={`sk-list-pill sk-list-pill--sm${loaiFilter === loai ? " on" : ""}`}
              onClick={() => setLoaiFilter(loai)}
            >
              {LOAI_SU_KIEN_LABELS[loai]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="sk-list-empty">
          <CalendarDays size={36} strokeWidth={1.25} aria-hidden />
          <p>
            {events.length === 0
              ? "Chưa có sự kiện nào trên CINs. Hãy quay lại sau hoặc theo dõi tổ chức để nhận cập nhật."
              : "Không có sự kiện phù hợp bộ lọc. Thử đổi từ khoá hoặc khu vực."}
          </p>
        </div>
      ) : (
        <div className="evb-grid sk-list-grid">
          {visible.map((item) => (
            <SuKienListCard
              key={item.id}
              item={item}
              onOpen={setDetail}
            />
          ))}
        </div>
      )}

      <p className="sk-list-foot">
        Sự kiện do tổ chức đăng trên trang của họ.{" "}
        <Link href="/co-so-dao-tao">Khám phá cơ sở đào tạo</Link>
        {" · "}
        <Link href="/studio">Studio & doanh nghiệp</Link>
      </p>
      </div>
      </div>

      <SuKienDetailModal
        open={Boolean(detail)}
        orgId={detail?.orgId ?? ""}
        suKien={detail}
        onClose={() => setDetail(null)}
        onSoDangKyChange={handleSoDangKyChange}
      />
    </>
  );
}
