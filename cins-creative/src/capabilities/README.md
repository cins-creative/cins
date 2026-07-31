# Capabilities — CINs Creative Phase X contracts

Bảng này ghi lại các tính năng đã implement và contract của chúng.

## Phase 1 — Portfolio shell (implemented)

| Capability | Route/File | Input | Output | Auth |
|---|---|---|---|---|
| Tạo tác phẩm | `studio/new` → `lib/create-work.ts` | tieu_de, files, linhVucIds | work.id | Required (owner) |
| Sửa tác phẩm | `studio/[id]/edit` | work fields, blocks, media | DB update | Required (owner RLS) |
| Xóa tác phẩm | `studio/[id]/edit` → DELETE | work id | redirect /studio | Required (owner) |
| Portfolio công khai | `/@slug` → `/u/[slug]` | slug, ?linh_vuc= | HTML list | Public |
| Chi tiết tác phẩm | `/@slug/workSlug` → `/u/[slug]/[workSlug]` | slug, workSlug | HTML detail | Public (chi_minh = owner only) |
| Khám phá lĩnh vực | `/explore` | — | HTML grid nhóm + lĩnh vực | Public |
| Lĩnh vực detail | `/linh-vuc/[slug]?page=` | slug, page | HTML grid (24/page) | Public |
| JSON feed | `/api/feed/[slug]` | slug | `{slug, works[]}` | Public |
| Nhãn / collections | `/studio/collections` | — | CRUD filter_nhan + filter_gan | Required (owner) |
| Reaction | `WorkSocial.tsx` | workId, emoji | social_reaction upsert | Required |
| Lưu tác phẩm | `WorkSocial.tsx` | workId | social_luu toggle | Required |
| Follow tác giả | `WorkSocial.tsx` | authorId | user_theo_doi toggle | Required (not own) |
| Lượt xem | `WorkSocial.tsx` | workId | social_luot_xem ping (once/session) | Anonymous ok |
| Upload ảnh | `lib/upload.ts` → `/api/cf-upload-url` | File | Cloudflare Images ID | Required (session) |
| Blocks renderer | `lib/blocks.tsx` | JSON blocks | React nodes | — |

## Middleware rewrites

| URL pattern | Rewrite đến | Lý do |
|---|---|---|
| `/@*` | `/u/*` | Next.js App Router `@folder` = parallel route slot — không phải URL segment |

## Enums quan trọng (DB)

| Enum | Giá trị |
|---|---|
| `che_do_hien_thi_moc_enum` | `public`, `chi_minh`, `feature`, `theo_nhom`, `cong_dong` |
| `loai_doi_tuong_social_enum` | `tac_pham`, `nguoi_dung`, `cot_moc`, … |
| `loai_theo_doi_enum` | `nguoi_dung`, `the`, `to_chuc` |
| `filter_doi_tuong_enum` | `tac_pham`, `cot_moc`, `org_bai_dang` |
| `trang_thai_tai_khoan_enum` | `dang_hoat_dong`, `tam_dung`, `da_xoa`, `bi_khoa` |

## Pending / polish

- [ ] Gallery lightbox cho media
- [ ] OG image generation động
- [ ] Search full-text
- [ ] Sitemap
- [ ] Notification follow/reaction
- [ ] Danh sách đã lưu trong profile

## Phase X — Ecosystem contracts (deferred · không ship vào core)

| Capability | Load | Phụ thuộc shell | Cấm |
|---|---|---|---|
| Portfolio | routes hiện tại | auth, CF, content_* | — |
| Widget feed | `/api/feed/[slug]` | cover URL https | scrape HTML |
| Sine Art | lazy package/route sau | org/khóa CINs hoặc API bridge — **không** ghi DB Sine Art từ shell | hardcode SA vào core |
| Edit / Design | `import()` động sau | media IDs | Tiptap trên first-load `/@slug` |
| 3D / Game | dynamic + WebGL sau | asset URL | three/babylon trên public routes |

Deps sàn: `next` + `react` + `react-dom` + `@supabase/*`. Budget: 0 editor/3D/Rive/Radix trên first-load public.
