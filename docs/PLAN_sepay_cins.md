# PLAN — Trigger tự động SePay cho CINs (log thô + poll + đối soát)

> Trạng thái: **Bước 1–3 + 5–6 đã ship** (2026-08-07) · Migration + webhook log-trước + poll API/UI. **Chưa:** bước 4 (user cấu hình webhook SePay dashboard) · bước 7 fallback số tiền · bước 8 admin view UI.
> Liên quan: `PLAN_thanh_toan_tai_cau_truc.md` (P2 billing) · `PLAN_csdt_phi_nen_tang_va_lead.md` §A6 · `lib/co-so/phi-sepay.ts` · `lib/billing/phan-bo.ts` · `app/api/webhook/sepay/route.ts`
> Tham chiếu ngoài repo (chỉ đọc, **không** copy code): `C:\Users\DELL\Desktop\Sine Art new\sineart-web-v2` — `src/lib/sepay/*`, `src/app/api/donghocphi/poll-order/route.ts`, `src/lib/data/hp-don-thu-helpers.ts`.

---

## 0. Vì sao cần plan này

CINs đã có webhook `POST /api/webhook/sepay` từ A-6 và đã có `cins_hoa_don` / `cins_thanh_toan` / `cins_phan_bo` từ P2. Nhưng **luồng tự động thực tế chưa bao giờ chạy**, vì ba lý do độc lập nhau:

| # | Vấn đề | Hệ quả hôm nay |
|---|---|---|
| 1 | Webhook #41975 của TK TPBank `10001834654` (Cty CINs) trỏ tới `https://sine-art-api.info-cins-vn.workers.dev/webhook/sepay` — **worker của Sine Art**. CINs không có entry webhook nào | Mọi giao dịch vào TK chỉ Sine Art nhận. Hoá đơn CINs **không bao giờ** tự sang `da_tra` |
| 2 | Route CINs trả **422** khi `xuLyWebhookSepay` lỗi, mà SePay đang **tắt** «Tự động gửi lại» | Giao dịch lỗi transient = **mất vĩnh viễn**, không có bản ghi nào để đối soát |
| 3 | Không lưu payload thô; `cins_thanh_toan` chỉ có `so_tien_vnd`/`noi_dung`/`tai_khoan_nguon` | Không debug được tx lệch, không đối soát lại được, không có đường phục hồi khi webhook fail |

Cộng thêm: trang `/tai-khoan/thanh-toan` **không poll**, nên kể cả khi webhook chạy đúng, người trả tiền vẫn phải F5 hoặc bấm «Tôi đã chuyển rồi» (nút này chỉ ghi tự khai + mở rào 3 ngày, không phải xác nhận thanh toán).

**Bất biến giữ nguyên:** CINs không cầm tiền hộ ai. Phạm vi SePay ở đây **chỉ** là phí nền tảng bên bán trả ngược vào TK CINs (`PLAN_thanh_toan_tai_cau_truc.md` §0). Không mở rộng sang tiền học phí / tiền hàng.

---

## 1. Hai hệ dùng chung một tài khoản ngân hàng

Sine Art và CINs cùng nhận vào TPBank `10001834654`. Mã CK **không đụng nhau**, nên chia luồng an toàn:

| Hệ | Regex mã | Bảng đích |
|---|---|---|
| Sine Art | `(SA\|SC)\d{6}` | `hp_don_thu_hoc_phi` · `hc_don_ban_hoa_cu` |
| CINs | `CINS[A-Z0-9]{10}` | `cins_hoa_don` (fallback legacy `org_phi_ky`) |

SePay cho phép **nhiều webhook trên cùng một tài khoản**. Cách làm: thêm webhook thứ hai trỏ về CINs; mỗi bên nhận **toàn bộ** stream giao dịch và tự bỏ qua mã không thuộc mình. Không sửa gì phía Sine Art.

Hệ quả cần chấp nhận: bảng log CINs sẽ chứa cả giao dịch của Sine Art. Đó là chủ ý — dùng cột `ma_he` để phân loại, và log thô là thứ cứu được đối soát khi khách ghi sai nội dung CK.

---

## 2. Đối chiếu luồng Sine Art ↔ CINs

