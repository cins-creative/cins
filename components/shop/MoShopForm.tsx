"use client";

import Link from "next/link";
import {
  CreditCard,
  Link2,
  Loader2,
  MessageCircle,
  Package,
  PenLine,
  Plus,
  Send,
  Share2,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import {
  SHOP_DANG_KY_MO_KENH,
  SHOP_DANG_KY_MO_KENH_LABEL,
  type ShopDangKyMoKenh,
} from "@/lib/shop/dang-ky-mo-constants";
import {
  MO_SHOP_SECTION_HELP,
  type MoShopSectionHelpImage,
} from "@/lib/shop/mo-shop-form-help";
import type { ShopDangKyMoHangGioiThieu } from "@/lib/shop/dang-ky-mo-types";

const MAX_LINK_ROWS = 20;
const MAX_HANG_ROWS = 20;

type Props = {
  initialGt: string;
  initialTu: string;
  slotsRemaining?: number;
  slotsLimit?: number;
  onSubmitted?: () => void;
};

type ThankYou = {
  kenhLienHe: ShopDangKyMoKenh;
  lienHeGiaTri: string;
};

type HangGioiThieuRow = {
  tenMatHang: string;
  moTa: string;
  giaBan: string;
  link: string;
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

function SectionHelpHint({ helpImage }: { helpImage: MoShopSectionHelpImage }) {
  const popoverId = useId();
  const [rootEl, setRootEl] = useState<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const canHover = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    [],
  );

  useEffect(() => {
    if (!open || canHover) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!rootEl?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open, canHover, rootEl]);

  return (
    <span
      ref={setRootEl}
      className={`mo-shop-section-help${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="mo-shop-section-help-btn"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label="Xem ví dụ minh hoạ"
        onMouseEnter={() => {
          if (canHover) setOpen(true);
        }}
        onMouseLeave={() => {
          if (canHover) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canHover) setOpen((prev) => !prev);
        }}
      >
        ?
      </button>
      <div
        id={popoverId}
        className="mo-shop-section-help-popover"
        role="tooltip"
        hidden={!open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={helpImage.src} alt={helpImage.alt} loading="lazy" />
      </div>
    </span>
  );
}

function FormSectionHead({
  id,
  step,
  icon: Icon,
  title,
  lead,
  helpImage,
}: {
  id: string;
  step: number;
  icon: LucideIcon;
  title: string;
  lead: string;
  helpImage?: MoShopSectionHelpImage;
}) {
  const preview = helpImage ?? MO_SHOP_SECTION_HELP[step];

  return (
    <div className="mo-shop-section-head">
      {preview ? <SectionHelpHint helpImage={preview} /> : null}
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

function LinkRowsField({
  label,
  optional,
  hint,
  links,
  maxRows,
  addLabel,
  removeAriaPrefix,
  placeholder,
  namePrefix,
  onAdd,
  onChange,
  onRemove,
}: {
  label: string;
  optional?: boolean;
  hint: string;
  links: string[];
  maxRows: number;
  addLabel: string;
  removeAriaPrefix: string;
  placeholder: string;
  namePrefix: string;
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="mo-shop-field">
      <span className="mo-shop-label">
        {label}{" "}
        {optional ? (
          <span className="mo-shop-optional">(tuỳ chọn)</span>
        ) : null}
      </span>
      {links.length > 0 ? (
        <ul className="mo-shop-link-list">
          {links.map((link, index) => (
            <li key={index} className="mo-shop-link-row">
              <input
                className="mo-shop-input"
                type="url"
                name={`${namePrefix}-${index}`}
                value={link}
                onChange={(e) => onChange(index, e.target.value)}
                placeholder={placeholder}
                maxLength={2000}
                autoComplete="url"
              />
              <button
                type="button"
                className="mo-shop-link-remove"
                onClick={() => onRemove(index)}
                aria-label={`${removeAriaPrefix} ${index + 1}`}
                title="Xóa"
              >
                <X size={16} strokeWidth={2.2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {links.length < maxRows ? (
        <button type="button" className="mo-shop-link-add" onClick={onAdd}>
          <Plus size={16} strokeWidth={2.4} aria-hidden />
          {addLabel}
        </button>
      ) : (
        <span className="mo-shop-hint">Đã đạt tối đa {maxRows} link.</span>
      )}
      <span className="mo-shop-hint">{hint}</span>
    </div>
  );
}

export function MoShopForm({
  initialGt,
  initialTu,
  slotsRemaining,
  slotsLimit,
  onSubmitted,
}: Props) {
  const slotLimited = slotsRemaining !== undefined;
  const slotsFull = slotLimited && slotsRemaining <= 0;
  const openedAt = useMemo(() => Date.now(), []);
  const [tenShop, setTenShop] = useState("");
  const [moTaShop, setMoTaShop] = useState("");
  const [mxhBanHangLinks, setMxhBanHangLinks] = useState<string[]>([]);
  const [hangGioiThieu, setHangGioiThieu] = useState<HangGioiThieuRow[]>([]);
  const [kenhLienHe, setKenhLienHe] = useState<ShopDangKyMoKenh>("zalo");
  const [lienHeGiaTri, setLienHeGiaTri] = useState("");
  const [nganHang, setNganHang] = useState("");
  const [soTaiKhoan, setSoTaiKhoan] = useState("");
  const [tenChuTk, setTenChuTk] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [dongY, setDongY] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thankYou, setThankYou] = useState<ThankYou | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const shareFormUrl = useMemo(() => {
    if (typeof window === "undefined") return "/open-shop";
    return `${window.location.origin}/mo-shop`;
  }, [thankYou]);

  async function copyShareFormLink() {
    try {
      await navigator.clipboard.writeText(shareFormUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  }

  function setMxhLinkAt(index: number, value: string) {
    setMxhBanHangLinks((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  }

  function addMxhLinkRow() {
    setMxhBanHangLinks((prev) =>
      prev.length >= MAX_LINK_ROWS ? prev : [...prev, ""],
    );
  }

  function removeMxhLinkAt(index: number) {
    setMxhBanHangLinks((prev) => {
      const next = prev.slice();
      next.splice(index, 1);
      return next;
    });
  }

  function setHangGioiThieuAt(
    index: number,
    patch: Partial<HangGioiThieuRow>,
  ) {
    setHangGioiThieu((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function addHangGioiThieuRow() {
    setHangGioiThieu((prev) =>
      prev.length >= MAX_HANG_ROWS
        ? prev
        : [...prev, { tenMatHang: "", moTa: "", giaBan: "", link: "" }],
    );
  }

  function removeHangGioiThieuAt(index: number) {
    setHangGioiThieu((prev) => {
      const next = prev.slice();
      next.splice(index, 1);
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (slotsFull) {
      setError("Đã hết suất đăng ký — CINs sẽ mở đợt tiếp theo.");
      return;
    }
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
      const cleanHangGioiThieu: ShopDangKyMoHangGioiThieu[] = hangGioiThieu
        .map((item) => ({
          tenMatHang: item.tenMatHang.trim(),
          moTa: item.moTa.trim(),
          giaBan: item.giaBan.trim(),
          link: item.link.trim(),
        }))
        .filter((item) => item.link.length > 0);
      const res = await fetch("/api/open-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenShop,
          moTa: moTaShop || null,
          tenLienHe: null,
          loaiHang: [],
          mxhBanHangLinks: mxhBanHangLinks
            .map((link) => link.trim())
            .filter(Boolean),
          hangGioiThieu: cleanHangGioiThieu,
          ghiChu: ghiChu || null,
          kenhLienHe,
          lienHeGiaTri,
          nganHang,
          soTaiKhoan,
          tenChuTk,
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
      onSubmitted?.();
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

        <div className="mo-shop-thanks-share">
          <div className="mo-shop-thanks-share-head">
            <span className="mo-shop-thanks-share-icon" aria-hidden>
              <Share2 size={17} strokeWidth={2.2} />
            </span>
            <div>
              <p className="mo-shop-thanks-share-title">
                Gửi link form cho artist khác
              </p>
              <p className="mo-shop-thanks-share-lead">
                Chia sẻ form mở shop này với một artist khác — mỗi người hoàn
                thành đăng ký là một suất riêng.
              </p>
            </div>
          </div>
          <div className="mo-shop-thanks-share-row">
            <input
              className="mo-shop-thanks-share-url"
              type="text"
              readOnly
              value={shareFormUrl}
              aria-label="Link form mở shop CINs"
            />
            <button
              type="button"
              className={`mo-shop-thanks-share-copy${shareCopied ? " is-copied" : ""}`}
              onClick={() => void copyShareFormLink()}
            >
              {shareCopied ? "Đã copy" : "Copy link"}
            </button>
          </div>
        </div>
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
            title="Tên shop"
            lead="Tên và mô tả ngắn hiển thị trên CINs."
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
              Mô tả shop{" "}
              <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            <textarea
              className="mo-shop-textarea mo-shop-textarea--short"
              name="moTaShop"
              rows={3}
              maxLength={2000}
              value={moTaShop}
              onChange={(e) => setMoTaShop(e.target.value)}
              placeholder="VD: Shop acrylic & print fanart, preorder theo đợt, ship toàn quốc…"
            />
          </label>
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s2">
          <FormSectionHead
            id="mo-shop-s2"
            step={2}
            icon={Share2}
            title="Nền tảng MXH bạn dùng để bán hàng"
            lead="Facebook, Instagram, Shopee, TikTok… — mỗi dòng một link shop hoặc trang bán."
          />

          <LinkRowsField
            label="Link nền tảng"
            optional
            links={mxhBanHangLinks}
            maxRows={MAX_LINK_ROWS}
            addLabel="Thêm link nền tảng"
            removeAriaPrefix="Xóa link nền tảng"
            placeholder="https://instagram.com/… hoặc https://shopee.vn/…"
            namePrefix="mxhBanHangLink"
            hint="Chưa có link public — bỏ trống, CINs nhắn xin sau."
            onAdd={addMxhLinkRow}
            onChange={setMxhLinkAt}
            onRemove={removeMxhLinkAt}
          />
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s3">
          <FormSectionHead
            id="mo-shop-s3"
            step={3}
            icon={Package}
            title="Các loại mặt hàng bạn bán"
            lead="Mô tả ngắn loại hàng + link ảnh hoặc file PSD — CINs dùng để dựng shop."
          />

          <div className="mo-shop-field">
            <span className="mo-shop-label">
              Mặt hàng giới thiệu{" "}
              <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            {hangGioiThieu.length > 0 ? (
              <ul className="mo-shop-hang-list">
                {hangGioiThieu.map((item, index) => (
                  <li key={index} className="mo-shop-hang-card">
                    <div className="mo-shop-hang-card-head">
                      <span className="mo-shop-hang-card-title">
                        {item.tenMatHang.trim() || `Mặt hàng ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        className="mo-shop-hang-card-remove"
                        onClick={() => removeHangGioiThieuAt(index)}
                        aria-label={`Xóa mặt hàng ${index + 1}`}
                        title="Xóa"
                      >
                        <X size={15} strokeWidth={2.2} aria-hidden />
                      </button>
                    </div>
                    <label className="mo-shop-field">
                      <span className="mo-shop-label">Tên mặt hàng</span>
                      <input
                        className="mo-shop-input"
                        name={`hangTen-${index}`}
                        value={item.tenMatHang}
                        onChange={(e) =>
                          setHangGioiThieuAt(index, {
                            tenMatHang: e.target.value,
                          })
                        }
                        placeholder="VD: Standee Miku, Badge enamel set…"
                        maxLength={120}
                      />
                    </label>
                    <label className="mo-shop-field">
                      <span className="mo-shop-label">Mô tả loại hàng</span>
                      <textarea
                        className="mo-shop-textarea mo-shop-textarea--short"
                        name={`hangMoTa-${index}`}
                        rows={3}
                        value={item.moTa}
                        onChange={(e) =>
                          setHangGioiThieuAt(index, { moTa: e.target.value })
                        }
                        placeholder="VD: Acrylic standee 5×7cm, in UV, có charm kèm…"
                        maxLength={200}
                      />
                      <span className="mo-shop-hint">
                        Nếu bạn có mô tả trong nơi nào khác thì dán link cũng được.
                      </span>
                    </label>
                    <label className="mo-shop-field">
                      <span className="mo-shop-label">
                        Giá bán{" "}
                        <span className="mo-shop-optional">(tuỳ chọn)</span>
                      </span>
                      <input
                        className="mo-shop-input"
                        name={`hangGiaBan-${index}`}
                        value={item.giaBan}
                        onChange={(e) =>
                          setHangGioiThieuAt(index, { giaBan: e.target.value })
                        }
                        placeholder="VD: 150.000đ, 80k, preorder 200k…"
                        maxLength={80}
                      />
                    </label>
                    <label className="mo-shop-field">
                      <span className="mo-shop-label">Link ảnh / PSD</span>
                      <input
                        className="mo-shop-input"
                        type="url"
                        name={`hangLink-${index}`}
                        value={item.link}
                        onChange={(e) =>
                          setHangGioiThieuAt(index, { link: e.target.value })
                        }
                        placeholder="https://drive.google.com/…"
                        maxLength={2000}
                        autoComplete="url"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
            {hangGioiThieu.length < MAX_HANG_ROWS ? (
              <button
                type="button"
                className="mo-shop-link-add"
                onClick={addHangGioiThieuRow}
              >
                <Plus size={16} strokeWidth={2.4} aria-hidden />
                Thêm mặt hàng
              </button>
            ) : (
              <span className="mo-shop-hint">
                Đã đạt tối đa {MAX_HANG_ROWS} mặt hàng.
              </span>
            )}
            <span className="mo-shop-hint">
              Chưa có ảnh public — bỏ trống, CINs nhắn xin file sau.
            </span>
          </div>
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s4">
          <FormSectionHead
            id="mo-shop-s4"
            step={4}
            icon={CreditCard}
            title="STK nhận tiền"
            lead="STK gắn vào shop — khách chuyển khoản thẳng cho bạn khi mua hàng."
          />

          <div className="mo-shop-stk">
            <div className="mo-shop-stk-grid">
              <label className="mo-shop-field">
                <span className="mo-shop-label">
                  Ngân hàng <span className="mo-shop-req">*</span>
                </span>
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
                <span className="mo-shop-label">
                  Số tài khoản <span className="mo-shop-req">*</span>
                </span>
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
                <span className="mo-shop-label">
                  Tên chủ tài khoản <span className="mo-shop-req">*</span>
                </span>
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
            <p className="mo-shop-hint mo-shop-hint--stk">
              Khi khách hàng mua sẽ có người chuyển khoản về STK thật của bạn
              (phí 0%).
            </p>
          </div>
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s5">
          <FormSectionHead
            id="mo-shop-s5"
            step={5}
            icon={MessageCircle}
            title="Thông tin liên hệ"
            lead="Khi cần thêm thông tin hoặc thông báo build hoàn thành thì CINs liên hệ bạn qua đâu?"
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
        </section>

        <section className="mo-shop-form-section" aria-labelledby="mo-shop-s6">
          <FormSectionHead
            id="mo-shop-s6"
            step={6}
            icon={PenLine}
            title="Góp ý thêm"
            lead="Điều gì form chưa hỏi — bạn cứ viết thêm để CINs hiểu shop của mình hơn."
          />

          <label className="mo-shop-field">
            <span className="mo-shop-label">
              Góp ý <span className="mo-shop-optional">(tuỳ chọn)</span>
            </span>
            <textarea
              className="mo-shop-textarea mo-shop-textarea--short"
              name="ghiChu"
              rows={3}
              maxLength={2000}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="VD: Giá tham khảo, lịch mở đơn, style shop bạn thích…"
            />
          </label>
        </section>

        <section className="mo-shop-form-section mo-shop-form-section--submit">
          <FormSectionHead
            id="mo-shop-s7"
            step={7}
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
              <Link href="/terms" target="_blank">
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
            disabled={submitting || slotsFull}
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="mo-shop-spin" aria-hidden />
                Đang gửi…
              </>
            ) : slotsFull ? (
              "Đã hết suất"
            ) : (
              "Gửi thông tin"
            )}
          </button>
        </section>
      </form>
    </div>
  );
}
