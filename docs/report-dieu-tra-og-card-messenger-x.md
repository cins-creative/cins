# Báo cáo điều tra OG Card — Facebook OK, Messenger & X không nhận

> **Chế độ:** chỉ điều tra — không sửa code trong phiên này.  
> **Ngày đo:** 2026-07-16  
> **Brief gốc:** `C:\Users\DELL\Downloads\brief-dieu-tra-og-card.md`  
> **URL mẫu:**
> - `https://cins.vn/nguyenthanhtu?view=gallery&display=luoi&nhom=du-an`
> - `https://cins.vn/basakila?view=gallery&filter=shop`

---

## KẾT LUẬN

Nguyên nhân gốc **không** phải thiếu `twitter:card` hay meta sai cú pháp — meta đủ và giống nhau giữa Twitterbot / Facebook.

Khả năng cao nhất là **OG image on-demand quá chậm** (`GET` PNG ~5–9s, đôi khi timeout) + **`Cache-Control: max-age=0`** (không cache CDN), nên Messenger/X (fetch một phát, timeout ngắn) drop ảnh trong khi Facebook Feed scrape async vẫn kịp.

**Mức chắc chắn:** cao cho latency; vừa cho `noindex, nofollow` như nguyên nhân phụ riêng với X.

Suy luận ban đầu của brief (latency / khả năng truy cập ảnh) — **xác nhận**.  
Giả thuyết thiếu `twitter:card` — **bác bỏ**.

---

## Triệu chứng quan sát (từ brief)

| Nền tảng | Kết quả |
|---|---|
| Facebook — bài post | ✅ Card + ảnh hiện đầy đủ |
| Facebook — comment | ✅ Hiện |
| Facebook Messenger — inbox | ❌ Không nhận |
| X (Twitter) | ❌ Không nhận |

---

## Trả lời 4 câu hỏi

| Q | Kết quả |
|---|---|
| **Q1** OG image sinh thế nào? | On-demand `next/og` + Satori; snapshot CF có trong code nhưng URL test production **chưa dùng** — vẫn fallback `/opengraph-image` |
| **Q2** Latency thực tế? | `GET` PNG **~5–9s** (có lần timeout 25s); vượt ngưỡng nguy hiểm >2s |
| **Q3** Meta tags đủ không? | Đủ bắt buộc + width/height/type + **twitter:card**. Thiếu `og:image:secure_url`. Có **noindex, nofollow** |
| **Q4** Bot có bị chặn không? | Không thấy chặn Twitterbot / facebookexternalhit trong middleware hay robots.txt |

---

## BẰNG CHỨNG

### Meta tags hiện có

UA `Twitterbot/1.0` và `facebookexternalhit/1.1` nhận **cùng bộ meta** trên URL nguyenthanhtu.

| Tag | Giá trị | Ghi chú |
|---|---|---|
| og:title | Portfolio · Dự án · Nguyễn Thanh Tú · CINS | OK |
| og:description | 19 tác phẩm · Dự án — Nguyễn Thanh Tú trên CINs. | OK |
| og:url | `https://cins.vn/nguyenthanhtu?view=gallery&nhom=du-an` | Giữ `view` + `nhom`; **strip** `display=luoi` (UI only — đúng) |
| og:site_name | CINs | OK |
| og:locale | vi_VN | OK |
| og:type | profile | OK |
| og:image | `https://cins.vn/nguyenthanhtu/opengraph-image?view=gallery&nhom=du-an&v=lstack-gdu-an-psun` | **On-demand**, chưa CF snapshot |
| og:image:type | image/png | Có |
| og:image:width | 1200 | Có |
| og:image:height | 630 | Có |
| og:image:alt | Portfolio · Dự án · Nguyễn Thanh Tú · CINS | Có |
| og:image:secure_url | **THIẾU** | URL đã là `https://` — rủi ro thấp |
| twitter:card | summary_large_image | **Có** — bác bỏ giả thuyết thiếu card |
| twitter:title | (cùng title) | OK |
| twitter:description | (cùng description) | OK |
| twitter:image | (cùng URL opengraph-image) | OK |
| twitter:image:width / height / alt | Có | OK |
| robots | **noindex, nofollow** | Nghi ngờ riêng với X |

`basakila?view=gallery&filter=shop` cũng vậy:

- `og:image` = `/basakila/opengraph-image?view=gallery&filter=shop&v=lfilm-fshop-pconfetti`
- `robots=noindex, nofollow`
- `twitter:card=summary_large_image`

#### Nguồn code emit meta

`app/[slug]/_lib/build-journey-metadata.ts`:

```ts
return {
  metadataBase: new URL(siteOrigin),
  title,
  description,
  robots: { index: false, follow: false },
  openGraph: {
    title,
    description,
    url: pagePath,
    siteName: "CINs",
    locale: "vi_VN",
    type: "profile",
    images: [
      {
        url: ogImageUrl, // ctx?.ogSnapshotUrl ?? /{slug}/opengraph-image?...
        alt: title,
        width: 1200,
        height: 630,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: ogImageUrl, alt: title, width: 1200, height: 630 }],
  },
};
```

`og:url` / query share được build bởi `buildOgShareSearchParams` trong `lib/journey/og-share-fetch.ts` — chỉ giữ `view`, `filter` hoặc `nhom` (không giữ `display`).

---

### OG image endpoint

| Mục | Chi tiết |
|---|---|
| Cách sinh | **On-demand** mỗi request (Satori / `next/og`). Có đường **pre-generated CF snapshot** (`ctx.ogSnapshotUrl`) nhưng URL test prod **chưa trỏ tới** |
| File | `app/[slug]/opengraph-image.tsx` |
| Lib | `ImageResponse` từ `next/og` + `lib/journey/og-share-card.tsx` + `lib/journey/og-fonts.ts` |
| Size / format | 1200×630, `contentType = "image/png"` |
| Cache-Control (prod) | `public, max-age=0, must-revalidate` → gần như regenerate mỗi lần |

```ts
// app/[slug]/opengraph-image.tsx
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

return new ImageResponse(element, {
  ...size,
  fonts,
});
```

Middleware gắn `x-url` cho route OG để đọc query (`view` / `nhom` / `filter`) khi Next không truyền `searchParams` ổn định:

```ts
// middleware.ts ~251–258
if (pathname.endsWith("/opengraph-image") || pathname.endsWith("/twitter-image")) {
  requestHeaders.set("x-url", request.nextUrl.href);
  ...
}
```

---

### Đo latency

URL ảnh đo:

`https://cins.vn/nguyenthanhtu/opengraph-image?view=gallery&nhom=du-an&v=lstack-gdu-an-psun`

| Lần | UA | HTTP | Thời gian | Content-Type | Ghi chú |
|---|---|---|---|---|---|
| HEAD “cold” | Twitterbot | 200 | **1.07s** | image/png | `size_download=0` — HEAD không đo đủ body |
| HEAD warm | Twitterbot | 200 | **0.82s** | image/png | |
| HEAD | facebookexternalhit | 200 | **0.93s** | image/png | |
| **GET** | Twitterbot | 200 | **4.73s** | image/png | size=395404 |
| **GET warm** | Twitterbot | 200 | **8.70s** | image/png | size=395404 |
| **GET** | facebookexternalhit | **000** | **25.0s** | (timeout) | `--max-time 25` — không kịp |

Ngưỡng brief (>2s): **GET vượt rõ**. Chỉ đo `curl -I` (HEAD) dễ gây hiểu nhầm vì nhanh hơn nhiều so với tải body.

#### Headers đầy đủ (HEAD, Twitterbot)

```
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: public, max-age=0, must-revalidate
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-opennext: 1
Server: cloudflare
```

#### Output lệnh tham chiếu (nguyên văn rút gọn)

```text
===== GET download timing cold-ish =====
code=200 time=4.728983s type=image/png size=395404 redirects=0

===== GET warm (max-time 25s) =====
code=200 time=8.698462s type=image/png size=395404

===== GET FB (max-time 25s) =====
code=000 time=25.004675s type= size=0
```

---

### Bot access

#### robots.txt (Cloudflare Managed — trích)

```text
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot
Disallow: /
...
User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /
```

- **Không** Disallow `Twitterbot`.
- **Không** Disallow `facebookexternalhit`.
- Có Disallow vài bot AI (`GPTBot`, `meta-externalagent`, …).

#### Middleware

- **Không** phân biệt User-Agent / whitelist bot.
- Chỉ session Supabase + redirect legacy + gắn `x-url` cho OG.
- `MAINTENANCE_MODE = false`.

#### Khác

- `vercel.json`: không tìm thấy (deploy OpenNext / Cloudflare Workers).
- App `robots.ts` / `robots.txt` trong repo: không tìm thấy; `/robots.txt` trên prod trả nội dung CF, đồng thời có dấu hiệu `[slug]` bắt path như journey HTML — **side issue**, không phải nguyên nhân chính Messenger/X.

---

## ĐỀ XUẤT FIX (CHƯA APPLY)

