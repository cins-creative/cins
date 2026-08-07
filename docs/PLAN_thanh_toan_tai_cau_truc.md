# PLAN — Tái cấu trúc thanh toán CINs (Billing)

> Trạng thái: **P0–P3b xong** · CF scheduled · chat + **Resend email** · **Journey ghim billing** ✅. P4 chờ Q2/Q3.
> Nguồn liên quan: `PLAN_csdt_phi_nen_tang_va_lead.md` · `CINS_DECISIONS.md` L33 · `lib/billing/*` · `lib/shop/dong-don.ts`.
>
> ## Handoff — mở chat mới bằng prompt này
>
> ```
> P4 sau Q2/Q3 (kế toán · PSP) — Grok 4.5 Medium.
> P0–P3b + CF scheduled + Resend + Journey ghim billing đã xong.
> ```
>
> ### Đã chốt
> - Trả sau toàn bộ · Billing trong Settings user owner · **Nợ gom về user owner** (1 tk / user)
> - Bên mua HĐ tách theo dòng dịch vụ (pháp nhân) · Tham số tiền → `/admin/tai-chinh`
> - Thu: QR+Sepay chính · thẻ sau · **bỏ uỷ nhiệm thu** · Không trừng phạt buyer
>
> ### P0 đã ship (không ALTER)
> - Ân hạn `hanTraTuThongBao` · `phanBoSoTienVaoKyNo` · salt `CSDT_PHI_MA_SALT` + retry mã CK
> - Soft lock `[ADMIN] ` · gate shop theo tỉ lệ · nút «Tôi đã chuyển rồi» (`tu_khai` trong `hoa_don_thong_tin`)
> - Env cần: `CSDT_PHI_MA_SALT` (khác `CSDT_PHI_CRON_SECRET`)
>
> ### P1 đã ship
> - Migration `cins_tk_thanh_toan` + `cins_dich_vu` + `cins_tk_nguoi_phu_trach` + RLS · `npm run migrate:cins-tk-thanh-toan`
> - Backfill: `npm run backfill:cins-tk-thanh-toan` (+ `--dry-run` rà multi-owner)
> - Lib `lib/billing/*` · adapter `HoaDon` từ `org_phi_ky` + `shop_phi_ky` (múi giờ VN hiển thị)
> - Hub `/tai-khoan/thanh-toan` · Settings «Thanh toán» · link `/ban-hang/cua-hang`
> - Bỏ tab «Phí CINs» nav · `/quan-ly/phi` → redirect hub · banner → hub
> - Người phụ trách (kế toán) qua API `/api/tai-khoan/thanh-toan/phu-trach`
>
> ### P2 đã ship (lõi)
> - Migration `cins_hoa_don` + dòng + `cins_thanh_toan` + `cins_phan_bo` · `npm run migrate:cins-hoa-don` / `backfill:cins-hoa-don`
> - Dual-write khi chốt CSĐT (`insertKy`) + shop (`chotKyPhiThang`); hub ưu tiên `cins_hoa_don`
> - Sepay → `ghiThanhToanSepayVaPhanBo` trước, legacy fallback
> - Shop **tối thiểu xuất kỳ** (default 50k) — dưới ngưỡng dồn tháng sau; admin khối «Phí shop»
> - Cron: `POST /api/noi-bo/billing/cron` · `.github/workflows/billing-cron.yml` · `wrangler.jsonc` `triggers.crons`
> - Chat hệ thống + **Resend email** + **Journey ghim** (live debt pin, không bảng mới) — `notify-hoa-don.ts` / `journey-ghim.ts`
>
> ### P3a đã ship
> - `migration_shop_dong_don_p3.sql` · `npm run migrate:shop-dong-don`
> - Buyer đã nhận / chưa nhận · im lặng tự đóng · `lib/shop/dong-don.ts` · admin «Đóng đơn shop»
>
> ### Còn treo
> Q2 kế toán · Q3 PSP · P4

---

## 0. Vì sao phải tái cấu trúc

Ba nguồn thu (cơ sở đào tạo · shop · ads tương lai) đang là ba hệ độc lập, và hai hệ đã tồn tại thì lệch nhau về gần như mọi thứ: cách chốt kỳ, cách thu tiền, cách khoá, múi giờ, và UI. Không có tầng nào biết tổng nợ của một chủ thể.

**Bất biến không được phá:** CINs **không cầm tiền** của người khác. Học phí học viên và tiền hàng người mua chuyển **thẳng** cho cơ sở / shop. Thứ duy nhất CINs thu là **phí nền tảng do bên bán trả ngược**. Mọi thiết kế dưới đây phải giữ nguyên điều này (L33 → không phải thu hộ/chi hộ → không cần giấy phép trung gian thanh toán).

**Hệ quả trực tiếp:** không làm ví trả trước. Số dư trả trước = giữ tiền khách = rủi ro pháp lý + nghĩa vụ hoàn tiền. **Toàn bộ mô hình là trả sau.**

