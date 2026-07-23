"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  AdminGiaoDichTab,
  AdminShopDonRow,
  AdminShopListingRow,
} from "@/lib/admin/shop-giao-dich";

type Props = {
  tab: AdminGiaoDichTab;
  items: AdminShopDonRow[];
  shops: AdminShopListingRow[];
  total: number;
  page: number;
  pageSize: number;
  tongDoanhThu?: number;
  tongGiaoDich?: number;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(n: number, tienTe: string): string {
  return `${n.toLocaleString("vi-VN")} ${tienTe}`;
}

function tabHref(tab: AdminGiaoDichTab, page?: number): string {
  const params = new URLSearchParams();
  if (tab !== "don") params.set("tab", tab);
  if (page != null && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/giao-dich?${qs}` : "/admin/giao-dich";
}

function UserCell({
  ten,
  slug,
}: {
  ten: string | null;
  slug: string | null;
}) {
  if (slug) {
    return (
      <Link href={`/${slug}`} className="admin-gd-user-link">
        {ten || `@${slug}`}
      </Link>
    );
  }
  return <span>{ten || "—"}</span>;
}

export function AdminGiaoDichScreen({
  tab,
  items,
  shops,
  total,
  page,
  pageSize,
  tongDoanhThu = 0,
  tongGiaoDich = 0,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <header className="page-header admin-bai-viet-header">
        <div className="admin-bai-viet-header__copy">
          <h1 className="page-title">Quản lý giao dịch</h1>
          <p className="page-subtitle">
            Đơn shop UGC (CINs không cầm tiền). Snapshot chấp nhận rủi ro hiện
            trong chi tiết từng đơn.
          </p>
        </div>
      </header>

      <nav className="admin-bai-viet-tabs" aria-label="Phân loại giao dịch">
        <Link
          href={tabHref("don")}
          className={`admin-bai-viet-tab${tab === "don" ? " is-active" : ""}`}
          aria-current={tab === "don" ? "page" : undefined}
        >
          Đơn hàng
        </Link>
        <Link
          href={tabHref("shop")}
          className={`admin-bai-viet-tab${tab === "shop" ? " is-active" : ""}`}
          aria-current={tab === "shop" ? "page" : undefined}
        >
          Shop
        </Link>
      </nav>

      {tab === "shop" ? (
        <>
          <div className="admin-gd-shop-summary" aria-label="Tổng quan shop">
            <div className="admin-gd-shop-stat">
              <span className="admin-gd-shop-stat-k">Số shop</span>
              <strong>{total.toLocaleString("vi-VN")}</strong>
            </div>
            <div className="admin-gd-shop-stat">
              <span className="admin-gd-shop-stat-k">Doanh thu hoàn tất</span>
              <strong>{fmtMoney(tongDoanhThu, "VND")}</strong>
              <span className="admin-gd-shop-stat-hint">
                Đã nhận tiền / đã giao tại sự kiện
              </span>
            </div>
            <div className="admin-gd-shop-stat">
              <span className="admin-gd-shop-stat-k">Tổng giao dịch</span>
              <strong>{fmtMoney(tongGiaoDich, "VND")}</strong>
              <span className="admin-gd-shop-stat-hint">
                Mọi đơn không nháp / hủy
              </span>
            </div>
          </div>

          {shops.length === 0 ? (
            <p className="admin-table-empty">
              Chưa có shop đủ điều kiện (bật bán hàng + STK chuyển khoản + có
              hàng đang bán).
            </p>
          ) : (
            <div className="admin-gd-table-wrap">
              <table className="admin-table admin-gd-shop-table">
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Chủ shop</th>
                    <th>Đơn</th>
                    <th>Hoàn tất</th>
                    <th>Doanh thu</th>
                    <th>Tổng giao dịch</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop.id}>
                      <td>
                        <div className="admin-gd-shop-name">
                          {shop.shopHref ? (
                            <Link
                              href={shop.shopHref}
                              className="admin-gd-user-link"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {shop.ten || "Shop chưa đặt tên"}
                            </Link>
                          ) : (
                            <strong>{shop.ten || "Shop chưa đặt tên"}</strong>
                          )}
                        </div>
                      </td>
                      <td>
                        <UserCell ten={shop.owner.ten} slug={shop.owner.slug} />
                      </td>
                      <td className="admin-gd-num">{shop.soDon}</td>
                      <td className="admin-gd-num">{shop.soDonHoanTat}</td>
                      <td className="admin-gd-num">
                        {fmtMoney(shop.doanhThu, shop.tienTe)}
                      </td>
                      <td className="admin-gd-num">
                        {fmtMoney(shop.tongGiaoDich, shop.tienTe)}
                      </td>
                      <td>
                        {shop.tamDong ? (
                          <span className="admin-gd-badge is-pause">Tạm đóng</span>
                        ) : (
                          <span className="admin-gd-badge is-ok">Đang mở</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 ? (
                <div className="admin-gd-pager">
                  {page > 1 ? (
                    <Link href={tabHref("shop", page - 1)}>← Trước</Link>
                  ) : (
                    <span />
                  )}
                  <span>
                    Trang {page}/{totalPages} · {total} shop
                  </span>
                  {page < totalPages ? (
                    <Link href={tabHref("shop", page + 1)}>Sau →</Link>
                  ) : (
                    <span />
                  )}
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : items.length === 0 ? (
        <p className="admin-table-empty">Chưa có đơn hàng.</p>
      ) : (
        <div className="admin-gd-layout">
          <div className="admin-gd-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Đơn</th>
                  <th>Mua / Bán</th>
                  <th>Loại</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                  <th>Tạo lúc</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const active = selected?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`admin-table-row--clickable${active ? " admin-table-row--active" : ""}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td>
                        <code className="admin-gd-id">
                          #{row.id.slice(0, 8)}
                        </code>
                      </td>
                      <td>
                        <div className="admin-table-sub">
                          <UserCell ten={row.mua.ten} slug={row.mua.slug} />
                          <span aria-hidden> → </span>
                          <UserCell ten={row.ban.ten} slug={row.ban.slug} />
                        </div>
                      </td>
                      <td>{row.loaiDonLabel}</td>
                      <td>{fmtMoney(row.tongTien, row.tienTe)}</td>
                      <td>{row.trangThaiLabel}</td>
                      <td>{fmtDate(row.taoLuc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 ? (
              <div className="admin-gd-pager">
                {page > 1 ? (
                  <Link href={tabHref(tab, page - 1)}>← Trước</Link>
                ) : (
                  <span />
                )}
                <span>
                  Trang {page}/{totalPages} · {total} đơn
                </span>
                {page < totalPages ? (
                  <Link href={tabHref(tab, page + 1)}>Sau →</Link>
                ) : (
                  <span />
                )}
              </div>
            ) : null}
          </div>

          <aside className="admin-gd-detail" aria-live="polite">
            {!selected ? (
              <p className="admin-gd-detail-empty">Chọn một đơn để xem chi tiết.</p>
            ) : (
              <>
                <h2>Đơn #{selected.id.slice(0, 8)}</h2>
                <dl className="admin-gd-dl">
                  <div>
                    <dt>Người mua</dt>
                    <dd>
                      <UserCell ten={selected.mua.ten} slug={selected.mua.slug} />
                    </dd>
                  </div>
                  <div>
                    <dt>Người bán</dt>
                    <dd>
                      <UserCell ten={selected.ban.ten} slug={selected.ban.slug} />
                    </dd>
                  </div>
                  <div>
                    <dt>Loại / trạng thái</dt>
                    <dd>
                      {selected.loaiDonLabel} · {selected.trangThaiLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>Tổng</dt>
                    <dd>{fmtMoney(selected.tongTien, selected.tienTe)}</dd>
                  </div>
                  <div>
                    <dt>Tạo lúc</dt>
                    <dd>{fmtDate(selected.taoLuc)}</dd>
                  </div>
                </dl>

                <h3>Sản phẩm</h3>
                <ul className="admin-gd-lines">
                  {selected.dong.map((d, i) => (
                    <li key={`${selected.id}-${i}`}>
                      {d.tenSnapshot}
                      {d.nhanSnapshot ? ` (${d.nhanSnapshot})` : ""} ×{d.soLuong}{" "}
                      — {fmtMoney(d.giaDonVi, selected.tienTe)}
                    </li>
                  ))}
                </ul>

                <h3>Bằng chứng chấp nhận rủi ro</h3>
                {selected.nguoiMuaChapNhanLuc ? (
                  <div className="admin-gd-evidence">
                    <p>
                      <strong>Thời điểm:</strong>{" "}
                      {fmtDate(selected.nguoiMuaChapNhanLuc)}
                    </p>
                    <p>
                      <strong>Phiên bản:</strong>{" "}
                      {selected.nguoiMuaChapNhanPhienBan || "—"}
                    </p>
                    <blockquote className="admin-gd-quote">
                      {selected.nguoiMuaChapNhanVanBan || "(Không có văn bản)"}
                    </blockquote>
                  </div>
                ) : (
                  <p className="admin-gd-missing">
                    Đơn này không có snapshot chấp nhận (đơn cũ hoặc không phải
                    mua ngay / chuyển khoản).
                  </p>
                )}

                {selected.hoaDonAnhUrl ? (
                  <>
                    <h3>Ảnh biên lai (người mua)</h3>
                    <a
                      href={selected.hoaDonAnhUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-gd-receipt"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.hoaDonAnhUrl} alt="Biên lai thanh toán" />
                    </a>
                  </>
                ) : null}

                {selected.ghiChu ? (
                  <>
                    <h3>Ghi chú đơn</h3>
                    <pre className="admin-gd-note">{selected.ghiChu}</pre>
                  </>
                ) : null}
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
