# PLAN — Bộ khối (preset) sidebar theo nhóm đối tượng

> **Trạng thái:** BUILT bước 1–3 (2026-08-06)
> **Nối tiếp:** [`PLAN_home_custom_modules.md`](./PLAN_home_custom_modules.md) (layout tùy chỉnh — BUILT) · [`PLAN_home_modules_vai_tro.md`](./PLAN_home_modules_vai_tro.md) (module theo vai trò — BUILT 2026-08-03)
> **Phạm vi:** panel «Thêm khối» (`AddModuleOverlay`) + hai sidebar trang chủ.
> **Không trong phạm vi:** dựng khối mới, sửa capability, sửa schema DB. Preset chỉ dùng **25 khối đã có**.

---

## 0. Vấn đề

Panel «Thêm khối» hiện liệt kê **25 khối lẻ** chia 6 nhóm. Người dùng mở ra thấy một bảng dài toàn tên khối, **không biết khối nào làm gì và khối nào hợp với mình** → rối, đóng lại, giữ nguyên 3 khối mặc định.

Đây là **vấn đề nhận thức, không phải vấn đề thiếu tính năng.** Khối đã đủ; cái thiếu là một lối vào nói bằng ngôn ngữ người dùng: *"tôi là chủ shop"* thay vì *"tôi cần khối `don_can_xu_ly`"*.

**Giải pháp:** dựng sẵn **bộ khối** (preset) cho từng nhóm đối tượng. Một cú bấm ra layout dùng được ngay. Ai muốn tinh chỉnh vẫn thêm/bớt từng khối như hiện tại — **preset không thay thế catalog, chỉ đứng trước nó.**

---

## 1. Nguyên tắc thiết kế

1. **Preset = danh sách id khối có sẵn.** Không dựng khối mới, không đổi capability, không ALTER DB. Về bản chất đây là dữ liệu tĩnh + một nút.
2. **Preset là cú ghi một lần, không phải chế độ.** Bấm "Dùng bộ này" → ghi vào `home_layout.left/right` → xong. Người dùng kéo/ẩn/xóa tự do sau đó, không có khái niệm "lệch khỏi preset".
   *Phép thử:* xóa mọi dấu vết preset khỏi DB thì layout phải không đổi. Nếu không, ta đã lỡ biến preset thành state.
3. **Stack được, không exclusive.** Người thật là giao nhiều vai (giáo viên kiêm bán standee ở quầy sự kiện). Chọn-1 thì luôn thiếu; làm đủ tổ hợp thì không maintain nổi. Nên: **1 bộ nền + N gói bổ sung.**
4. **Thẻ preset phải tự giải thích.** Đây là mục đích tồn tại của nó. Mỗi thẻ nêu rõ ai dùng, gồm khối gì, bằng tiếng Việt thường — không phải id kỹ thuật.
5. **Sidebar chỉ chứa 3–4 khối/cột** (290px rộng, ~700px cao) trước khi phải cuộn. Preset đẩy quá 6–7 khối tổng là preset hỏng. Đây là bài toán chọn lọc, không phải nhồi.

---

## 2. Nhóm đối tượng → 9 bộ khối

Cắt theo **việc họ mở trang chủ để làm gì**, không cắt theo tổ hợp cờ capability.

### 2.1. Bốn bộ NỀN (theo `giai_doan` — chọn 1)

| Bộ | Ai dùng | Mở trang chủ để làm gì |
|---|---|---|
| **Học viên** | `dang_hoc` + `dang_hoc_khoa` | Buổi học tới lúc mấy giờ, lớp có gì mới |
| **Khám phá ngành** | `dang_hoc`, chưa ghi danh | Ngành này gồm gì, học ở đâu, ai giỏi |
| **Đi làm** | `dang_lam` | Ngành có gì mới, ai đáng kết nối |
| **Freelancer / tìm việc** | `freelance`, `tim_viec` | Có job mới không, đơn ứng tuyển tới đâu |

### 2.2. Năm gói BỔ SUNG (theo capability — stack được)

