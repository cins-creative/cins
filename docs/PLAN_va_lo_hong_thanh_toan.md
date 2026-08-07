# PLAN — Vá lỗ hổng luồng thanh toán ràng buộc (shop + cơ sở đào tạo)

> Trạng thái: **Nhóm B + A + C đã ship** 2026-08-07 · Plan vá lỗ hổng thanh toán **xong**.
> Nguồn liên quan: `PLAN_thanh_toan_tai_cau_truc.md` (§2 nhóm A/B/C) · `PLAN_csdt_phi_nen_tang_va_lead.md` · `CINS_DEV_RULES.md`.
>
> ## Handoff — mở chat mới bằng prompt này
>
> ```
> Verify / smoke docs/PLAN_va_lo_hong_thanh_toan.md (A+B+C đã ship).
> Không làm thêm trừ khi phát hiện hồi quy.
> ```
>
> ### Đã chốt với user (2026-08-07)
> - Tự khai «Tôi đã chuyển rồi»: **tối đa 1 lần / hoá đơn**. Hết ân hạn mà tiền chưa về → khoá, muốn gia hạn phải đi đường khiếu nại.
> - Thứ tự đề xuất: **B → A → C**. B rẻ và chặn đường tấn công ngoài; A cần migration + đụng chính sách.
> - **Q1 (b):** gate shop đọc `cins_hoa_don` (fallback `shop_phi_ky` nếu chưa dual-write).
> - **Q3:** `so_ngay_an_han_tu_khai` đọc từ `/admin/tai-chinh` qua `getCinsTaiChinh()`.
> - **Q2:** STK seller giữ public; ẩn `tenChuTaiKhoan` với khách vãng lai.
>
> ### Đã ship — Nhóm B
> - **B1** `lib/co-so/phi-sepay.ts` — so STK webhook vs `cins_cau_hinh_tai_chinh`; lệch → `bo_qua` / `stk_khong_khop`, không phân bổ; STK trống hoặc thiếu accountNumber → fail-open.
> - **B2** `app/api/noi-bo/billing/cron/route.ts` (+ `shop/dong-don`) — fallback secret chỉ khi `503`, không khi sai token.
> - **B3** `lib/billing/hoa-don-ma.ts` — production thiếu `CSDT_PHI_MA_SALT` → throw; dev fallback + warn 1 lần.
>
> ### Đã ship — Nhóm A
> - **A0** `migration_billing_tu_khai_lan.sql` + `npm run migrate:billing-tu-khai` (đã chạy trên DB CINS).
> - **A1** `lib/billing/an-han.ts` · CSĐT gate + shop gate cùng đọc ân hạn hub; shop quá hạn + còn ân hạn → `han_che`.
> - **A2** `tuKhaiHoaDon` enforce 1 lần (optimistic lock) → API **409** + `goiY: khieu_nai`.
> - **A3** Hub UI: disable «Tôi đã chuyển rồi» → «Đã tự khai — mở khiếu nại».
>
> ### Đã ship — Nhóm C
> - **C1–C2** Poll: TTL eviction + min 8s; client 10s; `hasServiceRoleEnv` → 503.
> - **C3** `/api/shop/cua-hang/thanh-toan`: ẩn `tenChuTaiKhoan` khi chưa đăng nhập.
> - **C4** `sepay-giao-dich`: `MA_CINS_EXACT_RE` + escape trước `.or()`.
> - **C5** `lib/shop/phi.ts`: quá hạn dùng `todayYmdVn`.
>
> ### Bất biến không được phá
> CINs **không cầm tiền** người khác (`PLAN_thanh_toan_tai_cau_truc.md` §0). Mọi bản vá dưới đây chỉ chạm tầng **phí nền tảng bên bán trả ngược**, không chạm học phí học viên / tiền hàng người mua.

---

## 1. Lỗ hổng đã xác minh

Phần **ràng buộc quyền** (ai được xem/sửa hoá đơn) đã kiểm tra và **không có lỗ hổng**: mọi API `/api/tai-khoan/thanh-toan/*` đều qua `canSuaTk` / `canDocTk`, service-role không rò ra client. Bảy mục dưới đây nằm ở tầng **nghiệp vụ** và **xác thực máy-với-máy**.

