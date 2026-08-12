"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { adminUpdateShopDangKyMo } from "@/app/admin/mo-shop/actions";
import {
  SHOP_DANG_KY_MO_HINH_THUC_LABEL,
  SHOP_DANG_KY_MO_KENH_LABEL,
  SHOP_DANG_KY_MO_TRANG_THAI,
  SHOP_DANG_KY_MO_TRANG_THAI_LABEL,
  type ShopDangKyMoTrangThai,
} from "@/lib/shop/dang-ky-mo-constants";
import type { ShopDangKyMoAdminItem } from "@/lib/shop/dang-ky-mo-types";

type Props = { item: ShopDangKyMoAdminItem };

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminMoShopDetailScreen({ item }: Props) {
  const [trangThai, setTrangThai] = useState<ShopDangKyMoTrangThai>(
    item.trangThai,
  );
  const [ghiChuNoiBo, setGhiChuNoiBo] = useState(item.ghiChuNoiBo ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave() {
    setMsg(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await adminUpdateShopDangKyMo({
        id: item.id,
        trangThai,
        ghiChuNoiBo,
      });
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setOkMsg("Đã lưu.");
    });
  }

  return (
    <div className="mo-shop-admin">
      <header className="mo-shop-admin-head">
        <div>
          <p className="mo-shop-admin-kicker">
            <Link href="/admin/mo-shop">← Danh sách lead</Link>
          </p>
          <h1 className="mo-shop-admin-title">{item.tenShop}</h1>
          <p className="mo-shop-admin-sub">
            Gửi lúc {fmtDate(item.taoLuc)}
            {item.nguon ? ` · nguồn ${item.nguon}` : ""}
          </p>
        </div>
        <span className={`mo-shop-admin-badge status-${item.trangThai}`}>
          {SHOP_DANG_KY_MO_TRANG_THAI_LABEL[item.trangThai]}
        </span>
      </header>

      <div className="mo-shop-admin-detail-grid">
        <section className="mo-shop-admin-panel">
          <h2 className="mo-shop-admin-panel-title">Thông tin lead</h2>
          <dl className="mo-shop-admin-dl">
            <div>
              <dt>Tên shop</dt>
              <dd>{item.tenShop}</dd>
            </div>
            <div>
              <dt>Mô tả shop</dt>
              <dd className="mo-shop-admin-pre">{item.moTa || "—"}</dd>
            </div>
            <div>
              <dt>Tên gọi</dt>
              <dd>{item.tenLienHe || "—"}</dd>
            </div>
            <div>
              <dt>Hình thức bán</dt>
              <dd>
                {item.hinhThucBan
                  ? SHOP_DANG_KY_MO_HINH_THUC_LABEL[item.hinhThucBan]
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Link MXH bán hàng</dt>
              <dd>
                {item.mxhBanHangLinks.length > 0 ? (
                  <ul className="mo-shop-admin-links">
                    {item.mxhBanHangLinks.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Liên hệ</dt>
              <dd>
                {SHOP_DANG_KY_MO_KENH_LABEL[item.kenhLienHe]} ·{" "}
                {item.lienHeGiaTri}
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                {item.email ? (
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>STK</dt>
              <dd>
                {item.nganHang && item.soTaiKhoan && item.tenChuTk
                  ? `${item.nganHang} · ${item.soTaiKhoan} · ${item.tenChuTk}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Tài khoản CINs</dt>
              <dd>
                {item.daCoTaiKhoan
                  ? item.linkProfileCins || "Có (chưa có link)"
                  : "Chưa có"}
              </dd>
            </div>
            <div>
              <dt>Người giới thiệu</dt>
              <dd>{item.nguoiGioiThieu || "—"}</dd>
            </div>
            <div>
              <dt>Ghi chú từ lead</dt>
              <dd className="mo-shop-admin-pre">{item.ghiChu || "—"}</dd>
            </div>
          </dl>

          <h3 className="mo-shop-admin-panel-sub">Mặt hàng giới thiệu</h3>
          {item.hangGioiThieu.length === 0 ? (
            <p className="mo-shop-admin-muted">Không có mặt hàng.</p>
          ) : (
            <ul className="mo-shop-admin-hang-list">
              {item.hangGioiThieu.map((hang, index) => (
                <li key={`${hang.link}-${index}`} className="mo-shop-admin-hang-item">
                  <p className="mo-shop-admin-hang-mota">
                    {hang.tenMatHang || hang.moTa || `Mặt hàng ${index + 1}`}
                  </p>
                  {hang.tenMatHang && hang.moTa ? (
                    <p className="mo-shop-admin-hang-sub">{hang.moTa}</p>
                  ) : null}
                  {hang.giaBan ? (
                    <p className="mo-shop-admin-hang-sub">Giá: {hang.giaBan}</p>
                  ) : null}
                  <a href={hang.link} target="_blank" rel="noopener noreferrer">
                    {hang.link}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mo-shop-admin-panel-sub">Link hàng (legacy)</h3>
          {item.resourceLinks.length === 0 ? (
            <p className="mo-shop-admin-muted">Không có link.</p>
          ) : (
            <ul className="mo-shop-admin-links">
              {item.resourceLinks.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mo-shop-admin-panel">
          <h2 className="mo-shop-admin-panel-title">Vận hành</h2>

          <label className="mo-shop-admin-field">
            <span>Trạng thái</span>
            <select
              value={trangThai}
              onChange={(e) =>
                setTrangThai(e.target.value as ShopDangKyMoTrangThai)
              }
            >
              {SHOP_DANG_KY_MO_TRANG_THAI.map((t) => (
                <option key={t} value={t}>
                  {SHOP_DANG_KY_MO_TRANG_THAI_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="mo-shop-admin-field">
            <span>Ghi chú nội bộ</span>
            <textarea
              rows={5}
              value={ghiChuNoiBo}
              onChange={(e) => setGhiChuNoiBo(e.target.value)}
              placeholder="Ghi chú xử lý lead…"
              maxLength={4000}
            />
          </label>

          {msg ? (
            <p className="mo-shop-admin-msg" role="alert">
              {msg}
            </p>
          ) : null}
          {okMsg ? (
            <p className="mo-shop-admin-ok" role="status">
              {okMsg}
            </p>
          ) : null}

          <button
            type="button"
            className="mo-shop-admin-btn"
            disabled={pending}
            onClick={onSave}
          >
            {pending ? (
              <>
                <Loader2 size={16} className="mo-shop-admin-spin" aria-hidden />
                Đang lưu…
              </>
            ) : (
              "Lưu cập nhật"
            )}
          </button>

          <p className="mo-shop-admin-muted mo-shop-admin-id">
            ID: {item.id}
            <br />
            Cập nhật lần cuối: {fmtDate(item.capNhatLuc)}
          </p>
        </section>
      </div>
    </div>
  );
}
