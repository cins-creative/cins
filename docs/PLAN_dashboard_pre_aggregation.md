# PLAN: Tiền tổng hợp số liệu dashboard (pre-aggregation / rollup table)

Ngày: 07/08/2026 · Dựa trên scan codebase (`app/api/shop/bao-cao`, `lib/co-so/ops-dashboard.ts`, `supabase/sql/migration_social_su_kien.sql`)
Trạng thái: **PLAN — chưa implement**. Không có code trong phase này.

## Câu hỏi gốc

> Dữ liệu lớn dần, mỗi lần mở dashboard lại query từng nội dung riêng. Nhiều người cùng xem thì server chịu không nổi. Có cách nào snapshot vào một bảng riêng + có quy luật cập nhật, để xem theo năm / nhiều năm vẫn không quá tải? Kỹ thuật này tên gì và xoay quanh nó có những yếu tố nào?

---

## 1. Tên kỹ thuật

Không có một tên duy nhất — đây là một họ kỹ thuật, mỗi tên nhấn vào một khía cạnh khác nhau. Điều bạn mô tả nằm ở giao của các tên sau:

| Tên | Nhấn vào điều gì | Liên quan thế nào |
|---|---|---|
| **Pre-aggregation** / **Pre-computation** (tiền tổng hợp) | Tính trước thay vì tính lúc đọc | Tên chung nhất, đúng nhất cho câu hỏi |
| **Summary table** / **Rollup table** / **Aggregate table** | Kết quả nằm ở **bảng thật** | Chính là "bảng riêng" bạn nói |
| **Materialized view** | Postgres tự quản lý, `REFRESH` để làm mới | Anh em gần, nhưng có nhược điểm nặng — xem §5 |
| **Incremental rollup** / **Incremental View Maintenance (IVM)** | Chỉ tính lại phần thay đổi | Chính là phần "quy luật update" |
| **Dimensional modeling** — fact table + dimension, **star schema** (Kimball) | Cách thiết kế bảng số liệu | Nguồn gốc lý thuyết của grain / measure / dimension |
| **Aggregate navigation** / **aggregate awareness** | Xem theo ngày → đọc bảng ngày; xem theo năm → đọc bảng tháng | Chính là phần "xem theo năm – nhiều năm không quá tải" |
| **CQRS + read model** (projection) | Tách mô hình **ghi** (chuẩn hóa, OLTP) khỏi mô hình **đọc** (bẹt, tối ưu dashboard) | Khung tư duy kiến trúc bao trùm |
| **Lambda architecture** (batch layer + speed layer) | Lịch sử tính theo lô, hôm nay tính live rồi cộng vào | Cách xử lý "số hôm nay phải tươi" |
| **OLTP vs OLAP** | Cơ sở dữ liệu giao dịch vs phân tích | Lý do tại sao dashboard làm chậm cả app |
| **Denormalization / counter cache** | Nhét sẵn con số vào cột | Bản thu nhỏ nhất của cùng ý tưởng |

Nếu phải chọn **một** cụm để tra cứu tiếp: **"incremental rollup / summary table for analytics"**. Nếu muốn khung tư duy: **"CQRS read model"**.

Bản chất chung của cả họ này chỉ là một phép đánh đổi: **space-time tradeoff** — bỏ thêm dung lượng lưu trữ và một job chạy nền, đổi lấy việc đọc rẻ đi vài bậc.

---

## 2. Hiện trạng repo — đã có 80% một bản mẫu chuẩn

Repo **đã có sẵn** đúng pattern này, làm khá chuẩn, ở domain social:

`supabase/sql/migration_social_su_kien.sql`