| Gói | Ai dùng | Mở trang chủ để làm gì |
|---|---|---|
| **Chủ shop** | `co_shop` | Đơn nào cần đẩy đi hôm nay, khách hỏi gì |
| **Người mua hàng** | `da_mua_hang` | Đơn tôi đặt tới đâu, shop có hàng gì mới |
| **Giáo viên** | `org_staff` | Học viên thế nào, có gì chờ tôi duyệt |
| **Vận hành tổ chức** | `org_thanh_vien` / `org_staff` / `su_kien_admin` / `studio_tuyen_dung` | Tin nhắn tổ chức, ứng viên, sự kiện |
| **Kết nối bạn bè** | ai cũng được | Ai nhắn tôi, ai mời kết bạn |

*Gói dưới 2 khối không đáng làm preset — đó là lý do gộp «Tuyển dụng» + «BTC sự kiện» + «Thành viên tổ chức» thành một gói «Vận hành tổ chức». Các khối bên trong vẫn tự lọc theo capability nên người chỉ có 1 vai chỉ nhận khối của vai đó.*

---

## 3. Nội dung từng bộ (chỉ khối đã có)

`L` = cột trái · `R` = cột phải

### Bộ nền

| Bộ | L | R |
|---|---|---|
| **Học viên** | `khoa_hoc_goi_y`, `kham_pha_linh_vuc` | `lop_hoc_cua_ban`, `tin_nhan_to_chuc`, `theo_doi_org` |
| **Khám phá ngành** | `kham_pha_linh_vuc`, `duong_toi_do`, `khoa_hoc_goi_y` | `theo_doi_org`, `goi_y_theo_doi` |
| **Đi làm** | `nguoi_cung_nganh`, `goi_y_studio` | `theo_doi_org`, `tin_nhan_ban_be` |
| **Freelancer / tìm việc** | `ho_so_cua_ban`, `ung_tuyen_cua_toi` | `co_hoi`, `theo_doi_org` |

### Gói bổ sung

| Gói | L | R |
|---|---|---|
| **Chủ shop** | `don_can_xu_ly` | `tin_nhan_mua_ban`, `theo_doi_org` |
| **Người mua hàng** | `don_mua_cua_toi` | `tin_nhan_mua_ban`, `hang_feature` |
| **Giáo viên** | `hoc_vien_cua_ban`, `scout_tai_nang` | `cho_ban_duyet`, `org_inbox` |
| **Vận hành tổ chức** | `to_chuc_cua_ban`, `ung_vien_moi` | `org_inbox`, `quan_ly_su_kien` |
| **Kết nối bạn bè** | `goi_y_theo_doi` | `tin_nhan_ban_be`, `loi_moi_ket_ban` |

**Lọc trước khi ghi:** khối không khớp capability bị bỏ khỏi bộ ngay lúc áp — người chưa mua hàng bấm bộ «Chủ shop» sẽ không nhận `tin_nhan_mua_ban` nếu chưa đủ điều kiện. Bộ nào sau khi lọc còn 0 khối thì không hiện thẻ.

**Chống tràn:** nếu áp bộ làm tổng khối vượt **8**, hiện dialog *"Layout đã đầy — chọn khối để thay"*, gợi ý bỏ các khối gợi ý bị động trước (`goi_y_theo_doi`, `hang_feature`, `kham_pha_linh_vuc`).

**Độ phủ:** 9 bộ dùng 23/25 khối. Hai khối không nằm trong bộ nào — `duong_toi_do` (đã có trong bộ Khám phá) và các khối lẻ còn lại vẫn thêm tay được từ catalog. Không khối nào bị mất lối vào.

---

## 4. UI — panel «Thêm khối» đổi ra sao

Cấu trúc mới của `.ha-edit-add-scroll`, từ trên xuống:

```
┌─ Bộ khối gợi ý ───────────────────────────┐   ← MỚI, mặc định mở
│  [Chủ shop]        [Người mua hàng]        │
│  Cho người bán     Cho người hay mua       │
│  · Đơn chờ xử lý   · Đơn tôi đặt           │
│  · Tin nhắn mua bán· Tin nhắn mua bán      │
│  · Sự kiện & quầy  · Hàng feature          │
│  [ Dùng bộ này ]   [ Dùng bộ này ]         │
└────────────────────────────────────────────┘
┌─ Tự chọn từng khối ───────────────  [ v ] ┐   ← catalog cũ, mặc định THU GỌN
│  (25 khối, 6 nhóm — như hiện tại)          │
└────────────────────────────────────────────┘
```

Ba thay đổi hành vi:

1. **Dải bộ khối ghim đầu**, chỉ hiện bộ khớp capability, bộ khớp persona xếp trước.
2. **Catalog khối lẻ thu gọn mặc định** — đây chính là chỗ gây rối. Vẫn mở được một cú bấm.
3. **Thẻ preset liệt kê tên khối bằng nhãn tiếng Việt** (không phải id), kèm một dòng "cho ai". Người dùng biết mình sắp nhận gì trước khi bấm.

Nơi preset xuất hiện thêm:

- **Onboarding** — sau khi chọn `giai_doan`, hỏi một câu *"Bạn còn làm gì trên CINs?"* (chips: bán hàng / mua đồ / dạy học / vận hành tổ chức) → áp bộ nền + gói tương ứng. Rẻ hơn nhiều so với để người dùng tự dựng.
- **Toolbar sửa layout** — "Khôi phục mặc định" mở rộng thành "Đổi bộ khối".

---

## 5. Database

**Không ALTER.** `user_nguoi_dung.home_layout` đã là `jsonb`, chỉ mở rộng schema ứng dụng:

```jsonc
{
  "v": 2,
  "left": [...], "right": [...], "hidden": [...], "limits": {...},
  "preset": { "da_ap": ["hoc_vien", "chu_shop"], "at": "2026-08-06T..." }
}
```

`preset.da_ap` chỉ là **breadcrumb** để hiển thị "đang dùng bộ Chủ shop" và không mời lại bộ đã dùng. Nó **không tham gia resolve layout** — xem nguyên tắc §1.2. `v: 1` → `v: 2` là no-op, chỉ thêm field khi ghi.

---

## 6. Code

| File | Việc |
|---|---|
| `lib/cins/home-adaptive/presets.ts` **(mới)** | `PRESET_NEN`, `PRESET_GOI` (dữ liệu tĩnh), `presetsForUser(persona, caps)`, `applyPreset(layout, preset, caps)` — hàm thuần, client-safe |
| `lib/cins/home-adaptive/layout-prefs.ts` | Parse/validate `preset.da_ap` (whitelist id, bỏ id lạ) |
| `components/cins/home-adaptive/HomeLayoutBoard.tsx` | Dải "Bộ khối gợi ý" + thu gọn catalog trong `AddModuleOverlay`; dialog chống tràn |
| `app/api/user/home-layout/route.ts` | PUT nhận `preset`, validate |
| `app/world-journey-feed.css` | `.ha-edit-preset-*` |

Không đụng `module-meta.ts`, `capability-types.ts`, `capabilities.ts`, `HomeModuleColumn.tsx` — đó là dấu hiệu scope đang đúng.

---

## 7. Các bước

| Bước | Nội dung | Model |
|---|---|---|
| 1 | `presets.ts` + schema `preset` v2 + validate + `applyPreset` idempotent | ✅ BUILT |
| 2 | UI dải "Bộ khối gợi ý" + thu gọn catalog + dialog chống tràn | ✅ BUILT |
| 3 | Onboarding chips sau khi chọn `giai_doan` | ✅ BUILT |

Bước 1–3 ship được độc lập và đã giải quyết trọn vấn đề §0.

---

## 8. Edge case