---

## 1. Quyết định đã chốt với user (2026-08-07)

| Điểm | Chốt |
|---|---|
| Mô hình | **Trả sau toàn bộ.** Không ví trả trước, không giữ tiền khách |
| Chỗ đặt Billing | Trong **Settings của user owner** — không nằm trong nav vận hành `/quan-ly` |
| Chủ thể nợ | **Gom hết về user owner.** Một user = **một** tài khoản thanh toán, gánh nợ của mọi cơ sở + shop + ads của họ (chốt 2026-08-07, Q1) |
| Bên mua trên hoá đơn | **Tách khỏi chủ thể nợ.** Người chịu nợ là user, nhưng hoá đơn cho phép khai **pháp nhân** (tên công ty · MST) theo từng dòng dịch vụ — để cơ sở là công ty vẫn hạch toán được chi phí |
| Tham số tiền | **Toàn bộ** tỷ lệ · ngưỡng · hạn mức · số ngày đưa vào `/admin/tai-chinh`, không hardcode, không env (Q4) |
| Thu tiền tự động | **QR + Sepay** (đã chạy cho CSĐT) là đường chính · **thẻ token** làm sau · **uỷ nhiệm thu ngân hàng: bỏ** (hợp đồng ngân hàng + ký mandate từng khách, không đáng ở quy mô này) |
| Ads | Cho **chạy thử một lần có giới hạn**, không thu trước; sau lần đó phải trả hoá đơn kỳ 1 mới chạy tiếp |
| Cơ chế gộp | **Hạn mức + chốt kỳ khi đạt ngưỡng HOẶC hết tháng, cái nào tới trước.** Ngưỡng 2tr của CSĐT và "chạy thử" của ads là **cùng một cơ chế**, khác tham số |
| Kênh thông báo nợ | Noti + tin nhắn hệ thống + **mục ghim đầu Journey của chủ thể** (chỉ họ thấy) + **email** (hiện chưa có kênh email → phải làm) |
| Né phí shop | Người mua xác nhận đã nhận hàng → **tự đóng đơn** (không phải "phát hiện gian lận"). Im lặng quá hạn → **cũng tự đóng** |
| Người mua spam | **Không** trừng phạt, **không** điểm/nhãn người mua. Chỉ giới hạn mềm phía server + **nút chặn của shop** |

---

## 2. Lỗ hổng đã xác minh trong code (đầu vào của plan)

### Nhóm A — đang sai ngay bây giờ

| # | Lỗ hổng | Bằng chứng |
|---|---|---|
| A1 | **Phí shop không bao giờ được chốt.** Kỳ tạo ra ở `chua_chot`; thứ duy nhất chuyển sang `chua_tra` là `chotKyPhiThang`, chỉ được gọi từ route nội bộ. `wrangler.jsonc` **không có `triggers.crons`**. Shop **không có** đường lazy như CSĐT ⇒ CINs chưa thu được đồng nào từ shop | `lib/shop/phi.ts:96,248` · `app/api/noi-bo/shop/chot-ky-phi/route.ts` · `wrangler.jsonc` |
| A2 | **Seller không có UI trả phí.** `ShopPhiPanel` không được file nào import; và panel đó chỉ có nút nộp ảnh biên lai, **không hiện STK/QR** | `components/shop/ShopPhiPanel.tsx` |
| A3 | **Org im lặng bị khoá không ân hạn.** CSĐT chốt lazy khi có người mở dashboard. Org nghỉ 3 tháng → mở lại → chốt bù toàn bộ + `qua_han` ngay (hạn đã trôi qua) → khoá tức thì. Noti "đến hạn" chưa bao giờ gửi vì cron không chạy | `lib/co-so/phi-gate.ts:61` · `lib/co-so/phi-ky.ts:476` · `lib/co-so/phi-cron.ts:79` |
| A4 | **Trả đủ tiền vẫn có thể bị khoá + mất tiền thừa.** `org_phi_thanh_toan.id_ky` là 1-1, `ma_tham_chieu` theo từng kỳ. Nợ 2 kỳ chuyển 1 cục → dồn vào 1 kỳ, kỳ kia vẫn `qua_han`. Phần dư: plan ghi "trừ kỳ sau" nhưng `apDungSoTienVaoKy` chỉ cộng `da_tra_vnd` rồi dừng | `lib/co-so/phi-sepay.ts:122-137` · `PLAN_csdt_phi…md` §A6 |
| A5 | **Khoá shop bằng khiếu nại rác.** Gate khoá shop ở **≥5 khiếu nại mở**, không cân nhắc đúng/sai, không rate limit. Khiếu nại mở được trên đơn `huy`, mà huỷ đơn là **seller-only** ⇒ shop huỷ 5 đơn rác (hành động đúng) thì tự mở quyền khiếu nại cho kẻ spam → bị khoá | `lib/shop/gate.ts:38-42` · `lib/shop/khieu-nai.ts:219-248` (không có rate limit) · `lib/shop/don-hang.ts:1089` |

