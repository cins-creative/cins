# PLAN — Trang thu thập thông tin để CINs dựng shop hộ (`/mo-shop`)

> Trạng thái: **Phase 1 + Phase 2 (admin list/duyệt) đã ship** (2026-08-11) — bảng + API + `/mo-shop` · admin `/admin/mo-shop` (+ form + chi tiết). Email xác nhận / checklist dựng shop vẫn treo.
> Ngày: 2026-08-11 · Giai đoạn: cold start, chưa có buyer.
> Cập nhật sau phản hồi: phí sàn **đang set 0%** · shop dựng hộ **thuộc chủ shop**, sẽ có chức năng **transfer** · nguồn lead chính là **bạn hàng của vợ anh** (uy tín cao trong giới bán fes).

---

## 0. Đọc trước khi làm — vấn đề thật sự là gì

Anh đang mô tả bài toán như "làm 1 form". Nhưng bản chất nó không phải form. Đây là bài toán **cold start hai chiều**: shop không lên vì chưa có khách, khách không tới vì chưa có shop. Anh chọn cách phá thế bế tắc bằng **concierge onboarding** — tự tay dựng shop cho họ. Đây là hướng đúng ở giai đoạn này.

Hệ quả quan trọng: cái anh cần **không phải form thu thập dữ liệu**, mà là **trang thuyết phục một artist đang không có lý do gì để tin anh, chịu bỏ ra 90 giây**. Dữ liệu chỉ là sản phẩm phụ.

Ba rào cản tâm lý phải phá theo đúng thứ tự:

| Rào cản | Câu hỏi trong đầu họ | Cách phá |
|---|---|---|
| **Lười** | "Lại phải nhập hàng, up ảnh, set giá à?" | "Bạn chỉ gửi link. Tôi làm hết." |
| **Nghi ngờ** | "Sàn nào cũng nói free rồi ăn phí sau. Thu tiền hộ rồi ôm luôn?" | 0% phí + **tiền vào thẳng STK của bạn, CINs không cầm tiền** |
| **Sợ mất kiểm soát** | "Tự nhiên có thằng lấy art của tôi dựng shop mang tên tôi?" | **Không public trước khi bạn duyệt.** Gỡ bất cứ lúc nào. |

Rào cản thứ 3 là thứ anh chưa nhắc tới trong brief, nhưng với giới artist Việt nó là rủi ro **lớn nhất**. Cộng đồng này cực nhạy chuyện art bị dùng không xin phép (drama AI/repost). Một bài đăng "CINs tự lấy ảnh của tôi dựng shop" có thể giết luôn kênh của anh ở giai đoạn này. Xem §6.

### 0.1 Điều chỉnh lớn: đây là tệp warm, không phải cold

Nguồn lead chính là **bạn hàng của vợ anh** — người đã có uy tín cao trong giới bán fes. Chi tiết này thay đổi khá nhiều thứ trong thiết kế trang, nên tách riêng ra đây.

**Thứ được lợi:** rào cản "nghi ngờ" ở bảng trên gần như đã được giải quyết trước khi họ mở link. Họ không cần bị thuyết phục rằng CINs không lừa — họ tin người giới thiệu. Nghĩa là **phần pitch có thể ngắn hơn nhiều so với thiết kế cho tệp lạnh**. Đừng viết một landing dài dòng chứng minh mình đáng tin cho người vốn đã tin; nó tạo cảm giác "sao phải cố giải thích thế".

**Hệ quả nên làm:**

- Rút phần thuyết phục xuống mức tối thiểu. *(Anh đã chốt đi xa hơn: bỏ hẳn, giải thích trong inbox — xem §2.)* Việc bảo chứng bằng tên vợ anh khi đó diễn ra tự nhiên ngay trong cuộc trò chuyện, không cần in lên trang.
- Thêm field **"Ai giới thiệu bạn?"** (optional, hoặc prefill từ query `?gt=`). Vừa để tri ân, vừa đo được kênh nào ra lead, vừa là một tín hiệu xác minh nhẹ chống mạo danh (§6.3).

**Thứ đắt hơn:** rủi ro không còn nằm ở uy tín CINs mà nằm ở **uy tín của vợ anh**. Đây là loại vốn khó xây, dễ mất, và không mua lại được bằng tiền. Nếu anh nhận 30 shop rồi dựng được 6, người chịu tiếng không phải "một startup nào đó" mà là chị ấy — bạn hàng sẽ nói với nhau. Vì vậy hai mục §6.1 (bản quyền ảnh) và §6.4 (ôm quá công suất) **quan trọng hơn** so với kịch bản cold ban đầu, chứ không nhẹ đi.

