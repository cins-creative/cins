"use client";

import Link from "next/link";

import {
  fmtPhiVnd,
  fmtPhiYmd,
  phiThanhToanHref,
  useShopPhiGate,
} from "@/lib/shop/use-shop-phi-gate";

/** Banner gate phí nền tảng shop — chỉ hiện canh_bao / khoa_nhan_don. */
export function ShopPhiGateBanner() {
  const gate = useShopPhiGate();

  if (!gate || gate.trangThai === "hoat_dong") return null;

  const phiHref = phiThanhToanHref(gate);
  const han = gate.hanTraGanNhat ? fmtPhiYmd(gate.hanTraGanNhat) : null;
  const isLock = gate.trangThai === "khoa_nhan_don";

  return (
    <div
      className={`shop-phi-banner${isLock ? " shop-phi-banner--danger" : " shop-phi-banner--warn"}`}
      role="status"
    >
      <div className="shop-phi-banner-text">
        {isLock ? (
          <>
            Đã khóa nhận đơn mới
            {han ? ` — thanh toán kỳ hạn ${han}` : ""}
            {gate.tongNoVnd > 0 ? ` (${fmtPhiVnd(gate.tongNoVnd)})` : ""} để mở
            lại.
          </>
        ) : gate.tuKhaiTamMo ? (
          <>
            Đã ghi nhận chuyển khoản — shop tạm mở trong khi CINs đối soát
            {gate.tongNoVnd > 0 ? ` · nợ ${fmtPhiVnd(gate.tongNoVnd)}` : ""}.
          </>
        ) : (
          <>
            Sắp đến hạn trả phí nền tảng
            {han ? ` (${han})` : ""}
            {gate.tongNoVnd > 0 ? ` · nợ ${fmtPhiVnd(gate.tongNoVnd)}` : ""}.
          </>
        )}
      </div>
      <Link href={phiHref} className="shop-phi-banner-link">
        Thanh toán
      </Link>
    </div>
  );
}