### Nhóm B — bẫy đặt sẵn, chưa nổ

| # | Lỗ hổng | Bằng chứng |
|---|---|---|
| B1 | **`ma_tham_chieu` đoán được + đụng mã làm chết việc chốt kỳ.** `sha256(orgId).slice(0,6)` không salt, `orgId` lộ ở URL/API ⇒ sinh được mã org khác, khớp không kiểm tra người chuyển. UNIQUE toàn bảng với 6 hex → hai org đụng prefix cùng YYMM làm **tạo kỳ thất bại**, không có salt/retry | `lib/co-so/phi-config.ts:59` · `lib/co-so/phi-ky.ts:234` |
| B2 | **Gate shop ghi đè `ly_do_khoa` vô điều kiện.** `applyShopGateFromSignals` tính lại từ 2 signal rồi ghi thẳng ⇒ khi có admin lock thủ công, lần recompute kế tiếp sẽ **tự mở khoá** | `lib/shop/gate.ts:51-59` |
| B3 | **Lệch múi giờ.** CSĐT chốt theo VN (`todayYmdVn`), shop dùng UTC ⇒ đơn hoàn thành 00:00–07:00 ngày 1 rơi vào tháng trước. Sẽ đụng nhau khi gộp hoá đơn | `lib/shop/phi-config.ts` vs `lib/co-so/phi-config.ts` |
| B4 | **Shop không có ngưỡng tối thiểu.** Phí 30k cũng chốt kỳ đòi tiền — chi phí đòi > số tiền. CSĐT đã có ngưỡng 2tr | `lib/shop/phi.ts:248` |
| B5 | **Đơn hoàn thành chỉ toàn bất lợi cho shop.** Bấm Hoàn thành = bị tính phí, không được gì ⇒ động cơ né. Đường né: không bao giờ bấm; đơn đứng ở `da_nhan_tien` vĩnh viễn | `lib/shop/don-hang.ts:961-1007` |

### Nhóm C — lỗ hổng của chính mô hình trả sau

| # | Lỗ hổng |
|---|---|
| C1 | **Không có bản ghi đồng thuận.** Trả sau = cấp tín dụng, mà không có gì lưu "chủ thể này đã đồng ý tỷ lệ X%, nghĩa vụ trả kỳ, lúc nào, theo phiên bản điều khoản nào". Tranh chấp là không có bằng chứng |
| C2 | **Thuế phát sinh trước khi thu được tiền.** Post-paid: thời điểm xuất hoá đơn gắn với hoàn thành dịch vụ, không phải nhận tiền ⇒ nộp VAT cho hoá đơn chưa thu. Nợ xấu thành chi phí thật |
| C3 | **Không ai biết tổng nợ của một chủ thể.** `id_to_chuc` / `id_nguoi_ban` / ads chưa định — ba hệ không biết nhau, không hạn mức chung |
| C4 | **Hoá đơn không có bảng kê.** Trang Phí chỉ hiện tổng kỳ ⇒ chắc chắn phát sinh "sao lại 3 triệu?" và không ai chịu trả |
| C5 | **Sepay là điểm chết đơn lẻ.** Webhook lỗi / khách ghi sai mã ⇒ người đã trả tiền vẫn bị khoá |
| C6 | **Ads "chạy thử" hở Sybil.** Neo "một lần thử" vào org/shop thì tạo org mới là có lần thử mới. Inventory hiển thị là hữu hạn — không phải chi phí biên bằng 0 |
| C7 | **Chưa có kênh email.** Chỉ có email auth/OTP (`lib/auth/send-signup-otp.ts`). Chuyện tiền cần bằng chứng đã thông báo; noti trong app khó chứng minh |

---

## 3. Kiến trúc đích

### 3.1 Khái niệm trung tâm

**Tài khoản thanh toán** (billing account) = **một user owner**. Mọi thứ khác treo vào nó.

```
Tài khoản thanh toán  ── 1 : 1 ──  user owner (Minh)
├── thông tin hoá đơn (mặc định: cá nhân Minh)
├── hạn mức chung + đồng thuận
├── dòng dịch vụ
│   ├── csdt_phi   → cơ sở Sine Art   [bên mua HĐ: Công ty Sine Art · MST …]
│   ├── csdt_phi   → cơ sở Nhà Vẽ     [bên mua HĐ: cá nhân Minh]
│   ├── shop_phi   → shop của Minh
│   └── ads        → tài khoản ads
│        └── hoá đơn kỳ  →  bảng kê từng dòng
├── thanh toán        (Sepay · thẻ · gán tay)  →  phân bổ vào nhiều hoá đơn
└── trạng thái gate   (hoạt động | cảnh báo | hạn chế | khoá)
```