Nguyên tắc rút ra: **hứa ít hơn năng lực thật.** Với tệp warm, dựng đẹp 5 shop rồi để họ tự khoe trong nhóm sẽ kéo được nhiều hơn là nhận 30 shop và trễ hẹn.

---

## 1. Nguyên tắc thiết kế form

**Nguyên tắc vàng: chỉ hỏi những gì anh KHÔNG THỂ tự tìm ra.**

Anh sẽ tự dựng shop, nên anh tự lấy được: ảnh, tên sản phẩm, mô tả, phân loại, giá (nếu có trên album), fandom. Không hỏi mấy thứ đó. Mỗi field thừa là một cơ hội để họ đóng tab.

Thực chất chỉ có **3 thứ** anh không thể tự biết:

1. **Hàng ở đâu** → link resource
2. **Khách hỏi thì gọi ai** → kênh liên hệ
3. **Tiền chuyển vào đâu** → STK

Mọi thứ khác là optional.

### Field list

**Bắt buộc (5):**

| Field | Kiểu | Ghi chú |
|---|---|---|
| Tên shop / tên bạn | text | Đặt đầu tiên vì dễ trả lời nhất — tạo đà |
| Link hàng | textarea, mỗi dòng 1 link | Drive, album FB, Carrd, IG, TikTok Shop, Shopee — nhận hết |
| Kênh liên hệ | chọn kênh + ô giá trị | Zalo / Messenger / Instagram / Discord / Email |
| Email | email | Cần để **claim tài khoản** sau này (§4) |
| Đồng ý | 1 checkbox gộp | Điều khoản + cho phép dùng ảnh để dựng shop nháp |

**Tùy chọn (5):**

| Field | Kiểu | Vì sao optional |
|---|---|---|
| Loại hàng | chips multi-select | Anh tự phân loại được; chips chỉ để tăng tốc |
| Hình thức bán | có sẵn / preorder / cả hai | Ảnh hưởng cách dựng nhưng hỏi được sau |
| STK nhận tiền | ngân hàng + số + tên chủ TK | **Cố tình để optional** — xem §6.2 |
| Đã có tài khoản CINs? | toggle + link profile | Nếu có, gắn shop vào account sẵn |
| Ghi chú | textarea | Chỗ xả những gì form không hỏi |

**Không hỏi:** giá từng món, tồn kho, size, phí ship, mô tả sản phẩm, ảnh upload. Tất cả đều lấy được từ link hoặc hỏi sau qua chat.

### Về textarea link thay vì repeater

Artist thường có nhiều nguồn rời rạc (page FB + IG + Drive). Repeater "thêm link" trông chuyên nghiệp hơn nhưng thêm 2 cú click. Textarea "dán tất cả link vào đây, mỗi dòng một cái" là ma sát thấp nhất, parse theo dòng ở backend. Chọn cái này.

### Về người không có link nào

Một số artist chỉ có ảnh trong máy, không có album public. Đừng dựng upload ảnh ở phase 1 (kéo theo Cloudflare Images, quota, progress UI). Thay bằng một dòng: *"Chưa có link công khai? Cứ để trống — tôi sẽ nhắn xin ảnh trực tiếp."* Xử lý qua chat.

### Layout

Một trang cuộn, không multi-step. Với ~8 field, multi-step tạo cảm giác dài hơn thực tế và tăng chỗ để bỏ cuộc. Chia 3 nhóm có tiêu đề rõ: **Shop của bạn → Hàng của bạn → Liên hệ & nhận tiền**. Mobile-first 360px, touch ≥44px (theo `CINS_DEV_RULES` §4).

---

## 2. Trang này là form, không phải landing page

> **Chốt (2026-08-11):** anh sẽ giải thích và trao đổi chi tiết trong inbox. Trang chỉ cần đủ để họ điền.

Điều này gạt bỏ phần lớn thiết kế "landing thuyết phục" ở bản trước. Lý do rất rõ: người mở link **đã nói chuyện với anh hoặc vợ anh rồi**. Bắt họ đọc lại một trang bán hàng những thứ vừa được giải thích trong chat là thừa, và tệ hơn — nó ngầm nói "tôi không tin bạn đã hiểu".

