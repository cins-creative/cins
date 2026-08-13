"use client";

import { ChevronDown, ClipboardList, Loader2 } from "lucide-react";

import { CinsArrowIos } from "@/components/icons/CinsArrowIos";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useDraftModuleItemLimit } from "@/components/cins/home-adaptive/draft-module-limit";
import type { HomeDonHangItem } from "@/lib/cins/home-adaptive/role-types";

const STILL_ACTIONABLE = new Set([
  "cho_xac_nhan",
  "cho_lay_hang",
  "da_nhan_tien",
]);

type SellerFilter = "cho_xac_nhan" | "da_nhan_tien" | "cho_lay_hang" | "all";

const SELLER_FILTERS: Array<{ id: SellerFilter; label: string }> = [
  { id: "cho_xac_nhan", label: "Chờ xác nhận" },
  { id: "da_nhan_tien", label: "Đã nhận tiền" },
  { id: "cho_lay_hang", label: "Chờ lấy hàng" },
  { id: "all", label: "Tất cả" },
];

type SellerAction = { action: string; label: string };

function shortStatus(trangThai: string): string {
  switch (trangThai) {
    case "cho_xac_nhan":
      return "Chờ xác nhận";
    case "da_nhan_tien":
      return "Đã nhận tiền";
    case "cho_lay_hang":
      return "Chờ lấy hàng";
    case "dang_giao":
      return "Đang giao";
    case "da_giao_tai_su_kien":
      return "Giao tại SK";
    case "hoan_thanh":
      return "Hoàn thành";
    default:
      return trangThai;
  }
}

function sellerStatusActions(item: {
  trangThai: string;
  loaiDon: string | null;
}): SellerAction[] {
  switch (item.trangThai) {
    case "cho_xac_nhan":
      if (item.loaiDon === "dat_truoc_nhan_su_kien") {
        return [{ action: "da_giao_tai_su_kien", label: "Xác nhận đã giao" }];
      }
      return [{ action: "da_nhan_tien", label: "Xác nhận đã nhận tiền" }];
    case "da_nhan_tien":
    case "cho_lay_hang":
    case "dang_giao":
    case "da_giao_tai_su_kien":
      return [{ action: "hoan_thanh", label: "Hoàn thành" }];
    default:
      return [];
  }
}

function statusTone(trangThai: string): "warn" | "ok" | "neutral" {
  if (trangThai === "cho_xac_nhan") return "warn";
  if (
    trangThai === "da_nhan_tien" ||
    trangThai === "cho_lay_hang" ||
    trangThai === "dang_giao"
  ) {
    return "ok";
  }
  return "neutral";
}

function matchesSellerFilter(
  trangThai: string,
  filter: SellerFilter,
): boolean {
  if (filter === "all") return STILL_ACTIONABLE.has(trangThai);
  return trangThai === filter;
}