- **Áp bộ hai lần** — `applyPreset` idempotent: id đã có thì bỏ qua, không nhân bản.
- **Khối đang ở `hidden`** — áp bộ thì gỡ khỏi `hidden` và chèn lại. Chủ động chọn bộ = ý định thắng lần ẩn trước.
- **Áp bộ nền khi đã có layout** — hỏi: "Thay hẳn" hay "Chỉ thêm khối thiếu". Mặc định **thêm khối thiếu**, không phá layout đã dựng.
- **Layout tràn** — §3.
- **Capability tắt sau khi áp** (đóng shop) — khối tự ẩn qua `moduleMatchesCapabilities`, layout giữ id. Đúng hành vi hiện tại, không cần thêm gì.
- **`giai_doan` đổi** — không tự áp bộ nền mới, chỉ gợi ý.
- **`home_layout = {}`** (chưa customize) — nhóm dễ thắng nhất, áp bộ là lần ghi đầu tiên, an toàn.

## 9. Security

- Preset **không cấp quyền**. Giữ nguyên luật của `PLAN_home_custom_modules.md`: *layout ≠ data access*. Mỗi module tự guard server-side.
- Validate `preset.da_ap` theo whitelist id, giới hạn độ dài mảng (≤ 20). jsonb do client gửi → untrusted.
- Lọc khối theo capability **load ở server**; không tin capability client gửi lên khi ghi.

---

## 10. Khối còn thiếu cho từng nhóm (ngoài phạm vi plan này)

Đã đối chiếu 21 khối ứng viên với schema thật (`supabase/sql/*.sql` + lib query, 2026-08-06). Kết quả quan trọng: **14 khối dựng được mà không đụng DB**, 4 khối cần ALTER nhỏ, 3 khối cần bảng mới.

### 10.1. Dựng được ngay — 0 thay đổi schema

| Nhóm | Khối đề xuất | Nguồn dữ liệu | Đã có sẵn |
|---|---|---|---|
| Chủ shop | **Doanh thu 7 ngày** | `shop_don_hang.tong_tien` + `trang_thai` ∈ (`da_nhan_tien`, `da_giao_tai_su_kien`, `hoan_thanh`) | `app/api/shop/bao-cao/route.ts` |
| Chủ shop | **Hàng sắp hết** | `shop_bien_the.so_luong_ton` (lọc `<= N`) | `lib/shop/catalog.ts` |
| Chủ shop | **Đánh giá mới** | `shop_nhom_danh_gia` (`diem`, `noi_dung`) — cấp loại hàng | `lib/shop/nhom-danh-gia.ts` |
| Chủ shop | **Quầy sự kiện của tôi** | `shop_quay_su_kien.trang_thai` | `lib/shop/quay.ts` |
| Học viên | **Điểm & nhận xét** | `org_nop_bai` (`diem`, `ghi_chu`, `duyet_luc`) | `lib/co-so/nop-bai.ts` |
| Học viên | **Học phí cần đóng** | `org_don_hoc_phi.trang_thai = 'cho_thanh_toan'` | `lib/co-so/don-hoc-phi.ts` |
| Giáo viên | **Bài cần chấm** | `org_nop_bai.trang_thai = 'cho_duyet'` | `listNopBaiChoDuyet` |
| Vận hành CSĐT | **Lead tư vấn chưa trả lời** | `chat_phong` (`loai_phong='1_org'`) + `chat_da_doc` | `listOrgStaffInboxThreadsForViewer` |
| Vận hành CSĐT | **Học phí chờ thu** | `org_don_hoc_phi` + `org_ky_hoc` | `lib/co-so/ops-dashboard.ts` |
| Vận hành CSĐT | **Lớp sắp khai giảng / sắp đầy** | `org_lop_hoc.ngay_khai_giang`, `slot_toi_da` + đếm `user_hoc_vien_lop` | `listLopHocQuanLy` |
| Tuyển dụng | **Ứng viên theo tin** | `org_tuyen_dung_ung_tuyen` | `loadUngVienMoi` |
| Cộng đồng | **Yêu cầu xin tham gia** | `user_thanh_vien_to_chuc.trang_thai='pending'` | `lib/cong-dong/members.ts` |
| BTC sự kiện | **Số người đăng ký** | `org_dang_ky_su_kien` + `org_su_kien.slot_toi_da` | `demDangKySeThamGia` |
| Người mua | **Shop theo dõi có hàng mới** | `user_theo_doi` (`loai_doi_tuong='user'`) → `shop_san_pham.tao_luc` | cần query ghép, không cần bảng |

