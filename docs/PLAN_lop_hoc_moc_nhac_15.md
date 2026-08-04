# PLAN — Nhắc buổi học 15' (phòng chat lớp)

## Mục tiêu

Trong phòng chat `loai_phong=lop_hoc`, có mốc nhắc **trước giờ học 15 phút**, suy từ `org_lop_hoc.lich_hoc` (cùng nguồn với nhãn `Online · T2 & T4 & T6 — 19:00–21:30`). **Chỉ admin phòng** (staff/GV `vai_tro=admin|owner` trên `chat_thanh_vien`) bật/tắt · chỉnh; học viên chỉ xem.

## Hiện trạng

| Thành phần | Trạng thái |
|---|---|
| `org_lop_hoc.lich_hoc` + parse `lib/to-chuc/lich-ca-hoc-form.ts` | Có |
| `resolveNextLopHocSession` (`lib/cins/home-adaptive/lop-hoc-next.ts`) | Có — ra `startAt` buổi kế |
| `chat_moc` + tick `POST /api/chat/mocs/tick` + `loai_lap` | Có |
| Quyền moc UI: `!isGroup \|\| isGroupAdmin` | **Lỗ hổng** — thread lớp không `isGroup` ⇒ mọi thành viên CRUD được |
| Server `assertCanManageMoc` | 1-1 = mọi người; còn lại = owner/admin — **đã đúng cho lop_hoc** nếu membership là `thanh_vien` |

## Quyết định thiết kế

### 1. Một mốc hệ thống / phòng lớp

- Cột `chat_moc.nguon` enum: `thu_cong` (default) | `lich_lop`.
- Tối đa **1** hàng `nguon=lich_lop` mỗi `id_phong` (unique partial index).
- Field:
  - `ten` = «Buổi học» (hoặc `ma_lop`)
  - `mo_ta` = chuỗi lịch hiển thị (copy `lich_hoc` ngắn)
  - `thoi_diem` = `resolveNextLopHocSession(lich_hoc).startAt`
  - `nhac_truoc_phut` = **15** (cố định v1; admin sau có thể PATCH)
  - `loai_lap` = `mot_lan` — **không** dùng tuần/tháng đơn giản vì lịch đa thứ (T2&T4&T6)

### 2. Sau đến hạn / tick

Trong `tickDueMocNotices`, khi moc `nguon=lich_lop` vừa `den_han`:

1. Load `org_lop_hoc` qua `chat_phong.id_context` (hoặc `id_chat_phong`).
2. `next = resolveNextLopHocSession(lich_hoc, now)`.
3. Nếu có `startAt` tương lai → update `thoi_diem`, clear `id_tin_nhac_truoc` / `id_tin_den_han`.
4. Nếu không parse được lịch → giữ moc, không advance (admin sửa lịch lớp).

Đồng bộ thêm khi admin **PATCH lớp** (`lich_hoc` đổi): gọi `syncLopHocLichMoc(roomId)` nếu moc `lich_lop` đang bật.

### 3. Bật / tắt (admin phòng)

- Panel Mốc khi `loai_phong=lop_hoc`:
  - Toggle **«Nhắc trước buổi học 15 phút»**
  - ON → upsert moc `nguon=lich_lop`
  - OFF → xóa moc `lich_lop` (không đụng moc thủ công)
- Học viên: thấy moc trong list, **không** form thêm / không toggle / không sửa·xóa `lich_lop`.

### 4. Quyền

| Lớp | Hành động |
|---|---|
| UI | `canManageMoc = isLopRoom ? isRoomAdmin : (!isGroup \|\| isGroupAdmin)` |
| Thread lớp | Set `isGroupAdmin` (hoặc `canManageMoc`) từ `chat_thanh_vien.vai_tro` ∈ {owner, admin} khi build/list org lop threads |
| API | Giữ `assertCanManageMoc` (đã chặn thanh_vien); thêm: moc `nguon=lich_lop` không cho đổi `nguon`; xóa chỉ admin |

Staff/GV đã được upsert `vai_tro=admin` trong `lop-chat-phong.ts`.

## Schema

```sql
-- migration_chat_moc_nguon.sql
CREATE TYPE chat_moc_nguon_enum AS ENUM ('thu_cong', 'lich_lop');
ALTER TABLE chat_moc ADD COLUMN nguon chat_moc_nguon_enum NOT NULL DEFAULT 'thu_cong';
CREATE UNIQUE INDEX chat_moc_lich_lop_one_per_room
  ON chat_moc (id_phong) WHERE nguon = 'lich_lop';
```

## API / lib

| File | Việc |
|---|---|
| `lib/chat/room-moc-lop-lich.ts` (mới) | `syncLopHocLichMoc`, `enable`/`disable`, resolve next |
| `lib/chat/room-moc-notify.ts` | Advance `lich_lop` qua `resolveNextLopHocSession` |
| `lib/chat/room-moc.ts` | Map `nguon`; chặn sửa nguon; lỗi migration hint |
| `POST/PATCH …/mocs` | Body `nguon` chỉ server-set cho sync |
| `POST …/mocs/lich-lop` hoặc flag trên PATCH lớp | Toggle enable |
| `lib/chat/org-message.ts` (build lop thread) | `isGroupAdmin` từ membership |
| `CinsChatOverlay` | `canManage` cho phòng có `lopHocId` |
| `ChatRoomMocsPanel` | Toggle + badge «Theo lịch lớp» |

## UI

- Toggle trên đầu panel Mốc (chỉ admin, chỉ phòng lớp).
- Card moc: meta `Nhắc trước 15 phút · Theo lịch lớp`.
- Không hiện select «Loại nhắc» lặp cho moc `lich_lop` (khoá / ẩn khi edit nếu cho edit tên).

## Edge cases

| Case | Xử lý |
|---|---|
| Chưa có `lich_hoc` / parse fail | Toggle ON → lỗi «Cập nhật lịch lớp trước» |
| Lớp `trang_thai=huy` | Disable sync; optional ẩn toggle |
| Nhiều ca / ngày | `resolveNextLopHocSession` đã chọn buổi gần nhất |
| Offline lâu | Tick advance tới buổi **tương lai** gần nhất (1 tin den_han kỳ vừa rồi, không spam mọi buổi lỡ) |
| Moc thủ công song song | Vẫn CRUD bình thường; không đụng `lich_lop` |

## Bảo mật

- Chỉ member đọc list; chỉ admin mutate.
- Service role sync/tick; không tin client gửi `nguon=lich_lop` tùy ý (ignore / strip trên create thường).

## Steps triển khai

1. Migration `nguon` + unique partial + runner.
2. `room-moc-lop-lich.ts` + wire tick advance + sync khi đổi `lich_hoc`.
3. Fix quyền UI/thread `isGroupAdmin` cho phòng lớp.
4. Toggle UI panel Mốc.
5. Docs: IMPLEMENTATION + DECISIONS (O17 / L28 bổ sung).

## Ngoài scope v1

- Push/email (O17).
- Nhắc nhiều mốc (15' + 1h).
- Học viên tự tắt nhắc cá nhân.
