"use client";

import Link from "next/link";
import {
  CreditCard,
  Link2,
  Loader2,
  Send,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import {
  SHOP_DANG_KY_MO_HINH_THUC,
  SHOP_DANG_KY_MO_KENH,
  SHOP_DANG_KY_MO_KENH_LABEL,
  type ShopDangKyMoHinhThuc,
  type ShopDangKyMoKenh,
} from "@/lib/shop/dang-ky-mo-constants";

type Props = {
  initialGt: string;
  initialTu: string;
};

type ThankYou = {
  kenhLienHe: ShopDangKyMoKenh;
  lienHeGiaTri: string;
};

const HINH_THUC_LABEL: Record<ShopDangKyMoHinhThuc, string> = {
  co_san: "Có sẵn",
  preorder: "Preorder",
  ca_hai: "Cả hai",
};

function lienHePlaceholder(kenh: ShopDangKyMoKenh): string {
  switch (kenh) {
    case "email":
      return "email@…";
    case "zalo":
      return "Số Zalo của bạn";
    case "messenger":
      return "Tài khoản Facebook";
    case "instagram":
      return "@username hoặc link IG";
    case "discord":
      return "Username Discord";
    default:
      return "Username / link / SĐT";
  }
}

function FormSectionHead({
  id,
  step,
  icon: Icon,
  title,
  lead,
}: {
  id: string;
  step: number;
  icon: LucideIcon;
  title: string;
  lead: string;
}) {
  return (
    <div className="mo-shop-section-head">
      <div className="mo-shop-section-head-icon" aria-hidden>
        <Icon size={18} strokeWidth={2.1} />
      </div>
      <div className="mo-shop-section-head-text">
        <p className="mo-shop-section-head-step">Bước {step}</p>
        <h2 id={id} className="mo-shop-section-head-title">
          {title}
        </h2>
        <p className="mo-shop-section-head-lead">{lead}</p>
      </div>
    </div>
  );
}

function SubSectionHead({
  icon: Icon,
  title,
  required,
}: {
  icon: LucideIcon;
  title: string;
  required?: boolean;
}) {
  return (
    <p className="mo-shop-subhead">
      <span className="mo-shop-subhead-icon" aria-hidden>
        <Icon size={15} strokeWidth={2.1} />
      </span>
      <span className="mo-shop-subhead-text">
        {title}
        {required ? (
          <>
            {" "}
            <span className="mo-shop-req">*</span>
          </>
        ) : null}
      </span>
    </p>
  );
}

export function MoShopForm({ initialGt, initialTu }: Props) {
  const openedAt = useMemo(() => Date.now(), []);
  const [tenShop, setTenShop] = useState("");
  const [tenLienHe, setTenLienHe] = useState("");
  const [hinhThucBan, setHinhThucBan] = useState<ShopDangKyMoHinhThuc | "">(
    "",
  );
  const [resourceLinksText, setResourceLinksText] = useState("");
  const [kenhLienHe, setKenhLienHe] = useState<ShopDangKyMoKenh>("zalo");
  const [lienHeGiaTri, setLienHeGiaTri] = useState("");
  const [email, setEmail] = useState("");
  const [nganHang, setNganHang] = useState("");
  const [soTaiKhoan, setSoTaiKhoan] = useState("");
  const [tenChuTk, setTenChuTk] = useState("");
  const [daCoTaiKhoan, setDaCoTaiKhoan] = useState(false);
  const [linkProfileCins, setLinkProfileCins] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [dongY, setDongY] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thankYou, setThankYou] = useState<ThankYou | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dongY) {
      setError("Bạn cần tick đồng ý ở cuối form trước khi gửi.");
      return;
    }
    if (!nganHang.trim() || !soTaiKhoan.trim() || !tenChuTk.trim()) {
      setError("Vui lòng điền đủ thông tin tài khoản ngân hàng nhận tiền.");
      return;
    }
    setSubmitting(true);
    try {
      const nguonParts = [
        initialTu ? `tu=${initialTu}` : null,
        initialGt ? `gt=${initialGt}` : null,
      ].filter(Boolean);
      const res = await fetch("/api/mo-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenShop,
          tenLienHe: tenLienHe || null,
          loaiHang: [],
          hinhThucBan: hinhThucBan || null,
          resourceLinksText,
          ghiChu: ghiChu || null,
          kenhLienHe,
          lienHeGiaTri,
          email,
          nganHang,
          soTaiKhoan,
          tenChuTk,
          daCoTaiKhoan,
          linkProfileCins: linkProfileCins || null,
          nguoiGioiThieu: initialGt || null,
          dongYDieuKhoan: dongY,
          dongYDungAnh: dongY,
          nguon: nguonParts.length ? nguonParts.join("&") : null,
          openedAt,
          website,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        kenhLienHe?: ShopDangKyMoKenh;
        lienHeGiaTri?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Gửi không được — thử lại sau nhé.");
        return;
      }
      setThankYou({
        kenhLienHe: data.kenhLienHe ?? kenhLienHe,
        lienHeGiaTri: data.lienHeGiaTri ?? lienHeGiaTri,
      });
    } catch {
      setError("Mạng đang lỗi — thử lại sau nhé.");
    } finally {
      setSubmitting(false);
    }
  }

  if (thankYou) {
    const kenhLabel = SHOP_DANG_KY_MO_KENH_LABEL[thankYou.kenhLienHe];
    return (
      <div className="mo-shop-notice mo-shop-thanks" role="status">
        <p className="mo-shop-notice-kicker">Đã gửi</p>
        <h2 className="mo-shop-thanks-title">
          Cảm ơn bạn đã gửi thông tin cho CINs
        </h2>
        <p className="mo-shop-thanks-body">
          Sau khi xong, mình sẽ chủ động liên hệ để bạn preview shop của mình
          nhé.
        </p>
        <p className="mo-shop-thanks-note">
          Mình sẽ nhắn qua{" "}
          <strong>
            {kenhLabel} · {thankYou.lienHeGiaTri}
          </strong>
          . Không phải email tự động — nếu lâu chưa thấy tin thì nhắn lại đúng
          kênh này.
        </p>
      </div>
    );
  }

  return (
    <div className="mo-shop-panel">
      <form className="mo-shop-form" onSubmit={onSubmit} noValidate>
        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s1">
          <FormSectionHead
            id="mo-shop-s1"
            step={1}
            icon={Store}
            title="Shop"
            lead="Tên hiển thị và cách bạn thường bán."
          />

          <label className="mo-shop-field">
            <span className="mo-shop-label">
              Tên shop <span className="mo-shop-req">*</span>
            </span>
            <input
              className="mo-shop-input"
              name="tenShop"
              autoComplete="organization"
              required
              maxLength={120}
              value={tenShop}
              onChange={(e) => setTenShop(e.target.value)}
              placeholder="VD: Atelier Mochi, Shop của Lan…"
            />
          </label>

          <label className="mo-shop-field">
            <span className="mo-shop-label">
              Tên để gọi{" "}
              <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            <input
              className="mo-shop-input"
              name="tenLienHe"
              autoComplete="name"
              maxLength={120}
              value={tenLienHe}
              onChange={(e) => setTenLienHe(e.target.value)}
              placeholder="Nếu khác tên shop"
            />
          </label>

          <div className="mo-shop-field">
            <span className="mo-shop-label">
              Hình thức bán{" "}
              <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            <div
              className="mo-shop-chips"
              role="radiogroup"
              aria-label="Hình thức bán"
            >
              {SHOP_DANG_KY_MO_HINH_THUC.map((id) => {
                const active = hinhThucBan === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`mo-shop-chip${active ? " is-active" : ""}`}
                    aria-pressed={active}
                    onClick={() =>
                      setHinhThucBan((prev) => (prev === id ? "" : id))
                    }
                  >
                    {HINH_THUC_LABEL[id]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s2">
          <FormSectionHead
            id="mo-shop-s2"
            step={2}
            icon={Link2}
            title="Link hàng"
            lead="Album, Drive, Carrd, IG, Shopee… — mỗi dòng một link. CINs lấy ảnh từ đó."
          />

          <label className="mo-shop-field">
            <span className="mo-shop-label">
              Link <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            <textarea
              className="mo-shop-textarea"
              name="resourceLinks"
              rows={4}
              maxLength={8000}
              value={resourceLinksText}
              onChange={(e) => setResourceLinksText(e.target.value)}
              placeholder={
                "https://drive.google.com/…\nhttps://facebook.com/album/…"
              }
            />
            <span className="mo-shop-hint">
              Chưa có link public — để trống, CINs nhắn xin ảnh sau.
            </span>
          </label>
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s3">
          <FormSectionHead
            id="mo-shop-s3"
            step={3}
            icon={Wallet}
            title="Liên hệ & nhận tiền"
            lead="Kênh nhắn khi shop nháp xong. STK gắn vào shop — khách chuyển thẳng cho bạn."
          />

          <div className="mo-shop-field">
            <span className="mo-shop-label">
              Nhắn qua <span className="mo-shop-req">*</span>
            </span>
            <div className="mo-shop-kenh-row">
              <select
                className="mo-shop-select"
                name="kenhLienHe"
                value={kenhLienHe}
                onChange={(e) =>
                  setKenhLienHe(e.target.value as ShopDangKyMoKenh)
                }
                aria-label="Chọn kênh liên hệ"
              >
                {SHOP_DANG_KY_MO_KENH.map((k) => (
                  <option key={k} value={k}>
                    {SHOP_DANG_KY_MO_KENH_LABEL[k]}
                  </option>
                ))}
              </select>
              <input
                className="mo-shop-input"
                name="lienHeGiaTri"
                required
                maxLength={200}
                value={lienHeGiaTri}
                onChange={(e) => setLienHeGiaTri(e.target.value)}
                placeholder={lienHePlaceholder(kenhLienHe)}
              />
            </div>
          </div>

          <label className="mo-shop-field">
            <span className="mo-shop-label">
              Email <span className="mo-shop-req">*</span>
            </span>
            <input
              className="mo-shop-input"
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Bàn giao shop về tài khoản CINs"
            />
          </label>

          <div className="mo-shop-stk">
            <SubSectionHead
              icon={CreditCard}
              title="Tài khoản ngân hàng"
              required
            />
            <div className="mo-shop-stk-grid">
              <label className="mo-shop-field">
                <span className="mo-shop-label">Ngân hàng</span>
                <input
                  className="mo-shop-input"
                  name="nganHang"
                  required
                  maxLength={120}
                  value={nganHang}
                  onChange={(e) => setNganHang(e.target.value)}
                  placeholder="VD: Vietcombank"
                />
              </label>
              <label className="mo-shop-field">
                <span className="mo-shop-label">Số tài khoản</span>
                <input
                  className="mo-shop-input"
                  name="soTaiKhoan"
                  required
                  inputMode="numeric"
                  maxLength={40}
                  value={soTaiKhoan}
                  onChange={(e) => setSoTaiKhoan(e.target.value)}
                />
              </label>
              <label className="mo-shop-field mo-shop-field--span">
                <span className="mo-shop-label">Tên chủ tài khoản</span>
                <input
                  className="mo-shop-input"
                  name="tenChuTk"
                  required
                  maxLength={120}
                  value={tenChuTk}
                  onChange={(e) => setTenChuTk(e.target.value)}
                  placeholder="Viết hoa, không dấu"
                />
              </label>
            </div>
          </div>

          <label className="mo-shop-check">
            <input
              type="checkbox"
              checked={daCoTaiKhoan}
              onChange={(e) => setDaCoTaiKhoan(e.target.checked)}
            />
            <span>Đã có tài khoản CINs</span>
          </label>
          {daCoTaiKhoan ? (
            <label className="mo-shop-field">
              <span className="mo-shop-label">Link profile CINs</span>
              <input
                className="mo-shop-input"
                name="linkProfileCins"
                maxLength={500}
                value={linkProfileCins}
                onChange={(e) => setLinkProfileCins(e.target.value)}
                placeholder="https://cins.vn/ten-ban"
              />
            </label>
          ) : null}

          <label className="mo-shop-field">
            <span className="mo-shop-label">
              Ghi chú <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            <textarea
              className="mo-shop-textarea mo-shop-textarea--short"
              name="ghiChu"
              rows={2}
              maxLength={2000}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Điều gì form chưa hỏi — cứ viết thêm"
            />
          </label>
        </section>

        <section className="mo-shop-form-section mo-shop-form-section--submit">
          <FormSectionHead
            id="mo-shop-s4"
            step={4}
            icon={Send}
            title="Gửi form"
            lead="Đồng ý điều khoản rồi bấm gửi — CINs sẽ liên hệ preview shop cho bạn."
          />

          <label className="mo-shop-check mo-shop-check--consent">
            <input
              type="checkbox"
              checked={dongY}
              onChange={(e) => setDongY(e.target.checked)}
              required
            />
            <span>
              Tôi đồng ý{" "}
              <Link href="/termandservice" target="_blank">
                điều khoản CINs
              </Link>{" "}
              và cho CINs dùng ảnh từ link tôi gửi để dựng shop nháp. Shop chỉ
              public khi tôi duyệt.
            </span>
          </label>

          <div className="mo-shop-hp" aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p className="mo-shop-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="mo-shop-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="mo-shop-spin" aria-hidden />
                Đang gửi…
              </>
            ) : (
              "Gửi thông tin"
            )}
          </button>
        </section>
      </form>
    </div>
  );
}
