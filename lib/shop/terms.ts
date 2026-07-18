/** Điều khoản bán hàng CINs — L33: không trung gian tiền. */

export const SHOP_TERMS_VERSION = "2026-07-18";

export const SHOP_TERMS_TITLE = "Điều khoản bán hàng trên CINs";

export const SHOP_TERMS_BODY = `CINs chỉ cung cấp công cụ trưng bày sản phẩm, quản lý kho, giỏ hàng và đơn hàng để hai bên trao đổi.

CINs không thu hộ, không giữ, không chuyển tiền và không chịu trách nhiệm về thanh toán, giao hàng hay chất lượng hàng hóa.

Việc chuyển tiền, nhận hàng và xác nhận giao dịch do người mua và người bán tự thỏa thuận. Nút xác nhận trên CINs chỉ phản ánh quyết định của người dùng, không phải cam kết hay bảo đảm của CINs.

Bằng việc bật chức năng bán hàng, bạn xác nhận đã đọc và đồng ý với các điều khoản trên.`;

export function shopTermsSnapshot(): string {
  return `[${SHOP_TERMS_VERSION}] ${SHOP_TERMS_BODY}`;
}
