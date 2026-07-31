"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Props = {
  workId: string;
  authorId: string;
};

const EMOJIS = ["❤️", "🔥", "👏", "✨"] as const;

export function WorkSocial({ workId, authorId }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  // Load auth + initial state
  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("user_nguoi_dung")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!profile) return;
      setProfileId(profile.id);

      // My reaction
      const { data: reaction } = await supabase
        .from("social_reaction")
        .select("emoji")
        .eq("id_doi_tuong", workId)
        .eq("loai_doi_tuong", "tac_pham")
        .eq("id_nguoi_dung", profile.id)
        .maybeSingle();
      setMyReaction(reaction?.emoji ?? null);

      // Saved?
      const { data: luuRow } = await supabase
        .from("social_luu")
        .select("id")
        .eq("id_doi_tuong", workId)
        .eq("loai_doi_tuong", "tac_pham")
        .eq("id_nguoi_dung", profile.id)
        .maybeSingle();
      setSaved(!!luuRow);

      // Following author?
      const { data: followRow } = await supabase
        .from("user_theo_doi")
        .select("id")
        .eq("id_doi_tuong", authorId)
        .eq("loai_doi_tuong", "nguoi_dung")
        .eq("id_nguoi_theo_doi", profile.id)
        .maybeSingle();
      setFollowing(!!followRow);
    })();
  }, [workId, authorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate reaction counts (public)
  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("social_reaction")
        .select("emoji")
        .eq("id_doi_tuong", workId)
        .eq("loai_doi_tuong", "tac_pham");
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      }
      setReactionCounts(counts);
    })();
  }, [workId]); // eslint-disable-line react-hooks/exhaustive-deps

  // View ping — once per session
  useEffect(() => {
    const key = `view_pinged_${workId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void (async () => {
      const supabase = createClient();
      await supabase.from("social_luot_xem").insert({
        id_doi_tuong: workId,
        loai_doi_tuong: "tac_pham",
        loai_su_kien: "hien_thi",
        phien_id: key,
      });
    })();
  }, [workId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleReaction(emoji: string) {
    if (!profileId) return;
    const supabase = createClient();

    if (myReaction === emoji) {
      // Remove
      await supabase
        .from("social_reaction")
        .delete()
        .eq("id_doi_tuong", workId)
        .eq("loai_doi_tuong", "tac_pham")
        .eq("id_nguoi_dung", profileId);
      setMyReaction(null);
      setReactionCounts((prev) => ({ ...prev, [emoji]: Math.max((prev[emoji] ?? 1) - 1, 0) }));
    } else {
      // Remove old, add new
      if (myReaction) {
        await supabase
          .from("social_reaction")
          .delete()
          .eq("id_doi_tuong", workId)
          .eq("loai_doi_tuong", "tac_pham")
          .eq("id_nguoi_dung", profileId);
        setReactionCounts((prev) => ({
          ...prev,
          [myReaction]: Math.max((prev[myReaction] ?? 1) - 1, 0),
        }));
      }
      await supabase.from("social_reaction").insert({
        id_doi_tuong: workId,
        loai_doi_tuong: "tac_pham",
        id_nguoi_dung: profileId,
        emoji,
      });
      setMyReaction(emoji);
      setReactionCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    }
  }

  async function toggleSave() {
    if (!profileId) return;
    const supabase = createClient();
    if (saved) {
      await supabase
        .from("social_luu")
        .delete()
        .eq("id_doi_tuong", workId)
        .eq("loai_doi_tuong", "tac_pham")
        .eq("id_nguoi_dung", profileId);
      setSaved(false);
    } else {
      await supabase.from("social_luu").insert({
        id_doi_tuong: workId,
        loai_doi_tuong: "tac_pham",
        id_nguoi_dung: profileId,
      });
      setSaved(true);
    }
  }

  async function toggleFollow() {
    if (!profileId) return;
    const supabase = createClient();
    if (following) {
      await supabase
        .from("user_theo_doi")
        .delete()
        .eq("id_doi_tuong", authorId)
        .eq("loai_doi_tuong", "nguoi_dung")
        .eq("id_nguoi_theo_doi", profileId);
      setFollowing(false);
    } else {
      await supabase.from("user_theo_doi").insert({
        id_doi_tuong: authorId,
        loai_doi_tuong: "nguoi_dung",
        id_nguoi_theo_doi: profileId,
      });
      setFollowing(true);
    }
  }

  const isOwnWork = profileId === authorId;

  return (
    <div
      className="row"
      style={{
        flexWrap: "wrap",
        padding: "var(--space-3) 0",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        gap: "var(--space-3)",
      }}
    >
      {/* Reactions */}
      {EMOJIS.map((emoji) => {
        const count = reactionCounts[emoji] ?? 0;
        const active = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            disabled={!profileId}
            title={profileId ? undefined : "Đăng nhập để thả cảm xúc"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              border: `1px solid ${active ? "var(--cins-blue)" : "var(--border)"}`,
              borderRadius: 999,
              background: active ? "var(--cins-blue-soft)" : "var(--bg-surface)",
              cursor: profileId ? "pointer" : "default",
              fontSize: "var(--text-sm)",
              fontFamily: "inherit",
            }}
          >
            {emoji}
            {count > 0 && <span style={{ color: "var(--fg-2)" }}>{count}</span>}
          </button>
        );
      })}

      {/* Save */}
      {profileId && (
        <button
          onClick={toggleSave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: `1px solid ${saved ? "var(--cins-blue)" : "var(--border)"}`,
            borderRadius: 999,
            background: saved ? "var(--cins-blue-soft)" : "var(--bg-surface)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
            color: saved ? "var(--cins-blue-dark)" : "inherit",
          }}
        >
          {saved ? "🔖 Đã lưu" : "🔖 Lưu"}
        </button>
      )}

      {/* Follow author — not shown to the author themselves */}
      {profileId && !isOwnWork && (
        <button
          onClick={toggleFollow}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 12px",
            border: `1px solid ${following ? "var(--cins-blue)" : "var(--border)"}`,
            borderRadius: 999,
            background: following ? "var(--cins-blue-soft)" : "var(--bg-surface)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
            color: following ? "var(--cins-blue-dark)" : "inherit",
          }}
        >
          {following ? "✓ Đang theo dõi" : "+ Theo dõi tác giả"}
        </button>
      )}

      {/* Guest prompt */}
      {!userId && (
        <span className="muted" style={{ fontSize: 13 }}>
          <a href="/login">Đăng nhập</a> để thả cảm xúc hoặc lưu.
        </span>
      )}

    </div>
  );
}