- Bảng rollup **`social_thong_ke_doi_tuong_ngay`** — grain `(loai_doi_tuong, id_doi_tuong, ngay)`, các cột đo `luot_tiep_can`, `tiep_can_unique`, `luot_xem_noi_dung`… + `cap_nhat_luc`.
- `UNIQUE (loai_doi_tuong, id_doi_tuong, ngay)` + `INSERT … ON CONFLICT DO UPDATE` → **idempotent**, chạy lại cùng một ngày không nhân đôi số.
- Hàm `social_rollup_su_kien(p_ngay date)` — `SECURITY DEFINER`, `REVOKE` khỏi `anon`/`authenticated`.
- Chốt ngày theo **`AT TIME ZONE 'Asia/Ho_Chi_Minh'`**, không theo UTC.
- Watermark `da_xu_ly_hint` trên `social_luot_xem` để biết event nào đã gộp.
- Index `(loai_doi_tuong, id_doi_tuong, ngay DESC)`.
- RLS bật, **không** policy public → chỉ service role đọc.

Thiếu đúng **hai mảnh**:

1. **Không có lịch chạy.** Hàm tồn tại nhưng không ai gọi — `CINS_DECISIONS.md` O21 ghi rõ repo chưa có cron (`wrangler.jsonc` không `triggers`, không pg_cron).
2. **App vẫn không đọc bảng rollup.** `lib/social/su-kien.ts` gọi RPC `social_insight_*` quét thẳng `social_luot_xem` (bảng event thô, partition theo tháng) mỗi lần mở modal số liệu.

Nghĩa là: **bạn không cần phát minh gì mới, chỉ cần nhân bản pattern đã có sang các domain còn lại và cắm lịch chạy.**

### Các dashboard còn lại đang "query rồi cộng trong JS"

| Nơi | Cách làm hiện tại | Vấn đề khi dữ liệu lớn |
|---|---|---|
| `app/api/shop/bao-cao/route.ts` | `select(...).limit(500)` rồi `for` cộng dồn trong Node | Xem §3 — **sai số**, không chỉ chậm |
| `lib/co-so/ops-dashboard.ts` → `getDoanhThuSummary` | `select` toàn bộ `org_don_hoc_phi` của org, **không LIMIT**, cộng trong JS | Kéo cả nghìn dòng qua mạng mỗi lần mở trang; và PostgREST có trần `max-rows` → cắt âm thầm |
| `lib/co-so/ops-dashboard.ts` → `getMarketingFunnel` | 3 query nối tiếp + `.length` / `.filter().length` trong JS | Đếm bằng cách tải hết dòng về |
| `AdminNguoiDungGrowthDashboard` | Phân trang `user_nguoi_dung.tao_luc` (trần ~50k dòng) rồi đếm theo ngày trong JS | Trần cứng; vượt là biểu đồ sai |
| `/admin/analytics`, `/studio/[slug]/quan-ly/analytics` | Placeholder / scaffold | Chưa nối — **đúng thời điểm để làm đúng ngay từ đầu** |

Điểm chung: **đang dùng Node làm engine tổng hợp thay cho Postgres.** Đây là kiểu tốn kém nhất — vừa tốn băng thông kéo dòng thô, vừa tốn RAM Worker, vừa không tận dụng được index, và nhân lên theo số người xem đồng thời.

---

## 3. Hai chỗ đang **sai số**, không chỉ chậm

Cần ghi nhận riêng vì đây là bug đúng-sai, không phải bug hiệu năng — và pre-aggregation sẽ xóa cả hai:

**(a) `Tổng doanh thu` của shop bị cắt ở 500 đơn.**
`app/api/shop/bao-cao/route.ts` lấy `.order("tao_luc", desc).limit(500)`, rồi cộng `tong_tien` của tập đó và trả về field `tongDoanhThu`. `components/shop/ShopBaoCaoClient.tsx` hiển thị nó dưới nhãn **"Tổng doanh thu"**. Seller vượt 500 đơn sẽ thấy con số **im lặng thiếu đi phần lịch sử cũ** — và càng bán được nhiều thì càng sai. Cũng vậy với `tongDonHoanThanh`, `tongDonHuy`, `trangThaiDon`.

**(b) Cộng lẫn nhiều loại tiền tệ.**
Cùng file: `tongDoanhThu += soTien` không phân biệt `don.tien_te`, trong khi `tienTe` trả về được lấy từ `dons.find(d => d.tien_te)` — tức là **đơn vị tiền của một đơn bất kỳ** được gán cho tổng của tất cả các đơn. Nếu một seller từng có đơn khác VND thì con số hiển thị vô nghĩa.

