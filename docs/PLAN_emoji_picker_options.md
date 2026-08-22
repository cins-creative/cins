# Emoji picker / jcard-actions

Ngày: 2026-08-22 · SoT UI: `JourneyLikeButton` + `journey.css`

## Đã chốt — option 2

- Mobile: giữ nút tim → overlay `.j-reaction-picker--opt2` (portal `document.body`).
- Hàng emoji đảo: tim ở mép phải, mở từ tim; vuốt trái chọn emoji khác.
- Vuốt xuống: «xem Reaction». Vuốt lệch trên/dưới >100px: không chọn.
- Desktop: hàng pill hover.
- Option 1 (cung SVG `--arc`) đã xóa.

## Rail bài org (popup)

`OrgBaiDangPostSplitBody` `.post-rail-blk--actions` — cùng cụm jcard:

| Cụm | Thứ tự |
|---|---|
| Trái `--start` | Share · dislike |
| Phải `--end` | Lưu · comment · reaction |

`OrgBaiDangLikeButton` = wrapper `JourneyLikeButton` (`loai_doi_tuong` org bài đăng).
