# PLAN — Justified album: số ảnh/hàng theo độ rộng ảnh (case album ≥6 ảnh rộng)

Trạng thái: **đã implement** (`lib/journey/image-grid.ts` — `TARGET_JUSTIFIED_ROW_ASPECT_SUM`,
`justifiedPerRow`, vòng chunk cuối của `splitJustifiedRows`). Phạm vi: chỉ bổ sung cách tính
số ảnh/hàng cho nhánh chunk chung (album ≥ 6 ô). Mọi quy luật layout khác giữ nguyên.

## 1. Hiện trạng & triệu chứng

Bài mẫu (`ImageGrid`, `data-count="6"`, `image-grid--justified`): grid rộng **518px**, cao **158px**.

- `splitJustifiedRows` với 6 ô không khớp nhánh đặc biệt nào (2 / ≤3 / 4 / 5) → rơi vào vòng chunk
  cố định `JUSTIFIED_MAX_PER_ROW = 3` → 2 hàng × 3 ảnh.
- Ảnh là screenshot rất rộng (aspect đo ngược từ DOM ≈ **2.2–2.5**, không phải 16:9).
- Chiều cao hàng = `(W − gaps) / Σaspect` → `(518 − 4) / 6.6 ≈ 78px`/hàng → album cao 158px:
  mỗi ảnh chỉ ~170×78px, nội dung bên trong không đọc được.

Nguyên nhân: số ảnh/hàng là **hằng số**, trong khi chiều cao hàng lại tỉ lệ nghịch với tổng aspect.
Ảnh càng rộng, 3 ảnh/hàng càng dẹp — không có ngưỡng nào chặn.

Không phải nguyên nhân (đã loại):

- CSS `.image-grid-jrow` tính height thuần theo `--jrow-aspect-sum` / `--jrow-gaps` → đúng với mọi
  độ dài hàng, **không cần sửa CSS**.
- `resolveAlbumLayout` / `data-count` / overlay `+N` / cap 6 ô ở feed → không liên quan.

## 2. Quy tắc bổ sung (chỉ cho nhánh chunk chung)

Thay hằng số 3 bằng **số ảnh/hàng dẫn xuất từ aspect trung bình** của các ô hiển thị, sao cho tổng
aspect mỗi hàng gần một mục tiêu cố định.

```
TARGET_JUSTIFIED_ROW_ASPECT_SUM = 3.9   // hàng ~ W/3.9 ≈ 0.256·W
avgAspect = Σ aspect / n
k = argmin over k ∈ {1, 2, 3} của | ln( (k · avgAspect) / TARGET ) |
```

So khớp trong không gian log (bất biến tỉ lệ) → điểm chuyển đổi là trung bình nhân, cho ngưỡng:

| avgAspect | k (ảnh/hàng) | Ví dụ |
|---|---|---|
| ≤ 1.59 | **3** (như hiện tại) | dọc 3:4, vuông, 4:3, 3:2 |
| 1.59 – 2.76 | **2** | 16:9, 16:10, screenshot ~2.2 ← case này |
| > 2.76 | **1** | panorama |

Ngưỡng 1.59 chọn có chủ đích: **3:2 (1.5) và 4:3 (1.33) vẫn giữ 3 ảnh/hàng** → album ảnh chụp
thường không đổi layout; chỉ album ảnh rộng hơn ~16:10 mới tách.

Kết quả cho bài mẫu: avg ≈ 2.24 → k = 2 → **3 hàng × 2 ảnh**, chiều cao hàng ≈ 101 / 117 / 131px,
album ≈ 353px thay vì 158px. Đúng như kỳ vọng.

### Giữ nguyên (không đụng)

- Nhánh 2 ảnh (1 hàng), nhánh ≤3 ảnh + `JUSTIFIED_MIN_CANVAS_HEIGHT_RATIO` / `JUSTIFIED_MAX_ROW_HEIGHT_RATIO`,
  nhánh 4 (2+2), nhánh 5 (2+3).
- `JUSTIFIED_MAX_PER_ROW = 3` vẫn là trần cứng; logic mới chỉ chọn ≤ 3.
- Các preset khác: `masonry`, `columns2`, `square`, `stack`, `single`.

## 3. Thay đổi dự kiến

**Database / API:** không có.

**Frontend:** một file duy nhất — `lib/journey/image-grid.ts`

- Thêm hằng `TARGET_JUSTIFIED_ROW_ASPECT_SUM = 3.9` (kèm comment giải thích ngưỡng 1.59 / 2.76).
- Thêm helper export `justifiedPerRow(cells): 1 | 2 | 3`.
- Trong `splitJustifiedRows`, vòng chunk cuối dùng `justifiedPerRow(cells)` thay `JUSTIFIED_MAX_PER_ROW`.

Không sửa: `components/journey/ImageGrid.tsx` (đã gọi `splitJustifiedRows` với aspect đo được),
`app/[slug]/journey/image-grid.css`, editor, compose.

## 4. Các bước

1. Thêm hằng + `justifiedPerRow` trong `lib/journey/image-grid.ts`.
2. Đổi vòng chunk cuối của `splitJustifiedRows` sang dùng `justifiedPerRow`.
3. Verify: bài mẫu ở feed (3×2), album 6 ảnh dọc/vuông/4:3 (vẫn 2 hàng × 3), album 2/3/4/5 ảnh
   (không đổi), compose preview và trang xem bài khớp feed, mobile.

## 5. Edge case / rủi ro

- **Album trộn hướng** (3 dọc + 3 rộng): avg kéo về giữa → có thể vẫn k=3 và hàng ảnh rộng còn dẹp.
  Hướng xử lý sau nếu gặp: sau khi chunk, hàng nào có `1/Σaspect < 0.18` thì re-chunk với k−1.
  Chưa làm ở bước này.
- **Hàng cuối lẻ 1 ảnh** (7 ảnh, k=2 → 2+2+2+1): ảnh cuối full-width cao hơn hẳn. Chỉ xảy ra khi
  `showAll` (feed cap 6 ô). Hành vi này đã tồn tại sẵn với k=3 (7 → 3+3+1) → giữ nguyên, chưa gộp.
- **Album cao hơn** khi tách: 6 ảnh rộng → ~353px thay vì 158px. Đây là mục tiêu, nhưng nếu muốn
  chặn trần chiều cao card feed thì phải bàn riêng (không nằm trong plan này).
- **Metadata sai** (mặc định 1200×800 → aspect 1.5 → k=3) rồi ảnh load xong đo được 2.2 → k=2:
  album reflow từ 2 hàng sang 3 hàng. Rủi ro này đã có sẵn (component vốn re-split theo aspect đo
  được); rule mới làm nó dễ thấy hơn ở album ảnh rộng thiếu metadata.
- `showAll` với 8–10 ảnh rộng → 4–5 hàng: chấp nhận (compose / trang xem bài).

**Security:** không chạm dữ liệu, quyền, hay API — thuần layout client/server render.

## 6. Câu hỏi treo

- Có muốn ngưỡng "mạnh tay" hơn (TARGET ≈ 3.57 → 3:2 cũng xuống 2 ảnh/hàng) không? Mặc định plan
  này chọn phương án bảo thủ để album ảnh chụp thường giữ nguyên.
- Album 5 ảnh toàn ảnh rộng vẫn là 2+3 (hàng 3 dẹp) — có mở rộng rule sang nhánh 5 ảnh không?
