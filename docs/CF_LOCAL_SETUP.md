# Cloudflare → local (Worker dump + secrets)

## 1. Worker đã deploy (debug only)

Đã tải bản production Worker `cins` về (gitignore `_research/`):

`_research/cf-worker-cins-3ce6429d-de0d-491f-9489-fc8594ac422d/`

| File | Ý nghĩa |
|------|---------|
| `version-meta.json` | Metadata version `3ce6429d-…` (2026-07-13) |
| `settings.json` | Bindings / secret **names** |
| `worker-content.multipart` | Raw ~29MB từ API `content/v2` |
| `extracted/worker.js` | Bundle OpenNext đã minify (~28MB) |
| `extracted/*.wasm` / font | Assets kèm Worker |

Đây **không** phải source Next.js — để so/debug runtime. Sửa app vẫn dùng repo GitHub.

Tải lại (khi đã `wrangler login`):

```powershell
# xem version mới nhất
npx wrangler deployments list --name cins
```

## 2. Bindings production

| Name | Type |
|------|------|
| `ASSETS` | assets |
| `HYPERDRIVE` | hyperdrive `d66e788e860c42c893c3a2902533bedf` |
| `CINS_RIVE_ASSETS` | R2 `cins-rive-assets` |
| `CLOUDFLARE_ACCOUNT_ID` | plain text |

## 3. Secrets trên CF (không download được giá trị)

`npx wrangler secret list --name cins`:

1. `BUNNY_STREAM_API_KEY`
2. `CINS_ORG_DELEGATION_PASSWORD`
3. `CLOUDFLARE_IMAGES_API_TOKEN`
4. `GOOGLE_CLIENT_SECRET`
5. `NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH`
6. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. `SUPABASE_SERVICE_ROLE_KEY`

**Điền local**

1. Copy [`.dev.vars.example`](../.dev.vars.example) → `.dev.vars`
2. Mở [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → **cins** → Settings → Variables and Secrets → copy từng giá trị vào `.dev.vars` (và/hoặc `.env.local` cho `npm run host`)
3. Thêm `WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` = Postgres URI (Supabase Connect / pooler)
4. `NEXT_PUBLIC_SUPABASE_URL=https://ospzzzxcomrmhqrnkoiw.supabase.co`
5. `NEXT_PUBLIC_SITE_URL=http://localhost:3001` khi dev

Wrangler **không** export secret values — chỉ dashboard / chỗ bạn đã lưu key.

## 4. Smoke local

```powershell
cd "C:\Users\TheTrung\Projects\CINs Creative"
npm install
# có `.env.local` hoặc `.dev.vars` đủ key
npm run host
# hoặc preview OpenNext:
npm run preview
```
