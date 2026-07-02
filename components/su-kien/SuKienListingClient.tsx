"use client";

import { CalendarDays, ImageIcon, MapPin, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SuKienDetailModal } from "@/components/co-so/SuKienDetailModal";
import { HaOrgPopoverChip } from "@/components/cins/home-adaptive/HaOrgPopoverChip";
import { SuKienHeroCarousel } from "@/components/su-kien/SuKienHeroCarousel";
import { SuKienPhanHoiActions } from "@/components/to-chuc/SuKienPhanHoiActions";
import {
  LOAI_SU_KIEN_LABELS,
  LOAI_SU_KIEN_VALUES,
  labelLoaiSuKien,
  type LoaiSuKien,
} from "@/lib/to-chuc/su-kien-constants";
import type { LoaiPhanHoiSuKien } from "@/lib/to-chuc/su-kien-dang-ky";
import type { SuKienListItem } from "@/lib/to-chuc/su-kien-listing";
import {
  TINH_THANH_SELECT_OPTIONS,
  formatSuKienDiaDiemDisplay,
  labelTinhThanh,
} from "@/lib/truong/contact";

type Props = {
  events: SuKienListItem[];
  mySuKienPhanHoi: Record<string, LoaiPhanHoiSuKien>;
  initialTab?: string;
  initialSuKienId?: string;
  isLoggedIn: boolean;
};

type TimeFilter = "upcoming" | "past" | "cua-ban";

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

function compareNearestSuKien(a: SuKienListItem, b: SuKienListItem): number {
  const rank = (status: SuKienListItem["status"]) =>
    status === "active" ? 0 : status === "upcoming" ? 1 : 2;
  const byStatus = rank(a.status) - rank(b.status);
  if (byStatus !== 0) return byStatus;
  return new Date(a.batDau).getTime() - new Date(b.batDau).getTime();
}

