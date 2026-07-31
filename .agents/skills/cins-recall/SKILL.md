---
name: cins-recall
description: >
  Nhớ lại quyết định, preference, brainstorm, hoặc ngữ cảnh CINs đã ghi.
  Dùng khi /cins:recall, "mình đã chốt gì", "nhớ lại brainstorm", tìm trong ops docs / Graphiti.
---

# CINs Recall

## Thứ tự tìm (rẻ → đắt)

1. `docs/CINS_DECISIONS.md` — LOG + OPEN
2. `docs/ops/brainstorms/` và `docs/ops/decisions/`
3. `docs/CINS_FOUNDATIONS.md` / `CINS_IMPLEMENTATION.md` nếu hỏi nguyên tắc / API
4. Graphiti MCP: `search_nodes` + `search_memory_facts` với query task + filter tinh thần `[CINS]`
5. agentmemory chỉ khi Graphiti down **và** user bảo dùng

## Output

- Tóm tắt 3–7 bullet những gì tìm được (có path / ID quyết định nếu có)
- Phân biệt rõ: **đã chốt** vs **OPEN** vs **parked brainstorm**
- Nếu không thấy: nói rõ đã tìm đâu; hỏi user bổ sung — không bịa

## Ghi nhớ mới

Khi user nói "nhớ cái này": dùng skill `cins-decide` hoặc Graphiti `add_memory` `[CINS]` — không nhét secret.