| Bước | Sine Art (đang chạy production) | CINs hiện tại | Cần làm |
|---|---|---|---|
| Sinh mã CK | Trigger Postgres `AFTER INSERT` → `'SA' \|\| lpad(id,6)` | `maThamChieuHoaDon()` ở app, UNIQUE trên `cins_hoa_don.ma_tham_chieu` | — (tương đương) |
| QR | `buildVietQrImageUrl(code, amount)` — có amount + addInfo | `hub.ts` truyền `amountVnd` + `addInfo = maThamChieu` | — |
| Parse body | JSON **+ form-data + urlencoded** (`parseSepayRequestBody`) | Chỉ `request.json()` | Thêm parse form (webhook đang set JSON, nhưng đổi format trên dashboard là 1 click → không nên giòn) |
| Auth | `Authorization: Apikey <key>` vs `SEPAY_WEBHOOK_API_KEY` | `Apikey` \| `Bearer` vs `SEPAY_WEBHOOK_SECRET`, `timingSafeEqual` | — (đã đủ) |
| Log thô | Insert **mọi** tx vào `hp_giao_dich_thanh_toan` (+ `raw_webhook` jsonb) **trước** khi match | Không có | **Bảng mới** §3 |
| Khớp | Theo mã; **fallback theo số tiền** khi thiếu mã | Chỉ theo mã; không khớp → `id_tk = null` chờ admin | Fallback số tiền §4.3 (có điều kiện chặt) |
| Phản hồi người trả | Client poll 3s → server đối soát lại từ bảng log (`trySyncHpDonThuFromSepay`) → UI «Đã thanh toán» + email biên nhận | Không poll; chỉ nút tự khai | **Poll endpoint + polling** §5, §6 |
| Retry | SePay retry tối đa 7 lần (hiện tắt) | Trả 422 → mất tx | Trả 200 cho lỗi không cứu được §4.2 |

Điểm đáng học nhất từ Sine Art không phải webhook — mà là **cặp đôi log-thô + poll đối soát**. Webhook là mạng lưới có lỗ; bảng log thô cộng đối soát lúc poll là lưới thứ hai. Nút «Tôi đã chuyển rồi» của CINs là lưới thứ ba (thủ công), giữ nguyên.

---

## 3. Database

Chỉ **CREATE** — không `ALTER` bảng live nào, nên không kích gate ALTER của `CINS_DEV_RULES.md` §1.

### 3.1 Bảng mới `cins_sepay_giao_dich`

Log thô mọi giao dịch SePay đẩy về. Service-role only (chứa nội dung CK + số TK nguồn).

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `id` | uuid PK | NO | `gen_random_uuid()` |
| `sepay_id` | text | NO | **UNIQUE** → idempotent webhook + retry |
| `gateway` | text | YES | `TPBank` |
| `so_tai_khoan` | text | YES | TK nhận (của CINs) — không mask, là TK mình |
| `tai_khoan_nguon` | text | YES | **Mask 4 số cuối** (PII người trả — §6 security) |
| `loai_chuyen` | text | NO | CHECK `('in','out')` |
| `so_tien_vnd` | bigint | NO | CHECK `>= 0` |
| `noi_dung` | text | YES | `content` + `code` + `description` gộp, cắt 1000 |
| `ma_trich_xuat` | text | YES | Mã CK parse được (`CINS…` hoặc `SA…`/`SC…`) |
| `ma_he` | text | NO | CHECK `('cins','sineart','khac')` — phân loại chủ sở hữu mã |
| `id_thanh_toan` | uuid | YES | FK `cins_thanh_toan(id)` ON DELETE SET NULL — nối khi đã ghi nhận |
| `trang_thai_xu_ly` | text | NO | CHECK `('cho','da_khop','khong_khop','bo_qua','loi')` · default `'cho'` |
| `ghi_chu_xu_ly` | text | YES | Lý do `khong_khop` / message lỗi (**không** log secret/stack) |
| `raw_webhook` | jsonb | YES | Payload gốc — đường phục hồi duy nhất khi parse sai |
| `nhan_luc` | timestamptz | NO | Từ `transactionDate` (+07 → ISO), default `now()` |
| `tao_luc` | timestamptz | NO | default `now()` |

Index:
- `UNIQUE (sepay_id)`
- `(ma_trich_xuat)` WHERE `ma_trich_xuat IS NOT NULL` — poll tra theo mã
- `(trang_thai_xu_ly, nhan_luc DESC)` — admin đối soát
- `(ma_he, nhan_luc DESC)`
- `(so_tien_vnd, nhan_luc DESC)` WHERE `trang_thai_xu_ly = 'cho'` — fallback theo số tiền

RLS: `ENABLE ROW LEVEL SECURITY` · `REVOKE ALL FROM anon, authenticated` · `GRANT ALL TO service_role` (đúng pattern `cins_thanh_toan`).

