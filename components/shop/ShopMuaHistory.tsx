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

import type { ShopDonHang } from "@/lib/shop/types";
import { SHOP_TRANG_THAI_DON_LABEL } from "@/lib/shop/types";

import "./shop-mua-history.css";

type Filter = "all" | "paid" | "unpaid";

type Recipient = {
  roomId: string;
  name: string;
  avatarUrl: string | null;
  isGroup: boolean;
};

function isPaidDon(d: ShopDonHang): boolean {
  return d.trangThai === "da_nhan_tien";
}

function money(n: number, tienTe: string): string {
  return `${n.toLocaleString("vi-VN")} ${tienTe}`;
}

function dateVi(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
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

/** HTML tự chứa để in → "Save as PDF" (giữ dấu tiếng Việt qua font trình duyệt). */
function buildPrintHtml(orders: ShopDonHang[]): string {
  const now = new Date().toLocaleString("vi-VN");
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
            <td class="num">${money(l.giaDonVi, d.tienTe)}</td>
            <td class="num">${money(l.giaDonVi * l.soLuong, d.tienTe)}</td>
          </tr>`,
        )
        .join("");
      return `
      <section class="order">
        <div class="order-hdr">
          <div>
            <strong>${escapeHtml(d.banTen ?? "Cửa hàng")}</strong>
            <span class="ma">Mã ${escapeHtml(d.maDon ?? d.id.slice(0, 8))}</span>
          </div>
          <div class="meta">
            <span class="status ${isPaidDon(d) ? "paid" : "unpaid"}">${
              SHOP_TRANG_THAI_DON_LABEL[d.trangThai]
            }</span>
            <span>${escapeHtml(dateVi(d.taoLuc))}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Sản phẩm</th><th class="num">SL</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" class="num">Tổng</td><td class="num total">${money(
              d.tongTien,
              d.tienTe,
            )}</td></tr>
          </tfoot>
        </table>
      </section>`;
    })
    .join("");
  const grandTotal = orders.reduce((s, d) => s + d.tongTien, 0);
  const tienTe = orders[0]?.tienTe ?? "VND";
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
  <title>Lịch sử mua hàng</title>
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
    <h1>Lịch sử mua hàng</h1>
    <p class="sub">${orders.length} đơn · Xuất ${escapeHtml(now)}</p>
    ${blocks}
    <p class="grand">Tổng cộng: ${money(grandTotal, tienTe)}</p>
  </body></html>`;
}

function buildShareText(orders: ShopDonHang[]): string {
  const lines: string[] = [`Lịch sử mua hàng — ${orders.length} đơn:`];
  orders.forEach((d, i) => {
    lines.push(
      `${i + 1}. [${d.maDon ?? d.id.slice(0, 8)}] ${d.banTen ?? "Cửa hàng"} — ${money(
        d.tongTien,
        d.tienTe,
      )} — ${SHOP_TRANG_THAI_DON_LABEL[d.trangThai]} · ${dateVi(d.taoLuc)}`,
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

  useEffect(() => setPortalReady(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/don?role=buyer", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: ShopDonHang[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải lịch sử.");
        return;
      }
      setOrders(json?.items ?? []);
    } catch {
      setErr("Không tải lịch sử.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setToast("Trình duyệt chặn cửa sổ in — cho phép popup rồi thử lại.");
      return;
    }
    w.document.write(buildPrintHtml(selectedOrders));
    w.document.close();
    w.focus();
  }, [selectedOrders]);

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
        .filter((t) => Boolean(t.roomId))
        .map((t) => ({
          roomId: t.roomId,
          name: t.isSelf ? "Gửi cho tôi" : t.name,
          avatarUrl: t.avatarUrl ?? null,
          isGroup: Boolean(t.isGroup),
        }));
      setRecipients(list);
    } catch {
      setRecipients([]);
    } finally {
      setRecipLoading(false);
    }
  }, []);

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
          body: JSON.stringify({ noi_dung: buildShareText(selectedOrders) }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setToast(j?.error ?? "Gửi thất bại.");
          return;
        }
        setToast(`Đã chia sẻ ${selectedOrders.length} đơn cho ${r.name}.`);
        setShareOpen(false);
      } catch {
        setToast("Gửi thất bại.");
      } finally {
        setSendingRoom(null);
      }
    },
    [selectedOrders],
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
        aria-label="Lịch sử mua hàng"
      >
        <header className="mua-history-hdr">
          <div>
            <p className="mua-history-kicker">Lịch sử mua hàng</p>
            <h2>Đơn của bạn</h2>
          </div>
          <button
            type="button"
            className="mua-history-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="mua-history-tabs" role="tablist">
          {(
            [
              ["all", "Tất cả"],
              ["unpaid", "Chưa thanh toán"],
              ["paid", "Đã thanh toán"],
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
            Chọn tất cả
          </button>
          <span className="mua-history-selcount">
            {selCount > 0 ? `Đã chọn ${selCount}` : ""}
          </span>
          <div className="mua-history-actions">
            <button
              type="button"
              className="mua-history-action"
              disabled={selCount === 0}
              onClick={openShare}
            >
              <Share2 size={15} strokeWidth={2} aria-hidden />
              Chia sẻ{selCount > 0 ? ` (${selCount})` : ""}
            </button>
            <button
              type="button"
              className="mua-history-action"
              disabled={selCount === 0}
              onClick={exportPdf}
            >
              <FileDown size={15} strokeWidth={2} aria-hidden />
              Xuất PDF{selCount > 0 ? ` (${selCount})` : ""}
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
              <Loader2 size={16} className="mua-history-spin" aria-hidden /> Đang
              tải…
            </p>
          ) : filtered.length === 0 ? (
            <div className="mua-history-empty">
              <Package size={26} strokeWidth={1.6} aria-hidden />
              <p>Chưa có đơn nào.</p>
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
                    aria-label={checked ? "Bỏ chọn đơn" : "Chọn đơn"}
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
                        {d.banTen ?? "Cửa hàng"}
                      </span>
                      <span
                        className={`mua-history-status ${paid ? "is-paid" : "is-unpaid"}`}
                      >
                        {SHOP_TRANG_THAI_DON_LABEL[d.trangThai]}
                      </span>
                    </div>
                    <div className="mua-history-order-sub">
                      <span>Mã {d.maDon ?? d.id.slice(0, 8)}</span>
                      <span>·</span>
                      <span>{dateVi(d.taoLuc)}</span>
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
                            {money(l.giaDonVi * l.soLuong, d.tienTe)}
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
                          Biên lai
                        </a>
                      ) : (
                        <span />
                      )}
                      <strong className="mua-history-order-total">
                        {money(d.tongTien, d.tienTe)}
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
            aria-label="Chọn người nhận"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShareOpen(false);
            }}
          >
            <div className="mua-history-share-card">
              <header className="mua-history-share-hdr">
                <div>
                  <p className="mua-history-kicker">Chia sẻ qua chat</p>
                  <h3>Gửi {selectedOrders.length} đơn cho…</h3>
                </div>
                <button
                  type="button"
                  className="mua-history-close"
                  aria-label="Đóng"
                  onClick={() => setShareOpen(false)}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </header>
              <label className="mua-history-search">
                <Search size={15} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  placeholder="Tìm hội thoại…"
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
                    Đang tải hội thoại…
                  </p>
                ) : filteredRecipients.length === 0 ? (
                  <p className="mua-history-muted">
                    Chưa có hội thoại nào để chia sẻ.
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
      </div>
    </div>,
    document.body,
  );
}
