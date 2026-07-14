import "server-only";

import { assertRoomMember, mapMessageFromRow } from "@/lib/chat/direct-message";
import type { ChatMessage, ChatPollOption, ChatPollSummary } from "@/lib/chat/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_POLL_OPTIONS = 6;
const MIN_POLL_OPTIONS = 2;

type PollRow = {
  id: string;
  id_phong: string;
  id_tin_nhan: string;
  cau_hoi: string;
  cho_nhieu: boolean;
  id_nguoi_tao: string;
};

type OptionRow = {
  id: string;
  id_binh_chon: string;
  noi_dung: string;
  thu_tu: number;
};

type VoteRow = {
  id_binh_chon: string;
  id_lua_chon: string;
  id_nguoi_dung: string;
};

function buildPollSummary(
  poll: PollRow,
  options: OptionRow[],
  votes: VoteRow[],
  viewerId: string,
): ChatPollSummary {
  const countByOption = new Map<string, number>();
  let viewerOptionId: string | null = null;
  for (const vote of votes) {
    if (vote.id_binh_chon !== poll.id) continue;
    countByOption.set(
      vote.id_lua_chon,
      (countByOption.get(vote.id_lua_chon) ?? 0) + 1,
    );
    if (vote.id_nguoi_dung === viewerId) {
      viewerOptionId = vote.id_lua_chon;
    }
  }

  const mapped: ChatPollOption[] = [...options]
    .sort((a, b) => a.thu_tu - b.thu_tu)
    .map((opt) => ({
      id: opt.id,
      text: opt.noi_dung,
      count: countByOption.get(opt.id) ?? 0,
    }));

  return {
    id: poll.id,
    question: poll.cau_hoi,
    allowMultiple: Boolean(poll.cho_nhieu),
    totalVotes: votes.filter((v) => v.id_binh_chon === poll.id).length,
    viewerOptionId,
    options: mapped,
  };
}

export async function loadPollsForMessages(
  messageIds: string[],
  viewerId: string,
): Promise<Map<string, ChatPollSummary>> {
  const out = new Map<string, ChatPollSummary>();
  if (messageIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: polls } = await admin
    .from("chat_binh_chon")
    .select("id, id_phong, id_tin_nhan, cau_hoi, cho_nhieu, id_nguoi_tao")
    .in("id_tin_nhan", messageIds)
    .returns<PollRow[]>();

  if (!polls?.length) return out;

  const pollIds = polls.map((p) => p.id);
  const [{ data: options }, { data: votes }] = await Promise.all([
    admin
      .from("chat_binh_chon_lua_chon")
      .select("id, id_binh_chon, noi_dung, thu_tu")
      .in("id_binh_chon", pollIds)
      .returns<OptionRow[]>(),
    admin
      .from("chat_binh_chon_phieu")
      .select("id_binh_chon, id_lua_chon, id_nguoi_dung")
      .in("id_binh_chon", pollIds)
      .returns<VoteRow[]>(),
  ]);

  const optionsByPoll = new Map<string, OptionRow[]>();
  for (const opt of options ?? []) {
    const list = optionsByPoll.get(opt.id_binh_chon) ?? [];
    list.push(opt);
    optionsByPoll.set(opt.id_binh_chon, list);
  }

  for (const poll of polls) {
    out.set(
      poll.id_tin_nhan,
      buildPollSummary(
        poll,
        optionsByPoll.get(poll.id) ?? [],
        votes ?? [],
        viewerId,
      ),
    );
  }

  return out;
}