**Vậy trang này còn để làm gì, khi inbox làm được gần hết?**

Đúng một việc mà inbox làm *dở*: **tạo bản ghi có cấu trúc và có dấu thời gian**. Chat thì link nằm rải rác giữa 40 tin nhắn, STK gõ nhầm không ai biết, và quan trọng nhất — **không có bằng chứng đồng ý dùng ảnh** (§6.1). Đó mới là giá trị thật của trang. Định vị nó như vậy thì mọi quyết định thiết kế sau đều dễ.

### Bố cục mới

```
[Đầu trang]  1 dòng tiêu đề + 2 dòng phụ. Xác nhận họ đúng chỗ.
             "Gửi link hàng — CINs dựng shop hộ bạn."
             "0% phí · Tiền khách chuyển thẳng vào STK của bạn ·
              Shop là của bạn, không public trước khi bạn duyệt."

[FORM]       Ngay lập tức. ~90 giây.

[Cuối trang] 3 link nhỏ: Chính sách phí · Điều khoản · Liên hệ anh.
```

Ba ý ở dòng phụ **không phải để thuyết phục** — chúng để họ khỏi phải nhớ lại, và để người được bạn bè forward link (không qua inbox anh) vẫn hiểu ngay. Giữ đúng ba, đừng thêm.

**Bỏ hẳn:** hero lớn, section 3 bước, thẻ quyền lợi, FAQ dài. Những thứ đó chuyển vào inbox — nơi anh nói được đúng thứ từng người quan tâm, hiệu quả hơn nhiều so với đoán trước rồi viết sẵn.

**Tone:** anh đang *giúp*, không phải *tuyển*. Đừng viết "Đăng ký trở thành người bán trên CINs" — nghe như đơn xin việc.

**Lợi ích phụ đáng kể:** phạm vi phase 1 giảm mạnh. Không copywriting landing, không FAQ, không section marketing — chỉ còn form + API + bảng. Ship nhanh hơn nhiều (§10).

---

## 3. Cái gì lên trang, cái gì để inbox

### 3.1 Ba ý duy nhất trên trang

| Ý | Câu gợi ý | Đối chiếu |
|---|---|---|
| **0% phí** | "Không phí nền tảng, không cắt phần trăm đơn hàng." | Đúng cấu hình hiện hành — **đọc live từ config**, đừng hardcode (§3.2a) |
| **Tiền vào thẳng STK của bạn** | "CINs không cầm tiền. Khách chuyển khoản trực tiếp cho bạn." | Khớp `CINS_DECISIONS` L33 |
| **Shop là của bạn** | "CINs dựng hộ rồi bàn giao. Không public trước khi bạn duyệt." | `shop_hien_thi` · transfer §4 |

Ba ý này gánh hai vai: nhắc lại thứ đã nói trong inbox, và cứu trường hợp link bị forward cho người chưa nói chuyện với anh bao giờ.

### 3.2 ⚠️ Ba chỗ dễ tự bắn vào chân

**(a) 0% phí — đã kiểm tra lại, hệ thống xử lý đúng rồi. Vấn đề còn lại là đừng hardcode.**

Con số 5% trong code chỉ là **fallback khi DB trống** (`lib/shop/phi-config.ts` → `DEFAULT_TY_LE = 0.05`, `lib/cins/tai-chinh-config.ts` → `SHOP_PHI_TY_LE_DEFAULT`). Nguồn sự thật là `cins_cau_hinh_tai_chinh.shop_ty_le`, hiện anh đã set 0 → **0% là con số đang áp dụng thật**. Cảnh báo "hứa vĩnh viễn" ở bản trước không còn đúng, vì trang `/chinh-sach/phi-san` đã tự lo phần này:

- Render tỷ lệ **live** từ config (`getChinhSachPhiPayload("shop")` → `d.tyLePercent`), không viết cứng.
- Đã có cam kết công bố trước `d.camKetCongBoTruocNgay` ngày, kèm log thông báo lộ trình.
- Đã nói rõ "CINs không cầm tiền hàng" và "không phải hoa hồng đơn hàng" — trùng đúng thông điệp anh muốn đưa vào `/mo-shop`.

⇒ **Việc cần làm ở `/mo-shop`: đọc cùng nguồn config đó thay vì viết chữ "0%" cứng trong JSX.** Nếu hardcode, ngày anh đổi tỷ lệ sẽ có hai trang nói hai số khác nhau — đúng kiểu lỗi nhỏ nhưng phá niềm tin nặng, nhất là với tệp warm ở §0.1. Kèm link `/chinh-sach/phi-san` để ai muốn đọc kỹ thì đọc.