**Lợi thế của việc gom về user owner (Q1):** tổng nợ của một người hiện ở **một chỗ**, nên C3 được giải quyết miễn phí — hạn mức tính chung, một lần chuyển khoản trả được nợ của cả cơ sở lẫn shop, và lịch sử nợ xấu gắn vào một identity nên không thể mở dịch vụ mới để trốn.

**Cái phải bù lại:** hoá đơn GTGT. Nếu cơ sở là công ty mà hoá đơn ghi tên cá nhân owner thì công ty **không hạch toán được chi phí** — họ sẽ phản ứng. Vì vậy `cins_dich_vu` có bộ thông tin bên mua riêng: người **chịu trách nhiệm trả** vẫn là user, nhưng **bên mua trên hoá đơn** khai theo pháp nhân của dòng dịch vụ đó.

**Tầng đo giữ nguyên, không chạm:** `org_phi_dong` (theo đơn học phí) và `shop_phi_dong` (theo GMV đơn) gắn chặt nghiệp vụ, đã chạy đúng, và `org_phi_dong` còn có `SET NULL` cố ý để cơ sở không né phí bằng cách gỡ ghi danh. Ads sẽ có tầng đo riêng của nó. **Chỉ hợp nhất từ hoá đơn trở lên.**

### 3.2 Một cơ chế, ba bộ tham số

| Dòng dịch vụ | Đo theo | Ngưỡng chốt | Tối thiểu xuất kỳ | Chế tài khi quá hạn |
|---|---|---|---|---|
| `csdt_phi` | % học phí ghi nhận | 2.000.000₫ rồi theo tháng | — | Khoá **thêm ghi danh mới** |
| `shop_phi` | % GMV đơn hoàn thành | theo tháng (+ ngưỡng mới) | **cần có** (B4) | Khoá **nhận đơn mới** |
| `ads` | mức tiêu dùng | mức chạy thử rồi theo tháng | — | **Ngưng ads** |

Mức răn đe khác nhau nên **hạn mức cho nợ phải khác nhau**: ads nợ thoáng nhất (ngưng ads là mất lợi ích ngay), shop trung bình, **cơ sở siết nhất** (có cơ sở chỉ dùng CINs như trang giới thiệu → khoá ghi danh không đau).

### 3.3 Chỗ đặt UI

Vì một user chỉ có **một** tài khoản thanh toán (Q1), không cần account switcher — hub là một trang duy nhất, chia theo dòng dịch vụ bên trong.

```
/tai-khoan/thanh-toan              → Tổng quan: tổng nợ · hạn gần nhất · hạn mức
                                     + tách theo dòng: Sine Art · Nhà Vẽ · Shop · Ads
  /hoa-don                         → danh sách + bảng kê từng dòng + biên lai + số HĐĐT
  /phuong-thuc                     → STK CINs + QR + mã CK · (sau) thẻ đã lưu
  /thong-tin                       → bên mua hoá đơn: mặc định + khai riêng từng dòng dịch vụ
  /khieu-nai                       → đối soát
```

Trong `/quan-ly` của cơ sở: **bỏ tab «Phí CINs»** khỏi nhóm `tien` (nhóm đó chỉ còn tiền cơ sở **thu**: Học phí · Doanh thu). Giữ `CsdtPhiGateBanner` + link. `/quan-ly/phi` → redirect, giữ `"phi"` trong union `OrgQuanLySection` để link cũ và noti đã gửi không vỡ.

Phía shop: thêm link trong `/ban-hang/cua-hang` → hub. **Không** dựng trang phí riêng cho shop.

---

## 4. Database (đề xuất — chưa migration)

Prefix `cins_` (phí nền tảng là doanh thu của chính CINs). **Không** dùng `payment_*` (FOUNDATIONS §13 giữ cho cổng thanh toán org bán khoá/sự kiện).

### `cins_tk_thanh_toan` — 1 : 1 với user owner
`id` · **`id_nguoi_dung` uuid UNIQUE** (chủ thể nợ — Q1) · thông tin hoá đơn mặc định (`ten_phap_nhan`, `mst`, `dia_chi`, `email_hoa_don` — nullable) · `han_muc_vnd` bigint (hạn mức **chung**) · `trang_thai` (`hoat_dong`|`canh_bao`|`han_che`|`khoa`) · `ly_do_khoa_tu_dong` · `ly_do_khoa_thu_cong` (**tách 2 cột — sửa B2**) · `no_da_xoa_vnd` bigint default 0 (§8) · `tao_luc`/`cap_nhat_luc`.

Tạo lazy: lần đầu user phát sinh phí ở bất kỳ dòng dịch vụ nào.

### `cins_tk_nguoi_phu_trach`
`id_tk` · `id_nguoi_dung` · `vai_tro` (`quan_ly`) · `tao_luc`. Owner luôn thấy tài khoản của mình qua `id_nguoi_dung`; bảng này chỉ để **thêm người xem/trả hộ** (kế toán được thuê) mà không cần cho quyền owner.