function SuKienListCard({
  item,
  initialLoai,
  featured = false,
  onOpen,
  onPhanHoiChange,
  onSoDangKyChange,
}: {
  item: SuKienListItem;
  initialLoai?: LoaiPhanHoiSuKien | null;
  featured?: boolean;
  onOpen: (item: SuKienListItem) => void;
  onPhanHoiChange?: (suKienId: string, loai: LoaiPhanHoiSuKien | null) => void;
  onSoDangKyChange?: (suKienId: string, soDangKy: number) => void;
}) {
  const { month, day } = eventDate(item.batDau);
  const tag = eventTag(item);
  const location = formatSuKienDiaDiemDisplay(item.tinhThanh, item.diaDiem);
  const time = formatTimeRange(item.batDau, item.ketThuc);
  const rsvpEnabled = item.status !== "done";

  return (
    <article
      className={`evb-card evb-card--listing${featured ? " is-featured" : ""}`}
    >
      <button
        type="button"
        className="evb-card-hit evb-card-hit--cover"
        onClick={() => onOpen(item)}
        aria-label={`Xem chi tiết ${item.ten}`}
      >
        <div className="evb-card-img relative">
          {item.coverSrc ? (
            <Image
              src={item.coverSrc}
              alt=""
              fill
              className="object-cover"
              sizes={
                featured
                  ? "(max-width: 700px) 100vw, 100vw"
                  : "(max-width: 700px) 100vw, 33vw"
              }
              priority={featured}
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
      </button>
      <div className="evb-card-body">
        <div className="evb-card-meta evb-card-meta--org">
          <HaOrgPopoverChip
            orgSlug={item.orgSlug}
            orgName={item.orgTen}
            orgLoai={item.orgLoai}
            orgAvatarUrl={item.orgAvatarUrl}
            wrapClassName="evb-card-org"
            nameClassName="evb-card-org-name"
          />
        </div>
        <button
          type="button"
          className="evb-card-hit evb-card-hit--content"
          onClick={() => onOpen(item)}
        >
          {time || location ? (
            <div className="evb-card-meta">
              {time ? <span>🕐 {time}</span> : null}
              {location ? (
                <span>
                  <MapPin size={13} strokeWidth={2} aria-hidden />
                  {location}
                </span>
              ) : null}
            </div>
          ) : null}
          <h2 className="evb-card-title">{item.ten}</h2>
          {item.moTa ? <p className="evb-card-desc">{item.moTa}</p> : null}
        </button>
        <div className="evb-card-actions">
          <SuKienPhanHoiActions
            orgId={item.orgId}
            suKienId={item.id}
            slotToiDa={item.slotToiDa}
            initialSoDangKy={item.soDangKy}
            initialLoai={initialLoai ?? null}
            enabled={rsvpEnabled}
            className="evb-card-phan-hoi"
            onLoaiChange={(loai) => onPhanHoiChange?.(item.id, loai)}
            onSoDangKyChange={(n) => onSoDangKyChange?.(item.id, n)}
          />
        </div>
      </div>
    </article>
  );
}

export function SuKienListingClient({
  events,
  mySuKienPhanHoi,
  initialTab,
  initialSuKienId,
  isLoggedIn,
}: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() =>
    initialTab === "cua-ban" ? "cua-ban" : "upcoming",
  );
  const [loaiFilter, setLoaiFilter] = useState<LoaiSuKien | "all">("all");
  const [tinhThanh, setTinhThanh] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<SuKienListItem | null>(null);
  const [phanHoiMap, setPhanHoiMap] = useState(mySuKienPhanHoi);

  useEffect(() => {
    setPhanHoiMap(mySuKienPhanHoi);
  }, [mySuKienPhanHoi]);

  const upcomingCount = useMemo(
    () => events.filter((e) => e.status !== "done").length,
    [events],
  );
  const pastCount = useMemo(
    () => events.filter((e) => e.status === "done").length,
    [events],
  );
  const mineCount = useMemo(
    () =>
      events.filter(
        (e) => phanHoiMap[e.id] && e.status !== "done",
      ).length,
    [events, phanHoiMap],
  );

  useEffect(() => {
    if (!initialSuKienId) return;
    const found = events.find((e) => e.id === initialSuKienId);
    if (found) setDetail(found);
  }, [events, initialSuKienId]);

  const visible = useMemo(() => {
    const q = normalize(query);
    return events.filter((item) => {
      const isPast = item.status === "done";
      if (timeFilter === "cua-ban") {
        if (!isLoggedIn || !phanHoiMap[item.id]) return false;
        if (isPast) return false;
      } else if (timeFilter === "upcoming" && isPast) return false;
      else if (timeFilter === "past" && !isPast) return false;
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
  }, [events, timeFilter, loaiFilter, tinhThanh, query, isLoggedIn, phanHoiMap]);

  const featuredSuKienId = useMemo(() => {
    if (timeFilter === "past") return null;
    const candidates = visible.filter((item) => item.status !== "done");
    if (!candidates.length) return null;
    return [...candidates].sort(compareNearestSuKien)[0]?.id ?? null;
  }, [visible, timeFilter]);

  const orderedVisible = useMemo(() => {
    if (!featuredSuKienId) return visible;
    const featured = visible.find((item) => item.id === featuredSuKienId);
    if (!featured) return visible;
    return [
      featured,
      ...visible.filter((item) => item.id !== featuredSuKienId),
    ];
  }, [visible, featuredSuKienId]);

  const handlePhanHoiChange = useCallback(
    (suKienId: string, loai: LoaiPhanHoiSuKien | null) => {
      setPhanHoiMap((prev) => {
        const current = prev[suKienId];
        if (loai) {
          if (current === loai) return prev;
          return { ...prev, [suKienId]: loai };
        }
        if (!(suKienId in prev)) return prev;
        const next = { ...prev };
        delete next[suKienId];
        return next;
      });
    },
    [],
  );

  const handleSoDangKyChange = useCallback((suKienId: string, soDangKy: number) => {
    setDetail((prev) =>
      prev?.id === suKienId ? { ...prev, soDangKy } : prev,
    );
  }, []);

  return (
    <>
      <SuKienHeroCarousel events={events} onOpen={setDetail} />

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
              ["cua-ban", "Sự kiện của bạn", mineCount],
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

          <label className="sk-list-select-wrap">
            <span className="sk-list-select-label">Loại sự kiện</span>
            <select
              className="sk-list-select"
              value={loaiFilter}
              onChange={(e) => {
                const value = e.target.value;
                setLoaiFilter(value === "all" ? "all" : (value as LoaiSuKien));
              }}
              aria-label="Lọc theo loại sự kiện"
            >
              <option value="all">Tất cả loại</option>
              {LOAI_SU_KIEN_VALUES.map((loai) => (
                <option key={loai} value={loai}>
                  {LOAI_SU_KIEN_LABELS[loai]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="sk-list-empty">
          <CalendarDays size={36} strokeWidth={1.25} aria-hidden />
          <p>
            {timeFilter === "cua-ban" ? (
              isLoggedIn ? (
                <>
                  Bạn chưa quan tâm hoặc đăng ký sự kiện nào sắp diễn ra. Bấm{" "}
                  <strong>Quan tâm</strong> hoặc <strong>Sẽ tham gia</strong>{" "}
                  trên thẻ sự kiện, feed hoặc trang chi tiết.
                </>
              ) : (
                "Đăng nhập để xem sự kiện bạn quan tâm hoặc sẽ tham gia."
              )
            ) : events.length === 0 ? (
              "Chưa có sự kiện nào trên CINs. Hãy quay lại sau hoặc theo dõi tổ chức để nhận cập nhật."
            ) : (
              "Không có sự kiện phù hợp bộ lọc. Thử đổi từ khoá hoặc khu vực."
            )}
          </p>
        </div>
      ) : (
        <div className="evb-grid sk-list-grid">
          {orderedVisible.map((item) => (
            <SuKienListCard
              key={item.id}
              item={item}
              featured={item.id === featuredSuKienId}
              initialLoai={phanHoiMap[item.id] ?? null}
              onOpen={setDetail}
              onPhanHoiChange={handlePhanHoiChange}
              onSoDangKyChange={handleSoDangKyChange}
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