Một lưu ý phụ: hiện phí sàn là **phí sử dụng nền tảng theo tháng**, không phải cắt trên đơn. Nên câu trên `/mo-shop` chuẩn hơn là *"Hiện 0% — không phí nền tảng, không cắt phần trăm đơn hàng"*, tránh để họ hiểu nhầm rồi sau này ngạc nhiên khi thấy hoá đơn theo kỳ.

**(b) "Tiền vào thẳng STK" có mặt trái phải nói ra.**
CINs không cầm tiền ⇒ CINs **không** bảo đảm giao dịch, không hoàn tiền hộ. Nếu giấu điều này, đơn tranh chấp đầu tiên sẽ thành khủng hoảng niềm tin. Vì bỏ FAQ, ý này chuyển vào **checklist inbox** (§3.3) — và vẫn phải có trong Điều khoản. Đã có kênh khiếu nại (`shop_khieu_nai`) để hỗ trợ xử lý — hỗ trợ, không phải bảo hiểm.

**(c) Đừng hứa lượng khách.** Đang cold start, chưa có buyer. Hứa "tiếp cận hàng nghìn khách" là tự đặt bẫy, và với tệp warm thì lời hứa hụt còn đắt hơn. Khung đúng khi nói trong inbox: *"Shop của bạn sẵn sàng từ ngày đầu — khi khách tới, bạn đã ở đó."*

### 3.3 Checklist inbox (thay cho FAQ)

Vì phần giải thích chuyển hết sang chat, nó thành **quy trình vận hành**, không còn là nội dung web. Rủi ro của cách này: nói bằng miệng thì dễ quên, mỗi người nghe một kiểu, và khi có tranh cãi thì không có gì đối chiếu. Nên giữ một checklist cố định, nói đủ với mọi người:

- CINs lấy phí bao nhiêu, có cắt hoa hồng đơn không → **hiện 0%**
- Tiền khách trả đi thẳng STK của bạn; đổi lại, CINs không bảo đảm giao dịch (§3.2b)
- Shop đứng tên bạn, CINs chỉ dựng hộ rồi bàn giao
- Ảnh của bạn dùng để dựng shop nháp, không public trước khi bạn duyệt, gỡ bất cứ lúc nào
- Không độc quyền — cứ bán ở Facebook/Shopee bình thường
- Sau khi shop lên, bạn không phải làm gì nếu không muốn

Hai ý **bắt buộc** phải có dấu vết ngoài chat (bản quyền ảnh + phí), vì đó là hai thứ dễ thành tranh cãi nhất. Bản quyền ảnh đã có checkbox lưu `dong_y_luc` trong form; phí thì trỏ link `/chinh-sach/phi-san` — trang đó tự lưu lịch sử thay đổi.

---

## 4. Shop dựng hộ thuộc về chủ shop — đường bàn giao

Anh đã chốt: **shop thuộc chủ shop**, sau này có chức năng **transfer** để trao lại. Phần dưới là đường đi kỹ thuật cho quyết định đó.

**Bối cảnh:** phần lớn người điền form **chưa có tài khoản CINs**. Nhưng `shop_cua_hang` gắn `id_nguoi_dung`, và hub `/cua-hang` lọc theo `user_nguoi_dung.ban_hang_bat` + `shop_hien_thi`. Nghĩa là ở thời điểm dựng, shop buộc phải nằm dưới **một** `id_nguoi_dung` nào đó.

**Hai đường bàn giao — nên làm cả hai, dùng tuỳ trường hợp:**

- **(1) Claim bằng email — không cần code mới.** Anh dựng shop dưới tài khoản tạo bằng **chính email họ điền**. Họ đăng nhập Google / đặt mật khẩu bằng email đó là shop đã của họ, không cần transfer gì cả. Đây là lý do email là field **bắt buộc** dù kênh liên hệ chính là Zalo. Dùng cho người chưa có tài khoản CINs — tức đa số giai đoạn này.
- **(2) Transfer chủ sở hữu — cần build.** Đổi `shop_cua_hang.id_nguoi_dung` sang user đích, kèm chuyển theo các bảng con gắn `id_nguoi_dung` (`shop_nhom`, `shop_san_pham` — hai bảng này gắn user chứ không gắn cửa hàng, phải rà kỹ khi implement), và `shop_phuong_thuc_tt`. Dùng khi họ **đã có sẵn tài khoản CINs** dưới email khác, hoặc khi anh lỡ dựng dưới tài khoản staging của mình.