→ Kết luận thiết kế: **grain của bảng rollup shop phải bao gồm `tien_te`**, và số tổng phải xuất phát từ `SUM` của Postgres trên toàn bộ lịch sử, không từ một cửa sổ `limit`.

---

## 4. Các yếu tố xoay quanh kỹ thuật này

Đây là phần trả lời "có những yếu tố nào". Xếp theo thứ tự phải quyết định.

### 4.1 Grain — độ hạt (quyết định quan trọng nhất)

Grain = "một dòng trong bảng rollup đại diện cho cái gì". Ví dụ: *một người bán, trong một ngày, ở một loại tiền tệ*.

Chọn grain quá thô → sau này muốn xem chi tiết hơn thì phải backfill lại từ đầu. Chọn quá mịn → bảng rollup phình gần bằng bảng gốc, mất hết lợi ích.

Quy tắc thực dụng: **grain thời gian = ngày**. Ngày là đơn vị nhỏ nhất mà người dùng thật sự lọc theo, và mọi cấp lớn hơn (tuần / tháng / quý / năm) đều `SUM` lên được từ ngày.

Con số cụ thể cho lo ngại "xem theo năm – nhiều năm": grain ngày nghĩa là **365 dòng/năm/chủ thể**. Xem báo cáo 5 năm của một seller = `SUM` trên ~1.825 dòng có index. Đó là dưới 1ms. Không cần cấp tháng cho đến khi số **chủ thể × ngày** trở nên lớn ở view toàn nền tảng.

### 4.2 Additivity — cộng được hay không cộng được

Phân loại từng cột đo:

- **Additive** — cộng được qua mọi chiều: doanh thu, số đơn, số lượt xem. Đây là loại dễ, chiếm đa số.
- **Semi-additive** — cộng được qua chiều này nhưng không qua thời gian: số dư, tồn kho, "số học viên đang học". Phải lấy `LAST` hoặc snapshot cuối kỳ, không `SUM`.
- **Non-additive** — không cộng được: tỉ lệ, phần trăm, trung bình, và đặc biệt là **`COUNT DISTINCT`**.

⚠️ **Cạm bẫy đang nằm sẵn trong repo:** cột `social_thong_ke_doi_tuong_ngay.tiep_can_unique` là `COUNT DISTINCT`. `SUM` 365 dòng của nó **không ra "số người duy nhất trong năm"** — nó ra "tổng của các con số unique theo từng ngày", một người ghé 300 ngày sẽ được đếm 300 lần. Ba lựa chọn:

1. **Trung thực về nhãn** — hiển thị "tổng lượt tiếp cận duy nhất theo ngày", không gọi là "số người". Rẻ nhất.
2. **Sketch xấp xỉ** — lưu thêm cột `hll` (extension `postgres_hll`) hoặc roaring bitmap. Sketch **hợp nhất được**, nên unique theo năm tính từ sketch ngày. Sai số ~1–2%.
3. **Rollup riêng cho từng cấp thời gian** — bảng tháng và bảng năm tính lại từ event thô. Chính xác tuyệt đối nhưng job nặng và phải giữ event thô lâu.

Với CINs, (1) cho hầu hết chỗ và (2) nếu về sau cần "reach thật" cấp org.

### 4.3 Chiều (dimension) và bùng nổ tổ hợp

Mỗi chiều thêm vào grain nhân số dòng lên. `(seller × ngày)` là N dòng; `(seller × ngày × trạng thái đơn × kênh × tiền tệ)` là N × 6 × 4 × 2. Nguyên tắc: **chỉ pre-aggregate những chiều mà dashboard thực sự có bộ lọc**. Chiều hiếm dùng thì để query live trên khoảng thời gian hẹp.

### 4.4 Chiến lược cập nhật — "quy luật update" bạn hỏi

Bốn kiểu, có thể phối:

| Kiểu | Cách | Ưu | Nhược |
|---|---|---|---|
| **Write-time** (trigger / UPSERT counter) | Trigger trên `shop_don_hang` cộng ngay vào bảng rollup | Realtime, luôn khớp | Thêm lock lên **đường ghi nóng**; nhiều giao dịch cùng chạm một dòng rollup → contention; rollback phức tạp. Repo đã dùng kiểu này ở chỗ nhẹ: `shop_nhom.so_mau` |
| **Batch định kỳ** (cron) | Job đêm tính lại các ngày cần tính | Đơn giản, không đụng đường ghi, dễ chạy lại | Có độ trễ |
| **Lazy / on-demand** | Tính khi có người mở dashboard, rồi lưu lại | Không cần hạ tầng cron | Người xui xẻo đầu tiên chịu độ trễ; cần chống chạy chồng. Repo đã dùng: `flushDirtyEngagementScores` cap 40/request |
| **Hybrid (Lambda)** | Lịch sử từ rollup + hôm nay tính live rồi cộng | Vừa rẻ vừa tươi | Hai đường code cho cùng một con số → phải test kỹ |

**Đề xuất cho CINs: batch đêm + hybrid cho ngày hôm nay.** Query live giới hạn trong đúng một ngày là rẻ; toàn bộ lịch sử đọc từ rollup.

### 4.5 Idempotency và khóa chống chạy chồng

Job phải chạy được nhiều lần cho cùng một ngày mà số không đổi → bắt buộc `UNIQUE` + `ON CONFLICT DO UPDATE` (pattern `social_rollup_su_kien` đã đúng). Không dùng `INSERT` trần, không dùng `DELETE` + `INSERT` (có cửa sổ dashboard thấy số 0).

Thêm **`pg_advisory_xact_lock`** để hai lần cron chồng nhau (hoặc cron + lazy) không cùng ghi một khoảng.

### 4.6 Late-arriving data — dữ liệu về muộn (điểm dễ sai nhất)

Đây là chỗ hầu hết bản pre-aggregation tự làm bị sai số sau vài tháng.

Đơn hàng ngày 3/8 bị **hủy** vào ngày 20/8. Học phí được **hoàn**. Bài viết bị `da_xoa = true`. Nếu job chỉ tính "ngày hôm qua", dòng rollup của 3/8 sẽ **đóng băng ở giá trị sai vĩnh viễn**.

Ba lớp phòng vệ, nên có cả ba:

1. **Reprocessing window** — mỗi đêm tính lại **N ngày gần nhất** (đề xuất N = 7 hoặc 14), không chỉ hôm qua. Rẻ và tự chữa lành phần lớn trường hợp.
2. **Dirty-day queue** — trigger nhẹ trên bảng nguồn: khi một bản ghi đổi trạng thái / bị soft-delete, ghi ngày gốc của nó vào hàng đợi `..._rollup_can_tinh_lai`. Job đọc hàng đợi và tính lại đúng những ngày đó, kể cả ngày rất cũ. Đây là cách duy nhất bắt được thay đổi ngoài cửa sổ N ngày.
3. **Reconciliation** — job đối soát hàng tuần: `SUM` rollup vs `SUM` bảng gốc cho vài tháng gần nhất; lệch thì cảnh báo. Không có bước này thì bạn sẽ không bao giờ biết mình đang báo cáo số sai.

Đi kèm là **restatement policy**: số quá khứ **có** được phép sửa không? Với báo cáo nội bộ thì có. Với hóa đơn / kỳ chốt phí (`org_ky_hoc`, kỳ phí CSĐT) thì **không** — kỳ đã chốt phải bất biến, chênh lệch ghi vào kỳ sau. Hai loại này không được dùng chung một bảng.

### 4.7 Múi giờ

Biên "ngày" phải theo `Asia/Ho_Chi_Minh`, không theo UTC — lệch 7 tiếng nghĩa là mọi đơn từ 00:00–07:00 giờ VN rơi nhầm sang ngày hôm trước. `social_rollup_su_kien` đã làm đúng; các rollup mới phải copy nguyên. Chốt luôn: **mọi cột `ngay` trong bảng rollup là ngày theo giờ VN**, ghi trong `COMMENT ON COLUMN`.