### `cins_tk_dong_thuan` — sửa C1
`id_tk` · `phien_ban_dieu_khoan` · `ty_le_snapshot` · `nguong_snapshot` · `dong_thuan_boi` uuid · `dong_thuan_luc`. Append-only. Không cho phát sinh nợ khi chưa có dòng đồng thuận hợp lệ.

### `cins_dich_vu`
`id_tk` · `loai` (`csdt_phi`|`shop_phi`|`ads`) · `tham_chieu_id` (orgId / sellerId / adsId) · `ty_le` · `nguong_chot_vnd` · `toi_thieu_xuat_ky_vnd` · `so_ngay_han_tra` · `da_dung_chay_thu` boolean · `trang_thai` · **bên mua hoá đơn của riêng dòng này**: `hd_ten_phap_nhan` · `hd_mst` · `hd_dia_chi` · `hd_email` (nullable → rơi về thông tin mặc định của tài khoản).
UNIQUE `(loai, tham_chieu_id)`.

Tham số `ty_le` / `nguong_chot_vnd` / `toi_thieu_xuat_ky_vnd` / `so_ngay_han_tra` ở đây là **snapshot lúc tạo dòng dịch vụ**, đọc mặc định từ `/admin/tai-chinh` (§4.9). Cho phép override từng chủ thể (deal riêng) nhưng phải ghi log ai sửa.

### `cins_hoa_don`
`id_tk` · `id_dich_vu` · `tu_ngay`/`den_ngay` · `ngay_chot` · **`thong_bao_luc`** · **`han_tra`** (= `thong_bao_luc + so_ngay_han_tra`, **không** tính từ `ngay_chot` — sửa A3) · `so_tien_vnd` · `dieu_chinh_vnd` (âm được) · `da_tra_vnd` · `trang_thai` · `ma_tham_chieu` UNIQUE · `tu_khai_da_tra_luc` (sửa C5) · `so_hoa_don` · `xuat_hoa_don_luc` · `hoa_don_thong_tin` jsonb (snapshot bên mua/bên bán lúc chốt).

`ma_tham_chieu` **có salt server-side** (env, không phải hàm thuần của id) + retry khi đụng UNIQUE — sửa B1.

### `cins_hoa_don_dong` — sửa C4
`id_hoa_don` · `nguon_loai` · `nguon_id` (id đơn học phí / đơn hàng / phiên ads) · `dien_giai` · `doanh_thu_vnd` · `ty_le` · `phi_vnd` · `loai_tru`. Bảng kê để chủ thể mở ra xem trước khi trả.

### `cins_thanh_toan` + `cins_phan_bo` — sửa A4
- `cins_thanh_toan`: `id_tk` (nullable = chưa khớp) · `nguon` (`sepay`|`the`|`gan_tay`) · `sepay_id` UNIQUE · `so_tien_vnd` · `con_lai_vnd` · `noi_dung` · `tai_khoan_nguon` (mask 4 số cuối) · `nhan_luc`.
- `cins_phan_bo`: `id_thanh_toan` · `id_hoa_don` · `so_tien_vnd` · `tao_luc`. **Một thanh toán trả nhiều hoá đơn; tiền thừa nằm ở `con_lai_vnd` và tự phân bổ cho hoá đơn kế tiếp.**

### `cins_phuong_thuc` — Phase 4
`id_tk` · `psp` · `token` · `brand` · `so_cuoi` · `het_han` · `mac_dinh`. **Không bao giờ chứa số thẻ.**

### 4.9 Tham số tập trung ở `/admin/tai-chinh` (Q4)

Mở rộng `cins_cau_hinh_tai_chinh` đã có. Nguyên tắc: **không hardcode, không env** cho bất kỳ con số tiền nào; env chỉ giữ secret. Mỗi lần lưu **insert dòng mới** (giữ lịch sử ai đổi gì lúc nào) và **chỉ áp cho dòng dịch vụ / hoá đơn tạo sau** — hoá đơn đã ghi không đổi.

| Khối | Tham số |
|---|---|
| Tỷ lệ | `csdt_ty_le` · `shop_ty_le` · `ads_don_gia` (sau) |
| Ngưỡng chốt kỳ | `csdt_nguong_kich_hoat_vnd` · `shop_nguong_kich_hoat_vnd` · `ads_muc_chay_thu_vnd` |
| Tối thiểu xuất kỳ | `csdt_toi_thieu_xuat_ky_vnd` · `shop_toi_thieu_xuat_ky_vnd` (sửa B4) |
| Hạn & ân hạn | `so_ngay_han_tra` (mặc định 7) · `so_ngay_an_han_tu_khai` (mặc định 3 — nút «tôi đã chuyển rồi») |
| Hạn mức nợ | `han_muc_csdt_vnd` · `han_muc_shop_vnd` · `han_muc_ads_vnd` (mức răn đe khác nhau → §3.2) |
| Đóng đơn shop | `shop_ngay_tu_dong_su_kien` · `shop_ngay_tu_dong_truc_tiep` · `shop_ngay_tu_dong_online` · `shop_ngay_khao_sat_*` · `shop_so_lan_cho_hoan` (§5 P3) |
| Chống spam | `buyer_toi_da_don_cho_xac_nhan` · `buyer_toi_da_don_moi_ngay` · `buyer_toi_da_khieu_nai_mo` |
| Gate tranh chấp | `shop_ti_le_tranh_chap_han_che` · `shop_ti_le_tranh_chap_khoa` · `shop_toi_thieu_don_de_tinh_ti_le` (sửa A5) |
| Xoá nợ | `no_nho_xoa_duoi_vnd` · `no_nho_xoa_sau_ngay` (§8) |
| STK + pháp nhân CINs | `bank_*` · `dn_*` · `xuat_hoa_don_bat` (đã có) |

