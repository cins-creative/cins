---
name: ops-cadence
description: >
  Nhịp vận hành ngày/tuần cho CINs (daily standup, weekly review, hygiene docs/ops).
  Dùng khi user hỏi cadence, "hôm nay làm gì", weekly, hoặc /cins:standup.
  Bổ sung cho cins-standup — không thay DECISIONS khi chưa confirm.
---

# Ops cadence — CINs

Neo ngữ cảnh: skill `cins-context`. Chi tiết chạy session: skill `cins-standup` + command `/cins:standup`.

## Nhịp mặc định

| Cadence | Mục tiêu | Output |
|---|---|---|
| **Daily** | 3 bullet: hôm qua · hôm nay · blocker | Chat ngắn; optional ghi `docs/ops/` nếu user muốn |
| **Weekly** | Review OPEN trong `docs/CINS_DECISIONS.md` + brainstorms tuần · chọn 1–3 focus | Checklist next week; gợi ý `/cins:recall` / `/cins:brainstorm` nếu có topic treo |
| **Post-brainstorm** | Đã có file trong `docs/ops/brainstorms/` | Hỏi `/cins:decide` trước khi ghi DECISIONS |

## Luật

1. Tiếng Việt cho user-facing.
2. Không bịa brand/metric — đọc docs.
3. Không đụng Supabase Sine Art; chỉ CINS `ospzzzxcomrmhqrnkoiw`.
4. Quyết định bền → confirm rồi mới ghi `CINS_DECISIONS.md` hoặc `docs/ops/decisions/`.

## Gợi ý câu mở

- Daily: "3 dòng: xong / hôm nay / kẹt?"
- Weekly: "OPEN nào cần đụng tuần này? Có brainstorm chưa converge không?"
