# CINS — Cursor Map: Inline Edit Trang Trường
# Dựa trên UI thực tế (5 screenshots đã xem)
# Pattern: Facebook Page — edit trực tiếp trên trang public, không vào /admin

---

## Nguyên tắc

- Trang `/truong/[slug]` render y hệt với user thường
- Khi `isOrgAdmin = true`: xuất hiện thêm edit controls — hover overlay, nút inline, floating button
- Không có route `/truong/[slug]/edit` riêng
- Mọi save đều optimistic update UI trước, rollback nếu lỗi

---

## isOrgAdmin check

```typescript
// Server component — truyền xuống qua props hoặc context
async function getAdminStatus(slug: string, userId?: string) {
  if (!userId) return false
  const { data: org } = await supabase
    .from('org_to_chuc')
    .select('id')
    .eq('slug', slug)
    .single()
  if (!org) return false

  const { data } = await supabase
    .from('user_thanh_vien_to_chuc')
    .select('vai_tro')
    .eq('id_to_chuc', org.id)
    .eq('id_nguoi_dung', userId)
    .in('vai_tro', ['owner', 'admin', 'quan_ly_noi_dung', 'quan_ly_tuyen_sinh'])
    .limit(1)
    .single()
  return !!data
}
```

---

## Vùng edit theo từng phần trong UI

### 1. Cover ảnh bìa (hero banner)
```
Trigger: hover vào banner → overlay tối + nút "Đổi ảnh bìa"
Field:   org_to_chuc.cover_id (Cloudflare)
Action:  upload → Cloudflare Images → UPDATE org_to_chuc SET cover_id
Quyền:   admin
```

### 2. Avatar (ô "ĐT" bên trái tên trường)
```
Trigger: hover vào avatar square → icon camera overlay
Field:   org_to_chuc.avatar_id (Cloudflare)
Action:  upload → Cloudflare Images → UPDATE org_to_chuc SET avatar_id
Quyền:   admin
Note:    Hiện tại render initials vì chưa có ảnh — sau upload hiện ảnh thật
```

### 3. Mô tả trường (dưới tên tiếng Anh)
```
Trigger: click vào vùng mô tả → inline textarea
Fields:  org_to_chuc.mo_ta
         org_truong_dai_hoc.ten_chinh_thuc
         org_truong_dai_hoc.ten_tieng_anh
         org_truong_dai_hoc.website
Action:  inline edit → blur/Enter → PATCH
Quyền:   admin
```

### 4. Stat bar — học phí, KTX
```
Trigger: click vào ô "Học phí" → popover nhỏ với 2 input
Fields:  org_truong_dai_hoc.hoc_phi_nam_tu
         org_truong_dai_hoc.hoc_phi_nam_den
         org_truong_dai_hoc.co_ktx
         org_truong_dai_hoc.ktx_gia_thang
Action:  save button trong popover
Quyền:   admin
Note:    Điểm chuẩn và chỉ tiêu KHÔNG edit ở đây — edit trong tab Tuyển sinh
```

---

## Tab Bài đăng

```
Floating button: "＋ Viết bài" góc phải dưới (chỉ hiện khi isOrgAdmin)

Mỗi bài đăng khi hover → hiện 2 icon: Edit | Xóa
  Edit  → mở modal soạn bài (tieu_de, noi_dung rich text, tom_tat, cover, tags)
  Xóa   → confirm → UPDATE trang_thai = 'archived' (soft)

Form tạo/edit bài:
  tieu_de        text input (required)
  loai_bai_dang  select: thong_bao / tuyen_sinh / su_kien / khac
  tom_tat        textarea ngắn
  noi_dung       rich text editor
  cover_id       upload ảnh
  tags           multi-select article_bai_viet
  trang_thai     toggle: Nháp / Đăng ngay

Bảng: org_bai_dang + org_bai_dang_tag
Quyền: quan_ly_noi_dung hoặc admin
```

---

## Tab Ngành đào tạo

```
Chỉ CINS admin mới thêm/xóa ngành (thêm org_truong_nganh)
Trường admin chỉ được edit thông tin chương trình:
  - ten_chuong_trinh
  - thoi_gian_thang
  - trang_thai_chuong_trinh

Trigger: icon Edit nhỏ bên phải mỗi row ngành (chỉ hiện khi isOrgAdmin)
Action:  inline edit hoặc mini modal
Bảng:    org_truong_nganh
Quyền:   admin (không phải quan_ly_tuyen_sinh hay quan_ly_noi_dung)
```

---

## Tab Tuyển sinh

```
Quyền edit: admin + quan_ly_tuyen_sinh

Edit năm tuyển sinh (ô dữ liệu từng năm):
  Trigger: icon Edit bên phải row → expand inline form
  Fields:
    chi_tieu               number input
    diem_chuan             number input (điền sau khi có kết quả)
    tinh_trang             select enum
    ngay_mo_ho_so          date
    ngay_dong_ho_so        date
    ngay_thi_tu/den        date range
    ngay_cong_bo_diem      date
    ngay_xac_nhan_nhap_hoc_tu/den  date range
    link_thong_tin         url input
    ghi_chu_timeline       textarea
  Bảng: org_tuyen_sinh_nam

Thêm năm mới:
  Button "+ Thêm năm tuyển sinh"
  → modal chọn năm + ngành → INSERT org_tuyen_sinh_nam

Phương thức xét tuyển:
  Button "+ Thêm phương thức" trong accordion từng năm
  → modal:
      ten_phuong_thuc      select enum (15 giá trị)
      chi_tieu_phuong_thuc number
      ap_dung_tat_ca_nganh toggle
      id_nganh_ap_dung     multi-select (nếu không áp dụng tất cả)
      id_cau_hinh_khoi     select (từ org_cau_hinh_khoi của trường)
  Bảng: org_phuong_thuc_xet_tuyen
```

