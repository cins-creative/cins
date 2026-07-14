-- Lịch sử phiên bản trọng số điểm Timeline (L30).
-- Mỗi lần admin lưu → 1 dòng; có thể khôi phục.
-- Idempotent. Chạy: node scripts/run-content-feed-score-phien-ban-migration.mjs

CREATE TABLE IF NOT EXISTS public.content_feed_score_phien_ban (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_phien        integer NOT NULL,
  cau_hinh        jsonb NOT NULL,
  ly_do           text NOT NULL,
  loai            text NOT NULL DEFAULT 'luu',
  id_phien_goc    uuid REFERENCES public.content_feed_score_phien_ban(id) ON DELETE SET NULL,
  tao_boi         uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_feed_score_phien UNIQUE (so_phien),
  CONSTRAINT chk_feed_score_phien_loai CHECK (
    loai IN ('luu', 'khoi_phuc', 'mac_dinh', 'seed')
  ),
  CONSTRAINT chk_feed_score_phien_ly_do CHECK (
    char_length(btrim(ly_do)) >= 3 AND char_length(ly_do) <= 500
  )
);

COMMENT ON TABLE public.content_feed_score_phien_ban IS
  'Lịch sử phiên bản content_feed_score_cau_hinh — lý do + snapshot JSON để khôi phục.';

CREATE INDEX IF NOT EXISTS idx_feed_score_phien_tao
  ON public.content_feed_score_phien_ban (tao_luc DESC);

-- Seed phiên bản 1 từ singleton hiện tại (nếu chưa có lịch sử).
INSERT INTO public.content_feed_score_phien_ban (
  so_phien, cau_hinh, ly_do, loai, tao_boi, tao_luc
)
SELECT
  1,
  jsonb_build_object(
    'BASE', c.base,
    'BOOST_RESET_SCORE', c.boost_reset_score,
    'VERIFIED', c.verified,
    'MAX_CONTENT', c.max_content,
    'MAX_ENGAGEMENT', c.max_engagement,
    'MAX_TOTAL', c.max_total,
    'MAX_TOTAL_VERIFIED', c.max_total_verified,
    'DECAY_HOURS', c.decay_hours,
    'CONTENT_TEXT_MIN_CHARS', c.content_text_min_chars,
    'CONTENT_PART', c.content_part,
    'ENGAGEMENT_REACTION', c.engagement_reaction,
    'ENGAGEMENT_COMMENT', c.engagement_comment,
    'ENGAGEMENT_LUU', c.engagement_luu
  ),
  'Phiên bản gốc khi bật lịch sử công thức điểm.',
  'seed',
  c.cap_nhat_boi,
  coalesce(c.cap_nhat_luc, now())
FROM public.content_feed_score_cau_hinh c
WHERE c.id = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.content_feed_score_phien_ban LIMIT 1
  );

ALTER TABLE public.content_feed_score_phien_ban ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feed_score_phien_select ON public.content_feed_score_phien_ban;
CREATE POLICY feed_score_phien_select ON public.content_feed_score_phien_ban
  FOR SELECT
  USING (true);
