"use client";

import {
  Check,
  CheckSquare,
  FileDown,
  Loader2,
  Package,
  Search,
  Share2,
  Square,
  Store,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { formatDate, formatMoney } from "@/lib/format";
import type { TFn } from "@/lib/i18n/t";
import { useT } from "@/lib/i18n/use-t";
import { useLocale } from "@/lib/locale/context";
import type { CinsLocale } from "@/lib/locale/types";
import type { ShopDonHang } from "@/lib/shop/types";
import { shopTrangThaiDonLabel } from "@/lib/shop/types";

import { ShopDonDetailModal } from "./ShopDonDetailModal";
import "./shop-mua-history.css";

type Filter = "all" | "paid" | "unpaid";

type Recipient = {
  roomId: string;
  name: string;
  avatarUrl: string | null;
  isGroup: boolean;
};

function isPaidDon(d: ShopDonHang): boolean {
  return d.trangThai === "da_nhan_tien" || d.trangThai === "hoan_thanh";
}

function money(n: number, tienTe: string, locale: CinsLocale): string {
  return formatMoney(n, locale, tienTe);
}

function dateLabel(iso: string, locale: CinsLocale): string {
  try {
    return formatDate(iso, locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML tự chứa để in → "Save as PDF". */
function buildPrintHtml(
  orders: ShopDonHang[],
  locale: CinsLocale,
  t: TFn,
): string {
  const now = formatDate(new Date(), locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const blocks = orders
    .map((d) => {
      const rows = d.dong
        .map(
          (l) => `
          <tr>
            <td>${escapeHtml(l.tenSnapshot)}${
              l.nhanSnapshot && l.nhanSnapshot !== "Mặc định"
                ? ` · ${escapeHtml(l.nhanSnapshot)}`
                : ""
            }</td>
            <td class="num">${l.soLuong}</td>
            <td class="num">${money(l.giaDonVi, d.tienTe, locale)}</td>
            <td class="num">${money(l.giaDonVi * l.soLuong, d.tienTe, locale)}</td>
          </tr>`,
        )
        .join("");
      return `
      <section class="order">
        <div class="order-hdr">
          <div>
            <strong>${escapeHtml(d.banTen ?? t("shop.history.shopFallback"))}</strong>
            <span class="ma">${escapeHtml(t("shop.history.orderCode", { code: d.maDon ?? d.id.slice(0, 8) }))}</span>
          </div>
          <div class="meta">
            <span class="status ${isPaidDon(d) ? "paid" : "unpaid"}">${
              shopTrangThaiDonLabel(d.trangThai, locale)
            }</span>
            <span>${escapeHtml(dateLabel(d.taoLuc, locale))}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>${escapeHtml(t("shop.history.printProduct"))}</th><th class="num">${escapeHtml(t("shop.history.printQty"))}</th><th class="num">${escapeHtml(t("shop.history.printUnit"))}</th><th class="num">${escapeHtml(t("shop.history.printLine"))}</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" class="num">${escapeHtml(t("shop.history.printTotal"))}</td><td class="num total">${money(
              d.tongTien,
              d.tienTe,
              locale,
            )}</td></tr>
          </tfoot>
        </table>
      </section>`;
    })
    .join("");
  const grandTotal = orders.reduce((s, d) => s + d.tongTien, 0);
  const tienTe = orders[0]?.tienTe ?? "VND";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8" />
  <title>${escapeHtml(t("shop.history.title"))}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1a1a1a; margin: 28px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #666; font-size: 12px; margin: 0 0 20px; }
    .order { border: 1px solid #e4e6eb; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .order-hdr { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
    .order-hdr .ma { display: block; color: #666; font-size: 12px; margin-top: 2px; }
    .meta { text-align: right; font-size: 12px; color: #666; display: flex; flex-direction: column; gap: 4px; }
    .status { font-weight: 700; }
    .status.paid { color: #1a7f37; }
    .status.unpaid { color: #b4530e; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; }
    th { color: #666; font-weight: 600; }
    .num { text-align: right; white-space: nowrap; }
    .total { font-weight: 800; }
    .grand { text-align: right; font-size: 15px; font-weight: 800; margin-top: 8px; }
  </style></head>
  <body onload="window.print()">
    <h1>${escapeHtml(t("shop.history.title"))}</h1>
    <p class="sub">${escapeHtml(t("shop.history.printSub", { count: orders.length, when: now }))}</p>
    ${blocks}
    <p class="grand">${escapeHtml(t("shop.history.printGrand", { amount: money(grandTotal, tienTe, locale) }))}</p>
  </body></html>`;
}

function buildShareText(
  orders: ShopDonHang[],
  locale: CinsLocale,
  t: TFn,
): string {
  const lines: string[] = [
    t("shop.history.shareHead", { count: orders.length }),
  ];
  orders.forEach((d, i) => {
    lines.push(
      `${i + 1}. [${d.maDon ?? d.id.slice(0, 8)}] ${d.banTen ?? t("shop.history.shopFallback")} — ${money(
        d.tongTien,
        d.tienTe,
        locale,
      )} — ${shopTrangThaiDonLabel(d.trangThai, locale)} · ${dateLabel(d.taoLuc, locale)}`,
    );
    for (const l of d.dong) {
      lines.push(
        `   • ${l.tenSnapshot}${
          l.nhanSnapshot && l.nhanSnapshot !== "Mặc định"
            ? ` · ${l.nhanSnapshot}`
            : ""
        } ×${l.soLuong}`,
      );
    }
  });
  return lines.join("\n");
}

export function ShopMuaHistory({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useT();
  const [orders, setOrders] = useState<ShopDonHang[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [portalReady, setPortalReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipLoading, setRecipLoading] = useState(false);
  const [recipQuery, setRecipQuery] = useState("");
  const [sendingRoom, setSendingRoom] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => setPortalReady(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/orders?role=buyer", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopDonHang[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? t("shop.history.loadFail"));
        return;
      }
      setOrders(json?.items ?? []);
    } catch {
      setErr(t("shop.history.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setShareOpen(false);
    setToast(null);
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (shareOpen) setShareOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, shareOpen, onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(
    () =>
      orders.filter((o) =>
        filter === "all" ? true : filter === "paid" ? isPaidDon(o) : !isPaidDon(o),
      ),
    [orders, filter],
  );

  const allSelected =
    filtered.length > 0 && filtered.every((o) => selected.has(o.id));
  const someSelected =
    filtered.some((o) => selected.has(o.id)) && !allSelected;

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const n = new Set(prev);
      const all = filtered.every((o) => n.has(o.id)) && filtered.length > 0;
      if (all) filtered.forEach((o) => n.delete(o.id));
      else filtered.forEach((o) => n.add(o.id));
      return n;
    });
  }, [filtered]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.id)),
    [orders, selected],
  );

  const exportPdf = useCallback(() => {
    if (selectedOrders.length === 0) return;
    const w = window.open("", "_blank", "width=820,height=920");
    if (!w) {
      setToast(t("shop.history.popupBlocked"));
      return;
    }
    w.document.write(buildPrintHtml(selectedOrders, locale, t));
    w.document.close();
    w.focus();
  }, [selectedOrders, locale, t]);

  const loadRecipients = useCallback(async () => {
    setRecipLoading(true);
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        threads?: Array<{
          roomId: string;
          name: string;
          avatarUrl?: string | null;
          isGroup?: boolean;
          isSelf?: boolean;
        }>;
      } | null;
      const list: Recipient[] = (json?.threads ?? [])
        .filter((thread) => Boolean(thread.roomId))
        .map((thread) => ({
          roomId: thread.roomId,
          name: thread.isSelf ? t("shop.history.sendToMe") : thread.name,
          avatarUrl: thread.avatarUrl ?? null,
          isGroup: Boolean(thread.isGroup),
        }));
      setRecipients(list);
    } catch {
      setRecipients([]);
    } finally {
      setRecipLoading(false);
    }
  }, [t]);

  const openShare = useCallback(() => {
    if (selectedOrders.length === 0) return;
    setShareOpen(true);
    setRecipQuery("");
    if (recipients.length === 0) void loadRecipients();
  }, [selectedOrders.length, recipients.length, loadRecipients]);

  const sendTo = useCallback(
    async (r: Recipient) => {
      if (selectedOrders.length === 0) return;
      setSendingRoom(r.roomId);
      try {
        const res = await fetch(`/api/chat/rooms/${r.roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noi_dung: buildShareText(selectedOrders, locale, t),
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setToast(j?.error ?? t("shop.history.sendFail"));
          return;
        }
        setToast(
          t("shop.history.sharedTo", {
            count: selectedOrders.length,
            name: r.name,
          }),
        );
        setShareOpen(false);
      } catch {
        setToast(t("shop.history.sendFail"));
      } finally {
        setSendingRoom(null);
      }
    },
    [selectedOrders, locale, t],
  );

  const filteredRecipients = useMemo(() => {
    const q = recipQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipients, recipQuery]);

  if (!portalReady || !open) return null;

  const selCount = selected.size;

  return createPortal(
    <div
      className="mua-history-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mua-history-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("shop.history.title")}
      >
        <header className="mua-history-hdr">
          <div>
            <p className="mua-history-kicker">{t("shop.history.title")}</p>
            <h2>{t("shop.history.yourOrders")}</h2>
          </div>
          <button
            type="button"
            className="mua-history-close"
            aria-label={t("actors.close")}
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="mua-history-tabs" role="tablist">
          {(
            [
              ["all", t("shop.all")],
              ["unpaid", t("shop.history.unpaid")],
              ["paid", t("shop.history.paid")],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`mua-history-tab${filter === f ? " is-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mua-history-toolbar">
          <button
            type="button"
            className="mua-history-selectall"
            onClick={toggleAll}
            disabled={filtered.length === 0}
          >
            {allSelected ? (
              <CheckSquare size={16} strokeWidth={2} aria-hidden />
            ) : (
              <Square
                size={16}
                strokeWidth={2}
                aria-hidden
                className={someSelected ? "is-partial" : undefined}
              />
            )}
            {t("shop.history.selectAll")}
          </button>
          <span className="mua-history-selcount">
            {selCount > 0
              ? t("shop.history.selectedCount", { count: selCount })
              : ""}
          </span>
          <div className="mua-history-actions">
            <button
              type="button"
              className="mua-history-action"
              disabled={selCount === 0}
              onClick={openShare}
            >
              <Share2 size={15} strokeWidth={2} aria-hidden />
              {t("shop.history.share")}
              {selCount > 0 ? ` (${selCount})` : ""}
            </button>
            <button
              type="button"
              className="mua-history-action"
              disabled={selCount === 0}
              onClick={exportPdf}
            >
              <FileDown size={15} strokeWidth={2} aria-hidden />
              {t("shop.history.exportPdf")}
              {selCount > 0 ? ` (${selCount})` : ""}
            </button>
          </div>
        </div>

        {err ? (
          <p className="mua-history-err" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mua-history-body">
          {loading ? (
            <p className="mua-history-muted">
              <Loader2 size={16} className="mua-history-spin" aria-hidden />{" "}
              {t("shop.loadingShort")}
            </p>
          ) : filtered.length === 0 ? (
            <div className="mua-history-empty">
              <Package size={26} strokeWidth={1.6} aria-hidden />
              <p>{t("shop.history.empty")}</p>
            </div>
          ) : (
            filtered.map((d) => {
              const paid = isPaidDon(d);
              const checked = selected.has(d.id);
              return (
                <section
                  key={d.id}
                  className={`mua-history-order${checked ? " is-selected" : ""}`}
                >
                  <button
                    type="button"
                    className="mua-history-check"
                    aria-label={
                      checked
                        ? t("shop.history.unselectOrder")
                        : t("shop.history.selectOrder")
                    }
                    aria-pressed={checked}
                    onClick={() => toggle(d.id)}
                  >
                    {checked ? (
                      <CheckSquare size={18} strokeWidth={2} aria-hidden />
                    ) : (
                      <Square size={18} strokeWidth={2} aria-hidden />
                    )}
                  </button>
                  <div className="mua-history-order-main">
                    <div className="mua-history-order-hdr">
                      <span className="mua-history-shop">
                        <Store size={14} strokeWidth={1.9} aria-hidden />
                        {d.banTen ?? t("shop.history.shopFallback")}
                      </span>
                      <span className="mua-history-status-row">
                        <span
                          className={`mua-history-status ${paid ? "is-paid" : "is-unpaid"}`}
                        >
                          {shopTrangThaiDonLabel(d.trangThai, locale)}
                        </span>
                        {d.trangThai === "da_nhan_tien" && d.yeuCauHuyLuc ? (
                          <button
                            type="button"
                            className="mua-history-status is-yeu-cau"
                            onClick={() => setDetailId(d.id)}
                          >
                            {t("shop.history.cancelRequest")}
                          </button>
                        ) : null}
                      </span>
                    </div>
                    <div className="mua-history-order-sub">
                      <span>
                        {t("shop.history.orderCode", {
                          code: d.maDon ?? d.id.slice(0, 8),
                        })}
                      </span>
                      <span>·</span>
                      <span>{dateLabel(d.taoLuc, locale)}</span>
                    </div>
                    <ul className="mua-history-lines">
                      {d.dong.map((l) => (
                        <li key={l.id} className="mua-history-line">
                          <span className="mua-history-line-thumb" aria-hidden>
                            {l.anhUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.anhUrl} alt="" loading="lazy" />
                            ) : (
                              <Package size={14} strokeWidth={1.7} />
                            )}
                          </span>
                          <span className="mua-history-line-name">
                            {l.tenSnapshot}
                            {l.nhanSnapshot && l.nhanSnapshot !== "Mặc định" ? (
                              <span className="mua-history-line-var">
                                {" "}
                                · {l.nhanSnapshot}
                              </span>
                            ) : null}
                          </span>
                          <span className="mua-history-line-qty">
                            ×{l.soLuong}
                          </span>
                          <span className="mua-history-line-price">
                            {money(l.giaDonVi * l.soLuong, d.tienTe, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mua-history-order-foot">
                      {d.bienLaiAnhUrl ? (
                        <a
                          href={d.bienLaiAnhUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mua-history-bill"
                        >
                          {t("shop.history.receipt")}
                        </a>
                      ) : (
                        <span />
                      )}
                      <strong className="mua-history-order-total">
                        {money(d.tongTien, d.tienTe, locale)}
                      </strong>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>

        {shareOpen ? (
          <div
            className="mua-history-share"
            role="dialog"
            aria-modal="true"
            aria-label={t("shop.history.pickRecipient")}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShareOpen(false);
            }}
          >
            <div className="mua-history-share-card">
              <header className="mua-history-share-hdr">
                <div>
                  <p className="mua-history-kicker">{t("shop.history.shareViaChat")}</p>
                  <h3>
                    {t("shop.history.sendOrdersTo", {
                      count: selectedOrders.length,
                    })}
                  </h3>
                </div>
                <button
                  type="button"
                  className="mua-history-close"
                  aria-label={t("actors.close")}
                  onClick={() => setShareOpen(false)}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </header>
              <label className="mua-history-search">
                <Search size={15} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  placeholder={t("shop.history.searchThreads")}
                  value={recipQuery}
                  onChange={(e) => setRecipQuery(e.target.value)}
                />
              </label>
              <div className="mua-history-recips">
                {recipLoading ? (
                  <p className="mua-history-muted">
                    <Loader2
                      size={15}
                      className="mua-history-spin"
                      aria-hidden
                    />{" "}
                    {t("shop.history.loadingThreads")}
                  </p>
                ) : filteredRecipients.length === 0 ? (
                  <p className="mua-history-muted">
                    {t("shop.history.noThreads")}
                  </p>
                ) : (
                  filteredRecipients.map((r) => (
                    <button
                      key={r.roomId}
                      type="button"
                      className="mua-history-recip"
                      disabled={sendingRoom !== null}
                      onClick={() => void sendTo(r)}
                    >
                      <span className="mua-history-recip-avatar" aria-hidden>
                        {r.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatarUrl} alt="" />
                        ) : (
                          r.name.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <span className="mua-history-recip-name">{r.name}</span>
                      {sendingRoom === r.roomId ? (
                        <Loader2
                          size={15}
                          className="mua-history-spin"
                          aria-hidden
                        />
                      ) : (
                        <Check
                          size={15}
                          strokeWidth={2}
                          className="mua-history-recip-go"
                          aria-hidden
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {toast ? <div className="mua-history-toast">{toast}</div> : null}

        <ShopDonDetailModal
          donId={detailId}
          open={Boolean(detailId)}
          onClose={() => setDetailId(null)}
          viewerRole="buyer"
          onDonChange={(next) => {
            setOrders((prev) =>
              prev.map((it) => (it.id === next.id ? { ...it, ...next } : it)),
            );
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
