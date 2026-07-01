-- org_su_kien: nội dung chi tiết HTML (Tiptap) — tách khỏi mo_ta tóm tắt ngắn.

ALTER TABLE org_su_kien
  ADD COLUMN IF NOT EXISTS noi_dung text;

COMMENT ON COLUMN org_su_kien.mo_ta IS 'Tóm tắt ngắn 1–2 câu — card / timeline.';
COMMENT ON COLUMN org_su_kien.noi_dung IS 'Nội dung chi tiết HTML (Tiptap) — trang / popup sự kiện.';