| # | Lỗ hổng | Mức | Bằng chứng |
|---|---|---|---|
| **V1** | **Tự khai đã trả bấm được vô hạn.** Chỉ ghi đè `tu_khai_da_tra_luc`, không đếm lần. Cơ sở nợ bấm lại mỗi 3 ngày → `khoa_ghi_danh` không bao giờ đóng | **Cao** | `lib/billing/hoa-don.ts:383-394` · `lib/co-so/phi-sepay.ts:301-350` · gate đọc ở `lib/co-so/phi-gate.ts:103-133` |
| **V2** | **Shop không được hưởng ân hạn tự khai.** `applyShopGateFromSignals` chỉ nhìn `shop_phi_ky.trang_thai='qua_han'`, không đọc `tu_khai_da_tra_luc` → seller đã chuyển tiền, webhook trễ, vẫn bị chặn nhận đơn | **Trung bình** | `lib/shop/gate.ts:64-70,123-125` |
| **V2b** | **Trả một phần không hạ được trạng thái shop.** `shop_phi_ky` **không có cột `da_tra_vnd`**; `phanBoVaoHoaDonNo` chỉ sync ngược khi trả **đủ** | **Trung bình** | `lib/shop/phi.ts:49` (KY_SELECT) · `lib/billing/phan-bo.ts:86-95` |
| **V3** | **Webhook Sepay không kiểm tra STK nhận.** `accountNumber` chỉ được log, không đối chiếu STK thu phí trong `cins_cau_hinh_tai_chinh` → tiền vào STK khác có nội dung chứa mã `CINS…` vẫn trừ nợ phí | **Trung bình** | `lib/co-so/phi-sepay.ts:392-404` |
| **V4** | **Chuỗi fallback secret cron quá rộng.** Fallback 2 chạy khi lần đầu fail vì **bất kỳ lý do** (kể cả sai token), không chỉ khi 503 → secret đăng bài mở được cron tài chính | **Trung bình** | `app/api/noi-bo/billing/cron/route.ts:17-24` (so với nhánh 3 đã đúng) |
| **V5** | **Salt mã CK im lặng rơi về mặc định.** Thiếu `CSDT_PHI_MA_SALT` → dùng `"cins-billing"` hardcode; seed là `orgId` vốn lộ ở URL ⇒ bản vá B1 chỉ là ảo giác khi env thiếu | **Thấp–TB** | `lib/billing/hoa-don-ma.ts:9-11` |
| **V6** | **Rate limit poll vô dụng.** `lastPollAt` là `Map` in-memory theo instance; serverless/Workers mỗi isolate một bản. Map không bao giờ được dọn. Route cũng thiếu `hasServiceRoleEnv()` (500 thay vì 503) | **Thấp** (chi phí) | `app/api/tai-khoan/thanh-toan/poll/route.ts:14-16,185-190` |
| **V7** | **STK seller public, enumerate được.** GET không cần đăng nhập, trả `soTaiKhoan` + `tenChuTaiKhoan` đầy đủ theo `sellerId`, không rate limit | **Thấp–TB** (PII) | `app/api/shop/cua-hang/thanh-toan/route.ts:8-54` |
| **V8** | **`.or()` nội suy chuỗi chưa escape** (PostgREST filter injection pattern). `ma` đến từ DB nên hiện chưa khai thác được, nhưng `MA_CINS_RE` **không neo** đầu/cuối | **Thấp** | `lib/billing/sepay-giao-dich.ts:285,297` |
| **V9** | **Còn sót lệch múi giờ (B3).** Quét quá hạn shop dùng `now.toISOString().slice(0,10)` = UTC, trong khi CSĐT dùng `todayYmdVn` ⇒ shop bị đánh `qua_han` sớm 7 tiếng | **Thấp** | `lib/shop/phi.ts:384` |

**Nhận xét xuyên suốt:** V1 và V2 là hai mặt của **cùng một cơ chế ân hạn** được cài rời ở hai nơi. Đây là hệ quả trực tiếp của việc `PLAN_thanh_toan_tai_cau_truc.md` §5 P0 vá C5 chỉ cho nhánh CSĐT rồi P1/P2 gộp hub mà không gộp gate. Bản vá phải **hợp nhất cơ chế**, không vá tiếp hai chỗ.

---

## 2. Nhóm A — Hợp nhất ân hạn tự khai (V1 + V2 + V2b)