### 4.8 Backfill

Khi tạo bảng rollup mới hoặc thêm cột đo mới, phải tính lại toàn bộ lịch sử. Chạy **theo lô** (từng tháng một, có `COMMIT` giữa các lô) — một transaction ôm 3 năm dữ liệu sẽ giữ lock lâu, phình WAL, và nếu chết thì mất sạch. Script backfill phải **resume được** (nhớ đã tới tháng nào).

### 4.9 Versioning định nghĩa metric

"Doanh thu" gồm những trạng thái nào? Hiện `COMPLETED = {da_nhan_tien, da_giao_tai_su_kien, hoan_thanh}`. Ngày nào đó đổi định nghĩa → số lịch sử trong rollup đang theo định nghĩa cũ. Cần: hoặc backfill lại toàn bộ, hoặc ghi phiên bản công thức. Repo đã có tiền lệ: `content_feed_score_phien_ban`.

### 4.10 RLS và rò rỉ dữ liệu

Bảng rollup **bẹt** — nó mất hết ngữ cảnh quan hệ mà RLS của bảng gốc dựa vào. Đây là chỗ rò rỉ kinh điển.

⚠️ **Cực kỳ quan trọng với Supabase: PostgreSQL materialized view KHÔNG hỗ trợ RLS.** Policy không áp lên matview. Nếu matview nằm trong schema `public` thì PostgREST expose nó ra và **bất kỳ ai cũng đọc được toàn bộ**. Đây là một lý do đủ mạnh để chọn **bảng thật** thay vì materialized view.

Chuẩn cho CINs (theo đúng `social_thong_ke_doi_tuong_ngay`): bảng thật → `ENABLE ROW LEVEL SECURITY` → **không** policy nào → chỉ `service_role` chạm được → app kiểm tra quyền sở hữu ở tầng route (mẫu `canViewOrgBaiDangInsight`). Nếu về sau muốn mở policy đọc trực tiếp cho chủ sở hữu, nhớ `CINS_DEV_RULES.md` §5: RLS chạy per-row → mọi cột policy tham chiếu phải có index, và bọc `auth.uid()` thành `(select auth.uid())`.

### 4.11 Vòng đời dữ liệu & retention

Ba tầng, thời hạn giữ khác nhau:

- **Event thô** (`social_luot_xem`) — nặng nhất, giữ ngắn nhất (3–6 tháng). Đã partition theo tháng → **`DROP PARTITION` rẻ hơn `DELETE` rất nhiều**.
- **Rollup ngày** — giữ 2–3 năm.
- **Rollup tháng** — giữ vĩnh viễn (nhỏ xíu).

Chú ý thứ tự phụ thuộc: **không được xóa event thô trước khi rollup của khoảng đó đã chốt và đối soát xong.**

### 4.12 Freshness và giao tiếp với người dùng

Rollup nghĩa là số **không** realtime. Điều này chấp nhận được với báo cáo, nhưng phải nói ra: hiển thị `cap_nhat_luc` trên UI — *"Số liệu tính đến 07/08 06:00"*. Không có dòng này, người dùng sẽ báo bug "số sai" mỗi lần họ vừa bán được một đơn.

### 4.13 Hạ tầng chạy job

Đây là quyết định **O21 đang treo** trong `CINS_DECISIONS.md`. Ba lựa chọn:

| Cách | Phù hợp khi | Ghi chú cho CINs |
|---|---|---|
| **pg_cron** | Job thuần SQL, không cần gọi mạng | Đơn giản nhất cho rollup. `social_rollup_su_kien` đã là `SECURITY DEFINER` → cắm được ngay, không cần route HTTP, không cần secret, không phụ thuộc Cloudflare |
| **Cloudflare Workers cron trigger** | Job cần logic TS / gọi API ngoài | Hướng O21 đang nghiêng về; cần thêm `triggers` vào `wrangler.jsonc` + route `/api/noi-bo/...` bảo vệ bằng `xacThucBearerSecret()` (mẫu `phi-cron.ts`) |
| **GitHub Actions schedule** | Dự phòng | Đã dùng cho autopilot; kém tin cậy về giờ giấc |