Guard: xem = `canManageUsers`; sửa = **super_admin**. Bắt buộc `ghi_chu` khi đổi tỷ lệ / ngưỡng / hạn mức.

### Nối với bảng cũ
Thêm cột nullable `id_hoa_don` vào `org_phi_dong` / `shop_phi_dong`. `org_phi_ky` / `shop_phi_ky` **giữ nguyên** để không vỡ code đang chạy; ngưng ghi mới sau khi cắt sang `cins_hoa_don`.

---

## 5. Phase

### P0 — Vá máu (không đổi schema, không bật gate mới) ✅ 2026-08-07

1. ✅ **Ân hạn theo lúc thông báo** (A3): `hanTraTuThongBao` — khi chốt bù, `han_tra` tính từ hôm nay.
2. ✅ **Phân bổ tiền + tiền thừa** (A4): `phanBoSoTienVaoKyNo` — một CK trả nhiều kỳ theo hạn; dư cộng vào kỳ ưu tiên.
3. ✅ **Salt + retry `ma_tham_chieu`** (B1): env `CSDT_PHI_MA_SALT` + retry tới 8 lần khi đụng UNIQUE.
4. ✅ **Khóa thủ công không bị ghi đè** (B2): prefix `[ADMIN] ` trên `ly_do_khoa` (chưa ALTER cột riêng — soft).
5. ✅ **Gate tranh chấp theo tỉ lệ** (A5): không đếm KN trên đơn chưa nhận tiền; rate limit 3 KN mở / buyer; bỏ cho KN trên `huy`.
6. ✅ **Nút «Tôi đã chuyển rồi»** (C5): ghi `tu_khai_da_tra_luc` trong `hoa_don_thong_tin` → tạm mở rào 3 ngày.

> **Tuyệt đối không bật cron shop trong P0.** Bật cron trước khi seller có UI trả tiền = khoá hàng loạt shop không đường thoát (A1+A2).

### P1 — Tài khoản thanh toán + hub (đọc từ nguồn cũ, chưa migration hoá đơn) ✅ 2026-08-07

1. ✅ `cins_tk_thanh_toan` (1:1 user) + `cins_dich_vu` + backfill: mỗi org đang có phí → dòng `csdt_phi` gắn về **owner** của org; mỗi seller → dòng `shop_phi`. Org nhiều owner → chọn owner sớm nhất (`--dry-run` liệt kê).
2. ✅ Adapter đọc `org_phi_ky` + `shop_phi_ky` về một type `HoaDon` chung (chuẩn hoá múi giờ về VN — B3).
3. ✅ Hub `/tai-khoan/thanh-toan` — cộng nợ mọi dòng dịch vụ. Shop lần đầu có UI xem nợ + STK + QR + mã CK (A2).
4. ✅ Bỏ tab «Phí CINs» khỏi nav cơ sở + redirect.
5. ✅ `cins_tk_nguoi_phu_trach` — thêm người trả hộ (kế toán).

> **Cron shop vẫn chưa bật** — đợi P2 (hoá đơn hợp nhất + Sepay shop).
### P2 — Hoá đơn hợp nhất ✅ 2026-08-07 (lõi; email/Journey stub)

1. ✅ `cins_hoa_don` · `cins_hoa_don_dong` · `cins_thanh_toan` · `cins_phan_bo` (+ cột shop trên `cins_cau_hinh_tai_chinh`).
2. ✅ Dual-write CSĐT khi chốt (`insertKy` → `syncHoaDonTuOrgKy`); hub đọc `cins_hoa_don` trước. `org_phi_ky` vẫn ghi (chưa cắt hẳn — tránh vỡ lazy/gate).
3. ✅ Shop dual-write + **ngưỡng tối thiểu xuất kỳ** (B4, default 50k, admin «Phí shop»).
4. ✅ Sepay → `cins_thanh_toan` + `cins_phan_bo` (ưu tiên), legacy fallback.
5. ✅ Cron: `wrangler.jsonc` `triggers.crons` + GitHub Actions `billing-cron.yml` + `POST /api/noi-bo/billing/cron`.
6. ✅ Email hoá đơn qua **Resend** (`RESEND_API_KEY`) + chat hệ thống self-room. ✅ Journey ghim billing: live debt pin (`lib/billing/journey-ghim.ts` · `JourneyBillingPinBanner`, chỉ `isOwner`). ✅ CF Cron: `worker.ts`.