---

## Tab Hình ảnh

```
Quyền: quan_ly_noi_dung hoặc admin

Upload zone:
  Drag & drop hoặc click để upload
  → Cloudflare Images → INSERT org_hinh_anh

Mỗi ảnh trong gallery khi hover:
  - Icon Xóa (xóa khỏi org_hinh_anh)
  - Icon Edit caption
  - Handle kéo để reorder (UPDATE thu_tu)

Fields khi upload:
  cloudflare_id   (auto từ Cloudflare response)
  caption         text input (optional)
  loai            select: khuon_vien / xuong / trien_lam / khac
  nam             number input (optional)

Bảng: org_hinh_anh
```

---

## Calculator sidebar (Tính điểm xét tuyển)

Hiện trong tab Ngành đào tạo + Tuyển sinh + Hỏi & đáp (như ảnh).

```
Component: ScoreCalculator (read-only cho user, không có phần edit)
Data:      GET /api/truong/[id]/cau-hinh-tinh-diem?nam=[year]
           → org_cau_hinh_mon[] với edu_mon_thi (ten, loai)

State:
  selectedNganh  → chọn ngành để load config đúng
  selectedYear   → sync với year filter toàn trang
  inputs         → Record<id_mon_thi, number>
  result         → tính realtime từ công thức

Công thức (app layer, không gọi server):
  const tongMax = Σ(thang_diem_i × he_so_i)
  const tongNhap = Σ(nhap_i × he_so_i)
  const diem = (tongNhap / tongMax) × quy_ve_thang

Note: "Hình họa ×2 / 0–10" → môn có he_so=2, thang_diem=10
      Hiển thị "Chọn năm có cấu hình khối (ví dụ 2024) để tính theo DB"
      khi năm hiện tại chưa có org_cau_hinh_khoi
```

---

## Admin toolbar (chỉ hiện khi isOrgAdmin)

Thanh nhỏ cố định phía trên nội dung, bên trong page container (không phải fixed toàn màn hình):

```tsx
{isOrgAdmin && (
  <div className="admin-toolbar">
    <span>Chế độ quản lý</span>
    <a href="/admin/truong?id={truong.id}">Vào Admin</a>
  </div>
)}
```

Style: background warning nhẹ, font-size 12px, padding nhỏ.

---

## RLS cần implement trước khi deploy

```sql
-- org_bai_dang: admin + quan_ly_noi_dung của org đó mới được INSERT/UPDATE
-- org_tuyen_sinh_nam: admin + quan_ly_tuyen_sinh mới được INSERT/UPDATE
-- org_phuong_thuc_xet_tuyen: như org_tuyen_sinh_nam
-- org_hinh_anh: admin + quan_ly_noi_dung
-- org_to_chuc: chỉ admin được UPDATE cover_id, avatar_id, mo_ta
-- org_truong_dai_hoc: chỉ admin được UPDATE

-- Pattern chung:
CREATE POLICY "org_admin_write" ON org_bai_dang
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_thanh_vien_to_chuc
      WHERE id_to_chuc = org_bai_dang.id_to_chuc
        AND id_nguoi_dung = auth.uid()
        AND vai_tro IN ('owner','admin','quan_ly_noi_dung')
        AND trang_thai = 'active'
    )
  );
```

---

## API endpoints cần tạo

| Method | Path | Mô tả |
|---|---|---|
| PATCH | `/api/truong/[id]` | Update org_to_chuc + org_truong_dai_hoc |
| POST | `/api/truong/[id]/bai-dang` | Tạo bài đăng mới |
| PATCH | `/api/truong/[id]/bai-dang/[baiId]` | Sửa bài đăng |
| DELETE | `/api/truong/[id]/bai-dang/[baiId]` | Soft delete bài đăng |
| POST | `/api/truong/[id]/hinh-anh` | Upload ảnh |
| PATCH | `/api/truong/[id]/hinh-anh/reorder` | Cập nhật thu_tu |
| DELETE | `/api/truong/[id]/hinh-anh/[anhId]` | Xóa ảnh |
| POST | `/api/truong/[id]/tuyen-sinh` | Thêm năm tuyển sinh |
| PATCH | `/api/truong/[id]/tuyen-sinh/[tsId]` | Sửa năm tuyển sinh |
| POST | `/api/truong/[id]/phuong-thuc` | Thêm phương thức xét tuyển |
| GET | `/api/truong/[id]/cau-hinh-tinh-diem` | Lấy config tính điểm |

---

## Thứ tự implement

1. `isOrgAdmin` check + admin toolbar (không block UI)
2. Cover + avatar upload (visual impact cao, đơn giản)
3. Tab Bài đăng: floating button + modal tạo bài (trường cần ngay)
4. Tab Tuyển sinh: edit điểm chuẩn + chỉ tiêu (data quan trọng nhất)
5. Tab Hình ảnh: upload gallery
6. Mô tả + thông tin cơ bản
7. RLS policies (bắt buộc trước khi public)
