-- Cấu hình trọng số điểm World Timeline (L30) — singleton id=1.
-- Seed = FEED_SCORE / ENGAGEMENT_UNIT mặc định trong code.
-- Idempotent. Chạy: node scripts/run-content-feed-score-cau-hinh-migration.mjs

CREATE TABLE IF NOT EXISTS public.content_feed_score_cau_hinh (
  id                      smallint PRIMARY KEY DEFAULT 1
    CHECK (id = 1),

  base                    smallint NOT NULL DEFAULT 40,
  boost_reset_score       smallint NOT NULL DEFAULT 100,
  verified                smallint NOT NULL DEFAULT 20,
  max_content             smallint NOT NULL DEFAULT 20,
  max_engagement          smallint NOT NULL DEFAULT 20,
  max_total               smallint NOT NULL DEFAULT 100,
  max_total_verified      smallint NOT NULL DEFAULT 120,
  decay_hours             smallint NOT NULL DEFAULT 168,
  content_text_min_chars  smallint NOT NULL DEFAULT 50,
  content_part            smallint NOT NULL DEFAULT 5,
  engagement_reaction     smallint NOT NULL DEFAULT 1,
  engagement_comment      smallint NOT NULL DEFAULT 2,
  engagement_luu          smallint NOT NULL DEFAULT 3,

  cap_nhat_boi            uuid REFERENCES public.user_nguoi_dung(id) ON DELETE SET NULL,
  tao_luc                 timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.content_feed_score_cau_hinh IS
  'Singleton trọng số điểm World Timeline (L30). Admin sửa qua /admin/noi-dung-dang tab Công thức.';

INSERT INTO public.content_feed_score_cau_hinh (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.content_feed_score_cau_hinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feed_score_cau_hinh_select ON public.content_feed_score_cau_hinh;
CREATE POLICY feed_score_cau_hinh_select ON public.content_feed_score_cau_hinh
  FOR SELECT
  USING (true);
