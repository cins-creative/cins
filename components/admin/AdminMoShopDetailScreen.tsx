"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";

import { AdminMoShopGoDialog } from "@/components/admin/AdminMoShopGoDialog";
import {
  adminGoShopDangKyMo,
  adminUpdateShopDangKyMo,
} from "@/app/admin/mo-shop/actions";
import {
  SHOP_DANG_KY_MO_HINH_THUC_LABEL,
  SHOP_DANG_KY_MO_KENH_LABEL,
  SHOP_DANG_KY_MO_LOAI_HANG_LABEL,
  SHOP_DANG_KY_MO_TRANG_THAI,
  SHOP_DANG_KY_MO_TRANG_THAI_LABEL,
  type ShopDangKyMoLoaiHang,
  type ShopDangKyMoTrangThai,
} from "@/lib/shop/dang-ky-mo-constants";
import type { ShopDangKyMoAdminItem } from "@/lib/shop/dang-ky-mo-types";

type Props = { item: ShopDangKyMoAdminItem };

function linkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("facebook.com")) return "Facebook";
    if (host === "x.com" || host.includes("twitter.com")) return "X";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("tiktok.com")) return "TikTok";
    if (host.includes("drive.google.com")) return "Google Drive";
    if (host.includes("discord.com") || host.includes("discord.gg")) {
      return "Discord";
    }
    return host;
  } catch {
    return url;
  }
}

