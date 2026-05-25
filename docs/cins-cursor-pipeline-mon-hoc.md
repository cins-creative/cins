# CINS — Cursor Pipeline: Viết nội dung Môn học (v3)

Vòng lặp viết `loai_bai_viet = 'mon_hoc'` với 6 sections.

**Brief:** [`cins-brief-article-mon-hoc.md`](./cins-brief-article-mon-hoc.md)  
**Mẫu:** `update-bo-cuc-mau-v3.sql` (~13k ký tự, 6 sections, có accordion + path)

---

## Scripts

```bash
# Xem hàng đợi
npx tsx scripts/fetch-mon-hoc-queue.mts 10

# Áp dụng batch
npx tsx scripts/apply-mon-hoc-manifest.mts manifest-batchN.json
```

Apply script đã đủ điều kiện:
- `WHERE id = '...' AND loai_bai_viet = 'mon_hoc' AND (noi_dung IS NULL OR noi_dung = '')`
- Verify `LENGTH(noi_dung) > 2500` (mục tiêu thực tế 8–15k)

---

## Vòng lặp

1. **Bước 0** — `COUNT(*)` bài chưa có `noi_dung`
2. **Bước 1** — Lấy 5-10 bài `ORDER BY tieu_de ASC`
3. **Bước 2** — Phân loại môn:
   - Thi năng khiếu / Kỹ thuật / Nghệ thuật / Lý thuyết / Thiết kế ứng dụng / Media
4. **Bước 3** — Viết HTML 6 sections (xem brief)
5. **Bước 4** — Tạo manifest JSON `[{id, slug, tieu_de, tieu_de_eng, tieu_de_viet, tom_tat, meta_title, meta_description}]`
6. **Bước 5** — Apply, verify, báo cáo

---

## Lưu ý

- Chuẩn hóa `tieu_de` có dấu khi UPDATE
- Không tạo `article_lien_quan` / `article_gan_nhom` trong pipeline
- Slugs có hậu tố số (vd `-3`) thường là module course — giữ nguyên hoặc bỏ tùy ngữ cảnh, hỏi user nếu không chắc
- Môn hẹp (Lụa, Phù điêu, Tượng tròn) → section 03 nhấn giá trị văn hóa + nghề hiện đại