### 3.2 View `cins_sepay_doi_soat`

Cho `/admin/tai-chinh`. Join `cins_sepay_giao_dich` ← `cins_thanh_toan` ← `cins_phan_bo` → `cins_hoa_don`, trả: `nhan_luc`, `so_tien_vnd`, `ma_trich_xuat`, `ma_he`, `trang_thai_xu_ly`, `hoa_don_ma`, `da_phan_bo_vnd`, `con_lai_vnd`. Lọc mặc định `ma_he <> 'sineart'`.

View là `security_invoker = true`, `REVOKE` anon/authenticated, `GRANT SELECT TO service_role`. Query từ server qua service-role như `phi-admin.ts` đang làm.

### 3.3 File & runner

- `supabase/sql/migration_cins_sepay_giao_dich.sql` — idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, `CREATE INDEX IF NOT EXISTS`).
- `scripts/run-cins-sepay-giao-dich-migration.mjs` — copy pattern `run-cins-hoa-don-migration.mjs`.
- `package.json`: `"migrate:cins-sepay": "node scripts/run-cins-sepay-giao-dich-migration.mjs"`.

**Không backfill.** Giao dịch cũ nằm ở worker Sine Art, không có nguồn để dựng lại.

---

## 4. API — webhook

### 4.1 Ghi log trước, match sau

Đảo thứ tự trong `lib/co-so/phi-sepay.ts` → `xuLyWebhookSepay`:

1. Parse + normalize payload.
2. **INSERT `cins_sepay_giao_dich`** (`trang_thai_xu_ly = 'cho'`). Trùng `sepay_id` (`23505`) → đọc row cũ, trả `duplicate: true`, dừng.
3. `loai_chuyen !== 'in'` → `trang_thai_xu_ly = 'bo_qua'`, trả 200.
4. Parse mã → set `ma_he`: khớp `CINS[A-Z0-9]{10}` → `cins`; khớp `(SA|SC)\d{6}` → `sineart` + `bo_qua` (không xử lý, chỉ lưu để đối soát chéo); còn lại → `khac`.
5. `ma_he = 'cins'` → `ghiThanhToanSepayVaPhanBo()` như hiện tại → cập nhật `id_thanh_toan` + `trang_thai_xu_ly` (`da_khop` / `khong_khop` + `ghi_chu_xu_ly`).

Giữ nguyên fallback legacy `org_phi_thanh_toan` phía dưới — không sửa logic phân bổ ở plan này.

### 4.2 Mã lỗi trả về SePay

| Tình huống | Hiện tại | Sau |
|---|---|---|
| Auth sai | 401 | 401 (giữ) |
| Thiếu `SEPAY_WEBHOOK_SECRET` | 503 | 503 (giữ — retry được) |
| Body không parse được | 400 | 400 + log (không có gì cứu) |
| Thiếu `id` / `transferAmount` xấu | 422 | **200** `{ success: true, skipped: reason }` — retry cũng vô nghĩa |
| DB lỗi transient | 500 | **500** (giữ — để SePay retry) |
| Không khớp mã | 200 | 200 (giữ) |

Nguyên tắc: **500 = còn cứu được, retry đi. 200/400 = đừng retry.** Kèm bật «Tự động gửi lại» trên dashboard (§7).

### 4.3 Fallback khớp theo số tiền — có điều kiện chặt

Chỉ áp dụng khi **cả bốn** đúng, còn lại để admin xử tay:
- `ma_trich_xuat` rỗng hoặc `ma_he = 'khac'`;
- tồn tại **đúng một** hoá đơn `chua_tra`/`qua_han` có `con_no_vnd === so_tien_vnd`;
- giao dịch trong vòng 7 ngày kể từ `thong_bao_luc` của hoá đơn đó;
- hoá đơn chưa có phân bổ nào.

Nếu >1 ứng viên → `khong_khop` + `ghi_chu_xu_ly = 'nhieu_ung_vien'`. Không đoán.

### 4.4 Endpoint poll mới

`POST /api/tai-khoan/thanh-toan/poll` — body `{ hoaDonId }`.

