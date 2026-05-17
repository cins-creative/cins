-- Hub /nghe-nghiep — kiểm tra article_gan_nhom + article_nhom (chỉ bảng linh_vuc, không lv_linh_vuc)

-- 1) Bài chưa gán nhóm
SELECT b.id, b.slug, b.tieu_de
FROM public.article_bai_viet b
LEFT JOIN public.article_gan_nhom g ON g.id_bai_viet = b.id
WHERE b.loai_bai_viet = 'nghe'
  AND b.trang_thai_noi_dung = 'published'
  AND g.id_bai_viet IS NULL;

-- 2a) Phân loại nhóm (kiểm tra loai_nhom — hub ưu tiên bo_phan, bỏ linh_vuc umbrella)
SELECT loai_nhom, COUNT(*) AS so_nhom, COUNT(DISTINCT id_linh_vuc) AS so_lv
FROM public.article_nhom
GROUP BY loai_nhom
ORDER BY so_nhom DESC;

-- 2b) Section bộ phận theo lĩnh vực (bỏ nhóm trùng tên lĩnh vực — chỉnh ten nếu slug khác)
SELECT nh.ten AS section, nh.loai_nhom, nh.thu_tu, COUNT(DISTINCT b.id) AS so_bai
FROM public.article_bai_viet b
JOIN public.article_gan_nhom g ON g.id_bai_viet = b.id
JOIN public.article_nhom nh ON nh.id = g.id_nhom
JOIN public.linh_vuc lv ON lv.id = nh.id_linh_vuc
WHERE b.loai_bai_viet = 'nghe'
  AND b.trang_thai_noi_dung = 'published'
  AND lv.slug = 'lv-hoat-hinh'
  AND nh.loai_nhom IS DISTINCT FROM 'linh_vuc'
  AND nh.ten IS DISTINCT FROM lv.ten
GROUP BY nh.id, nh.ten, nh.loai_nhom, nh.thu_tu
ORDER BY nh.thu_tu, nh.ten;

-- 2) Section theo lĩnh vực (slug sidebar) — gồm cả nhóm umbrella
SELECT nh.ten AS section, nh.thu_tu, COUNT(DISTINCT b.id) AS so_bai
FROM public.article_bai_viet b
JOIN public.article_gan_nhom g ON g.id_bai_viet = b.id
JOIN public.article_nhom nh ON nh.id = g.id_nhom
JOIN public.linh_vuc lv ON lv.id = nh.id_linh_vuc
WHERE b.loai_bai_viet = 'nghe'
  AND b.trang_thai_noi_dung = 'published'
  AND lv.slug = 'lv-thiet-ke-do-hoa'
GROUP BY nh.id, nh.ten, nh.thu_tu
ORDER BY nh.thu_tu, nh.ten;

-- 3) Bài có nhiều nhóm thuộc CÙNG một lĩnh vực (cần chọn 1 nhóm để hiển thị)
SELECT
  g.id_bai_viet,
  b.slug,
  lv.slug AS linh_vuc_slug,
  COUNT(DISTINCT g.id_nhom) AS so_nhom_trong_lv
FROM public.article_gan_nhom g
JOIN public.article_bai_viet b ON b.id = g.id_bai_viet
JOIN public.article_nhom nh ON nh.id = g.id_nhom
JOIN public.linh_vuc lv ON lv.id = nh.id_linh_vuc
WHERE b.loai_bai_viet = 'nghe'
  AND b.trang_thai_noi_dung = 'published'
GROUP BY g.id_bai_viet, b.slug, lv.id, lv.slug
HAVING COUNT(DISTINCT g.id_nhom) > 1
ORDER BY so_nhom_trong_lv DESC
LIMIT 30;