Nhóm duy nhất đang **mất tiền thật** và đối xử lệch giữa hai loại khách.

### 2.1 Database

Nguồn sự thật là `cins_hoa_don` (P2 đã cắt sang). `org_phi_ky` / `shop_phi_ky` là tầng nguồn đang chuyển tiếp — **không ALTER**.

```sql
-- migration_billing_tu_khai_lan.sql
ALTER TABLE cins_hoa_don
  ADD COLUMN IF NOT EXISTS tu_khai_lan smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tu_khai_boi uuid REFERENCES user_nguoi_dung(id);
CREATE INDEX IF NOT EXISTS idx_cins_hoa_don_tu_khai
  ON cins_hoa_don (tu_khai_da_tra_luc) WHERE tu_khai_lan > 0;
```

- `tu_khai_da_tra_luc` đã tồn tại — giữ nguyên.
- Legacy `org_phi_ky.hoa_don_thong_tin` giữ ghi jsonb như P0 để không vỡ code cũ, nhưng **quyết định cho/không cho** đọc từ `cins_hoa_don`.
- Backfill: `tu_khai_lan = 1` cho mọi hoá đơn đang có `tu_khai_da_tra_luc IS NOT NULL` (không hồi tố phạt ai).

### 2.2 Lib — một chỗ duy nhất

Tạo `lib/billing/an-han.ts`, là **nguồn sự thật duy nhất** cho ân hạn của cả hai luồng:

| Hàm | Trách nhiệm |
|---|---|
| `coTheTuKhai(hoaDon)` | `tu_khai_lan < TU_KHAI_TOI_DA` **và** trạng thái ∈ {`chua_tra`,`qua_han`} → `{ok}` / `{ok:false, lyDo}` |
| `anHanConHieuLuc(hoaDon, now)` | `tu_khai_da_tra_luc + so_ngay_an_han_tu_khai >= now` |
| `anHanChoNguon({nguonBang, nguonId})` | Tra ngược từ `org_phi_ky.id` / `shop_phi_ky.id` → hoá đơn hub → trạng thái ân hạn |

`TU_KHAI_TOI_DA = 1` (chốt) và `so_ngay_an_han_tu_khai` đọc từ `/admin/tai-chinh` (§4.9 plan gốc — **không hardcode**, hiện đang hardcode `3` ở `CSDT_PHI_TU_KHAI_AN_HAN_NGAY`).

Sau đó: `lib/co-so/phi-gate.ts` và `lib/shop/gate.ts` **cùng gọi** `anHanChoNguon`, xoá bản sao logic trong `tuKhaiConHieuLuc`.

### 2.3 API

| Route | Đổi |
|---|---|
| `POST /api/tai-khoan/thanh-toan/tu-khai-da-tra` | Gọi `coTheTuKhai` trước khi ghi; hết lượt → **409** kèm `{ lyDo: "het_luot_tu_khai", goiY: "khieu_nai" }`. Tăng `tu_khai_lan`, ghi `tu_khai_boi` |
| `GET /api/tai-khoan/thanh-toan` (hub) | Payload thêm `coTheTuKhai: boolean` + `anHanDenIso` cho từng hoá đơn |

### 2.4 Gate

- **CSĐT** (`getCsdtPhiGate`): giữ hành vi `qua_han` + ân hạn còn hiệu lực → `canh_bao`. Chỉ đổi nguồn đọc.
- **Shop** (`applyShopGateFromSignals`): thêm bước — nếu `overdue` nhưng **mọi** kỳ quá hạn đều còn ân hạn → hạ `khoa` xuống **`han_che`** (không phải `hoat_dong`; shop vẫn nhận đơn, UI vẫn cảnh báo). Giữ nguyên ưu tiên `[ADMIN]` manual lock ở đầu hàm.
- **V2b**: `phanBoVaoHoaDonNo` khi trả **một phần** cho `shop_phi_ky` — không có cột để ghi. Hai lựa chọn ở §6 Q1.

### 2.5 Frontend

`components/billing/ThanhToanHubClient.tsx`: nút «Tôi đã chuyển rồi» **disable** khi `coTheTuKhai === false`, đổi nhãn thành «Đã tự khai — mở khiếu nại» trỏ sang form khiếu nại. Không được để client là chỗ chặn duy nhất (server vẫn 409).