Đề xuất tách bạch: **rollup thuần SQL → pg_cron. Job cần logic app (thông báo, gọi Sepay…) → Workers cron.** Không ép hai loại vào một cơ chế.

### 4.14 Giám sát

Job chạy nền chết **im lặng**. Dashboard vẫn hiện số — số cũ. Tối thiểu: log mỗi lần chạy (thời điểm, số dòng, thời lượng); cảnh báo khi `max(cap_nhat_luc)` của bảng rollup cũ hơn ngưỡng.

### 4.15 Cache vẫn còn chỗ đứng

Rollup và cache **không thay thế nhau**. Sau khi có rollup, endpoint dashboard vẫn nên có cache ngắn (`unstable_cache` với `revalidate`, theo mẫu `lib/truong/queries.ts`) — vì dữ liệu ngày hôm qua trở về trước **không đổi trong suốt ngày hôm nay**. Đây mới là thứ trả lời trực tiếp lo ngại "nhiều người cùng xem": 100 người xem cùng báo cáo tháng chỉ tốn 1 query.

Lưu ý `CINS_DEV_RULES.md` §8 — không tự ý thêm tầng cache mới trong lúc refactor khác; bước này phải là một session riêng, có chủ đích.

### 4.16 Khi nào thì rollup trong Postgres là không đủ

Thang leo, để biết mình đang ở nấc nào:

1. Query trực tiếp + index → **đủ cho đến khi bảng vài triệu dòng**
2. Rollup ngày trong Postgres + cron → **đủ cho đến hàng trăm triệu dòng event**
3. Cột store chuyên dụng (ClickHouse / BigQuery / DuckDB) → khi cần ad-hoc analytics tự do trên tỉ dòng

CINs **đang ở nấc 1 và cần lên nấc 2**. Nấc 3 còn rất xa; nhắc ra chỉ để bạn biết đường lui, đừng xây sớm.

*(Ghi chú: TimescaleDB `continuous aggregates` giải đúng bài này ở tầng extension, nhưng không nên phụ thuộc vào nó trên Supabase hosted. Bảng rollup tự viết cho kết quả tương đương và bạn kiểm soát hoàn toàn.)*

---

## 5. Materialized view hay bảng thật?

Câu hỏi bạn hỏi là "snapshot vào 1 bảng riêng" — và với Postgres/Supabase, **bảng thật là lựa chọn đúng**, không phải materialized view. Lý do:

| | Materialized view | Bảng rollup thật |
|---|---|---|
| Cập nhật một phần | ❌ Postgres core **không** có incremental refresh — `REFRESH MATERIALIZED VIEW` tính lại **toàn bộ** từ đầu. Với dữ liệu nhiều năm, chi phí refresh tăng tuyến tính mãi mãi | ✅ `UPSERT` đúng những ngày cần |
| Khóa khi refresh | Khóa đọc, trừ khi `CONCURRENTLY` (bắt buộc có unique index, và chậm hơn) | ✅ Không khóa dashboard |
| RLS | ❌ **Không hỗ trợ RLS** — footgun bảo mật trên Supabase | ✅ RLS đầy đủ |
| Late-arriving data | Tự đúng (vì tính lại hết) — ưu điểm duy nhất | Phải chủ động xử lý (§4.6) |
| Sửa tay một dòng | ❌ | ✅ |

Materialized view chỉ đáng dùng cho bảng **nhỏ, không nhạy cảm, refresh toàn bộ vẫn rẻ** — ví dụ bảng xếp hạng công khai. Không dùng cho báo cáo doanh thu nhiều năm.

---

## 6. Thiết kế đề xuất cho CINs

### Quy ước đặt tên

Theo tiền lệ đã có: `<domain>_thong_ke_<chủ thể>_<đơn vị thời gian>`.

### Các bảng

