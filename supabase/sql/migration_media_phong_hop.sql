-- Plan 2 Phase A — map chat_phong → meeting external (Cloudflare RealtimeKit / sau này LiveKit)
-- CREATE TABLE mới — không ALTER cột cũ.

CREATE TABLE IF NOT EXISTS media_phong_hop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_chat_phong uuid NOT NULL REFERENCES chat_phong (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'cloudflare'
    CHECK (provider IN ('cloudflare', 'livekit')),
  id_external text NOT NULL,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  cap_nhat_luc timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_phong_hop_id_chat_phong_key UNIQUE (id_chat_phong)
);

CREATE INDEX IF NOT EXISTS media_phong_hop_provider_idx
  ON media_phong_hop (provider);

COMMENT ON TABLE media_phong_hop IS
  'Phòng học A/V: 1 chat_phong ↔ 1 meeting external (CF RealtimeKit / LiveKit).';
