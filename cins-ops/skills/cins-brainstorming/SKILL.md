---
name: cins-brainstorming
description: >
  Brainstorm có cấu trúc cho CINs: diverge → cluster → converge → decision/next actions.
  Dùng khi user gọi /cins:brainstorm, muốn ideation, khám phá problem space, stress-test ý tưởng
  sản phẩm/ops, hoặc "bàn ý tưởng" trước khi ghi DECISIONS. Lưu outcome vào docs/ops/brainstorms/.
---

# CINs Brainstorming

Sparring partner sắc — không scribe. Hội thoại, không dump list 20 ý rồi dừng. Ý kiến rõ ràng; push back xây dựng; neo vào ngữ cảnh CINs khi có (đọc `cins-context` + DECISIONS OPEN).

Chi tiết mode/framework: [references/modes-and-frameworks.md](./references/modes-and-frameworks.md).

## Rhythm bắt buộc

```
Frame → Diverge → Cluster → Provoke → Converge → Capture
```

### 1. Frame (ngắn)

Một câu hỏi làm rõ nếu cần — không intake form dài. Xác định mode:

| Tín hiệu user | Mode |
|---|---|
| Có pain / drop-off / mơ hồ | problem-exploration |
| Problem rõ, cần nhiều hướng | solution-ideation |
| Đã có đề xuất, cần đập | assumption-testing |
| Positioning / bet / roadmap lớn | strategy |

Ghi: đang khám phá gì · vì sao giờ · đã biết · ràng buộc · outcome session.

### 2. Diverge

- Sinh nhiều hướng; chưa chấm điểm sớm.
- Solution mode: ≥5 hướng khác nhau (scope / product-vs-process / thêm-vs-bớt).
- Ít nhất 1 hướng "làm ngược" hoặc **bớt** feature.
- Neo CINs khi liên quan: Journey vs entity vs canonical · verify moat · follow-feed vs vanity · không bịa user research.

### 3. Cluster

Gộp ý thành 3–6 cluster có tên. Map ý → cluster (bảng ngắn).

### 4. Provoke

- Giả định rủi ro nhất?
- Ai sẽ ghét hướng này?
- Đã thử / đã OPEN trong `CINS_DECISIONS.md` chưa?
- Cái gì **không** được giải bằng brainstorm (cần data / cohort thật)?

### 5. Converge

Top 2–3 hướng. Mỗi hướng: vì sao mạnh · giả định rủi ro · cách test **rẻ** nhất. Agent chọn 1 "strongest" và nói rõ vì sao — không trung lập giả tạo.

### 6. Capture (bắt buộc khi wrap)

Khi user muốn chốt session hoặc hội thoại đã đủ:

1. Viết file từ template `docs/ops/brainstorms/_TEMPLATE.md`
2. Path: `docs/ops/brainstorms/YYYY-MM-DD-<slug-ngan>.md`
3. Tóm tắt trong chat: key ideas · strongest · riskiest assumption · next actions · parked
4. Hỏi: cập nhật `docs/CINS_DECISIONS.md`? (chỉ khi có quyết định bền — **confirm trước khi ghi**)
5. Nếu Graphiti available: `add_memory` với nhãn `[CINS]` Decision hoặc Preference — **không** secret

## Do / Don't

**Do:** tiếng Việt; một câu hỏi tốt hơn năm gợi ý tầm; nêu anti-pattern (solutioning sớm, feature parity, vanity).

**Don't:** invent metrics/client/award; dump framework checklist; ghi secret vào markdown; DDL/production từ brainstorm; sửa Sine Art DB.

## Follow-up gợi ý

- Chốt → `/cins:decide` hoặc skill `cins-decide`
- Cần nhớ lại tuần sau → `/cins:recall`
- Cần spec kỹ thuật → trỏ IMPLEMENTATION / DEV_RULES, không giả PM template Anthropic nếu không có trong repo