function Fact({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  if (children == null || children === false || children === "") return null;
  return (
    <div className="mo-shop-admin-fact">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function OutLink({ href }: { href: string }) {
  return (
    <a
      className="mo-shop-admin-link-chip"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {linkLabel(href)}
      <ExternalLink size={12} aria-hidden />
    </a>
  );
}

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
  const router = useRouter();
  const [trangThai, setTrangThai] = useState<ShopDangKyMoTrangThai>(
    item.trangThai,
  );
  const [ghiChuNoiBo, setGhiChuNoiBo] = useState(item.ghiChuNoiBo ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [going, setGoing] = useState(false);
  const [goOpen, setGoOpen] = useState(false);
  const [goError, setGoError] = useState<string | null>(null);

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

  function confirmGo() {
    if (pending || going) return;
    setMsg(null);
    setOkMsg(null);
    setGoError(null);
    setGoing(true);
    startTransition(async () => {
      const res = await adminGoShopDangKyMo(item.id);
      if (!res.ok) {
        setGoing(false);
        setGoError(res.message);
        return;
      }
      router.push("/admin/mo-shop");
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

          {item.moTa || item.hinhThucBan || item.loaiHang.length > 0 ? (
            <div className="mo-shop-admin-block">
              <h3 className="mo-shop-admin-block-title">Shop</h3>
              {item.moTa ? (
                <p className="mo-shop-admin-pre mo-shop-admin-block-copy">
                  {item.moTa}
                </p>
              ) : null}
              <div className="mo-shop-admin-facts">
                {item.hinhThucBan ? (
                  <Fact label="Hình thức bán">
                    {SHOP_DANG_KY_MO_HINH_THUC_LABEL[item.hinhThucBan]}
                  </Fact>
                ) : null}
                {item.loaiHang.length > 0 ? (
                  <Fact label="Loại hàng">
                    <span className="mo-shop-admin-pills">
                      {item.loaiHang.map((loai) => (
                        <span key={loai} className="mo-shop-admin-pill">
                          {SHOP_DANG_KY_MO_LOAI_HANG_LABEL[
                            loai as ShopDangKyMoLoaiHang
                          ] ?? loai}
                        </span>
                      ))}
                    </span>
                  </Fact>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mo-shop-admin-block">
            <h3 className="mo-shop-admin-block-title">Liên hệ</h3>
            <div className="mo-shop-admin-facts">
              <Fact label="Tên gọi">{item.tenLienHe}</Fact>
              <Fact label="Kênh">
                {SHOP_DANG_KY_MO_KENH_LABEL[item.kenhLienHe]}
              </Fact>
              <Fact label="Giá trị">
                {item.lienHeGiaTri.startsWith("http") ? (
                  <OutLink href={item.lienHeGiaTri} />
                ) : (
                  item.lienHeGiaTri
                )}
              </Fact>
              <Fact label="Email">
                {item.email ? (
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                ) : null}
              </Fact>
            </div>
            {item.mxhBanHangLinks.length > 0 ? (
              <div className="mo-shop-admin-chip-row">
                {item.mxhBanHangLinks.map((url) => (
                  <OutLink key={url} href={url} />
                ))}
              </div>
            ) : null}
          </div>

          {item.nganHang && item.soTaiKhoan && item.tenChuTk ? (
            <div className="mo-shop-admin-block">
              <h3 className="mo-shop-admin-block-title">Thanh toán</h3>
              <div className="mo-shop-admin-facts">
                <Fact label="Ngân hàng">{item.nganHang}</Fact>
                <Fact label="Số TK">{item.soTaiKhoan}</Fact>
                <Fact label="Chủ TK">{item.tenChuTk}</Fact>
              </div>
            </div>
          ) : null}

          <div className="mo-shop-admin-block">
            <h3 className="mo-shop-admin-block-title">CINs</h3>
            <div className="mo-shop-admin-facts">
              <Fact label="Tài khoản">
                {item.daCoTaiKhoan ? (
                  item.linkProfileCins ? (
                    <OutLink href={item.linkProfileCins} />
                  ) : (
                    "Có — chưa có link"
                  )
                ) : (
                  "Chưa có"
                )}
              </Fact>
              <Fact label="Người GT">{item.nguoiGioiThieu}</Fact>
            </div>
          </div>

          {item.ghiChu ? (
            <div className="mo-shop-admin-block">
              <h3 className="mo-shop-admin-block-title">Ghi chú từ lead</h3>
              <p className="mo-shop-admin-pre mo-shop-admin-block-copy">
                {item.ghiChu}
              </p>
            </div>
          ) : null}

          <div className="mo-shop-admin-block">
            <h3 className="mo-shop-admin-block-title">
              Mặt hàng giới thiệu
              {item.hangGioiThieu.length > 0 ? (
                <span>{item.hangGioiThieu.length}</span>
              ) : null}
            </h3>
            {item.hangGioiThieu.length === 0 ? (
              <p className="mo-shop-admin-muted">Không có mặt hàng.</p>
            ) : (
              <ul className="mo-shop-admin-hang-list">
                {item.hangGioiThieu.map((hang, index) => (
                  <li
                    key={`${hang.link}-${index}`}
                    className="mo-shop-admin-hang-item"
                  >
                    <div className="mo-shop-admin-hang-top">
                      <p className="mo-shop-admin-hang-mota">
                        {hang.tenMatHang || hang.moTa || `Mặt hàng ${index + 1}`}
                      </p>
                      {hang.giaBan ? (
                        <span className="mo-shop-admin-hang-price">
                          {hang.giaBan}
                        </span>
                      ) : null}
                    </div>
                    {hang.tenMatHang && hang.moTa ? (
                      <p className="mo-shop-admin-hang-sub">{hang.moTa}</p>
                    ) : null}
                    {hang.link ? <OutLink href={hang.link} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
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

          <div className="mo-shop-admin-panel-actions">
            <button
              type="button"
              className="mo-shop-admin-btn"
              disabled={pending || going}
              onClick={onSave}
            >
              {pending && !going ? (
                <>
                  <Loader2 size={16} className="mo-shop-admin-spin" aria-hidden />
                  Đang lưu…
                </>
              ) : (
                "Lưu cập nhật"
              )}
            </button>

            <button
              type="button"
              className="mo-shop-admin-btn mo-shop-admin-btn--ghost mo-shop-admin-btn--danger"
              disabled={pending || going}
              onClick={() => {
                setGoError(null);
                setGoOpen(true);
              }}
            >
              {going ? (
                <>
                  <Loader2 size={16} className="mo-shop-admin-spin" aria-hidden />
                  Đang gỡ…
                </>
              ) : (
                "Gỡ khỏi danh sách"
              )}
            </button>
          </div>

          <p className="mo-shop-admin-muted mo-shop-admin-id">
            ID: {item.id}
            <br />
            Cập nhật lần cuối: {fmtDate(item.capNhatLuc)}
          </p>
        </section>
      </div>

      <AdminMoShopGoDialog
        open={goOpen}
        tenShop={item.tenShop.trim()}
        confirming={going}
        error={goError}
        onClose={() => {
          if (going) return;
          setGoOpen(false);
          setGoError(null);
        }}
        onConfirm={confirmGo}
      />
    </div>
  );
}