| Bảng | Grain | Cột đo (additive) | Thay thế cho |
|---|---|---|---|
| `shop_thong_ke_ban_hang_ngay` | `(id_nguoi_ban, ngay, tien_te)` | `doanh_thu`, `so_don_chot`, `so_don_huy`, `so_don_cho`, `so_luong_ban` | `app/api/shop/bao-cao/route.ts` |
| `shop_thong_ke_san_pham_ngay` | `(id_nguoi_ban, id_bien_the, ngay)` | `so_luong`, `doanh_thu` | Phần "top sản phẩm bán chạy" |
| `org_thong_ke_hoc_phi_ngay` | `(id_to_chuc, ngay, kenh)` | `so_tien_vnd`, `so_don_da_nhan`, `so_don_cho` | `getDoanhThuSummary` |
| `cins_thong_ke_nen_tang_ngay` | `(ngay)` | `nguoi_dung_moi`, `bai_dang_moi`, `don_hang_moi`… | `AdminNguoiDungGrowthDashboard`, `/admin/analytics` |
| `social_thong_ke_doi_tuong_ngay` | **đã tồn tại** | đã có | Cắm cron + đọc từ nó thay vì RPC quét thô |

Mọi bảng đều có: `cap_nhat_luc timestamptz`, `UNIQUE` trên toàn bộ grain, index `(chủ thể, ngay DESC)`, `ENABLE ROW LEVEL SECURITY` không policy.

**Chưa làm cấp tháng.** Với grain ngày, xem 5 năm chỉ là ~1.825 dòng — thêm bảng tháng lúc này là tối ưu sớm và nhân đôi bề mặt lỗi. Chỉ thêm khi view **toàn nền tảng** (admin, tổng mọi seller) thực sự chậm; lúc đó bảng tháng tính từ bảng ngày, không tính lại từ đơn hàng.

### Hàng đợi tính lại

Một bảng dùng chung cho mọi domain:

```
cins_rollup_can_tinh_lai(pham_vi text, khoa text, ngay date, tao_luc)
  UNIQUE (pham_vi, khoa, ngay)
```

Trigger `AFTER UPDATE OR DELETE` trên `shop_don_hang`, `org_don_hoc_phi` → ghi ngày gốc của bản ghi vào đây. Trigger chỉ `INSERT … ON CONFLICT DO NOTHING` một dòng nhỏ nên gần như không ảnh hưởng đường ghi.

### Quy luật cập nhật (trả lời trực tiếp câu hỏi)

```
Mỗi giờ (pg_cron):
  1. advisory lock theo pham_vi — bỏ qua nếu lần chạy trước còn chạy
  2. rollup 7 ngày gần nhất            ← reprocessing window
  3. rollup mọi ngày trong cins_rollup_can_tinh_lai → xóa khỏi hàng đợi
  4. ghi log: số ngày đã xử lý, thời lượng

Chủ nhật hàng tuần:
  5. đối soát rollup vs bảng gốc, 90 ngày gần nhất → cảnh báo nếu lệch

Khi đọc dashboard:
  lịch sử  → SELECT … FROM <rollup> WHERE ngay < CURRENT_DATE(VN)   -- rẻ
  hôm nay  → tính live từ bảng gốc, phạm vi đúng 1 ngày             -- vẫn rẻ
  cộng hai phần lại, bọc unstable_cache revalidate ngắn
  hiển thị cap_nhat_luc lên UI
```

---

## 7. Các bước triển khai

Mỗi bước một session riêng, không gộp (theo `AUTO_MODEL_SELECTOR` §Quy tắc hành vi).

