import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
const url = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
const db = postgres(url, { max: 1, ssl: "require", prepare: false });

try {
  const pub = await db.unsafe(`
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'chat_tin_nhan'
  `);
  console.log("publication rows (expect 1):", pub);

  const replica = await db.unsafe(`
    SELECT relname, relreplident
    FROM pg_class
    WHERE oid = 'public.chat_tin_nhan'::regclass
  `);
  console.log("replica identity (expect f = FULL):", replica);

  const rls = await db.unsafe(`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE oid = 'public.chat_tin_nhan'::regclass
  `);
  console.log("RLS enabled:", rls);

  const policies = await db.unsafe(`
    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr, pg_get_expr(polwithcheck, polrelid) AS check_expr, polroles::regrole[]
    FROM pg_policy
    WHERE polrelid = 'public.chat_tin_nhan'::regclass
  `);
  console.log("policies on chat_tin_nhan:", policies);

  const fn = await db.unsafe(`
    SELECT proname, prosecdef, provolatile
    FROM pg_proc
    WHERE proname IN ('current_profile_id', 'is_chat_room_member')
  `);
  console.log("helper functions:", fn);

  const authUserBackfill = await db.unsafe(`
    SELECT count(*) AS total, count(auth_user_id) AS with_auth_user_id
    FROM public.user_nguoi_dung
  `);
  console.log("user_nguoi_dung auth_user_id coverage:", authUserBackfill);

  // Duplicate 1_1 rooms between the same pair of users (split-brain DM bug).
  const dupRooms = await db.unsafe(`
    WITH dm_members AS (
      SELECT tv.id_phong, array_agg(tv.id_nguoi_dung ORDER BY tv.id_nguoi_dung) AS members
      FROM public.chat_thanh_vien tv
      JOIN public.chat_phong p ON p.id = tv.id_phong
      WHERE p.loai_phong = '1_1' AND tv.roi_luc IS NULL
      GROUP BY tv.id_phong
      HAVING count(*) = 2
    )
    SELECT members, array_agg(id_phong) AS room_ids, count(*) AS room_count
    FROM dm_members
    GROUP BY members
    HAVING count(*) > 1
    ORDER BY count(*) DESC
    LIMIT 20
  `);
  console.log("duplicate 1_1 rooms for same pair (should be empty):", dupRooms);

  // Messages inserted in the last 14 days, grouped by whether recipient has a chat_da_doc row at all.
  const recentActivity = await db.unsafe(`
    SELECT count(*) AS total_recent_messages
    FROM public.chat_tin_nhan
    WHERE tao_luc > now() - interval '14 days'
      AND da_xoa = false
  `);
  console.log("recent messages (14d):", recentActivity);
} finally {
  await db.end({ timeout: 5 });
}
