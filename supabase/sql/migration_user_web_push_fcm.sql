-- user_web_push: mở rộng nhận FCM native (ios/android) — Option A / SSOT
-- Giữ tên bảng (đã có 3 row Web Push). Không CREATE bảng thứ hai cùng grain.
-- Idempotent. Runner: npm run migrate:user-web-push-fcm

-- 1) Cột mới
ALTER TABLE public.user_web_push
  ADD COLUMN IF NOT EXISTS nen_tang text NOT NULL DEFAULT 'web';

ALTER TABLE public.user_web_push
  ADD COLUMN IF NOT EXISTS token text;

ALTER TABLE public.user_web_push
  ADD COLUMN IF NOT EXISTS mat_hieu_luc_luc timestamptz;

-- 2) Web Push keys chỉ bắt buộc với nen_tang='web' → cho phép NULL với FCM
ALTER TABLE public.user_web_push
  ALTER COLUMN endpoint DROP NOT NULL;

ALTER TABLE public.user_web_push
  ALTER COLUMN p256dh DROP NOT NULL;

ALTER TABLE public.user_web_push
  ALTER COLUMN auth DROP NOT NULL;

-- 3) Backfill: row cũ = web (đã default). Đảm bảo row web còn đủ keys.
UPDATE public.user_web_push
SET nen_tang = 'web'
WHERE nen_tang IS DISTINCT FROM 'web'
  AND endpoint IS NOT NULL
  AND p256dh IS NOT NULL
  AND auth IS NOT NULL
  AND token IS NULL;

-- 4) CHECK nền tảng
ALTER TABLE public.user_web_push
  DROP CONSTRAINT IF EXISTS user_web_push_nen_tang_chk;

ALTER TABLE public.user_web_push
  ADD CONSTRAINT user_web_push_nen_tang_chk
  CHECK (nen_tang IN ('web', 'ios', 'android'));

-- 5) CHECK hình dạng credential theo nền tảng
ALTER TABLE public.user_web_push
  DROP CONSTRAINT IF EXISTS user_web_push_credential_chk;

ALTER TABLE public.user_web_push
  ADD CONSTRAINT user_web_push_credential_chk
  CHECK (
    (
      nen_tang = 'web'
      AND endpoint IS NOT NULL
      AND length(trim(endpoint)) > 0
      AND p256dh IS NOT NULL
      AND auth IS NOT NULL
    )
    OR (
      nen_tang IN ('ios', 'android')
      AND token IS NOT NULL
      AND length(trim(token)) > 0
    )
  );

-- 6) Unique token FCM (partial — nhiều NULL được)
CREATE UNIQUE INDEX IF NOT EXISTS user_web_push_token_uniq
  ON public.user_web_push (token)
  WHERE token IS NOT NULL;

-- 7) Index tra cứu gửi push theo user (bỏ qua đã mất hiệu lực)
CREATE INDEX IF NOT EXISTS user_web_push_user_active_idx
  ON public.user_web_push (id_nguoi_dung, nen_tang)
  WHERE mat_hieu_luc_luc IS NULL;

COMMENT ON TABLE public.user_web_push IS
  'Đăng ký thiết bị nhận push: 1 user ↔ N thiết bị. web = Web Push (endpoint+p256dh+auth); ios/android = FCM token. SoT duy nhất — không tạo bảng push thứ hai.';

COMMENT ON COLUMN public.user_web_push.nen_tang IS
  'web | ios | android';

COMMENT ON COLUMN public.user_web_push.token IS
  'FCM registration token (ios/android). NULL với web.';

COMMENT ON COLUMN public.user_web_push.mat_hieu_luc_luc IS
  'NOT NULL = token/endpoint đã chết (FCM 404/410) hoặc user gỡ — không gửi nữa.';

COMMENT ON COLUMN public.user_web_push.endpoint IS
  'Web Push endpoint. NULL với FCM native.';