- Auth: `getCurrentSessionAndProfile()` + `canSuaTk(hd.id_tk, actorId)` (đúng pattern route `tu-khai-da-tra`). 401/403 rõ ràng.
- Đọc hoá đơn; nếu `con_no_vnd <= 0` → trả luôn.
- Nếu còn nợ → tìm trong `cins_sepay_giao_dich`: `ma_trich_xuat = ma_tham_chieu` **hoặc** `noi_dung ilike %ma%`, `loai_chuyen = 'in'`, `trang_thai_xu_ly IN ('cho','khong_khop')`, `limit 10`, order `nhan_luc desc`. Có hit → `ghiThanhToanSepayVaPhanBo()` (idempotent theo `sepay_id`) → đọc lại hoá đơn.
- Trả `{ ok, trangThai, daTraVnd, conNoVnd, nhanLuc }`. **Không** trả `noi_dung` / `tai_khoan_nguon` / `raw_webhook` (§6).
- Rate limit: chặn cùng `hoaDonId` gọi < 3s (in-memory theo instance là đủ ở quy mô này).

Sau khi hoá đơn vừa chuyển `da_tra` do poll → gọi `notify-hoa-don.ts` (chat + Resend) như đường webhook, tránh mất thông báo.

---

## 5. Frontend — `ThanhToanHubClient`

Thêm polling **có kỷ luật** (`CINS_DEV_RULES.md` §5):

- Kích hoạt khi: khối «Thanh toán» đang hiện, có `thanhToan.hoaDonId`, hoá đơn còn nợ, tab **visible**.
- Interval **5s** (Sine Art 3s cho luồng học phí realtime; phí nền tảng không cần nhanh vậy). Tự dừng sau **10 phút** không đổi, hiện nút «Kiểm tra lại» để user chủ động.
- Dừng ngay khi: `conNoVnd <= 0`, tab hidden (`visibilitychange`), unmount (clear interval — không leak).
- UI: badge «Đang chờ xác nhận thanh toán…» (dot pulse, token CINS blue) cạnh QR; khi khớp → «Đã nhận thanh toán» + `void load()` refresh hub.
- Nút «Tôi đã chuyển rồi» **giữ nguyên** — vẫn là đường thoát khi SePay chết. Sau khi poll xác nhận thành công thì ẩn nút.

CSS vào `components/billing/thanh-toan-hub.css`, dùng token có sẵn, không hệ màu mới.

---

## 6. Bước triển khai

| # | Bước | File | Gate |
|---|---|---|---|
| 1 | Migration bảng + view + runner + npm script | `supabase/sql/migration_cins_sepay_giao_dich.sql` · `scripts/run-cins-sepay-giao-dich-migration.mjs` · `package.json` | User duyệt plan |
| 2 | Script mô phỏng webhook | `scripts/simulate-sepay-webhook.mjs` | — |
| 3 | Webhook: log-trước + parse form + mã lỗi | `lib/co-so/phi-sepay.ts` · `app/api/webhook/sepay/route.ts` | Sau bước 1 |
| 4 | Cấu hình SePay dashboard + env production | — (user bấm) | Sau bước 3 deploy |
| 5 | Poll endpoint | `app/api/tai-khoan/thanh-toan/poll/route.ts` | Sau bước 3 |
| 6 | Polling UI | `components/billing/ThanhToanHubClient.tsx` + css | Sau bước 5 |
| 7 | Fallback số tiền §4.3 | `lib/billing/phan-bo.ts` | Sau bước 5 — **làm cuối**, dễ sai nhất |
| 8 | Khối «Đối soát SePay» admin (dùng view §3.2) | `components/admin/AdminTaiChinhScreen.tsx` | Tuỳ chọn |

Bước 1–3 là một session. Bước 5–6 một session. Bước 7 một session riêng.

---

## 7. Checklist cấu hình SePay (user bấm trên dashboard)

Tạo webhook **mới**, giữ nguyên webhook #41975 của Sine Art:

| Trường | Giá trị |
|---|---|
| Tên webhook | `CINs — phí nền tảng` |
| Kích hoạt webhook | **Bật** |
| URL nhận webhook | `https://cins.vn/api/webhook/sepay` |
| Loại giao dịch | **Tiền vào** |
| Định dạng dữ liệu | **JSON** (`application/json`) |
| Tự động gửi lại khi server trả lỗi | **Bật** ← khác webhook Sine Art hiện tại |
| Tab «Bảo mật» | Bật xác thực API Key; copy key sinh ra |
| Tab «Tài khoản» | Chọn TPBank `10001834654` (Cty CINs) |

Env production (Cloudflare Workers secret — site chạy OpenNext, **không** Vercel):

```
SEPAY_WEBHOOK_SECRET = <API Key ở tab Bảo mật>
```

Đã có sẵn tên env này (`CINS_IMPLEMENTATION.md` §env) — chỉ cần set đúng giá trị, **không** đổi tên. Dev: cùng key trong `.env.local`.