**Thứ tự ưu tiên:** đường (1) đủ để chạy phase 1–2 mà không cần viết dòng code transfer nào. Đường (2) là tính năng thật sự (có UI, có xác nhận hai chiều, có audit log) — xếp vào phase 3, đừng để nó chặn việc mở form.

**Cảnh báo khi implement transfer:** vì `shop_nhom` và `shop_san_pham` gắn trực tiếp `id_nguoi_dung` (không phải `id_cua_hang`), transfer thiếu sót sẽ tạo trạng thái nửa vời — shop của người A nhưng hàng vẫn của người B, kéo theo lỗi quyền và lỗi hiển thị khó lần. Phải làm trong transaction và có script đối soát sau khi chuyển.

Điểm khớp đẹp: trạng thái "shop đã dựng nhưng chưa công khai" **không cần schema mới** — chính là `ban_hang_bat = true` + `shop_hien_thi = false`. Đúng cơ chế "duyệt rồi mới lên sóng" ở §2.

**Quy tắc đạo đức tự đặt:** chỉ tạo tài khoản sau khi họ **xác nhận qua kênh liên hệ**, không tạo hàng loạt từ lead thô. Số lượng giai đoạn này còn ít, làm tay được.

**Nên nói ra trên trang.** Với tệp warm ở §0.1, câu *"Shop là của bạn — CINs chỉ dựng hộ, bàn giao lại cho tài khoản của bạn"* là một trong những câu đáng giá nhất trên trang. Nó trả lời trước câu hỏi mà không ai hỏi thẳng nhưng ai cũng nghĩ: *"dựng free vậy rồi shop đứng tên ai?"*

---

## 5. Dữ liệu: bảng lead riêng, không đụng `shop_*`

**Đừng** ghi thẳng vào `shop_cua_hang`. Lead ≠ shop: lead có vòng đời riêng, có thể bị từ chối, trùng, spam. Trộn vào sẽ làm bẩn hub `/cua-hang`.

Bảng mới `shop_dang_ky_mo` (đặt tên theo quy ước `CINS_FOUNDATIONS`: tiền tố `shop_`, cột tiếng Việt không dấu):

| Nhóm | Cột |
|---|---|
| Định danh | `id`, `tao_luc`, `cap_nhat_luc` |
| Shop | `ten_shop`, `ten_lien_he`, `loai_hang` (text[]), `hinh_thuc_ban` |
| Resource | `resource_links` (text[]), `ghi_chu` |
| Liên hệ | `kenh_lien_he` (enum), `lien_he_gia_tri`, `email` |
| Thanh toán | `ngan_hang`, `so_tai_khoan`, `ten_chu_tk` (nullable) |
| Đồng ý | `dong_y_dieu_khoan`, `dong_y_dung_anh`, `dong_y_luc` |
| Xử lý | `trang_thai`, `ghi_chu_noi_bo`, `id_nguoi_dung`, `id_cua_hang` |
| Nguồn/chống spam | `nguon`, `ip_hash`, `user_agent` |

`trang_thai`: `moi` → `dang_lien_he` → `dang_dung` → `cho_duyet` → `da_public` (nhánh phụ: `tu_choi`, `tam_dung`).

Chuỗi trạng thái này chính là pipeline vận hành của anh. Có nó, anh biết đang tắc ở đâu: tắc ở `moi` = anh không liên hệ kịp; tắc ở `cho_duyet` = họ không phản hồi khi anh gửi bản nháp.

**RLS:** insert cho anon (qua API service-role, không insert trực tiếp từ client), select chỉ admin. Không expose bảng này ra public.

---

## 6. Rủi ro — phần quan trọng nhất

### 6.1 Bản quyền ảnh (rủi ro nghiêm trọng nhất)

Anh sẽ lấy artwork của người khác đăng lên một website thương mại. Kể cả họ tự gửi link, thiếu một câu ủy quyền rõ ràng là đủ để thành drama.

Bắt buộc:

- **Checkbox không tick sẵn**, chữ rõ nghĩa (không nhét vào "điều khoản chung"):
  > "Tôi đồng ý cho CINs sử dụng hình ảnh sản phẩm từ link tôi cung cấp để dựng gian hàng thử cho tôi. Shop chỉ công khai sau khi tôi duyệt."
