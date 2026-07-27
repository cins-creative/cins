# CINs · Autopilot Behance

Extension nội bộ: quét nhiều project trên trang Behance đang mở → `POST /api/noi-bo/auto/muc` → bảng `auto_muc`.

## Cài Chrome / Edge

1. `chrome://extensions` → bật **Developer mode**
2. **Load unpacked** → chọn thư mục `extensions/cins-behance-import`
3. (Tuỳ chọn) đóng gói zip: `npm run pack:behance-ext` → `public/downloads/cins-behance-import.zip`

## Dùng

1. Điền **API base** (`https://cins.vn`) + secret `CINS_NOI_BO_DANG_BAI_SECRET`
   (dev local: thêm optional host `http://127.0.0.1/*` trong Chrome nếu cần)
2. Niche gợi ý (phẩy): khớp `auto_tai_khoan.niche` khi chạy `chuan-bi-dang`
3. Mở hồ sơ Behance (`behance.net/username` hoặc `/projects`) — scroll để load card
4. **Quét trang** → **Gửi vào hàng đợi**

Chrome chỉ cần mở lúc scrap. Sau đó:

```bash
npm run autopilot -- liet-ke muc
npm run autopilot -- chuan-bi-dang --gioi-han 30
npm run autopilot -- chay-dang
```
