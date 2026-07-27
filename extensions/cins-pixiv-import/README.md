# CINs · Autopilot Pixiv

Extension nội bộ: quét artwork trên trang Pixiv đang mở → `POST /api/noi-bo/auto/muc` → bảng `auto_muc`.

Server-side ajax Pixiv thường **403** (giống Behance) — scrap trong browser.

## Cài Chrome / Edge

1. `chrome://extensions` → bật **Developer mode**
2. **Load unpacked** → chọn thư mục `extensions/cins-pixiv-import`
3. (Tuỳ chọn) đóng gói zip: `npm run pack:pixiv-ext` → `public/downloads/cins-pixiv-import.zip`

## Dùng

1. Điền **API base** (production CINs origin) + secret `CINS_NOI_BO_DANG_BAI_SECRET`
2. Niche gợi ý (phẩy): khớp `auto_tai_khoan.niche` khi chạy `chuan-bi-dang`
3. Mở hồ sơ Pixiv (`pixiv.net/users/{id}`) — scroll để load card
4. **Quét trang** → **Gửi vào hàng đợi**

Chrome chỉ cần mở lúc scrap. Sau đó:

```bash
npm run autopilot -- liet-ke muc
npm run autopilot -- chuan-bi-dang --gioi-han 30
npm run autopilot -- duyet-ban-thao --chi-xem
npm run autopilot -- chay-dang
```
