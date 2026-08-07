"use client";

import { CheckCircle2, Loader2, Mail, MailWarning, X } from "lucide-react";

export type BienNhanUi =
  | { status: "pending" }
  | { status: "ok" }
  | { status: "skipped"; reason: string; hint?: string }
  | { status: "error"; detail?: string };

export type PaySuccessSnapshot = {
  soTienVnd: number;
  conLaiVnd: number;
  nhanLuc: string | null;
  maCk: string | null;
  kyDaTru: Array<{
    tenDichVu: string;
    soTienVnd: number;
    tuNgay: string;
    denNgay: string;
    maThamChieu: string | null;
    conNoSau: number;
  }>;
  tongConNoSau: number;
  bienNhan: BienNhanUi;
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n))) + "₫";
}

function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function fmtIso(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("vi-VN");
}

export function receiptSkipUserMessage(reason: string): string {
  switch (reason) {
    case "no_resend_key":
      return "Hệ thống email chưa bật — CINs sẽ gửi biên nhận sau.";
    case "bad_email":
      return "Chưa có email nhận hoá đơn. Bổ sung trong Cài đặt thanh toán.";
    case "unmatched":
      return "Giao dịch chưa khớp mã — admin sẽ xử lý thủ công.";
    case "no_phan_bo":
      return "Chưa phân bổ vào kỳ — biên nhận sẽ gửi khi đã ghi nhận.";
    default:
      return "Không gửi được biên nhận lúc này. Bạn vẫn có thể xem trên trang thanh toán.";
  }
}

type Props = {
  open: boolean;
  snapshot: PaySuccessSnapshot | null;
  onClose: () => void;
  onOpenCaiDat?: () => void;
  onXemSo?: () => void;
};

export function BillingPaySuccessModal({
  open,
  snapshot,
  onClose,
  onOpenCaiDat,
  onXemSo,
}: Props) {
  if (!open || !snapshot) return null;

  const partial =
    snapshot.tongConNoSau > 0 ||
    snapshot.kyDaTru.some((k) => k.conNoSau > 0);
  const daTru = snapshot.kyDaTru.reduce((s, k) => s + k.soTienVnd, 0);

  return (
    <div
      className="billing-dialog-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-pay-success-title"
      onClick={onClose}
    >
      <div
        className="billing-dialog billing-dialog--success"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="billing-dialog-head">
          <h2 id="billing-pay-success-title" className="billing-panel-title">
            <CheckCircle2
              size={22}
              className="billing-success-icon"
              aria-hidden
            />
            {partial ? "Đã nhận một phần" : "Đã nhận thanh toán"}
          </h2>
          <button
            type="button"
            className="billing-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <p className="billing-success-lede">
          CINs đã ghi nhận chuyển khoản của bạn.
          {partial
            ? " Số tiền chưa đủ để tất toán hết nợ — phần còn lại vẫn hiện trên sổ."
            : " Đây là biên nhận xác nhận, không phải hoá đơn VAT."}
        </p>

        <dl className="billing-success-dl">
          <div>
            <dt>Số tiền nhận</dt>
            <dd className="billing-success-amount">
              {fmtVnd(snapshot.soTienVnd)}
            </dd>
          </div>
          <div>
            <dt>Đã trừ vào kỳ</dt>
            <dd>{fmtVnd(daTru)}</dd>
          </div>
          {snapshot.conLaiVnd > 0 ? (
            <div>
              <dt>Số dư giữ lại</dt>
              <dd>{fmtVnd(snapshot.conLaiVnd)} (tự trừ kỳ sau)</dd>
            </div>
          ) : null}
          <div>
            <dt>Còn nợ sau trừ</dt>
            <dd>{fmtVnd(snapshot.tongConNoSau)}</dd>
          </div>
          <div>
            <dt>Thời điểm</dt>
            <dd>{fmtIso(snapshot.nhanLuc)}</dd>
          </div>
          {snapshot.maCk ? (
            <div>
              <dt>Mã CK</dt>
              <dd className="mono">{snapshot.maCk}</dd>
            </div>
          ) : null}
        </dl>

        {snapshot.kyDaTru.length > 0 ? (
          <div className="billing-success-ky">
            <p className="billing-success-ky-label">Các kỳ đã trừ</p>
            <ul>
              {snapshot.kyDaTru.map((k, i) => (
                <li key={`${k.maThamChieu ?? i}-${i}`}>
                  <span className="billing-success-ky-ten">{k.tenDichVu}</span>
                  <span className="billing-muted">
                    {fmtYmd(k.tuNgay)} – {fmtYmd(k.denNgay)}
                  </span>
                  <span className="billing-success-ky-amt">
                    {fmtVnd(k.soTienVnd)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="billing-success-mail" role="status">
          {snapshot.bienNhan.status === "pending" ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden />
              <span>Đang gửi email biên nhận…</span>
            </>
          ) : snapshot.bienNhan.status === "ok" ? (
            <>
              <Mail size={16} aria-hidden />
              <span>Đã gửi biên nhận tới email nhận hoá đơn của bạn.</span>
            </>
          ) : snapshot.bienNhan.status === "skipped" ? (
            <>
              <MailWarning size={16} aria-hidden />
              <span>
                {receiptSkipUserMessage(snapshot.bienNhan.reason)}
                {snapshot.bienNhan.reason === "bad_email" && onOpenCaiDat ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="billing-link-btn"
                      onClick={onOpenCaiDat}
                    >
                      Mở Cài đặt
                    </button>
                  </>
                ) : null}
              </span>
            </>
          ) : (
            <>
              <MailWarning size={16} aria-hidden />
              <span>
                Gửi biên nhận lỗi
                {snapshot.bienNhan.detail
                  ? `: ${snapshot.bienNhan.detail}`
                  : ""}. Thanh toán vẫn đã được ghi nhận.
              </span>
            </>
          )}
        </div>

        <div className="billing-dialog-actions">
          {onXemSo ? (
            <button type="button" className="billing-btn ghost" onClick={onXemSo}>
              Xem sổ
            </button>
          ) : null}
          <button type="button" className="billing-btn" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
