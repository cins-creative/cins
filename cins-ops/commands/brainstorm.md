---
description: Brainstorm CINs — diverge → cluster → converge → next actions; lưu docs/ops/brainstorms/
argument-hint: "<chủ đề, vấn đề, hoặc ý tưởng cần khám phá>"
---

# /cins:brainstorm

> Connector tùy chọn: [CONNECTORS.md](../CONNECTORS.md). Chi tiết skill: `cins-brainstorming`.

Brainstorm với sparring partner. Đây là hội thoại, không phải deliverable dài.

## Usage

```
/cins:brainstorm $ARGUMENTS
```

## Workflow

1. **Frame** — nhận diện mode (problem / solution / assumption / strategy); tối đa 1 clarifying question.
2. **Context** — đọc nhanh `docs/CINS_DECISIONS.md` OPEN liên quan + `cins-context` nếu cần; Graphiti `[CINS]` nếu available.
3. **Diverge → Cluster → Provoke → Converge** — theo skill `cins-brainstorming`.
4. **Capture** — khi wrap: viết `docs/ops/brainstorms/YYYY-MM-DD-<slug>.md` từ `_TEMPLATE.md`.
5. **Follow-up** — gợi ý `/cins:decide` nếu có hướng chốt; không tự ghi DECISIONS khi chưa confirm.

## Close checklist

- [ ] Key ideas (2–5)
- [ ] Strongest direction + lý do
- [ ] Riskiest assumption
- [ ] Next actions (checkbox)
- [ ] Parked
- [ ] File markdown đã lưu (không secret)