- Lưu `dong_y_luc` (dấu thời gian) — bằng chứng khi cần.
- Cam kết gỡ trong 24h khi được yêu cầu, không hỏi lý do.
- Shop nháp phải **thật sự không công khai** (`shop_hien_thi = false`), không index, không lộ qua listing/API public. Kiểm tra kỹ điểm này trước khi mở form.

### 6.2 Vì sao STK nên optional

STK không phải bí mật (họ vốn công khai để nhận tiền), nhưng thu qua form public tạo hai vấn đề: tăng ma sát ở đúng lúc họ còn chưa tin anh, và tạo một kho dữ liệu tài chính từ nguồn chưa xác minh.

Đặt optional, kèm dòng *"Có thể gửi sau khi shop dựng xong."* Ai đã tin thì điền luôn; ai chưa tin vẫn submit được. **Bắt buộc xác nhận lại STK qua kênh liên hệ trước khi public** — sai một số tài khoản là mất tiền thật của người ta.

### 6.3 Mạo danh

Ai đó điền hộ/giả mạo shop khác. Chống bằng quy trình chứ không bằng code: **luôn xác nhận hai chiều qua kênh liên hệ trước khi public**. Không có bước này thì không lên sóng, không ngoại lệ.

Với tệp warm, việc này rẻ hơn nhiều: phần lớn lead là người vợ anh biết mặt, chỉ cần chị ấy xác nhận "đúng shop này" là xong. Field "ai giới thiệu bạn" (§0.1) chính là đầu mối đối chiếu. Lead lạ hoàn toàn, không ai giới thiệu → xếp riêng, xác minh kỹ hơn trước khi dựng.

### 6.4 Ôm nhiều hơn dựng nổi — với tệp warm, đây là rủi ro số một

Nhận 50 lead, dựng được 5 → 45 người có ấn tượng xấu, tệ hơn là không làm gì. Và ở đây người mất mặt là **vợ anh**, vì họ nhận lời qua chị ấy chứ không qua một cái website. Trong giới bán fes, chuyện này lan bằng miệng rất nhanh.

Cách xử lý:

- Nêu công suất thật — giờ trang đã gọn, chỗ tự nhiên nhất là **một dòng ngay trên nút gửi**: *"Đợt này nhận khoảng N shop."* Giới hạn còn tạo cảm giác được chọn.
- Khi đủ chỉ tiêu, chuyển form sang chế độ **danh sách chờ** thay vì đóng hẳn — vẫn nhận lead nhưng nói thẳng "đợt sau". Thà nói chờ còn hơn im lặng.
- Tự đặt trần: mỗi shop tốn bao nhiêu giờ dựng? Nhân với số lead. Nếu con số vượt quỹ thời gian tuần này, đừng nhận thêm dù lead đang về.

### 6.5 Spam

Chưa có captcha trong repo. Phase 1 đủ dùng: honeypot field ẩn + chặn submit dưới ~3 giây + rate limit theo IP + giới hạn độ dài (theo pattern `lib/gop-y/gop-y.ts` và rate limit ở `app/api/auth/login/route.ts`).

---

## 7. Sau khi submit — đừng để rơi vào hư không

Màn cảm ơn phải **cụ thể**, không phải "Cảm ơn bạn đã đăng ký":

> "Đã nhận. Tôi sẽ nhắn cho bạn qua **Zalo 0912…** trong vòng 48 giờ, kèm bản nháp shop để bạn xem trước.
> Nếu quá 48h chưa thấy, nhắn thẳng cho tôi ở [kênh]."

Nhắc lại đúng kênh + giá trị họ vừa điền → chứng minh dữ liệu đã tới nơi và tạo cam kết có thời hạn. Kèm email xác nhận tự động (phase 2).

Vì phần trao đổi diễn ra ở inbox, màn này còn một việc nữa: **nói rõ bước kế tiếp xảy ra ở đâu**. Người vừa điền form web dễ mặc định "chờ email", trong khi anh sẽ nhắn Zalo. Một câu chỉ đúng nơi sẽ tránh được mấy ngày im lặng hai chiều.

---

## 8. Đo lường

Vì trang đã rút còn form thuần và tệp là warm, phễu "xem → điền → submit" không còn nhiều thông tin — người mở link hầu hết đã đồng ý từ trước, tỷ lệ submit sẽ cao và không nói lên điều gì.