function DonStatusFilter({
  value,
  onChange,
  counts,
}: {
  value: SellerFilter;
  onChange: (next: SellerFilter) => void;
  counts: Record<SellerFilter, number>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current =
    SELLER_FILTERS.find((f) => f.id === value) ?? SELLER_FILTERS[0]!;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`ha-don-filter${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className="ha-don-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        title="Lọc loại đơn"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ha-don-filter-label">{current.label}</span>
        <ChevronDown size={12} strokeWidth={2.5} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className="ha-don-filter-menu"
          role="listbox"
          aria-label="Lọc loại đơn"
        >
          {SELLER_FILTERS.map((opt) => {
            const n = counts[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={value === opt.id}
                className={`ha-don-filter-option${value === opt.id ? " is-active" : ""}`}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                <span className="ha-don-filter-count">{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DonStatusControl({
  item,
  busy,
  onAct,
}: {
  item: HomeDonHangItem;
  busy: boolean;
  onAct: (item: HomeDonHangItem, action: string) => void;
}) {
  const tone = statusTone(item.trangThai);
  const actions = sellerStatusActions(item);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (actions.length === 0) {
    return (
      <span className={`ha-don-status is-${tone}`}>{item.trangThaiLabel}</span>
    );
  }

  return (
    <div
      className={`ha-don-status-dd${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className={`ha-don-status is-${tone} is-dd`}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        title="Đổi trạng thái đơn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {busy ? (
          <Loader2 size={11} className="ha-spin" aria-hidden />
        ) : null}
        <span className="ha-don-status-label">{item.trangThaiLabel}</span>
        <ChevronDown size={11} strokeWidth={2.6} aria-hidden />
      </button>
      {open && !busy ? (
        <div
          id={menuId}
          className="ha-don-status-menu"
          role="listbox"
          aria-label={`Cập nhật trạng thái đơn ${item.maDon}`}
        >
          {actions.map((opt) => (
            <button
              key={opt.action}
              type="button"
              role="option"
              className="ha-don-status-option"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onAct(item, opt.action);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ListProps = {
  items: HomeDonHangItem[];
  total: number;
  mode?: "seller" | "buyer";
};

/** Buyer / generic list (không filter đầu card). */
export function DonHangHomeList({
  items: initial,
  total: initialTotal,
  mode = "seller",
}: ListProps) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  if (items.length === 0) {
    return (
      <p className="ha-card-empty">
        {mode === "seller"
          ? "Không còn đơn chờ xử lý."
          : "Không còn đơn đang theo dõi."}
      </p>
    );
  }

  return (
    <div className="ha-don-list">
      {items.map((d) => {
        const tone = statusTone(d.trangThai);
        return (
          <article key={d.id} className="ha-don">
            <div className="ha-don-row">
              <Link href={d.href} className="ha-don-av-link" prefetch={false}>
                <span className="ha-don-av" aria-hidden>
                  {d.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.avatarUrl} alt="" />
                  ) : (
                    d.title.slice(0, 2).toUpperCase()
                  )}
                </span>
              </Link>
              <div className="ha-don-meta">
                <div className="ha-don-top">
                  <Link
                    href={d.href}
                    className="ha-don-name"
                    prefetch={false}
                    title={d.title}
                  >
                    {d.title}
                  </Link>
                  <span className="ha-don-price" title={d.tongTienLabel}>
                    {d.tongTienLabel}
                  </span>
                </div>
                <div className="ha-don-sub">
                  <Link
                    href={d.href}
                    className="ha-don-code"
                    prefetch={false}
                    title={d.maDon}
                  >
                    {d.maDon}
                  </Link>
                  <span className={`ha-don-status is-${tone}`}>
                    {d.trangThaiLabel}
                  </span>
                </div>
              </div>
            </div>
          </article>
        );
      })}
      {mode === "buyer" && initialTotal > items.length ? (
        <p className="ha-don-more-hint">
          Còn {initialTotal - items.length} đơn khác.
        </p>
      ) : null}
    </div>
  );
}

type SellerPanelProps = {
  items: HomeDonHangItem[];
  limit?: number;
};

/** Seller · card Đơn chờ xử lý + dropdown lọc trạng thái. */
export function DonCanXuLyPanel({
  items: initial,
  limit = 5,
}: SellerPanelProps) {
  const router = useRouter();
  const liveLimit = useDraftModuleItemLimit("don_can_xu_ly", limit);
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<SellerFilter>("cho_xac_nhan");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rowLimit = Math.min(10, Math.max(1, Math.round(liveLimit)));

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const counts = useMemo(() => {
    const base: Record<SellerFilter, number> = {
      cho_xac_nhan: 0,
      da_nhan_tien: 0,
      cho_lay_hang: 0,
      all: 0,
    };
    for (const d of items) {
      if (!STILL_ACTIONABLE.has(d.trangThai)) continue;
      base.all += 1;
      if (d.trangThai === "cho_xac_nhan") base.cho_xac_nhan += 1;
      else if (d.trangThai === "da_nhan_tien") base.da_nhan_tien += 1;
      else if (d.trangThai === "cho_lay_hang") base.cho_lay_hang += 1;
    }
    return base;
  }, [items]);

  const filteredAll = useMemo(
    () => items.filter((d) => matchesSellerFilter(d.trangThai, filter)),
    [items, filter],
  );
  const rows = filteredAll.slice(0, rowLimit);

  const act = useCallback(
    async (item: HomeDonHangItem, action: string) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        const res = await fetch(`/api/shop/orders/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = (await res.json().catch(() => null)) as {
          don?: {
            id: string;
            trangThai: string;
            loaiDon?: string;
          };
          error?: string;
        } | null;
        if (!res.ok || !json?.don) {
          setError(json?.error ?? "Không cập nhật được đơn.");
          return;
        }
        const next = json.don;
        if (!STILL_ACTIONABLE.has(next.trangThai)) {
          setItems((prev) => prev.filter((d) => d.id !== item.id));
        } else {
          setItems((prev) =>
            prev.map((d) =>
              d.id === item.id
                ? {
                    ...d,
                    trangThai: next.trangThai,
                    trangThaiLabel: shortStatus(next.trangThai),
                    loaiDon: next.loaiDon ?? d.loaiDon,
                  }
                : d,
            ),
          );
        }
        router.refresh();
      } catch {
        setError("Không cập nhật được đơn.");
      } finally {
        setBusyId(null);
      }
    },
    [busyId, router],
  );

  return (
    <section className="ha-card ha-card--don">
      <div className="ha-card-head">
        <ClipboardList size={16} strokeWidth={2} aria-hidden />
        <span className="ha-card-title">Đơn chờ xử lý</span>
        <DonStatusFilter
          value={filter}
          onChange={setFilter}
          counts={counts}
        />
        <Link
          href="/seller/orders"
          className="ha-card-more"
          prefetch={false}
          aria-label="Xem tất cả đơn"
          title="Xem tất cả đơn"
        >
          <CinsArrowIos size={16} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>

      {error ? (
        <p className="ha-don-error" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="ha-card-empty">
          {filter === "cho_xac_nhan"
            ? "Không có đơn chờ xác nhận."
            : filter === "all"
              ? "Không có đơn chờ xử lý."
              : `Không có đơn «${SELLER_FILTERS.find((f) => f.id === filter)?.label ?? ""}».`}
        </p>
      ) : (
        <div className="ha-don-list">
          {rows.map((d) => {
            const busy = busyId === d.id;
            return (
              <article key={d.id} className="ha-don">
                <div className="ha-don-row">
                  <Link
                    href={d.href}
                    className="ha-don-av-link"
                    prefetch={false}
                  >
                    <span className="ha-don-av" aria-hidden>
                      {d.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={d.avatarUrl} alt="" />
                      ) : (
                        d.title.slice(0, 2).toUpperCase()
                      )}
                    </span>
                  </Link>
                  <div className="ha-don-meta">
                    <div className="ha-don-top">
                      <Link
                        href={d.href}
                        className="ha-don-name"
                        prefetch={false}
                        title={d.title}
                      >
                        {d.title}
                      </Link>
                      <span className="ha-don-price" title={d.tongTienLabel}>
                        {d.tongTienLabel}
                      </span>
                    </div>
                    <div className="ha-don-sub">
                      <Link
                        href={d.href}
                        className="ha-don-code"
                        prefetch={false}
                        title={d.maDon}
                      >
                        {d.maDon}
                      </Link>
                      <DonStatusControl item={d} busy={busy} onAct={act} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredAll.length > rows.length ? (
            <p className="ha-don-more-hint">
              Còn {filteredAll.length - rows.length} đơn khác — xem tất cả
              trong quản lý đơn.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