### 10.2. Cần ALTER nhỏ (báo user trước — DEV_RULES §1)

| Khối | Thiếu gì | Đề xuất |
|---|---|---|
| **Bài tập sắp hết hạn** (học viên) | `org_bai_tap` **không có `han_nop`** | Thêm cột `han_nop timestamptz null` |
| **Preorder sắp chốt** (người mua) | Không có hạn chốt trên sản phẩm | Buộc theo `org_su_kien.ket_thuc` (0 ALTER) hoặc thêm cột hạn |
| **Lịch học / lịch dạy hôm nay** | `org_lop_hoc.lich_hoc` là **text tự do**, đang parse ra buổi kế | Giữ parse (`resolveNextLopHocSession`) hoặc dựng `org_buoi_hoc` — quyết định lớn, tách plan riêng |
| **Hiệu suất tin tuyển dụng** | `org_tuyen_dung` không có `luot_xem` | Đọc `social_thong_ke_doi_tuong_ngay` (`loai_doi_tuong='org_tuyen_dung'`) — 0 ALTER |

### 10.3. Cần bảng / enum mới

| Khối | Vì sao |
|---|---|
| **Đã lưu sản phẩm (wishlist)** | `social_luu.loai_doi_tuong` chỉ có `cot_moc`, `org_bai_dang`, `org_tuyen_dung`, `org_khoa_hoc`. Cần mở rộng enum cho `shop_san_pham`. `shop_gio` là **giỏ hàng**, không phải wishlist |
| **Bài cộng đồng chờ duyệt** | Bài cộng đồng (`content_cot_moc`, `che_do_hien_thi='cong_dong'`) **đăng là hiện ngay** — không có hàng đợi kiểm duyệt. Đây là quyết định sản phẩm, không chỉ là khối |
| **Check-in sự kiện** | `verify_tham_du_su_kien` có trong schema nhưng **không code nào dùng** — chưa có luồng check-in |

### 10.4. Hai điều đáng chú ý

**Nhóm doanh thu lại là nhóm dễ làm nhất.** Bảy khối cho Chủ shop và Vận hành CSĐT — doanh thu, tồn kho, lead tư vấn, học phí chờ thu, lớp sắp đầy — đều đã có bảng và cả hàm query sẵn. Chỉ thiếu component sidebar. Đây là ROI cao nhất trong toàn bộ danh sách.

**`lich_hoc` là text tự do** — khối "Lịch dạy hôm nay" và "Buổi học tiếp theo" đang dựa vào parse chuỗi. Chấp nhận được cho khối gợi ý, nhưng nếu muốn nhắc giờ đáng tin thì phải dựng bảng buổi học. Không nên gộp vào plan preset.

Ngoài ra `org_staff` hiện gộp cả giáo viên lẫn ban điều hành, nên bộ «Giáo viên» và «Vận hành tổ chức» dùng chung một cờ. Chấp nhận được ở phạm vi này (khối vẫn đúng người); khi thêm khối tuyển sinh / học phí mới cần tách `org_giang_day` / `org_dieu_hanh`.

## 11. Câu còn treo

1. Bộ «Kết nối bạn bè» không gắn capability nào → hiện cho tất cả. Có ồn quá không, hay chỉ hiện khi có lời mời kết bạn đang chờ?
2. Onboarding chips (bước 3) có nên hỏi luôn ở lần đăng ký, hay đợi người dùng có capability thật rồi mới mời?
3. Preset hard-code trong `presets.ts` là đủ, hay cần bảng admin để A/B? Đề xuất: hard-code cho tới khi có nhu cầu A/B thật.
