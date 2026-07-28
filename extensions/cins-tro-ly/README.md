# Trợ lý CINs (extension nội bộ)

Một tiện ích duy nhất cho hai việc — **không** phân phối Chrome Web Store:

- **Shopee → Kho hàng** (`/ban-hang/kho` → AI · Shopee): kéo 1 SP hoặc cả shop.
- **Behance → Journey** (menu tài khoản → Nhập tác phẩm): kéo portfolio về dạng bài nháp.

Dùng chính **phiên đăng nhập của bạn** trên shopee.vn / behance.net để lấy dữ liệu (vượt chặn Cloudflare / login-wall). Trang CINs ↔ extension nói chuyện qua `postMessage`, không cần secret.

## Cài vào Chrome / Edge

1. `chrome://extensions` (Edge: `edge://extensions`) → bật **Chế độ nhà phát triển**.
2. **Tải tiện ích đã giải nén** → chọn thư mục `extensions/cins-tro-ly`.
3. Cài bản cũ (Shopee riêng) thì gỡ đi cho gọn — tiện ích này gộp cả hai.

## Giao thức postMessage

| Nguồn trang | Nguồn ext | Loại message |
|---|---|---|
| `cins-shopee-page` | `cins-shopee-ext` | `PING` · `FETCH_GET_PC` · `LIST_SHOP_ITEMS` · `FETCH_GET_PC_BATCH` |
| `cins-port-page` | `cins-port-ext` | `PING` · `LIST_PROFILE_WORKS` · `FETCH_WORK` |

## Đóng gói

`npm run pack:tro-ly-ext` → `public/downloads/cins-tro-ly.zip`.