export async function createRoomPoll(
  roomId: string,
  viewerId: string,
  input: { question: string; options: string[] },
): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const question = input.question.trim();
  if (!question) return { ok: false, error: "Nhập câu hỏi bình chọn." };
  if (question.length > 200) {
    return { ok: false, error: "Câu hỏi tối đa 200 ký tự." };
  }

  const options = [
    ...new Set(
      input.options
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, MAX_POLL_OPTIONS),
    ),
  ];
  if (options.length < MIN_POLL_OPTIONS) {
    return { ok: false, error: `Cần ít nhất ${MIN_POLL_OPTIONS} lựa chọn.` };
  }
  if (options.some((o) => o.length > 80)) {
    return { ok: false, error: "Mỗi lựa chọn tối đa 80 ký tự." };
  }

  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: message, error: msgError } = await admin
    .from("chat_tin_nhan")
    .insert({
      id_phong: roomId,
      id_nguoi_gui: viewerId,
      noi_dung: question,
      loai_tin: "binh_chon",
      da_xoa: false,
    })
    .select(
      "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc",
    )
    .single();

  if (msgError || !message?.id) {
    return { ok: false, error: "Không tạo được tin bình chọn." };
  }

  const { data: poll, error: pollError } = await admin
    .from("chat_binh_chon")
    .insert({
      id_phong: roomId,
      id_tin_nhan: message.id,
      cau_hoi: question,
      cho_nhieu: false,
      id_nguoi_tao: viewerId,
    })
    .select("id, id_phong, id_tin_nhan, cau_hoi, cho_nhieu, id_nguoi_tao")
    .single<PollRow>();

  if (pollError || !poll?.id) {
    await admin.from("chat_tin_nhan").delete().eq("id", message.id);
    return { ok: false, error: "Không tạo được bình chọn." };
  }

  const { data: optionRows, error: optError } = await admin
    .from("chat_binh_chon_lua_chon")
    .insert(
      options.map((noi_dung, thu_tu) => ({
        id_binh_chon: poll.id,
        noi_dung,
        thu_tu,
      })),
    )
    .select("id, id_binh_chon, noi_dung, thu_tu")
    .returns<OptionRow[]>();

  if (optError || !optionRows?.length) {
    await admin.from("chat_tin_nhan").delete().eq("id", message.id);
    return { ok: false, error: "Không tạo được lựa chọn." };
  }

  await admin
    .from("chat_phong")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", roomId);

  const mapped = mapMessageFromRow(message, viewerId);
  mapped.kind = "binh_chon";
  mapped.poll = buildPollSummary(poll, optionRows, [], viewerId);

  return { ok: true, message: mapped };
}

export async function castRoomPollVote(
  roomId: string,
  pollId: string,
  viewerId: string,
  optionId: string,
): Promise<{ ok: true; poll: ChatPollSummary } | { ok: false; error: string }> {
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const admin = createServiceRoleClient();
  const { data: poll } = await admin
    .from("chat_binh_chon")
    .select("id, id_phong, id_tin_nhan, cau_hoi, cho_nhieu, id_nguoi_tao")
    .eq("id", pollId)
    .eq("id_phong", roomId)
    .maybeSingle<PollRow>();

  if (!poll) return { ok: false, error: "Không tìm thấy bình chọn." };

  const { data: option } = await admin
    .from("chat_binh_chon_lua_chon")
    .select("id")
    .eq("id", optionId)
    .eq("id_binh_chon", pollId)
    .maybeSingle();

  if (!option) return { ok: false, error: "Lựa chọn không hợp lệ." };

  const { error: voteError } = await admin.from("chat_binh_chon_phieu").upsert(
    {
      id_binh_chon: pollId,
      id_nguoi_dung: viewerId,
      id_lua_chon: optionId,
      tao_luc: new Date().toISOString(),
    },
    { onConflict: "id_binh_chon,id_nguoi_dung" },
  );

  if (voteError) {
    return { ok: false, error: "Không gửi được phiếu." };
  }

  const [{ data: options }, { data: votes }] = await Promise.all([
    admin
      .from("chat_binh_chon_lua_chon")
      .select("id, id_binh_chon, noi_dung, thu_tu")
      .eq("id_binh_chon", pollId)
      .returns<OptionRow[]>(),
    admin
      .from("chat_binh_chon_phieu")
      .select("id_binh_chon, id_lua_chon, id_nguoi_dung")
      .eq("id_binh_chon", pollId)
      .returns<VoteRow[]>(),
  ]);

  return {
    ok: true,
    poll: buildPollSummary(poll, options ?? [], votes ?? [], viewerId),
  };
}
