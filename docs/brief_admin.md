# Brief: Trang Admin CINS — /admin

Scope: CINs internal only — không phải trường admin.  
Mockup HTML: `admin-skeleton.html` (reference).  
Implementation: `app/admin/*`, `components/admin/*`, `app/cins-admin.css`.

## Phân biệt 2 loại admin

| | CINS Admin (/admin) | Trường Admin (inline) |
|---|---|---|
| Ai dùng | CINS internal | Staff trường |
| Route | /admin/* | /truong-dai-hoc/[slug] (inline) |
| Quyền | owner / dev gate | admin/quan_ly_* |

## Routes (repo)

- `/admin` → redirect `/admin/bai-viet`
- `/admin/bai-viet` — bảng + slide-over (Supabase)
- `/admin/de-xuat`, `/admin/to-chuc`, `/admin/nganh`, `/admin/edu` — mock UI
- `/admin/nguoi-dung`, `/admin/analytics` — placeholder

## Dev gate

`NODE_ENV=development` hoặc `CINS_INLINE_ARTICLE_EDIT=1` + `SUPABASE_SERVICE_ROLE_KEY`.