---

## 3. Nhóm B — Ba lỗi một dòng (V3 + V4 + V5)

Không đụng schema, không đụng UI. Rủi ro hồi quy gần bằng không.

| # | Đổi | File |
|---|---|---|
| **B1** | So `n.accountNumber` với STK thu phí (`cins_cau_hinh_tai_chinh.bank_*`, đọc qua `getCinsTaiChinh`). Lệch → vẫn **ghi log** nhưng `trang_thai_xu_ly='bo_qua'`, `ghi_chu_xu_ly='stk_khong_khop'`, **không** phân bổ. Cấu hình trống → giữ hành vi hiện tại (không tự khoá mình) | `lib/co-so/phi-sepay.ts` (trước nhánh `maHe === "cins"`) |
| **B2** | Fallback 2 chỉ chạy khi `auth.status === 503`, giống nhánh 3 | `app/api/noi-bo/billing/cron/route.ts:19-21` |
| **B3** | `billingMaSalt()` — throw khi `NODE_ENV === "production"` và thiếu env; dev giữ default kèm `console.warn` một lần | `lib/billing/hoa-don-ma.ts:9-11` |

> B1 lưu ý: `bo_qua` chứ không phải drop — cần giữ log để admin `gan-giao-dich` thủ công được nếu là dương tính giả.

---

## 4. Nhóm C — Chống lạm dụng & lộ dữ liệu (V6 + V7 + V8 + V9)

| # | Đổi | File |
|---|---|---|
| **C1** | Rate limit poll chuyển sang **DB-backed**: cột `poll_lan_cuoi` trên `cins_hoa_don`, hoặc chấp nhận in-memory nhưng thêm TTL eviction + hạ tần suất poll client 5s → 10s và dừng hẳn sau N lần | `app/api/.../poll/route.ts` |
| **C2** | Poll thêm `hasServiceRoleEnv()` → 503, đồng bộ với các route anh em | như trên |
| **C3** | `/api/shop/cua-hang/thanh-toan`: **yêu cầu đăng nhập** để trả `soTaiKhoan`/`tenChuTaiKhoan`; khách vãng lai chỉ nhận `nganHang` + tên shop. Cần xác nhận không vỡ luồng mua không đăng nhập (§6 Q2) | `app/api/shop/cua-hang/thanh-toan/route.ts` |
| **C4** | Neo `MA_CINS_RE` thành `/^CINS[A-Z0-9]{10}$/i` khi **validate** (giữ bản không neo khi **trích xuất** từ nội dung CK), và escape `ma` trước khi nội suy vào `.or()` | `lib/billing/sepay-giao-dich.ts:9,285,297` |
| **C5** | `lib/shop/phi.ts:384` dùng `todayYmdVn(now)` thay `now.toISOString().slice(0,10)` — đóng nốt B3 của plan gốc | `lib/shop/phi.ts` |

---

## 5. Thứ tự thực hiện

| Step | Nội dung | Điều kiện xong |
|---|---|---|
| **B1–B3** | Nhóm B, một commit | Webhook lệch STK không phân bổ; cron từ chối secret sai; build production fail nếu thiếu salt |
| **A0** | Migration `tu_khai_lan` + backfill | `npm run migrate:billing-tu-khai` chạy sạch, dry-run trước |
| **A1** | `lib/billing/an-han.ts` + đấu lại 2 gate | Xoá được `tuKhaiConHieuLuc` khỏi `phi-sepay.ts` |
| **A2** | API 409 + payload hub | Tự khai lần 2 trả 409 |
| **A3** | UI disable nút + đường khiếu nại | — |
| **C1–C5** | Nhóm C, tách commit | — |

**Một phase một brief.** Không gộp A + B + C trong một lượt (`AUTO_MODEL_SELECTOR` §Quy tắc hành vi 4).

---

## 6. Câu treo — cần user chốt trước khi làm Nhóm A