Chỉ số đáng theo dõi giờ nằm **sau** form, chính là chuỗi `trang_thai` ở §5: bao nhiêu lead thành shop public, và tắc ở khâu nào. Tắc ở `moi` = anh không liên hệ kịp. Tắc ở `cho_duyet` = họ không phản hồi khi nhận bản nháp — thường vì bản nháp chưa đủ thuyết phục hoặc anh nhắn sai kênh.

Vẫn nên giữ: field nào hay bị bỏ trống (biết field nào thừa) và tham số `?gt=` / `?tu=` lưu vào `nguon`.

Nếu view cao mà start thấp → hero/pitch sai. Start cao mà submit thấp → form hỏi quá nhiều hoặc vướng ở checkbox/STK.

---

## 9. Route & phân phối

Đề xuất **`/mo-shop`** — ngắn, kebab-case tiếng Việt, đúng convention `/cua-hang`, `/ban-hang/kho`. Đọc được qua điện thoại: *"cins.vn/mo-shop"*.

(Cân nhắc khác: `/dang-ky-ban-hang` dài và mang sắc thái "xin đăng ký"; `/cua-hang/mo` dễ nhầm với "cửa hàng đang mở".)

Link này sẽ đi chủ yếu qua **inbox cá nhân và nhóm chat của vợ anh**, không phải quảng cáo lạnh. Hai hệ quả:

- **OG image vẫn nên làm tử tế** — link dán vào Messenger/Zalo hiện preview, và preview xấu làm giảm cảm giác "chỗ này nghiêm túc". Nó cũng chính là thứ *thay* cho phần landing đã cắt: ba dòng trong preview là ấn tượng đầu, còn thuyết phục thì anh làm bằng lời trong chat. Nhưng đây không phải yếu tố quyết định như với tệp lạnh.
- **Nên hỗ trợ tham số giới thiệu**: `/mo-shop?gt=ten-nguoi-gioi-thieu`, lưu vào `nguon` và prefill field "ai giới thiệu bạn". Cho phép anh biết lead nào tới từ ai, và cho phép chị ấy gửi link riêng cho từng nhóm.

---

## 10. Phạm vi thực thi

| Phase | Nội dung | Model đề xuất |
|---|---|---|
| **1 — MVP** | Bảng `shop_dang_ky_mo` + RLS · `POST /api/mo-shop` (validate backend, honeypot, rate limit) · trang `/mo-shop` (**form thuần**, 3 dòng đầu trang, màn cảm ơn) · đọc tỷ lệ phí live từ config · OG image | Grok 4.5, effort Medium (có DB + API + RLS) |
| **2 — Vận hành** | Trang admin duyệt lead, đổi trạng thái, ghi chú nội bộ · email xác nhận tự động · checklist dựng shop | Grok 4.5, Medium |
| **3 — Tự động hoá & bàn giao** | Lead → tạo user + `shop_cua_hang` bán tự động · **transfer chủ sở hữu shop** (§4, nhớ `shop_nhom` / `shop_san_pham` gắn `id_nguoi_dung`) · link preview shop nháp cho chủ shop duyệt | Cần plan riêng |

**Ghi chú kỹ thuật:** không dùng shadcn (repo không có), dùng token `app/cins-design-tokens.css` + CSS module riêng theo pattern `cua-hang-listing.css`. Validation viết tay theo pattern `lib/gop-y/gop-y.ts`, không thêm Zod trừ khi quyết định đổi convention toàn repo.

---

## 11. Câu hỏi cần anh chốt trước khi code

1. **Route:** `/mo-shop` hay tên khác?
2. ~~Nêu tên vợ anh trên trang~~ — không còn cần, việc bảo chứng diễn ra trong inbox (§2). Thay bằng: **checklist inbox ở §3.3 đã đủ chưa**, có ý nào anh muốn thêm/bớt?
3. **STK:** optional (khuyến nghị) hay bắt buộc?
4. **Công suất:** đợt đầu nhận bao nhiêu shop — có hiện con số lên trang không? (§6.4)
5. **Kênh liên hệ chính của anh** để đặt ở màn cảm ơn và FAQ (Zalo? Messenger page CINs?)
6. **Ai xử lý lead:** một mình anh, hay cả vợ anh cùng vào duyệt? Nếu hai người thì trang admin cần từ phase 2 chứ không phải phase 3.