| Bước | Việc | Rủi ro | Vì sao theo thứ tự này |
|---|---|---|---|
| 1 | **Cắm cron cho `social_rollup_su_kien` đã có** (pg_cron) + đóng O21 cho nhánh SQL | Thấp | Chứng minh cả cơ chế trên một hàm đã viết sẵn, chưa đụng bảng mới. Nếu bước này trục trặc thì mọi bước sau vô nghĩa |
| 2 | Chuyển `getCotMocInsight` / `getOrgBaiDangInsight` đọc từ `social_thong_ke_doi_tuong_ngay` (hybrid: lịch sử rollup + hôm nay live) | Thấp–TB | Kiểm chứng pattern đọc hybrid trên domain ít nhạy cảm về tiền |
| 3 | **Sửa bug §3** (`limit(500)` + trộn tiền tệ) bằng query `SUM`/`GROUP BY` phía Postgres, **chưa** cần rollup | TB | Đây là bug đúng-sai, không nên chờ hạ tầng rollup. Và nó ép ta chốt định nghĩa metric trước khi đông cứng vào bảng |
| 4 | `cins_rollup_can_tinh_lai` + trigger trên `shop_don_hang`, `org_don_hoc_phi` | TB — đụng bảng ghi nóng | Hạ tầng chung, phải có trước rollup tiền |
| 5 | `shop_thong_ke_ban_hang_ngay` + hàm rollup + backfill theo lô + nối API báo cáo | TB | Domain có dữ liệu thật nhiều nhất |
| 6 | `org_thong_ke_hoc_phi_ngay` — tương tự | TB | Copy pattern bước 5 |
| 7 | `cins_thong_ke_nen_tang_ngay` → nối `/admin/analytics` + `/studio/[slug]/quan-ly/analytics` | Thấp | Hai trang đang là placeholder — làm đúng ngay từ đầu, không phải sửa lại |
| 8 | Job đối soát + cảnh báo `cap_nhat_luc` cũ | Thấp | Chỉ có ý nghĩa khi đã có ≥2 bảng chạy thật |
| 9 | Retention: `DROP PARTITION` event thô cũ + policy giữ dữ liệu | TB — **không hoàn tác được** | Chỉ làm sau khi bước 8 chạy sạch một thời gian |

Bước 1–3 độc lập với nhau, có thể làm song song. Bước 4 chặn 5–6.

## 8. Cần đo trước khi làm

Plan này dựa trên đọc code, **chưa có số**. Trước bước 3 nên lấy baseline, nếu không sẽ không biết bước nào đáng làm:

1. Seller có nhiều đơn nhất hiện có bao nhiêu đơn? (`SELECT id_nguoi_ban, count(*) FROM shop_don_hang GROUP BY 1 ORDER BY 2 DESC LIMIT 10`) — nếu chưa ai vượt 500 thì bug §3(a) là bom hẹn giờ chứ chưa nổ, và bước 3 hạ ưu tiên.
2. `social_luot_xem` hiện bao nhiêu dòng, tăng bao nhiêu dòng/ngày?
3. Thời gian thực tế của `GET /api/shop/bao-cao` và trang `co-so/[slug]/quan-ly/doanh-thu` trên dữ liệu thật (Supabase Dashboard → Logs, `pg_stat_statements`).
4. Có bao nhiêu đơn từng bị đổi trạng thái **sau** ngày tạo quá 7 ngày? — con số này quyết định cửa sổ reprocessing ở §4.6 nên là 7 hay 14 hay 30.

## 9. Không đụng tới

- Kỳ chốt phí nền tảng CSĐT (`org_ky_hoc`, `phi-ky.ts`) — kỳ đã chốt là **bất biến**, không được nằm chung cơ chế với rollup có thể tính lại (§4.6).
- Logic tính điểm feed `content_diem_feed` — đã có lộ trình scale 3 tầng riêng (`CINS_DECISIONS.md` **L30**), không gộp vào đây.
- Định nghĩa metric hiện tại — bước 3 mới là chỗ chốt lại, không đổi âm thầm trong lúc làm hạ tầng.
- Bảng gốc: plan này **chỉ thêm** bảng/trigger/index, **không ALTER** bảng nghiệp vụ hiện có (ngoài trigger). Mọi ALTER phát sinh cần duyệt riêng theo `CINS_DEV_RULES.md`.

---

## Tóm tắt một câu

Kỹ thuật này tên là **pre-aggregation bằng incremental rollup table** (khung tư duy: **CQRS read model**); repo đã có một bản mẫu đúng chuẩn ở `social_thong_ke_doi_tuong_ngay` chỉ thiếu lịch chạy; và yếu tố khó nhất không phải là tạo bảng mà là **grain**, **dữ liệu về muộn**, và **cột `COUNT DISTINCT` không cộng được**.
