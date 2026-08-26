/** Điều khoản bán hàng CINs — L33: không trung gian tiền hàng. */

import type { CinsLocale } from "@/lib/locale/types";

export const SHOP_TERMS_VERSION = "2026-08-07";

export const SHOP_TERMS_TITLE = "Điều khoản bán hàng trên CINs";

export const SHOP_TERMS_TITLE_EN = "CINs seller terms";

export const SHOP_TERMS_BODY = `CINs cung cấp công cụ để bạn trưng bày sản phẩm, quản lý kho, nhận đơn và trao đổi với người mua trên nền tảng.

1. Vai trò của CINs
CINs không phải bên bán, không phải bên mua, và không phải trung gian thanh toán cho tiền hàng.
Tiền hàng người mua chuyển thẳng tới tài khoản người bán (hoặc theo thỏa thuận hai bên ngoài CINs).
CINs không thu hộ, không giữ, không chuyển tiền hàng.

2. Trách nhiệm của hai bên
Thanh toán, giao nhận, đổi trả và chất lượng hàng hóa do người bán và người mua tự thỏa thuận và tự chịu trách nhiệm.
Các nút xác nhận trên CINs (đã chuyển / đã nhận / đóng đơn…) chỉ ghi nhận quyết định của người dùng — không phải cam kết hay bảo đảm của CINs.

3. Tranh chấp
Khi có tranh chấp, CINs có thể hỗ trợ xác minh và đưa ra phán quyết vận hành (cảnh báo, hạn chế, khóa cửa hàng) theo quy chế sàn.
CINs không hoàn tiền hộ và không bảo lãnh thanh toán, vì CINs không cầm tiền hàng.

4. Phí sử dụng nền tảng
Việc bán hàng trên CINs có thể phát sinh phí sàn (phí sử dụng công cụ), do người bán trả ngược cho CINs — tách biệt với tiền hàng.
Chi tiết tỷ lệ, kỳ tính, hạn trả và lộ trình thay đổi được công bố trong «Chính sách phí sàn» và mục Thanh toán trên tài khoản của bạn.
Bật bán hàng đồng nghĩa bạn đã đọc điều khoản này và biết có thể phát sinh phí sàn theo chính sách công bố tại từng thời điểm.

Bằng việc bật chức năng bán hàng, bạn xác nhận đã đọc và đồng ý với các điều khoản trên.`;

/** Bản hiển thị tiếng Anh — snapshot pháp lý (shopTermsSnapshot) vẫn là tiếng Việt. */
export const SHOP_TERMS_BODY_EN = `CINs provides tools for you to list products, manage inventory, receive orders, and communicate with buyers on the platform.

1. Role of CINs
CINs is not the seller, not the buyer, and not a payment intermediary for product payments.
Buyers send product payments directly to the seller's account (or as otherwise agreed between the two parties outside CINs).
CINs does not collect, hold, or transfer product payments.

2. Responsibilities of both parties
Payment, delivery, returns, and product quality are agreed between seller and buyer, who are solely responsible.
Confirmation actions on CINs (sent / received / close order…) only record the user's decision — they are not a commitment or guarantee by CINs.

3. Disputes
If a dispute arises, CINs may help verify facts and issue operational decisions (warnings, restrictions, shop suspension) under marketplace rules.
CINs does not refund on anyone's behalf and does not guarantee payment, because CINs does not hold product payments.

4. Platform fees
Selling on CINs may incur a marketplace fee (a fee for using the tools), paid by the seller to CINs — separate from product payments.
Rates, billing periods, payment deadlines, and the change timeline are published in the "Marketplace fee policy" and in Payments on your account.
Enabling selling means you have read these terms and understand that marketplace fees may apply under the policy in effect at the time.

By enabling selling, you confirm that you have read and agree to the terms above.`;

export function shopTermsForLocale(locale: CinsLocale): {
  title: string;
  body: string;
} {
  if (locale === "en") {
    return { title: SHOP_TERMS_TITLE_EN, body: SHOP_TERMS_BODY_EN };
  }
  return { title: SHOP_TERMS_TITLE, body: SHOP_TERMS_BODY };
}

export function shopTermsSnapshot(): string {
  return `[${SHOP_TERMS_VERSION}] ${SHOP_TERMS_BODY}`;
}

/** Disclaimer người mua tick trước khi gửi đơn `mua_ngay` (chuyển khoản). */
export const SHOP_BUYER_TRANSFER_DISCLAIMER_VERSION = "2026-07-18";

export const SHOP_BUYER_TRANSFER_DISCLAIMER =
  "Tôi đã xác minh người bán chính chủ và hiểu CINs không chịu trách nhiệm về giao dịch chuyển tiền này.";

export function shopBuyerTransferDisclaimerSnapshot(): string {
  return `[${SHOP_BUYER_TRANSFER_DISCLAIMER_VERSION}] ${SHOP_BUYER_TRANSFER_DISCLAIMER}`;
}
