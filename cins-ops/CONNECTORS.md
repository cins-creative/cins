# CONNECTORS — cins-ops

Plugin này **không bắt buộc** MCP. Các workflow chạy được chỉ với file trong repo.

## Khi có connector (tuỳ chọn)

| Placeholder / tên | Vai trò | Ghi chú CINs |
|---|---|---|
| Graphiti MCP | `search_nodes` / `search_memory_facts` / `add_memory` | Nhãn episode: `[CINS]` + loại (Preference / Decision / Procedure). Không ghi secret. |
| agentmemory | `memory_recall` / `memory_save` | Fallback khi Graphiti down — chỉ khi user bảo dùng. |
| Supabase MCP | Schema / SQL đọc | **Chỉ** project `ospzzzxcomrmhqrnkoiw`. Không đụng Sine Art. |

## Không làm

- Không invent API key / password / env secret vào brainstorm hay decision log.
- Không ghi credential vào `docs/ops/**`.
- Không DDL production từ ops chat — theo `docs/PHASE0_SECURITY_RUNBOOK.md` / DECISIONS L29.
