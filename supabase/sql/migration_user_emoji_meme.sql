-- Bộ meme / sticker cá nhân cho chat (mỗi user tối đa 5 category, 64 meme/category).
-- Chạy Supabase SQL Editor — idempotent.

CREATE TABLE IF NOT EXISTS public.user_emoji_bo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_nguoi_dung  uuid NOT NULL REFERENCES public.user_nguoi_dung(id) ON DELETE CASCADE,
  ten            text NOT NULL,
  thu_tu         smallint NOT NULL DEFAULT 0,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_emoji_bo_nguoi_dung
  ON public.user_emoji_bo (id_nguoi_dung, thu_tu);

COMMENT ON TABLE public.user_emoji_bo IS
  'Category meme/sticker cá nhân — tối đa 5 bo/user (enforce app layer).';

CREATE TABLE IF NOT EXISTS public.user_emoji_muc (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_bo          uuid NOT NULL REFERENCES public.user_emoji_bo(id) ON DELETE CASCADE,
  cloudflare_id  text NOT NULL,
  ten_goi        text,
  thu_tu         smallint NOT NULL DEFAULT 0,
  da_xoa         boolean NOT NULL DEFAULT false,
  tao_luc        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_emoji_muc_bo
  ON public.user_emoji_muc (id_bo, thu_tu)
  WHERE da_xoa = false;

COMMENT ON TABLE public.user_emoji_muc IS
  'Meme/sticker trong một bo — tối đa 64 active/bo (enforce app layer).';

ALTER TABLE public.user_emoji_bo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emoji_muc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_emoji_bo_owner ON public.user_emoji_bo;
CREATE POLICY user_emoji_bo_owner ON public.user_emoji_bo
  FOR ALL
  TO authenticated
  USING (id_nguoi_dung = public.current_profile_id())
  WITH CHECK (id_nguoi_dung = public.current_profile_id());

DROP POLICY IF EXISTS user_emoji_muc_owner ON public.user_emoji_muc;
CREATE POLICY user_emoji_muc_owner ON public.user_emoji_muc
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_emoji_bo b
      WHERE b.id = id_bo
        AND b.id_nguoi_dung = public.current_profile_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_emoji_bo b
      WHERE b.id = id_bo
        AND b.id_nguoi_dung = public.current_profile_id()
    )
  );
