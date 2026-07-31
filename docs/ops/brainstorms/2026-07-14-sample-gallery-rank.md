# Brainstorm: Gallery rank — thời gian thực vs engagement (mẫu)

- **Ngày:** 2026-07-14
- **Chủ đề:** Có nên đổi mô hình rank Gallery follow-feed trước khi scale ngoài cohort?
- **Mode:** assumption-testing + strategy
- **Người tham gia:** (mẫu plugin — không phải quyết định thật)

## Frame

- Đang khám phá trade-off O13 trong `CINS_DECISIONS.md`.
- Vì sao lúc này: chuẩn bị ống ops brainstorm; neo vào câu OPEN có thật.
- Đã biết: MVP đang **thời gian thực**; điều kiện đóng O13 = feed loãng hoặc đủ data tương tác.
- Ràng buộc: phản-vanity (không khoe follower); không engagement-sort bài org "Gợi ý" (L21).
- Outcome session: 2–3 hướng + cách đo rẻ — chưa chốt sản phẩm.

## Diverge (ý tưởng thô)

1. Giữ thời gian thực tới khi có metric loãng rõ.
2. Hybrid: thời gian thực + boost nhẹ tương tác trong cửa sổ 24h (cap).
3. Chỉ bật engagement-weighted cho cohort nội bộ / feature flag.
4. Không rank lại feed — cải thiện density bằng nội dung / follow graph trước.
5. Inversion: làm feed "nóng" tối đa → đo complaint vanity/clickbait rồi rút.

## Cluster

| Cluster | Ý trong nhóm | Ghi chú |
|---|---|---|
| A · Giữ MVP | 1, 4 | Khớp điều kiện đóng O13 hiện tại |
| B · Rank có kiểm soát | 2, 3 | Cần instrumentation trước |
| C · Học từ cực đoan | 5 | Chỉ experiment nội bộ |

## Converge

| # | Hướng | Vì sao mạnh | Giả định rủi ro nhất | Cách test rẻ |
|---|---|---|---|---|
| 1 | Giữ thời gian thực + đo "loãng" | Đúng LOG tạm O13 | "Loãng" không được định nghĩa | Dashboard: posts/day/user active, empty-feed rate |
| 2 | Feature-flag hybrid 24h | Học được tín hiệu | Engagement = clickbait sớm | Flag 10% nội bộ, so complaint |

## Quyết định / next actions

- **Chốt (nếu có):** *Không chốt sản phẩm trong mẫu này* — chỉ demo flow capture.
- **Next actions:**
  1. [ ] Định nghĩa 2 metric "loãng" trước khi bàn lại O13
  2. [ ] Nếu cần chốt → `/cins:decide` + cập nhật điều kiện đóng O13
- **Parked:** full engagement-weighted global

## Liên kết

- DECISIONS: O13, L21
- Graphiti label: `[CINS]` (chỉ khi chạy session thật + MCP up)
