-- Thêm loại báo cáo «Lừa đảo» (tách khỏi thông tin sai lệch).
-- Idempotent. Chạy: node scripts/run-bao-cao-lua-dao-migration.mjs
-- Project: CINS ospzzzxcomrmhqrnkoiw

ALTER TYPE public.loai_bao_cao_enum ADD VALUE IF NOT EXISTS 'lua_dao';