### P3 — Đóng đơn shop & chống né phí (B5)

#### P3a ✅ 2026-08-07
1. ✅ Buyer «Đã nhận hàng» → `hoan_thanh` + ghi phí (`dong_boi=buyer`).
2. ✅ Im lặng quá hạn → tự đóng (`dong_boi=he_thong`) qua `tickDongDonShop`.
3. ✅ «Chưa nhận» → hoãn N lần; hết lần → `moKhieuNaiTuHeThong` (không cáo buộc buyer).
4. ✅ Tham số trong `/admin/tai-chinh` khối «Đóng đơn shop».
5. ✅ Cron: `billing/cron` + `noi-bo/shop/dong-don`.

#### P3b ✅ 2026-08-07
6. ✅ «Đã bán» storefront/post + eligible đánh giá nhóm → chỉ `hoan_thanh` (`SHOP_DON_TINH_DA_BAN`).
7. ✅ Soft-limit: `buyer_toi_da_don_cho_xac_nhan` · `_moi_shop` · `_moi_ngay` — assert khi tạo đơn; admin khối «Soft-limit buyer»; migration `migration_shop_buyer_soft_limit_p3b.sql`.
8. ✅ Tin chat một phía: cột `chat_tin_nhan.chi_hien_cho` + RLS/list/realtime filter; khảo sát đóng đơn → `guiChatKhaoSatBuyerOnly` (system, chỉ buyer). Migration `migration_chat_chi_hien_cho_p3b.sql`.

Lazy tick: `tickDonHangDongDonLazy` khi GET `/api/shop/don/[id]`.

### P4 — Đồng thuận · hoá đơn điện tử · thẻ tự động

1. `cins_tk_dong_thuan` + chặn phát sinh nợ khi chưa đồng thuận (C1).
2. Bật xuất HĐĐT — **chờ kế toán** trả lời C2 trước.
3. Thẻ token qua PSP nội địa: hosted page của PSP, chỉ lưu token. Chốt kỳ → charge tự động; Sepay giữ làm đường thủ công.

### P5 — Ads

1. Tầng đo tiêu dùng + `cins_dich_vu.loai='ads'`.
2. Chạy thử neo vào **tài khoản thanh toán đã xác minh** (SĐT/MST), **không** neo vào org — chống Sybil (C6).
3. Hạn mức thoáng nhất trong ba dòng; quá hạn → ngưng ads.

---

## 6. Edge case

| Case | Xử lý |
|---|---|
| Org im lặng nhiều tháng | Chốt bù đủ kỳ, nhưng `han_tra` tính từ lúc thông báo |
| Trả một cục cho nhiều kỳ | `cins_phan_bo` chia theo thứ tự hạn gần nhất |
| CK thừa | `con_lai_vnd` giữ lại, tự phân bổ kỳ sau |
| CK sai mã | `id_tk = null` → khiếu nại → admin gán |
| Đụng `ma_tham_chieu` | Salt + retry, không để tạo kỳ thất bại |
| Sepay chết | Nút tự khai đã trả → mở tạm 3 ngày |
| Chưa điền STK CINs | Ẩn khối thanh toán, **hoãn** `qua_han` (lỗi của CINs) |
| Nợ nhỏ hơn ngưỡng | Dồn sang kỳ sau, không xuất hoá đơn |
| Đơn huỷ sau khi đã trả kỳ | `dieu_chinh_vnd` âm ở kỳ đang mở, **không sửa kỳ đã trả** (hoá đơn đã xuất không phải điều chỉnh) |
| Shop huỷ đơn rác rồi bị khiếu nại | Không đếm vào gate (A5) |
| **Owner chuyển giao cơ sở** (hệ quả của Q1) | Nợ **ở lại** tài khoản owner cũ; dòng dịch vụ chuyển sang tài khoản owner mới với hạn mức mới. Nợ cũ **không** khoá cơ sở dưới tay owner mới — nó chỉ chặn **người cũ** mở dịch vụ mới. Chuyển giao cần admin xác nhận để tránh dùng chiêu này để rửa nợ |
| Một người có 2 cơ sở + 1 shop | **Một** tài khoản thanh toán, 3 dòng dịch vụ, nợ cộng chung, mỗi dòng khai bên mua hoá đơn riêng |
| Cơ sở là công ty nhưng owner là cá nhân | Hoá đơn xuất theo `cins_dich_vu.hd_*` (pháp nhân); trách nhiệm trả vẫn ở user owner |
| Đổi tỷ lệ giữa kỳ | Dòng phí snapshot `ty_le` lúc ghi; kỳ cũ không đổi |
| Múi giờ | Tất cả về **VN (UTC+7)** — sửa shop (B3) |

---

## 7. Security

