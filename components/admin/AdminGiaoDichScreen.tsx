"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  AdminGiaoDichTab,
  AdminShopDonRow,
} from "@/lib/admin/shop-giao-dich";

type Props = {
  tab: AdminGiaoDichTab;
  items: AdminShopDonRow[];
  total: number;
  page: number;
  pageSize: number;
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
  total,
  page,
  pageSize,
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
            Đơn shop UGC (CINs không cầm tiền). Tab bằng chứng lưu snapshot khi
            người mua tick chấp nhận rủi ro chuyển khoản.
          </p>
        </div>
      </header>

      <nav className="admin-bai-viet-tabs" aria-label="Phân loại giao dịch">
        <Link
          href="/admin/giao-dich"
          className={`admin-bai-viet-tab${tab === "don" ? " is-active" : ""}`}
          aria-current={tab === "don" ? "page" : undefined}
        >
          Đơn hàng
        </Link>
        <Link
          href="/admin/giao-dich?tab=chap-nhan"
          className={`admin-bai-viet-tab${tab === "chap-nhan" ? " is-active" : ""}`}
          aria-current={tab === "chap-nhan" ? "page" : undefined}
        >
          Bằng chứng chấp nhận
        </Link>
      </nav>

      {items.length === 0 ? (
        <p className="admin-table-empty">
          {tab === "chap-nhan"
            ? "Chưa có đơn nào có snapshot chấp nhận rủi ro."
            : "Chưa có đơn hàng."}
        </p>
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
                  <th>
                    {tab === "chap-nhan" ? "Chấp nhận" : "Tạo lúc"}
                  </th>
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
                      <td>
                        {fmtDate(
                          tab === "chap-nhan"
                            ? row.nguoiMuaChapNhanLuc
                            : row.taoLuc,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 ? (
              <div className="admin-gd-pager">
                {page > 1 ? (
                  <Link
                    href={
                      tab === "chap-nhan"
                        ? `/admin/giao-dich?tab=chap-nhan&page=${page - 1}`
                        : `/admin/giao-dich?page=${page - 1}`
                    }
                  >
                    ← Trước
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  Trang {page}/{totalPages} · {total} đơn
                </span>
                {page < totalPages ? (
                  <Link
                    href={
                      tab === "chap-nhan"
                        ? `/admin/giao-dich?tab=chap-nhan&page=${page + 1}`
                        : `/admin/giao-dich?page=${page + 1}`
                    }
                  >
                    Sau →
                  </Link>
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
