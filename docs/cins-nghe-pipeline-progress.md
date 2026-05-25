# CINs — Nghề nghiệp pipeline: trạng thái tiến độ

> Note resume cho chat mới khi tiếp tục seed nội dung `loai_bai_viet = 'nghe'`.

## Trạng thái hiện tại

**Đã hoàn thành:** 2 batch (10 bài), `manifest-batch1.json` + `manifest-batch2.json`
**Còn lại:** **235 stubs** (≤1000 ký tự) trong DB cần viết
**Tổng nghe table:** 288 rows — 43 bài đã có nội dung đầy đủ trước đó được pipeline tự bảo vệ (WHERE `LENGTH(noi_dung) < 1000` chặn ghi đè).

### Batch đã apply

| Batch | Slug | Length | Nhóm |
|---|---|---|---|
| 1 | `nghe-phim-1st-assistant-camera-1st-ac` | 14755 | +1 |
| 1 | `nghe-hoat-hinh-2d-animator` | 14866 | +1 |
| 1 | `nghe-3d-3d-animator` | 14797 | +2 |
| 1 | `nghe-hoat-hinh-3d-animator` | 16495 | +1 |
| 1 | `nghe-3d-3d-art-director` | 15817 | +1 |
| 2 | `nghe-3d-3d-concept-artist` | 15114 | +1 |
| 2 | `nghe-vfx-3d-generalist` | 15058 | +1 |
| 2 | `nghe-3d-3d-generalist` | 15407 | +2 |
| 2 | `nghe-minh-hoa-3d-illustrator` | 15415 | +1 |
| 2 | `nghe-hoat-hinh-3d-modeler` | 15410 | +1 |

## Pipeline đã dựng (không cần làm lại)

### Scripts
- `scripts/fetch-nghe-queue.mts` — lấy N bài stub tiếp theo (default 5), `ORDER BY tieu_de ASC`
- `scripts/apply-nghe-manifest.mts` — apply 1 manifest JSON vào DB (UPDATE + INSERT article_gan_nhom)
- `scripts/check-nghe-status.mts` — xem phân bố loai_bai_viet
- `scripts/check-all-nhom.mts` — xem toàn bộ slug `article_nhom` có sẵn
- `scripts/peek-one-stub.mts` — xem chi tiết 1 bài (hardcoded UUID, sửa nếu cần)
- `scripts/peek-nghe-stub.mts` — xem 3 stub tiếp theo

### Folders
- `scripts/nghe-content/` — chứa `manifest-batchN.json` + `{slug}.html` cho mỗi bài

### Brief / pipeline docs
- `docs/cins-brief-article-nghe.md` — cấu trúc 4 sections + bảng slug nhóm thực tế DB
- `docs/cins-cursor-pipeline-nghe.md` — workflow chạy pipeline

## Workflow chuẩn cho mỗi batch

```pwsh
# 1. Lấy 5 bài tiếp theo
npx tsx scripts/fetch-nghe-queue.mts 5

# 2. Tạo scripts/nghe-content/manifest-batchN.json
#    Format: [{ id, slug, tieu_de_viet, tom_tat, meta_title, meta_description, nhom_slugs: [...] }]
#    nhom_slugs lấy từ docs/cins-brief-article-nghe.md (mapping theo prefix slug)

# 3. Tạo scripts/nghe-content/{slug}.html cho từng bài
#    Cấu trúc 4 sections theo brief: arc-intro + 01 "X là ai" + 02 "Công việc" + 03 "Cần giỏi gì" + 04 "Làm cách nào"
#    Length mục tiêu: 14-18k ký tự

# 4. Apply batch
npx tsx scripts/apply-nghe-manifest.mts manifest-batchN.json
```

## Schema gán nhóm thực tế (đã verify trong DB)

**`bo_phan`** dùng pattern `nghe-{linh-vuc}-{vai-tro}`, không phải `bp-*` như brief gốc:

- `nghe-3d-*` → 6 slug: concept-tien-ky, modeling-sculpting, texturing-shading, lighting-rendering, visualization, quan-ly-san-xuat
- `nghe-game-*` → 7 slug: tien-san-xuat, san-xuat-art, technical-art, level-design, am-thanh, qa-release, quan-ly-san-xuat
- `nghe-hoat-hinh-*` → 7 slug: tien-san-xuat, san-xuat-2d, san-xuat-3d, technical-art, hau-ky, am-thanh, quan-ly-san-xuat
- `nghe-phim-*` → 6 slug: tien-san-xuat, san-xuat, hau-ky, am-thanh, phat-hanh, quan-ly-san-xuat
- `nghe-vfx-*` → 6 slug: tien-hien-truong, 3d-fx, compositing, motion-graphics, technical, quan-ly-san-xuat
- `nghe-comic-*`, `nghe-dohoa-*`, `nghe-uiux-*`, `nghe-minh-hoa-*`, `nghe-kien-truc-*`, `nghe-thoitrang-*` — xem `docs/cins-brief-article-nghe.md` § "Slug nhóm theo loai_nhom"

**`nhom_nganh`** (4 slug):
- `nn-bao-chi-truyen-thong` — phim, hoạt hình, VFX, video
- `nn-my-thuat-thiet-ke` — 3D, đồ họa, minh họa, UI/UX, comic
- `nn-kien-truc-xay-dung` — kiến trúc, nội thất, thời trang space
- `nn-my-thuat-thuan-tuy` — fine art

**Quy tắc:** mỗi bài gán 1 `bo_phan` (khớp prefix slug bài) + 1 `nhom_nganh` (theo lĩnh vực).

## Mẫu khởi động chat mới

> @docs/cins-brief-article-nghe.md @docs/cins-cursor-pipeline-nghe.md @docs/cins-nghe-pipeline-progress.md
>
> Tiếp tục seed nghề nghiệp. Fetch 5 bài tiếp, tạo manifest + HTML, apply. Loop đến hết context.