| # | Việc | Giải quyết vấn đề gì | Effort |
|---|---|---|---|
| 1 | Ưu tiên `og:image` = PNG đã snapshot CF (`imagedelivery.net/.../public`) sau khi chủ hồ sơ share; đảm bảo key filter/layout khớp | Ảnh tĩnh CDN <200ms → Messenger/X lấy kịp | S (pipeline đã có — cần publish + verify prod) |
| 2 | Cache CDN cho `/opengraph-image`: `Cache-Control: public, s-maxage=86400` (hoặc ISR / `revalidate`) | Warm path nhanh khi chưa có snapshot | M |
| 3 | Xem lại `robots: { index: false }` trên trang share công khai — ít nhất nới cho bot, hoặc bỏ `noindex` nếu SEO cho phép | X thường bỏ card trên trang noindex | S–M |
| 4 | (Tuỳ chọn) thêm `og:image:secure_url` trùng URL https | Compliance crawler cũ | S |
| 5 | Khi chẩn đoán latency: luôn `GET` body, không chỉ `HEAD` | Tránh false negative | — |

---

## ĐIỀU CHƯA XÁC MINH ĐƯỢC

- Messenger inbox fail **chỉ** vì timeout ảnh hay còn rule FB riêng (app link preview / domain trust) — không test được API Messenger từ môi trường này.
- Output chính thức X Card Validator (cần tài khoản / UI) — chưa chạy; chưa A/B tách `noindex` vs latency.
- Vì sao một lần GET FB timeout 25s trong khi GET Twitterbot 4–9s — có thể cold Worker / load / PoP khác (HKG vs SIN trên CF-RAY).
- URL test chưa có CF snapshot dù code ưu tiên snapshot — chưa xác nhận owner đã publish snapshot đúng key trên prod.

---

## Phụ lục — map file liên quan

| Vai trò | Path |
|---|---|
| Metadata / og + twitter | `app/[slug]/_lib/build-journey-metadata.ts` |
| GenerateMetadata route | `app/[slug]/page.tsx` |
| OG image on-demand | `app/[slug]/opengraph-image.tsx` |
| OG URL helpers + cache headers + warm | `lib/journey/og-image-url.ts` |
| Fetch context + search params | `lib/journey/og-share-fetch.ts` |
| Card Satori layouts | `lib/journey/og-share-card.tsx` |
| Snapshot CF helpers | `lib/journey/share-og-theme.ts` |
| Upload snapshot API | `app/api/share-theme/og-card/route.ts` |
| Share modal (warm on copy/share) | `components/journey/JourneyProfileShareModal.tsx` |
| Middleware | `middleware.ts` |

---

## Phase 1 — đã code (chờ deploy + đo lại)

### Việc đã làm

1. **`withOgImageCacheHeaders`** (`lib/journey/og-image-url.ts`) — gỡ `Vary`, set  
   `Cache-Control` / `CDN-Cache-Control: public, max-age=31536000, immutable`  
   áp vào response `opengraph-image.tsx` (twitter-image re-export cùng default).
2. **Middleware** — cùng Cache-Control trên response wrapper cho `/opengraph-image` và `/twitter-image` (Vary cuối cùng vẫn phụ thuộc handler; strip chính ở bước 1).
3. **1c Pre-warm** — xác minh: preview modal là DOM (`JourneyShareCardPreview`), **không** hit `/opengraph-image` → thêm `warmOnDemandOgImage()` (cùng `v=` với metadata) fire-and-forget trên Copy link / Facebook / native share / Copy ảnh.
4. Helper URL dùng chung client+server: `buildOgImageVersion`, `buildJourneyOgImagePath`, …

### Đo prod sau deploy (chưa chạy — code chưa lên cins.vn)

Baseline Phase 0 (trước fix):

| Lần | cf-cache-status | time | size |
|---|---|---|---|
| 1 | (không có) | 6.87s | 395404 |
| 2 | (không có) | 7.52s | 395404 |
| 3 | (không có) | 7.09s | 395404 |

Sau deploy, đo lại:

```bash
OG='https://cins.vn/nguyenthanhtu/opengraph-image?view=gallery&nhom=du-an&v=lstack-gdu-an-psun'
# 3 GET liên tiếp → lần 2+ kỳ vọng HIT + time < 0.5s
# Copy link trên modal → đợi 2s → curl -sI "$OG" | grep -i cf-cache-status
```

### Acceptance Phase 1

| Tiêu chí | Trạng thái |
|---|---|
| Không còn `Vary` RSC (hoặc chỉ Accept-Encoding) | Code đã strip — **verify sau deploy** |
| `Cache-Control: public, max-age=31536000, immutable` | Code đã set — **verify sau deploy** |
| Lần 2+ `cf-cache-status: HIT`, time &lt; 0.5s | **Chờ deploy** |
| Copy link → 2s → HIT | Warm đã wire — **chờ deploy** |
| Đổi `v=` → ảnh mới | Nội dung key không đổi logic |

⛔ Dừng Phase 1 tại đây — không sang Phase 2 cho đến khi đo sau deploy đạt acceptance.