- Secret (`SEPAY_WEBHOOK_SECRET`, token PSP, cron secret, salt mã CK) ở **env**, không ở DB.
- `cins_thanh_toan` + cấu hình tài chính = **service-role only**. Không expose `tai_khoan_nguon` ra client.
- RLS: chủ thể đọc tài khoản mình phụ trách qua `cins_tk_nguoi_phu_trach`; ghi (trả phí, khiếu nại, sửa thông tin hoá đơn) = `chu` hoặc `quan_ly`.
- **Không bao giờ** lưu số thẻ. Chỉ token + brand + 4 số cuối + hạn.
- Bảng kê hoá đơn chứa thông tin học viên/người mua → chỉ chủ thể trả tiền đọc, không log.
- Số điện thoại / MST là PII: không log, không trả về cho user khác.

---

## 8. Xoá nợ & thu hồi — đề xuất (Q6)

Trả sau nghĩa là chắc chắn có người nợ rồi biến mất. Cần chính sách **trước** khi mở rộng, không phải sau.

**1. Không có phí trễ hạn, không tính lãi.** Với B2B nhỏ ở VN, lãi chậm trả tạo tranh chấp và làm xấu quan hệ nhiều hơn số tiền thu thêm. Chế tài duy nhất là **khoá dịch vụ** — CINs không giữ tiền của họ nên cũng không có đòn nào khác. Giữ đơn giản.

**2. Nợ nhỏ thì xoá tự động.** Dưới `no_nho_xoa_duoi_vnd` và quá `no_nho_xoa_sau_ngay` mà chưa trả → chuyển `mien`, ghi vào `no_da_xoa_vnd`, không đòi nữa. Chi phí đòi 50k lớn hơn 50k, và giữ nợ rác làm bẩn báo cáo lẫn quan hệ.

**3. Nợ lớn: không xoá, nhưng ngừng theo dõi.** Giữ nguyên số, chuyển hoá đơn sang `ngung_theo_doi` để không tính vào "phải thu" đang hoạt động. Dịch vụ khoá đến khi trả. Không tăng thêm, không sinh kỳ mới.

**4. Lịch sử nợ gắn vào user, không vào org.** Đây là lợi thế lớn nhất của Q1: đã bị xoá nợ hoặc đang `ngung_theo_doi` thì **mở cơ sở/shop mới cũng không được cấp hạn mức** — phải trả trước hoặc trả sạch nợ cũ. Không thể tạo pháp nhân mới để trốn.

**5. Ngưỡng vào cửa cho người lạ.** Chủ thể mới chưa có lịch sử trả → hạn mức thấp; trả đúng hạn 2–3 kỳ → nâng dần. Đây là cách rẻ nhất để giới hạn thiệt hại mà không cần thẩm định ai.

**6. Đừng ghi nhận doanh thu cho nợ chưa thu** — xem §9 Q2. Nếu chốt được cách xuất hoá đơn khi thu tiền thì nợ xấu chỉ là doanh thu **không phát sinh**, không phải chi phí phải gánh thuế.

---

## 9. Câu treo

| # | Câu | Trạng thái |
|---|---|---|
| Q1 | Chủ thể nợ | ✅ **Chốt:** gom hết về user owner; bên mua hoá đơn khai theo pháp nhân từng dòng dịch vụ (§3.1) |
| Q4 | Các ngưỡng / % / hạn mức | ✅ **Chốt:** đưa hết vào `/admin/tai-chinh` (§4.9) |
| Q5 | Mốc tự đóng đơn shop | ✅ **Đề xuất:** 3 / 7 / 14 ngày theo hình thức giao; hoãn 7 ngày, tối đa 2 lần (§5 P3) |
| Q6 | Xoá nợ & thu hồi | ✅ **Đề xuất:** không lãi trễ · nợ nhỏ xoá tự động · nợ lớn ngừng theo dõi · lịch sử gắn vào user · hạn mức tăng dần (§8) |
| **Q2** | **Thời điểm xuất hoá đơn khi trả sau + thuế suất.** Cần hỏi kế toán 3 câu: (a) cuối kỳ gửi **thông báo phí phải trả** rồi chỉ **xuất hoá đơn khi nhận được tiền** có được không? (b) nếu buộc xuất theo kỳ thì VAT phải nộp cho hoá đơn chưa thu xử lý thế nào? (c) thuế suất áp cho dịch vụ nền tảng là bao nhiêu? | ⏳ **Kế toán CINs** — chặn P4 |
| **Q3** | **PSP nào hỗ trợ lưu thẻ + charge định kỳ thật.** Hỏi từng bên (VNPay · OnePay · Momo · ZaloPay) 4 câu: (a) có trả về **token thẻ** dùng lại được không? (b) charge bằng token **không cần khách bấm/OTP** không? (c) điều kiện hợp đồng + phí mỗi giao dịch? (d) thẻ hết hạn / bị khoá thì API báo thế nào? | ⏳ **User + PSP** — chặn P4 |