Verify sau khi bật:
1. `node scripts/simulate-sepay-webhook.mjs CINS…  100000` → row `cins_sepay_giao_dich` + hoá đơn `da_tra`.
2. Nút «Gửi thử» trên dashboard SePay → xem log Workers có 200.
3. Chuyển thật **10.000đ** với mã CK của một hoá đơn nợ → hub tự đổi trạng thái trong ~5s không cần F5.
4. Chuyển thật một khoản **sai mã** → phải thấy row `trang_thai_xu_ly = 'khong_khop'`, hoá đơn không đổi.

## 8. Script mô phỏng

`scripts/simulate-sepay-webhook.mjs` — pattern như Sine Art nhưng **gọi qua HTTP** thay vì import handler, để test cả tầng auth:

```
node scripts/simulate-sepay-webhook.mjs CINS7F3A9C2604 100000
node scripts/simulate-sepay-webhook.mjs CINS7F3A9C2604 100000 --url http://localhost:3001
```

Đọc `SEPAY_WEBHOOK_SECRET` từ `.env.local`, POST `Authorization: Apikey …`, `id` random, in response + row `cins_sepay_giao_dich` + trạng thái hoá đơn sau. Mặc định `--url` = localhost:3001 (dev rule host).

---

## 9. Edge case

| Case | Xử lý |
|---|---|
| Webhook gửi 2 lần (retry) | UNIQUE `sepay_id` trên cả `cins_sepay_giao_dich` và `cins_thanh_toan` |
| Webhook + poll chạy song song, cùng tx | `ghiThanhToanSepayVaPhanBo` check `sepay_id` trước insert → lần sau trả `duplicate` |
| Giao dịch Sine Art (`SA`/`SC`) | Lưu, `ma_he = 'sineart'`, `bo_qua`. Không đụng bảng Sine Art |
| Khách trả thiếu | `da_tra_vnd` cộng dồn, hoá đơn vẫn `chua_tra`. Poll vẫn báo còn nợ |
| Khách trả thừa | `con_lai_vnd` trên `cins_thanh_toan` giữ phần dư; `phanBoVaoHoaDonNo` đã rải sang hoá đơn nợ khác |
| Khách gộp 2 kỳ 1 lần chuyển | Đã xử: `phanBoVaoHoaDonNo` phân bổ theo `han_tra` tăng dần (khác bug A4 của legacy) |
| Ghi sai mã | `khong_khop` → fallback số tiền §4.3 → nếu không, khiếu nại + admin gán tay |
| SePay chết hẳn | Nút «Tôi đã chuyển rồi» (giữ) + gán tay ở `/admin/tai-chinh` |
| `transactionDate` không parse được | `nhan_luc = now()`, ghi `raw_webhook` để truy lại |
| Đổi «Định dạng dữ liệu» sang form trên dashboard | Sau §4.1 route parse được cả 3 format |

---

## 10. Security

- `SEPAY_WEBHOOK_SECRET` chỉ ở env (Workers secret), so sánh `timingSafeEqual` — đã đúng, giữ.
- `tai_khoan_nguon` **mask 4 số cuối** trước khi lưu (đã có `maskTk`). `raw_webhook` giữ nguyên payload — bảng service-role only, không expose qua API nào.
- Poll endpoint: check `canSuaTk` ở **backend**, không dựa UI. Response không chứa nội dung CK / TK nguồn / raw.
- Không log nội dung CK đầy đủ ra console; chỉ `sepay_id` + `trang_thai_xu_ly`.
- Bảng + view: RLS on, `REVOKE` anon/authenticated, chỉ `service_role`.
- Rate limit poll theo `hoaDonId` để không thành đường dò hoá đơn.

---

## 11. Câu treo

1. **Có nên gộp log vào `cins_thanh_toan` thay vì bảng mới?** Đã chọn bảng mới (user chốt 2026-08-07) — tránh ALTER bảng live và giữ `cins_thanh_toan` thuần "tiền đã nhận diện". Nếu sau này thấy 2 bảng lệch nhau nhiều thì xem lại.
2. **Fallback theo số tiền có nên bật production?** Rủi ro khớp sai khi 2 shop cùng nợ đúng một con số. Đang giới hạn "đúng một ứng viên" — cân nhắc thêm gate admin duyệt tay thay vì tự động.
3. **Poll hay Supabase Realtime?** Realtime chỉ dành cho chat/thông báo theo DEV_RULES §5 — plan này dùng poll. Nếu về sau muốn realtime cho billing thì cần quyết định riêng.
