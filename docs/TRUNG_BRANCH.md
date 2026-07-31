# Nhánh Trung — deploy & cách ly

> **Không đụng `main` / worker `cins` / `cins.vn`.** Document riêng nhánh `trung/cins-website`.

## Định danh

| | Giá trị |
|---|---|
| GitHub branch | `trung/cins-website` |
| Worker | `trung-cins` |
| URL | `https://trung.cins.vn` |
| Wrangler | `wrangler.trung.jsonc` |
| Scripts | `npm run preview:trung` · `npm run deploy:trung` |
| CI | `.github/workflows/cloudflare-deploy-trung.yml` (chỉ push `trung/cins-website`) |

Production vẫn: worker `cins` → `cins.vn` · workflow `cloudflare-deploy.yml` · `npm run deploy`.

## Mục tiêu máy / workspace

```text
C:\Users\TheTrung\Projects\trung-cins-website   ← git worktree nhánh trung/cins-website
```

Repo gốc `CINs Creative` có thể ở detached HEAD (đối chiếu). Làm việc và commit từ folder `trung-cins-website`.

Shell portfolio cũ: `_archive/cins-creative/` (tham khảo). Public browse lĩnh vực: `/explore`, `/linh-vuc/[slug]`.

## Cảnh báo dùng chung (khai báo)

Worker Trung hiện bind **cùng** Hyperdrive + R2 (`cins-rive-assets`, `cins-chat-video`) và cùng Supabase project với prod.

- **DB / storage dùng chung** → mọi migration, ALTER, xóa object R2/Images ảnh hưởng `main`.
- Mặc định: **không chạy** SQL migration / không xóa media từ nhánh này.
- Xung đột logic/dữ liệu khi build → dừng và báo ngay.

## Setup một lần (Cloudflare + Auth)

Làm thủ công với quyền Dashboard — **add-only**, không xóa URL/secret của prod.

### 1. Secrets worker `trung-cins`

Sau deploy lần đầu (CI hoặc `npm run deploy:trung`):

```bash
# Liệt kê secrets trên prod (chỉ đọc — không sửa worker cins)
npx wrangler secret list --name cins

# Copy sang trung-cins (bulk từ file local đã export tay; KHÔNG ghi đè worker cins)
npx wrangler secret bulk path/to/trung-secrets.json --name trung-cins
```

Hoặc Dashboard → Workers → **trung-cins** → Variables and Secrets — dán cùng bộ secret runtime như `cins` (SUPABASE_*, CLOUDFLARE_IMAGES_*, BUNNY_*, DATABASE_URL, …).

### 2. Custom domain

`wrangler.trung.jsonc` khai `trung.cins.vn` (`custom_domain: true`). Deploy tạo DNS/cert trên zone `cins.vn`. Kiểm tra Dashboard: worker **trung-cins** gắn **chỉ** `trung.cins.vn` — không có `cins.vn` / `www`.

### 3. Supabase Auth (add-only)

Supabase → Authentication → URL Configuration → **Redirect URLs** thêm:

- `https://trung.cins.vn/auth/callback`

**Không xóa** `https://cins.vn/auth/callback` hay URL localhost production đang dùng.

Local Trung (nếu host root): `http://localhost:3001/auth/callback` (đã có) hoặc port bạn chọn.

### 4. GitHub Actions

Cùng Repository secrets như workflow `main` (không cần secret mới). Workflow Trung set `NEXT_PUBLIC_SITE_URL=https://trung.cins.vn` rồi gọi `npm run deploy:trung`.

## Lệnh an toàn

```bash
# Đúng
npm run preview:trung
npm run deploy:trung
git push -u origin trung/cins-website

# Sai — đụng production
npm run deploy
npx wrangler deploy   # mặc định wrangler.jsonc → worker cins
git push origin main
```