| # | Câu | Đề xuất |
|---|---|---|
| **Q1** | **V2b — trả một phần cho kỳ shop.** (a) `ALTER shop_phi_ky ADD da_tra_vnd`, hay (b) bỏ hẳn đọc `shop_phi_ky` ở gate, chuyển gate shop sang đọc `cins_hoa_don` như nguồn duy nhất? | **(b)** — đúng hướng P2 "cắt sang `cins_hoa_don`", tránh thêm cột cho bảng sắp ngưng ghi. Nhưng đụng nhiều chỗ hơn |
| **Q2** | **C3 — có luồng mua hàng không đăng nhập không?** Nếu có, ẩn STK sẽ chặn khách vãng lai | Nếu có: giữ public nhưng thêm rate limit theo IP + bỏ `tenChuTaiKhoan` khỏi payload ẩn danh |
| **Q3** | `so_ngay_an_han_tu_khai` hiện hardcode `3` (`CSDT_PHI_TU_KHAI_AN_HAN_NGAY`). Đưa vào `/admin/tai-chinh` luôn trong Nhóm A hay tách? | Đưa luôn — đang sửa đúng file đó, và Q4 plan gốc đã chốt "không hardcode con số tiền/ngày" |

---

## 7. Verify

**Nhóm B**
1. `curl` webhook Sepay với `accountNumber` sai + nội dung chứa mã hợp lệ → `cins_sepay_giao_dich.trang_thai_xu_ly='bo_qua'`, `cins_hoa_don.da_tra_vnd` **không đổi**.
2. `POST /api/noi-bo/billing/cron` với `Bearer <CINS_NOI_BO_DANG_BAI_SECRET>` khi `CSDT_PHI_CRON_SECRET` **đã** cấu hình → **401** (hiện tại: 200).
3. `unset CSDT_PHI_MA_SALT` + build production → fail rõ ràng.

**Nhóm A**
4. Hoá đơn `qua_han`: tự khai lần 1 → 200 + gate `canh_bao`. Lần 2 → **409**, gate về `khoa_ghi_danh` sau khi hết 3 ngày.
5. Seller có `shop_phi_ky` quá hạn + tự khai còn hiệu lực → `assertShopGateNhanDon` **không** throw `SHOP_KHOA`.
6. Phụ trách `vai_tro='quan_ly'` vẫn tự khai được; phụ trách thường vẫn 403 (không hồi quy quyền).

**Không hồi quy**
7. `/tai-khoan/thanh-toan` SSR + poll sau khi trả đủ vẫn ra modal biên nhận.
8. `npm run build` sạch.

---

## 8. Edge case

| Case | Xử lý |
|---|---|
| Đã tự khai 1 lần, tiền về thật trong ân hạn | Hoá đơn `da_tra` → `tu_khai_lan` giữ nguyên, không phạt |
| Đã hết lượt, tiền về muộn | Webhook/poll vẫn phân bổ bình thường; gate tự mở khi hết nợ |
| Đã hết lượt nhưng CINs sai (webhook chết) | Đường thoát là **khiếu nại** → admin `gan-giao-dich` hoặc `dieu_chinh_vnd`. Phải nêu rõ trong UI, không để khách kẹt |
| Chưa điền STK CINs | Giữ nguyên hành vi hiện có: hoãn `qua_han` (lỗi của CINs) — B1 **không** được biến việc này thành khoá |
| Hoá đơn hub chưa sync từ `shop_phi_ky` | `anHanChoNguon` trả `false` → gate giữ hành vi cũ, không crash |
| Một CK trả nhiều hoá đơn | Không đổi — `cins_phan_bo` giữ nguyên |
| Backfill `tu_khai_lan` | Người đã tự khai 5 lần trước bản vá vẫn được tính là 1 → còn 0 lượt. Chấp nhận (không hồi tố phạt, cũng không tặng lượt mới) |

---

## 9. Security

- Không secret nào rời khỏi env (`CINS_DEV_RULES.md`). B3 làm chặt thêm chứ không nới.
- B1 **không** được để cấu hình trống biến thành từ chối toàn bộ tiền vào — fail **open** có kiểm soát, kèm log cảnh báo.
- 409 của A2 không được lộ `tu_khai_boi` (uuid người khác trong cùng tk) ra client.
- C3 đụng PII (số tài khoản + tên thật) — theo `PLAN_thanh_toan_tai_cau_truc.md` §7 "SĐT/MST là PII: không log, không trả về cho user khác".
- Mọi thay đổi gate đều phải giữ nguyên ưu tiên `SHOP_LY_DO_KHOA_ADMIN_PREFIX` — không được để ân hạn tự khai mở được khoá thủ công của admin (đây chính là B2 cũ, đừng tái phát).
