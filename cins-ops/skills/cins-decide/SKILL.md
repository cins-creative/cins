---
name: cins-decide
description: >
  Chốt quyết định CINs có cấu trúc: phương án, trade-off, điều kiện đóng câu OPEN,
  và nơi ghi (CINS_DECISIONS hoặc docs/ops/decisions). Dùng khi /cins:decide,
  "chốt đi", "ghi quyết định", đóng câu OPEN.
---

# CINs Decide

## Workflow

1. **Restate** quyết định đang chốt (1–2 câu).
2. **Options** đã cân (tối thiểu 2, kể cả "không làm / defer").
3. **Recommendation** + lý do neo FOUNDATIONS / cohort / chi phí.
4. **Điều kiện đóng** nếu còn OPEN — hoặc **điều kiện mở lại** nếu chốt tạm.
5. **Hỏi confirm** file ghi:
   - Quyết định sản phẩm / kiến trúc bền → `docs/CINS_DECISIONS.md` (LOG + ngày, chuyển khỏi OPEN nếu có)
   - Ghi chú ops nhẹ / tạm → `docs/ops/decisions/YYYY-MM-DD-<slug>.md`
6. Sau confirm: ghi file; optional Graphiti `[CINS]` Decision.

## Template ghi ngắn (`docs/ops/decisions/`)

```markdown
# Quyết định: {{title}}
- Ngày: YYYY-MM-DD
- Status: chốt | tạm | defer
- Liên quan OPEN/LOG: …

## Chốt
…

## Vì sao
…

## Hệ quả / việc tiếp
- [ ] …
```

## Không làm

- Không ghi DECISIONS khi chưa hỏi confirm.
- Không bịa số liệu.
- Không commit secret.
